import { sleep } from "@/lib/utils";
import { firebaseConfigured } from "@/lib/firebase/client";
import { scopeOf } from "@/lib/actionScopes";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
export const HAS_FIREBASE_SERVER = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
/** Mock data is used only when no Firebase (or other API) configuration is present. */
export const USE_MOCKS = !firebaseConfigured && !HAS_FIREBASE_SERVER && !API_URL;

export async function mock<T>(value: T, ms = 350): Promise<T> {
  await sleep(ms);
  return structuredClone(value);
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new ApiError(await res.text(), res.status);
  return (await res.json()) as T;
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
  var __qatraServer: { configured: boolean; exec: ServerExecutor; currentUser: () => Promise<unknown> } | undefined;
}

const FRIENDLY: Record<string, string> = {
  AUTH_REQUIRED: "Please log in again to continue.",
  ADMIN_REQUIRED: "Only administrators can do that.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "That record no longer exists.",
  FIREBASE_SERVER_NOT_CONFIGURED: "The server's Firebase settings are missing. Check .env.local.",
};

export async function dataCall<T>(resource: string, action: string, payload?: unknown): Promise<T> {
  if (typeof window !== "undefined") {
    let res: Response;
    try {
      // Admin actions go to the admin module's endpoint; everything else to the client endpoint.
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
  const server = globalThis.__qatraServer;
  if (!server?.configured) throw new ApiError(FRIENDLY.FIREBASE_SERVER_NOT_CONFIGURED, 503);
  return (await server.exec(resource, action, (payload ?? {}) as Record<string, unknown>)) as T;
}

/** Use on public/server pages so a temporary database error never blanks the page. */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") console.error("[qatra] data load failed:", e);
    return fallback;
  }
}

export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
