import { NextResponse } from "next/server";
import { executeDataAction } from "@/lib/server/execute";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Admin module endpoint: admin actions only, and only for admins. */
export async function POST(request: Request) {
  let body: { resource?: string; action?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.resource || !body.action) return NextResponse.json({ error: "Missing resource or action." }, { status: 400 });
  try {
    return NextResponse.json((await executeDataAction(body.resource, body.action, body.payload ?? {}, "admin")) ?? null);
  } catch (e) {
    return jsonError(e, `admin ${body.resource}:${body.action}`);
  }
}
