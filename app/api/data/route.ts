import { NextResponse } from "next/server";
import { executeDataAction } from "@/lib/server/execute";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Client module endpoint: public and member actions only. */
export async function POST(request: Request) {
  let body: { resource?: string; action?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.resource || !body.action) return NextResponse.json({ error: "Missing resource or action." }, { status: 400 });
  try {
    return NextResponse.json((await executeDataAction(body.resource, body.action, body.payload ?? {}, "member")) ?? null);
  } catch (e) {
    return jsonError(e, `${body.resource}:${body.action}`);
  }
}
