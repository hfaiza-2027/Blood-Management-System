/* eslint-disable @typescript-eslint/no-explicit-any */
/* Admin-only actions. The executor checks the admin role before any of these run. */
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { mockHospitals } from "@/data/mockHospitals";
import { mockInventory } from "@/data/mockInventory";
import { BLOOD_GROUPS, CITIES } from "@/lib/constants";
import { distanceKm } from "@/lib/geo";
import { checkBroadcast, checkFacility, checkInventoryDelta } from "../validate";
import { OPEN, STATUSES, STATUS_LABEL, HttpError, serial, all, one, slug, nowIso, normaliseUser, normaliseDonor, normaliseInventory, log, notify, lastMonths, monthly, recentActivity, type Handler, type Payload } from "../core";

export const adminHandlers: Record<string, Handler> = {
  "users:list": async ({ payload, me, store }) => {
    return serial((await all("users")).map(normaliseUser));
  },

  "users:setStatus": async ({ payload, me, store }) => {
    if (payload.id === me.uid) throw new HttpError("You can't change your own account status.");
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
    await log("user", me.name, `deleted account ${payload.id}`);
    return { id: payload.id };
  },

  "donors:list": async ({ payload, me, store }) => {
    return serial((await all("donors")).map(normaliseDonor));
  },

  "donors:setVerification": async ({ payload, me, store }) => {
    await store.collection("donors").doc(payload.id).set({ verification: payload.verification }, { merge: true });
    const d = await one("donors", payload.id);
    if (payload.verification === "verified") await notify(d?.userId ?? payload.id, "account_verified", "You're a verified donor", "Thank you. You'll now receive alerts for requests near you.", "/dashboard");
    await log("verification", me.name, `${payload.verification === "verified" ? "verified" : payload.verification === "rejected" ? "rejected" : "reset"} donor ${d?.name ?? payload.id}`);
    return { id: payload.id, verification: payload.verification };
  },

  "donors:setStatus": async ({ payload, me, store }) => {
    await store.collection("donors").doc(payload.id).set({ status: payload.status }, { merge: true });
    await log("user", me.name, `${payload.status === "suspended" ? "suspended" : "reactivated"} donor ${payload.id}`);
    return { id: payload.id, status: payload.status };
  },

  "bloodRequests:updateStatus": async ({ payload, me, store }) => {
    const r = await one("bloodRequests", payload.requestId);
    if (!r) throw new HttpError("NOT_FOUND");
    const status = String(payload.status);
    if (!STATUSES.includes(status)) throw new HttpError("Unknown status.");
    const patch: Payload = { status, timeline: FieldValue.arrayUnion({ status, at: nowIso(), note: `Updated by ${me.name}` }) };
    if (status === "fulfilled") patch.unitsFulfilled = Number(r.unitsRequired ?? 1);
    await store.collection("bloodRequests").doc(payload.requestId).set(patch, { merge: true });
    await notify(r.requesterId, status === "fulfilled" ? "request_fulfilled" : "request_accepted", `Request ${r.code ?? ""}: ${STATUS_LABEL[status]}`, `Your request for ${r.patientName ?? "the patient"} is now ${STATUS_LABEL[status].toLowerCase()}.`, `/dashboard/requests/${r.id}`);
    await log("request", me.name, `marked request ${r.code ?? r.id} as ${STATUS_LABEL[status].toLowerCase()}`);
    return { requestId: payload.requestId, status };
  },

  "bloodRequests:assignDonors": async ({ payload, me, store }) => {
    const r = await one("bloodRequests", payload.requestId);
    if (!r) throw new HttpError("NOT_FOUND");
    const ids: string[] = Array.isArray(payload.donorIds) ? payload.donorIds : [];
    await store.collection("bloodRequests").doc(payload.requestId).set({
      assignedDonorIds: ids,
      donorsContacted: ids.length,
      status: "matching",
      timeline: FieldValue.arrayUnion({ status: "matching", at: nowIso(), note: `${ids.length} donors alerted by ${me.name}` }),
    }, { merge: true });
    for (const id of ids) {
      const d = await one("donors", id);
      await notify(d?.userId ?? id, "emergency_nearby", `${r.bloodGroup} blood needed near you`, `${r.unitsRequired ?? 1} units needed at ${r.hospitalName ?? "a nearby hospital"}. Can you help?`, `/dashboard/blood-requests?respond=${r.id}`);
    }
    await log("request", me.name, `alerted ${ids.length} donors for ${r.code ?? r.id}`);
    return { requestId: payload.requestId, assigned: ids.length };
  },

  "donations:listAll": async ({ payload, me, store }) => {
    return serial((await all("donations")).sort((a, b) => +new Date(b.date) - +new Date(a.date)));
  },

  "donations:updateStatus": async ({ payload, me, store }) => {
    const d = await one("donations", payload.id);
    if (!d) throw new HttpError("NOT_FOUND");
    const patch: Payload = { status: payload.status };
    if (payload.status === "completed" && !d.certificateId) patch.certificateId = `QTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    await store.collection("donations").doc(payload.id).set(patch, { merge: true });
    if (payload.status === "completed" && d.status !== "completed") {
      if (await one("donors", d.donorId)) await store.collection("donors").doc(d.donorId).set({ lastDonationDate: d.date, totalDonations: FieldValue.increment(1) }, { merge: true });
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
    await log("system", me.name, `${existed ? "updated" : "added"} facility ${h.name}`);
    return serial(h);
  },

  "hospitals:saveLocation": async ({ payload, me, store }) => {
    const l = payload.location ?? {};
    if (!l.city) throw new HttpError("City name is required.");
    const id = l.id ?? slug(String(l.city));
    // First write materialises the default city list so later edits don't hide the others.
    const existing = await store.collection("locations").limit(1).get();
    if (existing.empty) {
      const batch = store.batch();
      Object.entries(CITIES).forEach(([city, areas]) => batch.set(store.collection("locations").doc(slug(city)), { city, areas }));
      await batch.commit();
    }
    await store.collection("locations").doc(id).set({ city: l.city, areas: Array.isArray(l.areas) ? l.areas : [] }, { merge: true });
    await log("system", me.name, `updated areas for ${l.city}`);
    return { id, city: l.city, areas: l.areas ?? [] };
  },

  "inventory:adjust": async ({ payload, me, store }) => {
    const group = String(payload.group);
    if (!(BLOOD_GROUPS as readonly string[]).includes(group)) throw new HttpError("Unknown blood group.");
    checkInventoryDelta(payload.delta);
    const ref = store.collection("inventory").doc(group);
    const current = normaliseInventory({ ...((await ref.get()).data() ?? {}), id: group, bloodGroup: group });
    const next = { ...current, available: Math.max(0, current.available + Number(payload.delta ?? 0)), updatedAt: nowIso() };
    await ref.set(next, { merge: true });
    await log("inventory", me.name, `adjusted ${group} stock by ${Number(payload.delta) > 0 ? "+" : ""}${payload.delta} (${payload.reason || "no reason given"})`);
    return { group, delta: payload.delta, reason: payload.reason, available: next.available };
  },

  "notifications:broadcast": async ({ payload, me, store }) => {
    const input = payload.input ?? {};
    checkBroadcast(input);
    const audience = String(input.audience ?? "all");
    let userIds: string[];
    if (audience === "all") userIds = (await all("users")).map((u) => u.id);
    else {
      const donors = (await all("donors")).map(normaliseDonor).filter((d) => d.status === "active");
      const picked = audience.startsWith("group:") ? donors.filter((d) => d.bloodGroup === audience.slice(6))
        : audience.startsWith("city:") ? donors.filter((d) => d.location.city === audience.slice(5))
        : donors;
      userIds = [...new Set(picked.map((d) => String(d.userId ?? d.id)))];
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

  "notifications:broadcastHistory": async ({ payload, me, store }) => {
    return serial((await all("broadcasts")).sort((a, b) => +new Date(b.at) - +new Date(a.at)));
  },

  "dashboard:adminOverview": async ({ payload, me, store }) => {
    const [users, donors, reqs, dons, inv, activity] = await Promise.all([all("users"), all("donors"), all("bloodRequests"), all("donations"), all("inventory"), recentActivity(20)]);
    return serial({
      stats: {
        totalUsers: users.length,
        activeDonors: donors.filter((d) => (d.status ?? "active") === "active").length,
        bloodRequests: reqs.length,
        completedDonations: dons.filter((d) => d.status === "completed").length,
        emergencyRequests: reqs.filter((r) => r.urgency === "emergency" && OPEN.includes(r.status ?? "pending")).length,
        availableUnits: inv.reduce((a, d) => a + (Number(d.available) || 0), 0),
      },
      activity,
      monthlyDonations: monthly(dons, "date", (d) => d.status === "completed"),
      monthlyRequests: monthly(reqs, "createdAt"),
      donorGroupDistribution: BLOOD_GROUPS.map((group) => ({ group, value: donors.filter((d) => d.bloodGroup === group).length })),
      requestStatusBreakdown: STATUSES.map((s) => ({ label: STATUS_LABEL[s], value: reqs.filter((r) => (r.status ?? "pending") === s).length })),
    });
  },

  "dashboard:reports": async ({ payload, me, store }) => {
    const [donors, reqs, dons] = await Promise.all([all("donors"), all("bloodRequests"), all("donations")]);
    const fulfillmentRate = lastMonths().map((m) => {
      const inMonth = reqs.filter((r) => String(r.createdAt ?? "").startsWith(m.key));
      return { label: m.label, value: inMonth.length ? Math.round((inMonth.filter((r) => r.status === "fulfilled").length / inMonth.length) * 100) : 0 };
    });
    const cities = new Map<string, number>();
    reqs.forEach((r) => {
      const c = String(r.location?.city ?? r.city ?? "Other");
      cities.set(c, (cities.get(c) ?? 0) + 1);
    });
    return serial({
      monthlyDonations: monthly(dons, "date", (d) => d.status === "completed"),
      monthlyRequests: monthly(reqs, "createdAt"),
      fulfillmentRate,
      groupDemand: BLOOD_GROUPS.map((group) => ({ group, value: reqs.filter((r) => r.bloodGroup === group).length })),
      cityDemand: [...cities.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      donorGroupDistribution: BLOOD_GROUPS.map((group) => ({ group, value: donors.filter((d) => d.bloodGroup === group).length })),
      requestStatusBreakdown: STATUSES.map((s) => ({ label: STATUS_LABEL[s], value: reqs.filter((r) => (r.status ?? "pending") === s).length })),
    });
  },

  "dashboard:activityLog": async ({ payload, me, store }) => {
    return serial(await recentActivity(300));
  },

  "system:status": async ({ payload, me, store }) => {
    const names = ["hospitals", "inventory", "locations", "users", "donors", "bloodRequests"];
    const counts = await Promise.all(names.map(async (c) => (await store.collection(c).count().get()).data().count));
    return Object.fromEntries(names.map((n, i) => [n, counts[i]]));
  },

  "system:getSettings": async ({ payload, me, store }) => {
    const s = await store.collection("settings").doc("system").get();
    return serial(s.exists ? s.data() : null);
  },

  "system:saveSettings": async ({ payload, me, store }) => {
    const patch: Payload = {};
    for (const k of ["general", "matching", "flags"]) if (payload[k]) patch[k] = payload[k];
    await store.collection("settings").doc("system").set({ ...patch, updatedAt: nowIso(), updatedBy: me.name }, { merge: true });
    await log("system", me.name, `updated system settings (${Object.keys(patch).join(", ")})`);
    return { ok: true };
  },

  "system:seed": async ({ payload, me, store }) => {
    const written: Record<string, number> = {};
    const writeIfEmpty = async (collection: string, rows: { id: string; data: Payload }[]) => {
      const has = await store.collection(collection).limit(1).get();
      if (!has.empty) return;
      const batch = store.batch();
      rows.forEach((r) => batch.set(store.collection(collection).doc(r.id), r.data));
      await batch.commit();
      written[collection] = rows.length;
    };
    await writeIfEmpty("hospitals", mockHospitals.map((h) => ({ id: h.id, data: { ...h } })));
    await writeIfEmpty("inventory", mockInventory.map((i) => ({ id: i.bloodGroup, data: { ...i, updatedAt: nowIso() } })));
    await writeIfEmpty("locations", Object.entries(CITIES).map(([city, areas]) => ({ id: slug(city), data: { city, areas } })));
    const summary = Object.entries(written).map(([k, v]) => `${v} ${k}`).join(", ");
    await log("system", me.name, summary ? `loaded starter data (${summary})` : "checked starter data (nothing to add)");
    return { written };
  },

  /** Cheap badge count for the admin sidebar: reads only emergency requests. */
  "bloodRequests:openEmergencyCount": async ({ store }) => {
    const snap = await store.collection("bloodRequests").where("urgency", "==", "emergency").get();
    return { count: snap.docs.filter((d) => OPEN.includes(d.data().status ?? "pending")).length };
  },
};
