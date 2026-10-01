/* End-to-end flows through the real data layer against the in-memory Firestore. */
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { authLog, call, db, rejects, resetWorld } from "./helpers";

const DONOR_INPUT = (uid: string, bloodGroup: string, city = "Lahore", area = "Johar Town") => ({
  input: { name: uid, bloodGroup, gender: "male", age: 28, weightKg: 70, location: { city, area }, availability: "available", preferredContact: "phone", lastDonationDate: null, phone: "03000000000" },
});

async function seeded() {
  await call("admin", "system:seed");
}

async function newRequest(overrides: Record<string, unknown> = {}) {
  return call("ahmed", "bloodRequests:create", {
    input: { bloodGroup: "O-", unitsRequired: 2, patientName: "Parveen Akhtar", patientAge: 34, hospitalId: "h1", hospitalAddress: "", city: "Lahore", requiredBy: "2030-01-01T10:00:00+05:00", urgency: "emergency", reason: "Surgery", contactNumber: "03001234567", ...overrides },
    requester: { id: "ahmed", name: "Ahmed Hassan" },
  });
}

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const D1 = inDays(7);
const D2 = inDays(8);

beforeEach(resetWorld);

test("starter data fills empty collections once and never overwrites", async () => {
  const first = await call("admin", "system:seed");
  assert.ok(first.written.hospitals > 0 && first.written.inventory === 8 && first.written.locations > 0);
  await call("admin", "inventory:adjust", { group: "O-", delta: 10, reason: "drive" });
  const second = await call("admin", "system:seed");
  assert.deepEqual(second.written, {});
  const oNeg = (await call(null, "inventory:list")).find((i: any) => i.bloodGroup === "O-");
  assert.equal(oNeg.available, 6 + 10, "seed must not reset stock");
});

test("creating a request stores code, hospital name and area location", async () => {
  await seeded();
  const r = await newRequest();
  assert.match(r.code, /^REQ-\d+$/);
  assert.equal(r.hospitalName, "Ravi Valley General Hospital");
  assert.equal(r.location.area, "Gulberg");
  assert.equal(r.status, "pending");
  assert.equal(r.timeline.length, 1);
  const mine = await call("ahmed", "bloodRequests:listMine");
  assert.equal(mine.length, 1);
  assert.equal((await call("ali", "bloodRequests:listMine")).length, 0);
});

test("the public emergency list never exposes the contact number", async () => {
  await seeded();
  await newRequest();
  const list = await call(null, "bloodRequests:nearbyPublic", { origin: { lat: 31.4697, lng: 74.2728 }, radiusKm: 30 });
  assert.equal(list.length, 1);
  assert.equal(list[0].contactNumber, "");
});

test("responding: another member can respond once; the requester is notified", async () => {
  await seeded();
  const r = await newRequest();
  await call("ali", "bloodRequests:respond", { requestId: r.id });
  await call("ali", "bloodRequests:respond", { requestId: r.id }); // repeated tap
  const after = await call("ahmed", "bloodRequests:getById", { id: r.id });
  assert.equal(after.status, "donor_found");
  assert.equal(after.donorsContacted, 1, "a second tap must not double count");
  assert.equal(after.timeline.length, 2);
  const inbox = await call("ahmed", "notifications:list");
  assert.ok(inbox.some((n: any) => n.kind === "donor_responded"));
  await rejects(call("ahmed", "bloodRequests:respond", { requestId: r.id }), /your own request/);
});

test("request lookup works by id or by code", async () => {
  await seeded();
  const r = await newRequest();
  assert.equal((await call("ali", "bloodRequests:getById", { id: r.code })).id, r.id);
  assert.equal(await call("ali", "bloodRequests:getById", { id: "nope" }), null);
});

test("cancelling: only the requester or an admin; closed requests can't be answered", async () => {
  await seeded();
  const r = await newRequest();
  await rejects(call("ali", "bloodRequests:cancel", { requestId: r.id }), "FORBIDDEN");
  await call("ahmed", "bloodRequests:cancel", { requestId: r.id });
  assert.equal((await call("ahmed", "bloodRequests:getById", { id: r.id })).status, "cancelled");
  await rejects(call("ali", "bloodRequests:respond", { requestId: r.id }), /no longer open/);
});

test("admin status updates fill units on fulfilment and notify the requester", async () => {
  await seeded();
  const r = await newRequest();
  await rejects(call("admin", "bloodRequests:updateStatus", { requestId: r.id, status: "teleported" }), /Unknown status/);
  await call("admin", "bloodRequests:updateStatus", { requestId: r.id, status: "fulfilled" });
  const after = await call("ahmed", "bloodRequests:getById", { id: r.id });
  assert.equal(after.status, "fulfilled");
  assert.equal(after.unitsFulfilled, 2);
  assert.ok((await call("ahmed", "notifications:list")).some((n: any) => n.kind === "request_fulfilled"));
  assert.ok(db.dump("activity").some((a) => /fulfilled/.test(a.message)));
});

test("admin can alert chosen donors; each gets a notification", async () => {
  await seeded();
  await call("ali", "donors:registerDonor", DONOR_INPUT("ali", "O-"));
  const r = await newRequest();
  const res = await call("admin", "bloodRequests:assignDonors", { requestId: r.id, donorIds: ["ali"] });
  assert.equal(res.assigned, 1);
  assert.ok((await call("ali", "notifications:list")).some((n: any) => n.kind === "emergency_nearby"));
});

test("donor registration, search filters and privacy", async () => {
  await call("ali", "donors:registerDonor", DONOR_INPUT("ali", "O-", "Lahore", "Model Town"));
  await call("hira", "donors:registerDonor", DONOR_INPUT("hira", "B+", "Karachi", "Clifton"));
  const origin = { lat: 31.4697, lng: 74.2728 };

  assert.equal((await call("ahmed", "donors:nearby", { origin, filters: {} })).length, 2);
  const exact = await call("ahmed", "donors:nearby", { origin, filters: { bloodGroup: "B+" } });
  assert.deepEqual(exact.map((d: any) => d.id), ["hira"]);
  const compatible = await call("ahmed", "donors:nearby", { origin, filters: { bloodGroup: "B+", compatibleOnly: true } });
  assert.deepEqual(compatible.map((d: any) => d.id).sort(), ["ali", "hira"], "O- can give to B+");
  const nearby = await call("ahmed", "donors:nearby", { origin, filters: { maxDistanceKm: 25 } });
  assert.deepEqual(nearby.map((d: any) => d.id), ["ali"]);
  assert.equal(nearby[0].phone, undefined, "phone never leaves the server in search");
  assert.ok(nearby[0].distanceKm > 0 && nearby[0].distanceKm < 10);

  // "Show me in donor search" off → hidden
  await call("ali", "users:update", { user: { id: "ali", preferences: { privacy: { donorVisible: false } } } });
  assert.equal((await call("ahmed", "donors:nearby", { origin, filters: {} })).some((d: any) => d.id === "ali"), false);

  // Suspended donors disappear from search
  await call("admin", "donors:setStatus", { id: "hira", status: "suspended" });
  assert.equal((await call("ahmed", "donors:nearby", { origin, filters: {} })).length, 0);

  // Registering makes the member a donor; admin stays admin
  assert.equal(db.dump("users").find((u) => u.id === "ali")!.role, "donor");
});

test("availability: members change their own; admins can change any donor", async () => {
  await rejects(call("ahmed", "donors:updateAvailability", { availability: "unavailable" }), /Register as a donor/);
  await call("ali", "donors:registerDonor", DONOR_INPUT("ali", "O-"));
  await call("ali", "donors:updateAvailability", { availability: "unavailable" });
  assert.equal(db.dump("donors")[0].availability, "unavailable");
  await rejects(call("ahmed", "donors:updateAvailability", { availability: "available", donorId: "ali" }), "FORBIDDEN");
  assert.equal(db.dump("donors")[0].availability, "unavailable", "a member can't change someone else");
  await call("admin", "donors:updateAvailability", { availability: "available", donorId: "ali" });
  assert.equal(db.dump("donors")[0].availability, "available");
});

test("booking a donation, blocking a second booking, and completing it", async () => {
  await seeded();
  await call("ali", "donors:registerDonor", DONOR_INPUT("ali", "O-"));
  await rejects(call("ali", "donations:bookAppointment", { input: { centerId: "missing", date: D1, time: "10:00" } }), /no longer listed/);
  const d = await call("ali", "donations:bookAppointment", { input: { centerId: "h4", date: D1, time: "10:00" } });
  assert.equal(d.status, "scheduled");
  assert.equal(d.date, `${D1}T10:00:00+05:00`);
  await rejects(call("ali", "donations:bookAppointment", { input: { centerId: "h4", date: D2, time: "10:00" } }), /already have an upcoming appointment/);

  const done = await call("admin", "donations:updateStatus", { id: d.id, status: "completed" });
  assert.match(done.certificateId, /^QTR-\d{4}-\d{5}$/);
  const donor = db.dump("donors")[0];
  assert.equal(donor.totalDonations, 1);
  assert.equal(donor.lastDonationDate, d.date);
  // completing twice must not double count
  await call("admin", "donations:updateStatus", { id: d.id, status: "completed" });
  assert.equal(db.dump("donors")[0].totalDonations, 1);
  const overview = await call("ali", "dashboard:userOverview");
  assert.equal(overview.stats.totalDonations, 1);
  assert.equal(overview.stats.livesHelped, 3);
});

test("maintenance mode pauses member requests and bookings but not admins", async () => {
  await seeded();
  await call("admin", "system:saveSettings", { flags: { maintenance: true } });
  await rejects(newRequest(), /maintenance/);
  await rejects(call("ali", "donations:bookAppointment", { input: { centerId: "h4", date: D1, time: "10:00" } }), /maintenance/);
  const settings = await call("admin", "system:getSettings");
  assert.equal(settings.flags.maintenance, true);
  await call("admin", "system:saveSettings", { flags: { maintenance: false } });
  assert.equal((await newRequest()).status, "pending");
});

test("broadcast reaches only the chosen audience and is recorded", async () => {
  await call("ali", "donors:registerDonor", DONOR_INPUT("ali", "O-"));
  await call("hira", "donors:registerDonor", DONOR_INPUT("hira", "B+", "Karachi", "Clifton"));
  assert.equal((await call("admin", "notifications:broadcast", { input: { title: "O- needed", body: "Please book", audience: "group:O-" } })).sent, 1);
  assert.equal((await call("admin", "notifications:broadcast", { input: { title: "Karachi drive", body: "Clifton", audience: "city:Karachi" } })).sent, 1);
  assert.equal((await call("admin", "notifications:broadcast", { input: { title: "Hello", body: "All", audience: "all" } })).sent, 5);
  assert.equal((await call("ali", "notifications:list")).length, 2);
  assert.equal((await call("hira", "notifications:list")).length, 2);
  const history = await call("admin", "notifications:broadcastHistory");
  assert.equal(history.length, 3);
});

test("notifications: read state is per member", async () => {
  await call("admin", "notifications:broadcast", { input: { title: "Hello all", body: "Thanks for donating", audience: "all" } });
  const [aliNote] = await call("ali", "notifications:list");
  const [ahmedNote] = await call("ahmed", "notifications:list");
  await call("ahmed", "notifications:markRead", { ids: [aliNote.id] }); // someone else's: ignored
  assert.equal((await call("ali", "notifications:unreadCount")).count, 1);
  await call("ahmed", "notifications:markRead", { ids: [ahmedNote.id] });
  assert.equal((await call("ahmed", "notifications:unreadCount")).count, 0);
  await call("ali", "notifications:markAllRead");
  assert.equal((await call("ali", "notifications:unreadCount")).count, 0);
});

test("inventory adjustments never go below zero and reject unknown groups", async () => {
  await seeded();
  const r = await call("admin", "inventory:adjust", { group: "AB-", delta: -100, reason: "expired" });
  assert.equal(r.available, 0);
  await rejects(call("admin", "inventory:adjust", { group: "C+", delta: 1 }), /Unknown blood group/);
});

test("locations: first save keeps the default cities; areas persist", async () => {
  const before = await call(null, "hospitals:locations");
  const lahore = before.find((l: any) => l.city === "Lahore");
  await call("admin", "hospitals:saveLocation", { location: { id: lahore.id, city: "Lahore", areas: [...lahore.areas, "Valencia Town"] } });
  await call("admin", "hospitals:saveLocation", { location: { city: "Gujranwala", areas: [] } });
  const after = await call(null, "hospitals:locations");
  assert.equal(after.length, before.length + 1);
  assert.ok(after.find((l: any) => l.city === "Lahore").areas.includes("Valencia Town"));
});

test("facilities: admins add and edit; list is public", async () => {
  const saved = await call("admin", "hospitals:save", { h: { name: "Wapda Town Family Hospital", type: "hospital", city: "Lahore", area: "Wapda Town", address: "Block J", phone: "042 1", email: "a@b.pk", openingHours: "24h", availableGroups: [], verified: false } });
  assert.ok(saved.id);
  const list = await call(null, "hospitals:list", { type: "hospital" });
  assert.equal(list.length, 1);
});

test("admin dashboards and reports return complete 12-month series on an empty database", async () => {
  const o = await call("admin", "dashboard:adminOverview");
  assert.equal(o.monthlyDonations.length, 12);
  assert.equal(o.donorGroupDistribution.length, 8);
  assert.equal(o.stats.totalUsers, 5);
  const r = await call("admin", "dashboard:reports");
  for (const k of ["monthlyDonations", "monthlyRequests", "fulfillmentRate"]) assert.equal(r[k].length, 12, k);
  assert.ok(Array.isArray(r.cityDemand));
});

test("sign out everywhere revokes the member's sessions", async () => {
  await call("ali", "users:revokeSessions");
  assert.deepEqual(authLog.revoked, ["ali"]);
  await rejects(call("ali", "notifications:list"), "AUTH_REQUIRED");
});

test("suspending an account disables sign-in; deleting removes the donor profile too", async () => {
  await call("ali", "donors:registerDonor", DONOR_INPUT("ali", "O-"));
  await call("admin", "users:setStatus", { id: "ali", status: "suspended" });
  assert.deepEqual(authLog.updated.at(-1), { uid: "ali", disabled: true });
  await rejects(call("ali", "notifications:list"), "FORBIDDEN");
  await call("admin", "users:remove", { id: "ali" });
  assert.equal(db.dump("donors").length, 0);
  assert.deepEqual(authLog.deleted, ["ali"]);
});

test("admin sidebar emergency badge counts only open emergencies", async () => {
  await seeded();
  const a = await newRequest();
  await newRequest({ urgency: "urgent" });
  const c = await newRequest();
  await call("ahmed", "bloodRequests:cancel", { requestId: c.id });
  assert.equal((await call("admin", "bloodRequests:openEmergencyCount")).count, 1);
  await call("admin", "bloodRequests:updateStatus", { requestId: a.id, status: "fulfilled" });
  assert.equal((await call("admin", "bloodRequests:openEmergencyCount")).count, 0);
});
