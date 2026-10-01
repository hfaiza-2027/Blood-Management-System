/**
 * Server-only bootstrap. Imported once from app/layout.tsx so that services
 * running inside Server Components can reach Firestore through the registry
 * in services/client.ts without client bundles ever importing firebase-admin.
 */
import { adminDb } from "./admin";
import { currentSessionUser, executeDataAction } from "@/lib/server/execute";

globalThis.__qatraServer = {
  configured: Boolean(adminDb),
  exec: executeDataAction,
  currentUser: currentSessionUser,
};

export {};
