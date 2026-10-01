/* Routes a "resource:action" call to the public, client or admin handler module. */
import { db, getActor, HttpError, type Actor, type Payload } from "./core";
import { publicHandlers } from "./handlers/public";
import { clientHandlers } from "./handlers/client";
import { adminHandlers } from "./handlers/admin";
import { scopeOf, type ActionScope } from "@/lib/actionScopes";

export { currentSessionUser, HttpError } from "./core";

const TABLES = { public: publicHandlers, client: clientHandlers, admin: adminHandlers } as const;

/**
 * @param only  Restrict to one module. /api/admin passes "admin" and /api/data
 *              passes "member", so each endpoint can only reach its own actions.
 */
export async function executeDataAction(resource: string, action: string, payload: Payload = {}, only?: "admin" | "member"): Promise<unknown> {
  const key = `${resource}:${action}`;
  const scope: ActionScope = scopeOf(key);
  const handler = TABLES[scope][key];
  if (!handler) throw new HttpError(`Unsupported data action: ${key}`);
  if (only === "admin" && scope !== "admin") throw new HttpError(`Unsupported data action: ${key}`);
  if (only === "member" && scope === "admin") throw new HttpError("ADMIN_REQUIRED");

  const store = db();
  let me: Actor | null = null;
  if (scope !== "public") {
    me = await getActor();
    if (!me) throw new HttpError("AUTH_REQUIRED");
    if (me.status === "suspended" || me.status === "inactive") throw new HttpError("FORBIDDEN");
    if (scope === "admin" && me.role !== "admin") throw new HttpError("ADMIN_REQUIRED");
  }
  return handler({ payload: payload ?? {}, me: me as Actor, store });
}
