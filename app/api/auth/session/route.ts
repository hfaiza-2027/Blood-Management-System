import { NextResponse } from "next/server";
import { adminAuth, adminDb, SESSION_COOKIE } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const FIVE_DAYS = 1000 * 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  if (!adminAuth || !adminDb) return NextResponse.json({ error: "Firebase server configuration is missing. Check FIREBASE_* values in .env.local." }, { status: 503 });
  let idToken: string | undefined;
  let profile: Record<string, unknown> | undefined;
  try {
    ({ idToken, profile } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!idToken) return NextResponse.json({ error: "Missing ID token." }, { status: 400 });

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const ref = adminDb.collection("users").doc(decoded.uid);
    let snap = await ref.get();

    // Registration sends the profile along; accounts created in the Firebase
    // console get a minimal profile so they can still sign in.
    if (!snap.exists) {
      const base = {
        fullName: decoded.name ?? decoded.email?.split("@")[0] ?? "Member",
        email: decoded.email ?? "",
        phone: "",
        bloodGroup: "O+",
        gender: "other",
        dateOfBirth: "1995-01-01",
        location: { city: "Lahore", area: "Johar Town", point: { lat: 31.4697, lng: 74.2728 } },
        verified: Boolean(decoded.email_verified),
        joinedAt: new Date().toISOString(),
        ...(profile ?? {}),
        role: "user",
        status: "active",
      };
      await ref.set(base);
      snap = await ref.get();
    } else if (decoded.email_verified && !snap.data()?.verified) {
      await ref.set({ verified: true }, { merge: true });
      snap = await ref.get();
    }

    const data = snap.data() ?? {};
    if (data.status === "suspended" || data.status === "inactive") {
      return NextResponse.json({ error: "This account has been suspended. Contact support to restore access." }, { status: 403 });
    }

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS });
    const response = NextResponse.json({ user: { ...data, id: decoded.uid } });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: FIVE_DAYS / 1000,
    });
    return response;
  } catch (e) {
    console.error("[qatra] session creation failed:", e);
    return NextResponse.json({ error: "We couldn't start your session. Log in again." }, { status: 401 });
  }
}
