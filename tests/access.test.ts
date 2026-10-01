/* Who may call what: public / member / admin, and the two API endpoints. */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_ACTIONS, PUBLIC_ACTIONS } from "@/lib/actionScopes";
import { adminHandlers } from "@/lib/server/handlers/admin";
import { clientHandlers } from "@/lib/server/handlers/client";
import { publicHandlers } from "@/lib/server/handlers/public";
import { call, rejects, resetWorld } from "./helpers";

beforeEach(resetWorld);

test("every declared action has exactly one handler in the matching module", () => {
  for (const k of PUBLIC_ACTIONS) assert.ok(publicHandlers[k], `public handler missing: ${k}`);
  for (const k of ADMIN_ACTIONS) assert.ok(adminHandlers[k], `admin handler missing: ${k}`);
  const all = [...Object.keys(publicHandlers), ...Object.keys(clientHandlers), ...Object.keys(adminHandlers)];
  assert.equal(new Set(all).size, all.length, "an action is defined in two modules");
  for (const k of Object.keys(adminHandlers)) assert.ok((ADMIN_ACTIONS as readonly string[]).includes(k), `admin handler not declared admin: ${k}`);
  for (const k of Object.keys(publicHandlers)) assert.ok((PUBLIC_ACTIONS as readonly string[]).includes(k), `public handler not declared public: ${k}`);
});

test("every action a service calls exists", async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path");
  const dir = path.join(__dirname, "..", "services");
  const known = new Set([...Object.keys(publicHandlers), ...Object.keys(clientHandlers), ...Object.keys(adminHandlers)]);
  for (const f of fs.readdirSync(dir)) {
    const src: string = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of src.matchAll(/dataCall(?:<[^(]*?>)?\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g)) assert.ok(known.has(`${m[1]}:${m[2]}`), `${f} calls unknown action ${m[1]}:${m[2]}`);
  }
});

test("public actions work without signing in", async () => {
  assert.ok(Array.isArray(await call(null, "inventory:list")));
  assert.ok(Array.isArray(await call(null, "hospitals:list")));
  const o = await call(null, "public:overview");
  assert.equal(typeof o.activeDonors, "number");
});

test("member actions need a session", async () => {
  await rejects(call(null, "bloodRequests:listMine"), "AUTH_REQUIRED");
  await rejects(call(null, "notifications:list"), "AUTH_REQUIRED");
});

test("members can't run admin actions, even through the admin endpoint", async () => {
  await rejects(call("ahmed", "users:list"), "ADMIN_REQUIRED");
  await rejects(call("ahmed", "users:list", {}, "admin"), "ADMIN_REQUIRED");
  await rejects(call("ahmed", "inventory:adjust", { group: "O+", delta: 5 }), "ADMIN_REQUIRED");
  await rejects(call("ahmed", "system:seed"), "ADMIN_REQUIRED");
});

test("the client endpoint refuses admin actions and the admin endpoint refuses client actions", async () => {
  await rejects(call("admin", "users:list", {}, "member"), "ADMIN_REQUIRED");
  await rejects(call("admin", "bloodRequests:listMine", {}, "admin"), /Unsupported data action/);
  assert.ok(Array.isArray(await call("admin", "users:list", {}, "admin")));
});

test("suspended accounts are blocked", async () => {
  await rejects(call("banned", "notifications:list"), "FORBIDDEN");
});

test("unknown actions are rejected", async () => {
  await rejects(call("admin", "users:hack"), /Unsupported data action/);
});

test("members can edit only safe fields on their own profile", async () => {
  const saved = await call("ahmed", "users:update", { user: { id: "ahmed", fullName: "Ahmed H.", role: "admin", status: "active", verified: true } });
  assert.equal(saved.fullName, "Ahmed H.");
  assert.equal(saved.role, "user", "role must not change");
  await rejects(call("ahmed", "users:update", { user: { id: "ali", fullName: "Hacked" } }), "FORBIDDEN");
});

test("admins can edit anyone but can't suspend, delete or demote themselves", async () => {
  const saved = await call("admin", "users:update", { user: { id: "ali", fullName: "Ali R." } });
  assert.equal(saved.fullName, "Ali R.");
  const self = await call("admin", "users:update", { user: { id: "admin", role: "user" } });
  assert.equal(self.role, "admin");
  await rejects(call("admin", "users:setStatus", { id: "admin", status: "suspended" }), /own account status/);
  await rejects(call("admin", "users:remove", { id: "admin" }), /own account/);
});
