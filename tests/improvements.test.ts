/* Version 5 behaviour: role routing, reports, stock movements, privacy, contact form and caching. */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { postLoginPath, homeFor } from "@/lib/routing";
import { bucketFor, bucketsBetween, previousPeriod, resolveReportFilters, toDateInput } from "@/lib/reportRange";
import { stockLevel } from "@/lib/inventory";
import { call, db, rejects, resetWorld } from "./helpers";

beforeEach(resetWorld);

const DONOR = (uid: string, bloodGroup: string, city = "Lahore", area = "Johar Town") => ({
  input: { name: uid, bloodGroup, gender: "male", age: 28, weightKg: 70, location: { city, area }, availability: "available", preferredContact: "phone", lastDonationDate: null },
});

const request = (who: string, overrides: Record<string, unknown> = {}) =>
  call(who as never, "bloodRequests:create", {
    input: { bloodGroup: "O-", unitsRequired: 2, patientName: "Parveen Akhtar", patientAge: 34, hospitalId: "h1", city: "Lahore", requiredBy: "2030-01-01T10:00:00+05:00", urgency: "emergency", reason: "Surgery", contactNumber: "03001234567", ...overrides },
  });

const lastDays = (n: number) => ({ from: new Date(Date.now() - (n - 1) * 86_400_000).toISOString(), to: new Date(Date.now() + 60_000).toISOString() });

/* ---------- routing ---------- */

test("admins always land in the admin console after login", () => {
  assert.equal(postLoginPath("admin", null), "/admin");
  assert.equal(postLoginPath("admin", "/dashboard/request"), "/admin", "a public 'Request blood' link must not strand admins in the member view");
  assert.equal(postLoginPath("admin", "/admin/reports?range=30d"), "/admin/reports?range=30d");
});

test("members return to where they were going, never into the console or off-site", () => {
  assert.equal(postLoginPath("user", "/dashboard/donors?group=O%2B"), "/dashboard/donors?group=O%2B");
  assert.equal(postLoginPath("donor", "/admin"), "/dashboard");
  for (const bad of ["//evil.example", "https://evil.example", "/auth/login", "/api/admin", "/\\evil"]) assert.equal(postLoginPath("user", bad), "/dashboard", bad);
  assert.equal(homeFor("admin"), "/admin");
  assert.equal(homeFor("user"), "/dashboard");
});

/* ---------- report ranges ---------- */

test("report presets resolve to Pakistan calendar days", () => {
  const now = new Date("2026-10-18T20:00:00Z"); // 19 Oct, 01:00 in Pakistan
  const { preset, filters } = resolveReportFilters({ range: "7d" }, now);
  assert.equal(preset, "7d");
  assert.equal(toDateInput(filters.from), "2026-10-13");
  assert.equal(toDateInput(filters.to), "2026-10-19");
  assert.equal(filters.from, "2026-10-12T19:00:00.000Z", "midnight in Pakistan");
  assert.equal(toDateInput(resolveReportFilters({ range: "ytd" }, now).filters.from), "2026-01-01");
  assert.equal(toDateInput(resolveReportFilters({ range: "12m" }, now).filters.from), "2025-11-01");
});

test("custom ranges are validated, clamped and fall back safely", () => {
  const now = new Date("2026-10-18T06:00:00Z");
  const ok = resolveReportFilters({ range: "custom", from: "2026-09-01", to: "2026-09-30", group: "AB-", urgency: "urgent", city: "Lahore" }, now);
  assert.equal(ok.preset, "custom");
  assert.equal(toDateInput(ok.filters.to), "2026-09-30");
  assert.equal(ok.filters.bloodGroup, "AB-");
  assert.equal(ok.filters.urgency, "urgent");
  const future = resolveReportFilters({ range: "custom", from: "2026-10-01", to: "2027-01-01" }, now);
  assert.equal(toDateInput(future.filters.to), "2026-10-18", "never past today");
  const reversed = resolveReportFilters({ range: "custom", from: "2026-10-10", to: "2026-10-01" }, now);
  assert.equal(reversed.preset, "90d");
  const junk = resolveReportFilters({ range: "forever", group: "C+", urgency: "panic" }, now);
  assert.equal(junk.preset, "90d");
  assert.equal(junk.filters.bloodGroup, undefined);
  assert.equal(junk.filters.urgency, undefined);
});

test("buckets: daily up to a month, weekly up to four months, monthly beyond", () => {
  const to = "2026-10-18T18:59:59.999Z";
  assert.equal(bucketFor("2026-09-19T19:00:00.000Z", to), "day");
  assert.equal(bucketFor("2026-07-20T19:00:00.000Z", to), "week");
  assert.equal(bucketFor("2025-10-31T19:00:00.000Z", to), "month");
  const months = bucketsBetween("2025-10-31T19:00:00.000Z", to, "month");
  assert.equal(months.length, 12);
  assert.equal(months[0].key, "2025-11");
  assert.equal(months.at(-1)?.key, "2026-10");
  const weeks = bucketsBetween("2026-09-30T19:00:00.000Z", to, "week");
  assert.ok(weeks.every((w) => new Date(`${w.key}T00:00:00Z`).getUTCDay() === 1), "weeks start on Monday");
  const prev = previousPeriod("2026-10-01T00:00:00.000Z", "2026-10-10T23:59:59.999Z");
  assert.equal(prev.to, "2026-09-30T23:59:59.999Z");
  assert.equal(new Date(prev.to).getTime() - new Date(prev.from).getTime(), new Date("2026-10-10T23:59:59.999Z").getTime() - new Date("2026-10-01T00:00:00.000Z").getTime());
});

test("stock level thresholds", () => {
  assert.equal(stockLevel({ available: 10, required: 10 }), "normal");
  assert.equal(stockLevel({ available: 9, required: 10 }), "low");
  assert.equal(stockLevel({ available: 4, required: 10 }), "critical");
  assert.equal(stockLevel({ available: 0, required: 0 }), "critical");
});

/* ---------- reports ---------- */

test("report KPIs: fulfilment, response times, emergencies and filters", async () => {
  await call("admin", "system:seed");
  await call("ali", "donors:registerDonor", DONOR("ali", "O-"));
  const a = await request("ahmed");
  const b = await request("ahmed", { bloodGroup: "B+", urgency: "normal", hospitalId: "h10" });
  const c = await request("hira", { bloodGroup: "O-", urgency: "urgent" });
  await call("ali", "bloodRequests:respond", { requestId: a.id });
  await call("admin", "bloodRequests:updateStatus", { requestId: a.id, status: "fulfilled" });
  await call("ahmed", "bloodRequests:cancel", { requestId: b.id });

  const r = await call("admin", "dashboard:reports", { filters: lastDays(30) });
  assert.equal(r.kpis.requests.value, 3);
  assert.equal(r.kpis.unitsRequested.value, 6);
  assert.equal(r.kpis.fulfilmentRate.value, 50, "1 of 2 non-cancelled requests fulfilled");
  assert.equal(r.kpis.emergencies.value, 1);
  assert.equal(r.kpis.emergencyOnTimeRate.value, 100);
  assert.ok(r.kpis.medianHoursToFirstResponse.value !== null && r.kpis.medianHoursToFirstResponse.value >= 0);
  assert.ok(r.kpis.medianHoursToFulfil.value !== null);
  assert.equal(r.kpis.requests.previous, 0);
  assert.equal(r.groups.find((g: any) => g.group === "O-").activeDonors, 1);
  assert.equal(r.hospitals[0].requests, 2);
  assert.ok(r.requestStatus.some((s: any) => s.label === "Fulfilled" && s.value === 1));
  assert.equal(r.trend.reduce((n: number, t: any) => n + t.requests, 0), 3);

  const lahore = await call("admin", "dashboard:reports", { filters: { ...lastDays(30), city: "Lahore" } });
  assert.equal(lahore.kpis.requests.value, 2, "the Karachi hospital request is excluded");
  const oNeg = await call("admin", "dashboard:reports", { filters: { ...lastDays(30), bloodGroup: "O-" } });
  assert.equal(oNeg.kpis.requests.value, 2);
  assert.equal(oNeg.groups.length, 1);
  const urgent = await call("admin", "dashboard:reports", { filters: { ...lastDays(30), urgency: "urgent" } });
  assert.equal(urgent.kpis.requests.value, 1);
  assert.deepEqual(urgent.requestStatus, [{ label: "Pending review", value: 1 }]);
  assert.equal(urgent.hospitals[0].hospitalId, c.hospitalId);
});

test("reports compare with the previous period of equal length", async () => {
  await call("admin", "system:seed");
  const old = await request("ahmed", { urgency: "normal" });
  // Move the request back 10 days: outside the last 7 days, inside the 7 before.
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
  await db.collection("bloodRequests").doc(old.id).set({ createdAt: tenDaysAgo }, { merge: true });
  await request("ahmed", { urgency: "normal" });
  await request("ahmed", { urgency: "normal" });
  const r = await call("admin", "dashboard:reports", { filters: lastDays(7) });
  assert.equal(r.kpis.requests.value, 2);
  assert.equal(r.kpis.requests.previous, 1);
});

test("report filters are validated on the server", async () => {
  await rejects(call("admin", "dashboard:reports", { filters: { from: "nope", to: "never" } }), /valid date range/);
  await rejects(call("admin", "dashboard:reports", { filters: { from: "2026-10-10T00:00:00Z", to: "2026-10-01T00:00:00Z" } }), /before the end date/);
  await rejects(call("admin", "dashboard:reports", { filters: { from: "2020-01-01T00:00:00Z", to: "2026-01-01T00:00:00Z" } }), /two years/);
  await rejects(call("admin", "dashboard:reports", { filters: { ...lastDays(7), bloodGroup: "C+" } }), /valid blood group/);
  await rejects(call("ahmed", "dashboard:reports", { filters: lastDays(7) }), "ADMIN_REQUIRED");
});

/* ---------- inventory ---------- */

test("stock adjustments are recorded as movements and feed the report", async () => {
  await call("admin", "system:seed");
  await call("admin", "inventory:adjust", { group: "A+", delta: 20, reason: "New donations received" });
  await call("admin", "inventory:adjust", { group: "A+", delta: -5, reason: "Issued to hospital" });
  const res = await call("admin", "inventory:adjust", { group: "A+", delta: -50, reason: "Expired units discarded" });
  assert.equal(res.available, 0, "stock never goes below zero");
  assert.equal(res.delta, -15, "only the units actually removed are recorded");
  const a = db.dump("inventory").find((i) => i.id === "A+");
  assert.equal(a?.expired, 15);
  const moves = await call("admin", "inventory:movements", { limit: 10 });
  assert.equal(moves.length, 3);
  assert.deepEqual(moves.map((m: any) => m.balance).sort((x: number, y: number) => x - y), [0, 15, 20]);
  const r = await call("admin", "dashboard:reports", { filters: lastDays(7) });
  assert.equal(r.kpis.unitsIn.value, 20);
  assert.equal(r.kpis.unitsOut.value, 20);
  assert.equal(r.inventory.find((i: any) => i.group === "A+").unitsOut, 20);
  await rejects(call("ahmed", "inventory:movements"), "ADMIN_REQUIRED");
});

test("public stock reflects an adjustment straight away (cache is invalidated)", async () => {
  await call("admin", "system:seed");
  const before = (await call(null, "inventory:list")).find((i: any) => i.bloodGroup === "B+").available;
  await call("admin", "inventory:adjust", { group: "B+", delta: 7, reason: "drive" });
  const after = (await call(null, "inventory:list")).find((i: any) => i.bloodGroup === "B+").available;
  assert.equal(after, before + 7);
});

/* ---------- requests ---------- */

test("responding twice counts once and records the first response time", async () => {
  await call("admin", "system:seed");
  const r = await request("ahmed");
  await call("ali", "bloodRequests:respond", { requestId: r.id });
  await call("ali", "bloodRequests:respond", { requestId: r.id });
  const saved = db.dump("bloodRequests")[0];
  assert.equal(saved.donorsContacted, 1);
  assert.equal(saved.status, "donor_found");
  assert.ok(saved.firstResponseAt);
  await call("admin", "bloodRequests:updateStatus", { requestId: r.id, status: "fulfilled" });
  const done = db.dump("bloodRequests")[0];
  assert.ok(done.fulfilledAt && done.closedAt);
  await rejects(call("ahmed", "bloodRequests:cancel", { requestId: r.id }), /already closed/);
});

test("a requester's phone is masked for other members until they offer to help", async () => {
  await call("admin", "system:seed");
  const r = await request("ahmed");
  assert.equal((await call("ahmed", "bloodRequests:getById", { id: r.id })).contactNumber, "03001234567");
  const forAli = await call("ali", "bloodRequests:getById", { id: r.id });
  assert.notEqual(forAli.contactNumber, "03001234567");
  assert.match(forAli.contactNumber, /•/);
  const listed = (await call("hira", "bloodRequests:list")).find((x: any) => x.id === r.id);
  assert.match(listed.contactNumber, /•/);
  await call("ali", "bloodRequests:respond", { requestId: r.id });
  assert.equal((await call("ali", "bloodRequests:getById", { id: r.id })).contactNumber, "03001234567");
  assert.equal((await call("admin", "bloodRequests:getById", { id: r.id })).contactNumber, "03001234567");
});

test("the public emergency feed never includes contact numbers or names", async () => {
  await call("admin", "system:seed");
  await request("ahmed");
  await request("ahmed", { urgency: "normal" });
  const feed = await call(null, "bloodRequests:nearbyPublic", { radiusKm: 50 });
  assert.equal(feed.length, 1, "routine requests are not public");
  assert.equal(feed[0].contactNumber, "");
  assert.equal(feed[0].requesterName, "");
});

test("a facility with open requests can't be removed", async () => {
  await call("admin", "system:seed");
  const r = await request("ahmed");
  await rejects(call("admin", "hospitals:remove", { id: "h1" }), /open request/);
  await call("ahmed", "bloodRequests:cancel", { requestId: r.id });
  await call("admin", "hospitals:remove", { id: "h1" });
  assert.ok(!(await call(null, "hospitals:list")).some((h: any) => h.id === "h1"));
});

test("admin overview counts open emergencies and lists them by deadline", async () => {
  await call("admin", "system:seed");
  await request("ahmed", { requiredBy: "2030-06-01T10:00:00+05:00" });
  await request("ahmed", { requiredBy: "2030-01-01T10:00:00+05:00" });
  const o = await call("admin", "dashboard:adminOverview");
  assert.equal(o.stats.emergencyRequests, 2);
  assert.equal(o.emergencies.length, 2);
  assert.ok(o.emergencies[0].requiredBy < o.emergencies[1].requiredBy);
  assert.equal(o.inventory.length, 8);
});

/* ---------- contact form ---------- */

test("contact messages are validated, stored and handled by admins", async () => {
  await rejects(call(null, "contact:submit", { input: { name: "A", email: "x", message: "short" } }), /your name/);
  await rejects(call(null, "contact:submit", { input: { name: "Nadia", email: "nadia@example.com", message: "too short" } }), /at least 10/);
  await call(null, "contact:submit", { input: { name: "Bot", email: "bot@example.com", message: "Buy cheap things here now", website: "spam.example" } });
  assert.equal(db.dump("contactMessages").length, 0, "honeypot submissions are dropped");
  await call(null, "contact:submit", { input: { name: "Nadia Perveen", email: "Nadia@Example.com", topic: "drive", message: "We would like to host a blood drive in March." } });
  const [m] = await call("admin", "contactMessages:list");
  assert.equal(m.email, "nadia@example.com");
  assert.equal(m.status, "new");
  assert.equal((await call("admin", "contactMessages:newCount")).count, 1);
  await call("admin", "contactMessages:setStatus", { id: m.id, status: "resolved" });
  assert.equal((await call("admin", "contactMessages:newCount")).count, 0);
  await rejects(call("ahmed", "contactMessages:list"), "ADMIN_REQUIRED");
});

/* ---------- validation of admin inputs ---------- */

test("admin status changes only accept known values", async () => {
  await call("ali", "donors:registerDonor", DONOR("ali", "O-"));
  await rejects(call("admin", "users:setStatus", { id: "ali", status: "owner" }), /Unknown account status/);
  await rejects(call("admin", "donors:setVerification", { id: "ali", verification: "maybe" }), /Unknown verification/);
  await rejects(call("admin", "donors:setStatus", { id: "ali", status: "gone" }), /Unknown donor status/);
});

/* ---------- live updates ---------- */

test("live counters report new activity to members and admins", async () => {
  await call("admin", "system:seed");
  assert.deepEqual(await call("ali", "live:counts"), { unread: 0 }, "members only see their own unread count");
  const before = await call("admin", "live:counts");
  assert.deepEqual(before, { unread: 0, newMessages: 0, emergencies: 0 });

  await call(null, "contact:submit", { input: { name: "Nadia Perveen", email: "nadia@example.com", topic: "partner", message: "We would like to partner with BloodBridge." } });
  await request("ahmed");
  const after = await call("admin", "live:counts");
  assert.equal(after.newMessages, 1, "a new contact message is counted at once");
  assert.equal(after.emergencies, 1);

  const [m] = await call("admin", "contactMessages:list");
  await call("admin", "contactMessages:setStatus", { id: m.id, status: "read" });
  assert.equal((await call("admin", "live:counts")).newMessages, 0);
  await rejects(call(null, "live:counts"), "AUTH_REQUIRED");
});
