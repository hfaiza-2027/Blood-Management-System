import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "bloodbridge_session";

function privateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY ?? "";
  // Accept keys pasted with literal "\n", real newlines, or wrapped in quotes.
  return raw.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

const configured = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

export const firebaseAdminApp = configured
  ? (getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey(),
      }),
    }))
  : null;

export const adminAuth = firebaseAdminApp ? getAuth(firebaseAdminApp) : null;

function makeDb(): Firestore | null {
  if (!firebaseAdminApp) return null;
  const db = getFirestore(firebaseAdminApp);
  try {
    // Optional fields may be undefined; skip them instead of throwing.
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    /* settings() can only run once per instance (e.g. after hot reload) */
  }
  return db;
}

export const adminDb = makeDb();

/**
 * Verified sessions, keyed by cookie value, reused for a short time.
 *
 * Opening one page used to verify the session cookie several times (layout,
 * badges and each data call), and every check also asked Firebase Auth whether
 * the session had been revoked. That added a network round trip per call and,
 * when one of those calls hiccupped, the page failed with an error. Now each
 * cookie is checked once and reused for SESSION_TTL_MS. Signing out
 * everywhere or suspending a user clears their entries on this server at once;
 * other servers catch up within the TTL.
 */
const SESSION_TTL_MS = 60_000;
type Decoded = Awaited<ReturnType<NonNullable<typeof adminAuth>["verifySessionCookie"]>>;
const verified = new Map<string, { at: number; decoded: Decoded }>();

/** Firebase rejected the cookie itself (expired, revoked, malformed): the visitor is signed out. */
function isAuthRejection(e: unknown) {
  const code = String((e as { code?: string })?.code ?? (e as Error)?.message ?? "");
  return code.startsWith("auth/");
}

async function verify(cookie: string): Promise<Decoded | null> {
  const hit = verified.get(cookie);
  if (hit && Date.now() - hit.at < SESSION_TTL_MS) return hit.decoded;
  for (let attempt = 1; ; attempt++) {
    try {
      const decoded = await adminAuth!.verifySessionCookie(cookie, true);
      verified.set(cookie, { at: Date.now(), decoded });
      if (verified.size > 5000) verified.delete(verified.keys().next().value as string);
      return decoded;
    } catch (e) {
      if (isAuthRejection(e)) {
        verified.delete(cookie);
        return null;
      }
      // A network or Firebase hiccup: retry once, then let the caller show an error instead of signing the person out.
      if (attempt >= 2) throw e;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

/** Drop cached sessions for a user (after sign-out everywhere or suspension). */
export function forgetSessions(uid?: string) {
  for (const [cookie, v] of verified) if (!uid || v.decoded.uid === uid) verified.delete(cookie);
}

export async function getSessionUser() {
  if (!adminAuth) return null;
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  return verify(session);
}
