import { NextResponse } from "next/server";

const STATUS: Record<string, number> = {
  AUTH_REQUIRED: 401,
  ADMIN_REQUIRED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  FIREBASE_SERVER_NOT_CONFIGURED: 503,
};

export function jsonError(e: unknown, label: string) {
  const message = e instanceof Error ? e.message : "Request failed";
  const status = STATUS[message] ?? (message.startsWith("Unsupported data action") ? 404 : 400);
  if (!(message in STATUS)) console.error(`[qatra] ${label} failed:`, e);
  return NextResponse.json({ error: message }, { status });
}
