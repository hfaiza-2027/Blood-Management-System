/* Shared setup for data-layer tests: fake users, sessions and a call() helper. */
import { executeDataAction } from "@/lib/server/execute";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("firebase-admin/firestore");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const auth = require("firebase-admin/auth");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const headers = require("next/headers");

export const db = fs.__db as { reset(): void; dump(c: string): Record<string, any>[]; collection(c: string): any };
export const authLog = auth.__log as { updated: any[]; deleted: string[]; revoked: string[] };

export const USERS = {
  admin: { fullName: "Sana Mirza", email: "sana@qatra.pk", role: "admin", bloodGroup: "A+", location: { city: "Lahore", area: "Gulberg" } },
  ahmed: { fullName: "Ahmed Hassan", email: "ahmed@example.com", phone: "03001234567", role: "user", bloodGroup: "O+", location: { city: "Lahore", area: "Johar Town" } },
  ali: { fullName: "Ali Raza", email: "ali@example.com", phone: "03111234567", role: "user", bloodGroup: "O-", location: { city: "Lahore", area: "Model Town" } },
  hira: { fullName: "Hira Batool", email: "hira@example.com", phone: "03211234567", role: "user", bloodGroup: "B+", location: { city: "Karachi", area: "Clifton" } },
  banned: { fullName: "Imran Aslam", email: "imran@example.com", role: "user", status: "suspended", bloodGroup: "A-", location: { city: "Lahore", area: "Cantt" } },
} as const;
export type Who = keyof typeof USERS | null;

export async function resetWorld() {
  db.reset();
  auth.__reset();
  for (const [uid, u] of Object.entries(USERS)) {
    await db.collection("users").doc(uid).set({ status: "active", verified: true, gender: "male", dateOfBirth: "1995-01-01", ...u });
    auth.__signIn(`cookie-${uid}`, { uid, email: u.email, name: u.fullName });
  }
  headers.__setCookie(null);
}

export function as(who: Who) {
  headers.__setCookie(who ? `cookie-${who}` : null);
}

/** Call a data action as someone. `via` mimics which API endpoint was used. */
export async function call<T = any>(who: Who, key: string, payload: Record<string, unknown> = {}, via?: "admin" | "member"): Promise<T> {
  as(who);
  const [resource, action] = key.split(":");
  return (await executeDataAction(resource, action, payload, via)) as T;
}

export async function rejects(p: Promise<unknown>, message: string | RegExp) {
  try {
    await p;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (typeof message === "string" ? m === message : message.test(m)) return;
    throw new Error(`Expected rejection matching ${message}, got "${m}"`);
  }
  throw new Error(`Expected rejection matching ${message}, but it resolved`);
}
