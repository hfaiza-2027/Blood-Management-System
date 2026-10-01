import type { AuthSession, User } from "@/types";
import { currentUser } from "@/data/mockUsers";
import { AREA_POINTS } from "@/data/locations";
import { mock, ApiError } from "./client";
import { firebaseConfigured, firebaseAuth, firestore } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";

export interface LoginInput { email: string; password: string }
export interface RegisterInput { fullName: string; email: string; phone: string; password: string; city: string; area: string; bloodGroup: string; dateOfBirth: string; gender: string; address: string }

const LIVE = () => firebaseConfigured && Boolean(firebaseAuth);

/** Turn Firebase error codes into sentences people can act on. */
export function authMessage(e: unknown, fallback = "Something went wrong. Try again."): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "That email and password don't match. Check them and try again.",
    "auth/wrong-password": "That email and password don't match. Check them and try again.",
    "auth/user-not-found": "There's no account with that email. Create one instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Log in instead.",
    "auth/weak-password": "Choose a stronger password (at least 8 characters with a number).",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes, then try again.",
    "auth/network-request-failed": "You appear to be offline. Check your connection.",
    "auth/user-disabled": "This account has been suspended. Contact support.",
    "auth/requires-recent-login": "For security, log out and log in again before changing your password.",
    "auth/expired-action-code": "This link has expired. Request a new one.",
    "auth/invalid-action-code": "This link is invalid or has already been used. Request a new one.",
  };
  if (map[code]) return map[code];
  return e instanceof Error && !code ? e.message : fallback;
}

async function startSession(idToken: string, profile?: Record<string, unknown>) {
  const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken, profile }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.user) throw new ApiError(body.error ?? "We couldn't start your session. Log in again.", res.status || 400);
  return body.user as User;
}

export const authService = {
  isLive: LIVE,

  async login({ email, password }: LoginInput): Promise<AuthSession> {
    if (!LIVE()) {
      const admin = email.trim().toLowerCase().endsWith("@qatra.pk");
      return mock({ user: { ...currentUser, role: admin ? "admin" : currentUser.role }, token: "mock-token", expiresAt: new Date(Date.now() + 86_400_000).toISOString() }, 500);
    }
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth!, email.trim(), password);
      const token = await cred.user.getIdToken(true);
      const user = await startSession(token);
      return { user: { ...user, id: cred.user.uid }, token, expiresAt: new Date(Date.now() + 5 * 86_400_000).toISOString() };
    } catch (e) {
      if (firebaseAuth?.currentUser) await signOut(firebaseAuth).catch(() => undefined);
      throw new ApiError(e instanceof ApiError ? e.message : authMessage(e, "We couldn't log you in. Try again."), 401);
    }
  },

  async register(input: RegisterInput): Promise<{ userId: string; email: string }> {
    if (!LIVE()) return mock({ userId: "u-new", email: input.email }, 900);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth!, input.email.trim(), input.password);
      await updateProfile(cred.user, { displayName: input.fullName });
      const point = AREA_POINTS[input.city]?.[input.area] ?? { lat: 31.4697, lng: 74.2728 };
      const token = await cred.user.getIdToken(true);
      // The server writes the profile (role, status and verification are set there, not by the browser).
      await startSession(token, {
        fullName: input.fullName,
        email: input.email.trim(),
        phone: input.phone,
        bloodGroup: input.bloodGroup,
        gender: input.gender,
        dateOfBirth: input.dateOfBirth,
        location: { city: input.city, area: input.area, point },
        address: input.address,
        verified: false,
        joinedAt: new Date().toISOString(),
      });
      await sendEmailVerification(cred.user).catch(() => undefined);
      return { userId: cred.user.uid, email: input.email };
    } catch (e) {
      throw new ApiError(e instanceof ApiError ? e.message : authMessage(e, "We couldn't create your account. Try again."), 400);
    }
  },

  async requestPasswordReset(email: string) {
    if (!LIVE()) return mock({ sent: Boolean(email) }, 500);
    try {
      await sendPasswordResetEmail(firebaseAuth!, email.trim());
    } catch (e) {
      // Don't reveal whether an account exists; only surface real input/network problems.
      const code = (e as { code?: string })?.code;
      if (code && code !== "auth/user-not-found") throw new ApiError(authMessage(e), 400);
    }
    return { sent: true };
  },

  async resetPassword(_token: string, _password: string) {
    return { ok: true };
  },

  async changePassword(current: string, next: string) {
    if (!LIVE()) return mock({ ok: true }, 800);
    const u = firebaseAuth?.currentUser;
    if (!u?.email) throw new ApiError("Log out and log in again before changing your password.", 401);
    try {
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
      await updatePassword(u, next);
      return { ok: true };
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") throw new ApiError("Your current password is incorrect.", 400);
      throw new ApiError(authMessage(e), 400);
    }
  },

  async verifyOtp(code: string) {
    if (code === "000000") throw new ApiError("That code has expired. Request a new one.", 400);
    return mock({ ok: true }, 600);
  },

  async resendCode() {
    if (LIVE() && firebaseAuth?.currentUser) await sendEmailVerification(firebaseAuth.currentUser);
    return { ok: true };
  },

  async logout() {
    if (firebaseAuth) await signOut(firebaseAuth).catch(() => undefined);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  },

  /**
   * On the server this reads the session cookie (via the registry set up in
   * lib/firebase/server.ts). In the browser it waits for Firebase Auth.
   */
  async getCurrentUser(): Promise<User> {
    if (typeof window === "undefined") {
      const server = globalThis.__qatraServer;
      if (server?.configured) {
        const user = (await server.currentUser()) as User | null;
        if (!user) throw new ApiError("Authentication required.", 401);
        return user;
      }
      return mock(currentUser, 150);
    }
    if (!firebaseAuth || !firestore) return mock(currentUser, 150);
    return new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(firebaseAuth!, async (u) => {
        unsub();
        if (!u) return reject(new ApiError("Authentication required.", 401));
        const snap = await getDoc(doc(firestore!, "users", u.uid));
        if (!snap.exists()) return reject(new ApiError("Profile not found.", 404));
        resolve({ ...(snap.data() as Omit<User, "id">), id: u.uid });
      });
    });
  },
};
