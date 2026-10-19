import { scopeOf } from "@/lib/actionScopes";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Server-side data access is registered by `lib/firebase/server.ts` (imported
 * from the root layout). Keeping it behind this registry means client bundles
 * never pull in `firebase-admin` or `next/headers`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServerExecutor = (resource: string, action: string, payload?: Record<string, any>) => Promise<unknown>;

declare global {
  // eslint-disable-next-line no-var
  var __bloodbridgeServer: { configured: boolean; exec: ServerExecutor; currentUser: () => Promise<unknown> } | undefined;
}

const FRIENDLY: Record<string, string> = {
  AUTH_REQUIRED: "Please log in again to continue.",
  ADMIN_REQUIRED: "Only administrators can do that.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "That record no longer exists.",
  FIREBASE_SERVER_NOT_CONFIGURED: "The server's Firebase settings are missing. Check the FIREBASE_* values in your environment.",
};

/**
 * Calls a "resource:action" on the server. In the browser it posts to the
 * right endpoint (/api/admin for admin actions, /api/data for the rest); in
 * Server Components it calls the handler directly.
 */
export async function dataCall<T>(resource: string, action: string, payload?: unknown): Promise<T> {
  if (typeof window !== "undefined") {
    let res: Response;
    try {
      const endpoint = scopeOf(`${resource}:${action}`) === "admin" ? "/api/admin" : "/api/data";
      res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, action, payload: payload ?? {} }) });
    } catch {
      throw new ApiError("You appear to be offline. Check your connection and try again.", 0);
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = (body as { error?: string }).error ?? "Request failed";
      throw new ApiError(FRIENDLY[code] ?? code, res.status);
    }
    return body as T;
  }
  const server = globalThis.__bloodbridgeServer;
  if (!server?.configured) throw new ApiError(FRIENDLY.FIREBASE_SERVER_NOT_CONFIGURED, 503);
  return (await server.exec(resource, action, (payload ?? {}) as Record<string, unknown>)) as T;
}

/** Use on server pages so a temporary database error never blanks the page. */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[BloodBridge] data load failed:", e);
    return fallback;
  }
}
