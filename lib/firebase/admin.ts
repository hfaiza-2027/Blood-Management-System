import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "qatra_session";

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

export async function getSessionUser() {
  if (!adminAuth) return null;
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;
  try {
    return await adminAuth.verifySessionCookie(session, true);
  } catch {
    return null;
  }
}
