/* eslint-disable @typescript-eslint/no-explicit-any */
/* Admin-only actions. The executor checks the admin role before any of these run. */
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { STARTER_HOSPITALS, STOCK_TARGETS } from "@/data/starter";
import { BLOOD_GROUPS, CITIES } from "@/lib/constants";
import { checkBroadcast, checkFacility, checkInventoryDelta, checkReportFilters } from "../validate";
import { buildReport } from "../reports";
import {
  OPEN, STATUSES, STATUS_LABEL, HttpError, serial, all, rows, one, count, inRange, invalidate, slug, nowIso,
  normaliseUser, normaliseDonor, normaliseInventory, normaliseRequest, log, notify, monthly, monthsAgoIso, recentActivity,
  type Handler, type Payload,
} from "../core";

const ACCOUNT_STATUSES = ["active", "inactive", "suspended"];
const VERIFICATION = ["verified", "pending", "rejected"];
const DONATION_STATUSES = ["scheduled", "completed", "cancelled", "deferred"];
const DONOR_STATUSES = ["active", "suspended"];

export const adminHandlers: Record<string, Handler> = {
  "users:list": async () => {
    return serial((await all("users")).map(normaliseUser));
  },

  "users:setStatus": async ({ payload, me, store }) => {
    if (payload.id === me.uid) throw new HttpError("You can't change your own account status.");
    if (!ACCOUNT_STATUSES.includes(String(payload.status))) throw new HttpError("Unknown account status.");
    await store.collection("users").doc(payload.id).set({ status: payload.status }, { merge: true });
    if (adminAuth) await adminAuth.updateUser(payload.id, { disabled: payload.status === "suspended" || payload.status === "inactive" }).catch(() => undefined);
    await log("user", me.name, `set account ${payload.id} to ${payload.status}`);
    return { id: payload.id, status: payload.status };
  },

  "users:verify": async ({ payload, me, store }) => {
    await store.collection("users").doc(payload.id).set({ verified: true }, { merge: true });
    await notify(payload.id, "account_verified", "Your account is verified", "You can now respond to requests and receive emergency alerts.", "/dashboard");
    await log("verification", me.name, `verified user ${payload.id}`);
    return { id: payload.id, verified: true };
  },

  "users:remove": async ({ payload, me, store }) => {
    if (payload.id === me.uid) throw new HttpError("You can't delete your own account.");
    await store.collection("users").doc(payload.id).delete();
    await store.collection("donors").doc(payload.id).delete().catch(() => undefined);
    if (adminAuth) await adminAuth.deleteUser(payload.id).catch(() => undefined);
    invalidate("public:");
    await log("user", me.name, `deleted account ${payload.id}`);
    return { id: payload.id };
  },

  "donors:list": async () => {
    return serial((await all("donors")).map(normaliseDonor));
  },

  "donors:setVerification": async ({ payload, me, store }) => {
    if (!VERIFICATION.includes(String(payload.verification))) throw new HttpError("Unknown verification status.");
    await store.collection("donors").doc(payload.id).set({ verification: payload.verification }, { merge: true });
    const d = await one("donors", payload.id);
    if (payload.verification === "verified") await notify(d?.userId ?? payload.id, "account_verified", "You're a verified donor", "Thank you. You'll now receive alerts for requests near you.", "/dashboard");
    await log("verification", me.name, `${payload.verification === "verified" ? "verified" : payload.verification === "rejected" ? "rejected" : "reset"} donor ${d?.name ?? payload.id}`);
    return { id: payload.id, verification: payload.verification };
  },

  "donors:setStatus": async ({ payload, me, store }) => {
    if (!DONOR_STATUSES.includes(String(payload.status))) throw new HttpError("Unknown donor status.");
    await store.collection("donors").doc(payload.id).set({ status: payload.status }, { merge: true });
    invalidate("public:locations", "public:overview");
    await log("user", me.name, `${payload.status === "suspended" ? "suspended" : "reactivated"} donor ${payload.id}`);
    return { id: payload.id, status: payload.status };
  },

  "bloodRequests:updateStatus": async ({ payload, me, store }) => {
    const r = await one("bloodRequests", payload.requestId);
    if (!r) throw new HttpError("NOT_FOUND");
    const status = String(payload.status);
    if (!STATUSES.includes(status)) throw new HttpError("Unknown status.");
    const at = nowIso();
    const patch: Payload = { status, timeline: FieldValue.arrayUnion({ status, at, note: `Updated by ${me.name}` }) };
    // Timestamps the reports use for response and fulfilment times.
    if (status === "fulfilled") {
      patch.unitsFulfilled = Number(r.unitsRequired ?? 1);
      if (!r.fulfilledAt) patch.fulfilledAt = at;
    }
    if (["donor_found", "partially_fulfilled", "fulfilled"].includes(status) && !r.firstResponseAt) patch.firstResponseAt = at;
    if (["fulfilled", "rejected", "cancelled"].includes(status)) patch.closedAt = at;
    await store.collection("bloodRequests").doc(payload.requestId).set(patch, { merge: true });
    invalidate("public:urgentRequests", "public:locations");
    await notify(r.requesterId, status === "fulfilled" ? "request_fulfilled" : "request_accepted", `Request ${r.code ?? ""}: ${STATUS_LABEL[status]}`, `Your request for ${r.patientName ?? "the patient"} is now ${STATUS_LABEL[status].toLowerCase()}.`, `/dashboard/requests/${r.id}`);
    await log("request", me.name, `marked request ${r.code ?? r.id} as ${STATUS_LABEL[status].toLowerCase()}`);
    return { requestId: payload.requestId, status };
  },

  "bloodRequests:assignDonors": async ({ payload, me, store }) => {
    const r = await one("bloodRequests", payload.requestId);
    if (!r) throw new HttpError("NOT_FOUND");
    const ids: string[] = Array.isArray(payload.donorIds) ? payload.donorIds.map(String).slice(0, 200) : [];
    if (!ids.length) throw new HttpError("Choose at least one donor to alert.");
    await store.collection("bloodRequests").doc(payload.requestId).set({
      assignedDonorIds: ids,
      donorsContacted: ids.length,
      status: "matching",
      timeline: FieldValue.arrayUnion({ status: "matching", at: nowIso(), note: `${ids.length} donors alerted by ${me.name}` }),
    }, { merge: true });
    const donors = await Promise.all(ids.map((id) => one("donors", id)));
    await Promise.all(
      donors.map((d, i) =>
        notify(d?.userId ?? ids[i], "emergency_nearby", `${r.bloodGroup} blood needed near you`, `${r.unitsRequired ?? 1} units needed at ${r.hospitalName ?? "a nearby hospital"}. Can you help?`, `/dashboard/blood-requests?respond=${r.id}`),
      ),
    );
    await log("request", me.name, `alerted ${ids.length} donors for ${r.code ?? r.id}`);
    return { requestId: payload.requestId, assigned: ids.length };
  },

  "donations:listAll": async () => {
    return serial((await all("donations")).sort((a, b) => +new Date(b.date) - +new Date(a.date)));
  },

  "donations:updateStatus": async ({ payload, me, store }) => {
    const d = await one("donations", payload.id);
    if (!d) throw new HttpError("NOT_FOUND");
    if (!DONATION_STATUSES.includes(String(payload.status))) throw new HttpError("Unknown donation status.");
    const patch: Payload = { status: payload.status, updatedAt: nowIso() };
    if (payload.status === "completed" && !d.certificateId) patch.certificateId = `BB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    await store.collection("donations").doc(payload.id).set(patch, { merge: true });
    if (payload.status === "completed" && d.status !== "completed") {
      if (await one("donors", d.donorId)) await store.collection("donors").doc(d.donorId).set({ lastDonationDate: d.date, totalDonations: FieldValue.increment(1) }, { merge: true });
      invalidate("public:overview");
      await notify(d.donorId, "request_fulfilled", "Thank you for donating", "Your donation is recorded. Your certificate is ready in Donation history.", "/dashboard/donations");
    }
    await log("donation", me.name, `marked ${d.donorName ?? "a"} donation as ${payload.status}`, d.donorId);
    return { id: payload.id, status: payload.status, certificateId: patch.certificateId ?? d.certificateId };
  },

  "hospitals:save": async ({ payload, me, store }) => {
    const h = { ...(payload.h ?? {}) };
    checkFacility(h);
    if (!h.id) h.id = store.collection("hospitals").doc().id;
    const existed = Boolean(await one("hospitals", h.id));
    delete h.distanceKm;
    await store.collection("hospitals").doc(h.id).set(h, { merge: true });
    invalidate("public:hospitals", "public:locations", "public:overview");
    await log("system", me.name, `${existed ? "updated" : "added"} facility ${h.name}`);
    return serial(h);
  },

  "hospitals:remove": async ({ payload, me, store }) => {
    const h = await one("hospitals", payload.id);
    if (!h) throw new HttpError("NOT_FOUND");
    const openRequests = await count(store.collection("bloodRequests").where("hospitalId", "==", h.id).where("status", "in", OPEN));
    if (openRequests > 0) throw new HttpError(`This facility has ${openRequests} open request${openRequests === 1 ? "" : "s"}. Close them before removing it.`);
    await store.collection("hospitals").doc(h.id).delete();
    invalidate("public:hospitals", "public:locations", "public:overview");
    await log("system", me.name, `removed facility ${h.name ?? h.id}`);
    return { id: h.id };
  },

  "hospitals:saveLocation": async ({ payload, me, store }) => {
    const l = payload.location ?? {};
    if (!String(l.city ?? "").trim()) throw new HttpError("City name is required.");
    const id = l.id ?? slug(String(l.city));
    // First write materialises the default city list so later edits don't hide the others.
    const existing = await store.collection("locations").limit(1).get();
    if (existing.empty) {
      const batch = store.batch();
      Object.entries(CITIES).forEach(([city, areas]) => batch.set(store.collection("locations").doc(slug(city)), { city, areas }));
      await batch.commit();
    }
    const areas = Array.isArray(l.areas) ? [...new Set(l.areas.map((a: unknown) => String(a).trim()).filter(Boolean))] : [];
    await store.collection("locations").doc(id).set({ city: String(l.city).trim(), areas }, { merge: true });
    invalidate("public:locations");
    await log("system", me.name, `updated areas for ${l.city}`);
    return { id, city: l.city, areas };
  },

  "inventory:adjust": async ({ payload, me, store }) => {
    const group = String(payload.group);
    if (!(BLOOD_GROUPS as readonly string[]).includes(group)) throw new HttpError("Unknown blood group.");
    checkInventoryDelta(payload.delta);
    const delta = Number(payload.delta);
    const reason = String(payload.reason ?? "").trim().slice(0, 200);
    const ref = store.collection("inventory").doc(group);
    const at = nowIso();
    // A transaction keeps stock correct when two coordinators adjust the same group at once.
    const result = await store.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = normaliseInventory({ ...(snap.data() ?? {}), id: group, bloodGroup: group });
      const available = Math.max(0, current.available + delta);
      const applied = available - current.available;
      const expired = /^expired/i.test(reason) && applied < 0 ? current.expired - applied : current.expired;
      tx.set(ref, { ...current, available, expired, updatedAt: at }, { merge: true });
      // Every change is kept so reports can show units in and out over time.
      tx.set(store.collection("inventoryMovements").doc(), { group, delta: applied, requested: delta, reason: reason || null, balance: available, at, by: me.name, byId: me.uid });
      return { available, applied };
    });
    invalidate("public:inventory");
    await log("inventory", me.name, `adjusted ${group} stock by ${result.applied > 0 ? "+" : ""}${result.applied} (${reason || "no reason given"})`);
    return { group, delta: result.applied, reason, available: result.available };
  },

  "inventory:movements": async ({ payload, store }) => {
    const limit = Math.min(200, Math.max(1, Number(payload.limit ?? 50)));
    return serial(await rows(store.collection("inventoryMovements").orderBy("at", "desc").limit(limit)));
  },

  "notifications:broadcast": async ({ payload, me, store }) => {
    const input = payload.input ?? {};
    checkBroadcast(input);
    const audience = String(input.audience ?? "all");
    let userIds: string[];
    if (audience === "all") {
      userIds = (await rows(store.collection("users").where("status", "==", "active").select())).map((u) => u.id);
    } else {
      let q = store.collection("donors").where("status", "==", "active");
      if (audience.startsWith("group:")) q = q.where("bloodGroup", "==", audience.slice(6));
      else if (audience.startsWith("city:")) q = q.where("location.city", "==", audience.slice(5));
      else if (audience !== "donors") throw new HttpError("Choose who should receive this message.");
      userIds = [...new Set((await rows(q)).map((d) => String(d.userId ?? d.id)))];
    }
    for (let i = 0; i < userIds.length; i += 400) {
      const batch = store.batch();
      userIds.slice(i, i + 400).forEach((uid) => batch.set(store.collection("notifications").doc(), { userId: uid, title: input.title, body: input.body, kind: "announcement", createdAt: nowIso(), read: false }));
      await batch.commit();
    }
    await store.collection("broadcasts").add({ title: input.title, body: input.body, audience, sent: userIds.length, at: nowIso(), by: me.name });
    await log("system", me.name, `sent "${input.title}" to ${userIds.length} people`);
    return { sent: userIds.length };
  },

  "notifications:broadcastHistory": async ({ store }) => {
    return serial(await rows(store.collection("broadcasts").orderBy("at", "desc").limit(50)));
  },

  "contactMessages:list": async ({ store }) => {
    return serial(await rows(store.collection("contactMessages").orderBy("createdAt", "desc").limit(200)));
  },

  "contactMessages:setStatus": async ({ payload, me, store }) => {
    if (!["new", "read", "resolved"].includes(String(payload.status))) throw new HttpError("Unknown message status.");
    const m = await one("contactMessages", payload.id);
    if (!m) throw new HttpError("NOT_FOUND");
    await store.collection("contactMessages").doc(m.id).set({ status: payload.status, handledBy: me.name, handledAt: nowIso() }, { merge: true });
    return { id: m.id, status: payload.status };
  },

  "contactMessages:newCount": async ({ store }) => {
    return { count: await count(store.collection("contactMessages").where("status", "==", "new")) };
  },

  "dashboard:adminOverview": async ({ store }) => {
    const since = monthsAgoIso(12);
    // Totals are counted on the server; only the last 12 months of requests and donations are read for charts.
    const [totalUsers, activeDonors, bloodRequests, completedDonations, openEmergencies, inventory, reqs, dons, activity, groupCounts] = await Promise.all([
      count(store.collection("users")),
      count(store.collection("donors").where("status", "==", "active")),
      count(store.collection("bloodRequests")),
      count(store.collection("donations").where("status", "==", "completed")),
      rows(store.collection("bloodRequests").where("urgency", "==", "emergency").where("status", "in", OPEN)),
      all("inventory"),
      inRange("bloodRequests", "createdAt", since, nowIso()),
      inRange("donations", "date", since, nowIso()),
      recentActivity(20),
      Promise.all(BLOOD_GROUPS.map((g) => count(store.collection("donors").where("status", "==", "active").where("bloodGroup", "==", g)))),
    ]);
    return serial({
      stats: {
        totalUsers,
        activeDonors,
        bloodRequests,
        completedDonations,
        emergencyRequests: openEmergencies.length,
        availableUnits: inventory.reduce((a, d) => a + (Number(d.available) || 0), 0),
      },
      // Soonest deadline first, so coordinators see what is most at risk.
      emergencies: openEmergencies.map(normaliseRequest).sort((a, b) => +new Date(a.requiredBy) - +new Date(b.requiredBy)).slice(0, 4),
      inventory: inventory.map(normaliseInventory),
      activity,
      monthlyDonations: monthly(dons, "date", (d) => d.status === "completed"),
      monthlyRequests: monthly(reqs, "createdAt"),
      donorGroupDistribution: BLOOD_GROUPS.map((group, i) => ({ group, value: groupCounts[i] })),
      requestStatusBreakdown: STATUSES.map((s) => ({ label: STATUS_LABEL[s], value: reqs.filter((r) => (r.status ?? "pending") === s).length })),
    });
  },

  "dashboard:reports": async ({ payload, store }) => {
    const filters = payload.filters ?? {};
    checkReportFilters(filters);
    return buildReport(store, {
      from: new Date(filters.from).toISOString(),
      to: new Date(filters.to).toISOString(),
      ...(filters.city ? { city: String(filters.city) } : {}),
      ...(filters.bloodGroup ? { bloodGroup: filters.bloodGroup } : {}),
      ...(filters.urgency ? { urgency: filters.urgency } : {}),
      ...(filters.hospitalId ? { hospitalId: String(filters.hospitalId) } : {}),
    });
  },

  "dashboard:activityLog": async () => {
    return serial(await recentActivity(300));
  },

  "system:status": async ({ store }) => {
    const names = ["hospitals", "inventory", "locations", "users", "donors", "bloodRequests"];
    const counts = await Promise.all(names.map((c) => count(store.collection(c))));
    return Object.fromEntries(names.map((n, i) => [n, counts[i]]));
  },

  "system:getSettings": async ({ store }) => {
    const s = await store.collection("settings").doc("system").get();
    return serial(s.exists ? s.data() : null);
  },

  "system:saveSettings": async ({ payload, me, store }) => {
    const patch: Payload = {};
    for (const k of ["general", "matching", "flags"]) if (payload[k]) patch[k] = payload[k];
    await store.collection("settings").doc("system").set({ ...patch, updatedAt: nowIso(), updatedBy: me.name }, { merge: true });
    invalidate("settings:");
    await log("system", me.name, `updated system settings (${Object.keys(patch).join(", ")})`);
    return { ok: true };
  },

  "system:seed": async ({ me, store }) => {
    const written: Record<string, number> = {};
    const writeIfEmpty = async (collection: string, docs: { id: string; data: Payload }[]) => {
      const has = await store.collection(collection).limit(1).get();
      if (!has.empty) return;
      const batch = store.batch();
      docs.forEach((r) => batch.set(store.collection(collection).doc(r.id), r.data));
      await batch.commit();
      written[collection] = docs.length;
    };
    await writeIfEmpty("hospitals", STARTER_HOSPITALS.map((h) => ({ id: h.id, data: { ...h } })));
    await writeIfEmpty("inventory", STOCK_TARGETS.map((t) => ({ id: t.bloodGroup, data: { ...t, available: 0, reserved: 0, expired: 0, updatedAt: nowIso() } })));
    await writeIfEmpty("locations", Object.entries(CITIES).map(([city, areas]) => ({ id: slug(city), data: { city, areas } })));
    invalidate("public:");
    const summary = Object.entries(written).map(([k, v]) => `${v} ${k}`).join(", ");
    await log("system", me.name, summary ? `loaded starter data (${summary})` : "checked starter data (nothing to add)");
    return { written };
  },

  /** Cheap badge count for the admin sidebar. */
  "bloodRequests:openEmergencyCount": async ({ store }) => {
    return { count: await count(store.collection("bloodRequests").where("urgency", "==", "emergency").where("status", "in", OPEN)) };
  },
};
