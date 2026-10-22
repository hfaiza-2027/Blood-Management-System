/* eslint-disable @typescript-eslint/no-explicit-any */
/* Actions for signed-in members. Some also accept admins (e.g. cancelling any request). */
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { canReceiveFrom } from "@/lib/constants";
import { coarsen, distanceKm } from "@/lib/geo";
import { formatDate, formatTime12, maskPhone } from "@/lib/utils";
import { checkAppointment, checkDonorInput, checkProfilePatch, checkRequestInput } from "../validate";
import {
  OPEN, HttpError, serial, all, rows, one, count, cached, invalidate, pointFor, withLocation, nowIso,
  normaliseUser, normaliseRequest, normaliseDonor, log, notify, recentActivity, maintenanceOn,
  type Actor, type Handler, type Row, type Payload,
} from "../core";

/** Members see requests from this window on the board; admins see everything. */
const MEMBER_REQUEST_WINDOW_DAYS = 120;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The requester's phone is shown in full only to the requester, admins and donors who offered to help. */
function forViewer(r: Row, me: Actor): Row {
  const allowed = me.role === "admin" || r.requesterId === me.uid || (Array.isArray(r.responders) && r.responders.includes(me.uid));
  return allowed ? r : { ...r, contactNumber: r.contactNumber ? maskPhone(String(r.contactNumber)) : "" };
}

export const clientHandlers: Record<string, Handler> = {
  "users:update": async ({ payload, me, store }) => {
    const u = payload.user ?? {};
    const id = String(u.id ?? "");
    if (!id) throw new HttpError("NOT_FOUND");
    const isAdmin = me.role === "admin";
    if (!isAdmin && id !== me.uid) throw new HttpError("FORBIDDEN");
    const allowed = ["fullName", "phone", "bloodGroup", "gender", "dateOfBirth", "address", "location", "emergencyContact", "avatarUrl", "preferences"];
    const patch: Payload = {};
    for (const k of isAdmin ? Object.keys(u) : allowed) if (k !== "id" && u[k] !== undefined) patch[k] = u[k];
    if (isAdmin && id === me.uid) delete patch.role; // never demote yourself by accident
    delete patch.email; // the login email is managed by Firebase Authentication
    checkProfilePatch(patch);
    if (patch.location) patch.location = { city: patch.location.city, area: patch.location.area, point: pointFor(patch.location.city, patch.location.area) };
    if (patch.emergencyContact === null) patch.emergencyContact = FieldValue.delete();
    await store.collection("users").doc(id).set(patch, { merge: true });
    // Keep the linked donor profile in step with the user profile.
    const donor = await one("donors", id);
    if (donor) {
      const dp: Payload = {};
      if (patch.fullName) dp.name = patch.fullName;
      if (patch.bloodGroup) dp.bloodGroup = patch.bloodGroup;
      if (patch.location) dp.location = patch.location;
      if (patch.preferences?.privacy && typeof patch.preferences.privacy.donorVisible === "boolean") dp.hidden = !patch.preferences.privacy.donorVisible;
      if (Object.keys(dp).length) await store.collection("donors").doc(id).set(dp, { merge: true });
    }
    await log("profile", me.name, id === me.uid ? "updated their profile" : `updated the account of ${patch.fullName ?? id}`, id);
    const saved = await one("users", id);
    return serial(normaliseUser(saved ?? { id }));
  },

  "users:revokeSessions": async ({ me }) => {
    if (adminAuth) await adminAuth.revokeRefreshTokens(me.uid);
    await log("profile", me.name, "signed out of all devices", me.uid);
    return { ok: true };
  },

  "donors:nearby": async ({ payload, store }) => {
    const f = payload.filters ?? {};
    const origin = payload.origin ?? pointFor("Lahore", "Johar Town");
    const groups = f.bloodGroup && f.bloodGroup !== "any" ? (f.compatibleOnly ? canReceiveFrom(f.bloodGroup) : [f.bloodGroup]) : null;
    const q = String(f.query ?? "").trim().toLowerCase();
    // Narrow on the server with equality filters (no composite index needed); the rest is filtered here.
    let query = store.collection("donors").where("status", "==", "active");
    if (f.city) query = query.where("location.city", "==", f.city);
    const list = (await rows(query))
      .map(normaliseDonor)
      .filter((d) => d.verification !== "rejected" && !d.hidden)
      .filter((d) => !groups || groups.includes(d.bloodGroup))
      .filter((d) => !f.area || d.location.area === f.area)
      .filter((d) => !f.availability || f.availability === "any" || d.availability === f.availability)
      .filter((d) => !f.gender || f.gender === "any" || d.gender === f.gender)
      .filter((d) => !f.verifiedOnly || d.verification === "verified")
      .filter((d) => !f.lastDonationWithinDays || (d.lastDonationDate && (Date.now() - +new Date(d.lastDonationDate)) / 86_400_000 <= f.lastDonationWithinDays))
      .filter((d) => !q || `${d.name} ${d.location.area} ${d.location.city} ${d.bloodGroup}`.toLowerCase().includes(q))
      .map((d) => {
        // Private fields never leave the server in a public search.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { phone, email, address, ...pub } = d as Row;
        return { ...pub, location: { ...d.location, point: coarsen(d.location.point) }, distanceKm: round1(distanceKm(origin, d.location.point)) };
      })
      .filter((d) => !f.maxDistanceKm || d.distanceKm <= f.maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return serial(list);
  },

  "donors:getById": async ({ payload, me }) => {
    const d = await one("donors", payload.id);
    if (!d) return null;
    const donor = normaliseDonor(d);
    if (me.role === "admin" || donor.userId === me.uid) return serial(donor);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { phone, email, address, ...pub } = donor as Row;
    return serial({ ...pub, location: { ...donor.location, point: coarsen(donor.location.point) } });
  },

  "donors:registerDonor": async ({ payload, me, store }) => {
    const input = payload.input ?? {};
    checkDonorInput(input);
    const id = me.uid;
    const existing = await one("donors", id);
    const record = {
      ...input,
      id,
      userId: me.uid,
      name: input.name ?? me.name,
      location: withLocation(input.location),
      verification: existing?.verification ?? "pending",
      status: existing?.status ?? "active",
      totalDonations: existing?.totalDonations ?? input.totalDonations ?? 0,
      registeredAt: existing?.registeredAt ?? nowIso(),
    };
    await store.collection("donors").doc(id).set(record, { merge: true });
    const userPatch: Payload = { role: me.role === "admin" ? "admin" : "donor" };
    if (record.bloodGroup) userPatch.bloodGroup = record.bloodGroup;
    await store.collection("users").doc(id).set(userPatch, { merge: true }).catch(() => undefined);
    invalidate("public:locations", "public:overview");
    await log("user", me.name, existing ? "updated their donor registration" : `registered as a ${record.bloodGroup ?? ""} donor`, id);
    return { donorId: id, verification: record.verification };
  },

  "donors:updateAvailability": async ({ payload, me, store }) => {
    if (payload.donorId && payload.donorId !== me.uid && me.role !== "admin") throw new HttpError("FORBIDDEN");
    const id = payload.donorId && me.role === "admin" ? payload.donorId : me.uid;
    if (!["available", "unavailable", "temporarily_unavailable"].includes(String(payload.availability))) throw new HttpError("Choose your availability.");
    const d = await one("donors", id);
    if (!d) throw new HttpError("Register as a donor first to set your availability.");
    await store.collection("donors").doc(id).set({ availability: payload.availability }, { merge: true });
    await log("profile", me.name, `set availability to ${String(payload.availability).replace(/_/g, " ")}`, id);
    return { availability: payload.availability };
  },

  "donors:contactDonor": async ({ payload, me, store }) => {
    const d = await one("donors", payload.donorId);
    if (!d) throw new HttpError("NOT_FOUND");
    await store.collection("donorContacts").add({ donorId: payload.donorId, requestCode: payload.requestCode ?? null, requesterId: me.uid, requesterName: me.name, createdAt: nowIso() });
    await notify(d.userId ?? d.id, "emergency_nearby", "Someone needs your help", `${me.name} sent you a blood request${payload.requestCode ? ` (${payload.requestCode})` : ""}. Open Blood requests to respond.`, "/dashboard/blood-requests");
    await log("request", me.name, `contacted donor ${d.name ?? payload.donorId}`, me.uid);
    return { sent: true, donorId: payload.donorId, requestCode: payload.requestCode };
  },

  "bloodRequests:list": async ({ payload, me, store }) => {
    const origin = payload.origin;
    const since = new Date(Date.now() - MEMBER_REQUEST_WINDOW_DAYS * 86_400_000).toISOString();
    const source = me.role === "admin" ? await all("bloodRequests") : await rows(store.collection("bloodRequests").where("createdAt", ">=", since));
    const list = source.map(normaliseRequest).map((r): Row => ({
      ...forViewer(r, me),
      distanceKm: origin ? round1(distanceKm(origin, r.location.point)) : 0,
    }));
    return serial(list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
  },

  "bloodRequests:listMine": async ({ me, store }) => {
    const mine = await rows(store.collection("bloodRequests").where("requesterId", "==", me.uid));
    return serial(mine.map(normaliseRequest).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
  },

  "bloodRequests:getById": async ({ payload, me, store }) => {
    let r = await one("bloodRequests", payload.id);
    if (!r) {
      const s = await store.collection("bloodRequests").where("code", "==", String(payload.id)).limit(1).get();
      if (!s.empty) r = { ...s.docs[0].data(), id: s.docs[0].id };
    }
    return r ? serial(forViewer(normaliseRequest(r), me)) : null;
  },

  "bloodRequests:create": async ({ payload, me, store }) => {
    if (me.role !== "admin" && (await maintenanceOn())) throw new HttpError("BloodBridge is under maintenance, so new requests are paused. For an emergency, call the hospital's blood bank directly.");
    const input = payload.input ?? {};
    checkRequestInput(input);
    const h = await one("hospitals", input.hospitalId);
    if (!h) throw new HttpError("That hospital is no longer listed. Choose another.");
    const ref = store.collection("bloodRequests").doc();
    const created = nowIso();
    const city = h.city ?? input.city ?? "Lahore";
    const area = h.area ?? "";
    const r = {
      ...input,
      id: ref.id,
      code: `REQ-${Math.floor(24000 + Math.random() * 75000)}`,
      requesterId: me.uid,
      requesterName: me.name,
      hospitalId: h.id,
      hospitalName: h.name ?? "Hospital",
      location: { city, area, point: pointFor(city, area) },
      unitsRequired: Number(input.unitsRequired ?? 1),
      patientAge: Number(input.patientAge ?? 0),
      unitsFulfilled: 0,
      status: "pending",
      donorsContacted: 0,
      responders: [],
      createdAt: created,
      timeline: [{ status: "pending", at: created, note: "Request submitted" }],
    };
    await ref.set(r);
    invalidate("public:urgentRequests", "public:locations", "public:overview");
    await log("request", me.name, `created ${r.urgency === "emergency" ? "an emergency" : "a"} ${r.bloodGroup} request at ${r.hospitalName}`, me.uid);
    return serial(normaliseRequest(r));
  },

  "bloodRequests:respond": async ({ payload, me, store }) => {
    const ref = store.collection("bloodRequests").doc(String(payload.requestId ?? ""));
    // A transaction stops two quick taps (or two donors at once) from double-counting.
    const result = await store.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError("NOT_FOUND");
      const r = { ...snap.data(), id: snap.id } as Row;
      if (!OPEN.includes(r.status ?? "pending")) throw new HttpError("This request is no longer open.");
      if (r.requesterId === me.uid) throw new HttpError("You can't respond to your own request.");
      const already = Array.isArray(r.responders) && r.responders.includes(me.uid);
      if (already) return { r, changed: false };
      const at = nowIso();
      const status = ["pending", "approved", "matching"].includes(r.status ?? "pending") ? "donor_found" : r.status;
      tx.set(ref, {
        responders: FieldValue.arrayUnion(me.uid),
        donorsContacted: FieldValue.increment(1),
        status,
        ...(r.firstResponseAt ? {} : { firstResponseAt: at }),
        timeline: FieldValue.arrayUnion({ status, at, note: `${me.name} offered to donate` }),
      }, { merge: true });
      return { r, changed: true };
    });
    if (result.changed) {
      const r = result.r;
      invalidate("public:urgentRequests");
      await notify(r.requesterId, "donor_responded", "A donor responded", `${me.name} offered to donate for ${r.patientName ?? "your patient"} (${r.code ?? ""}).`, `/dashboard/requests/${r.id}`);
      await log("accepted", me.name, `accepted request ${r.code ?? r.id}`, me.uid);
    }
    return { requestId: payload.requestId, accepted: true };
  },

  "bloodRequests:cancel": async ({ payload, me, store }) => {
    const r = await one("bloodRequests", payload.requestId);
    if (!r) throw new HttpError("NOT_FOUND");
    if (r.requesterId !== me.uid && me.role !== "admin") throw new HttpError("FORBIDDEN");
    if (!OPEN.includes(r.status ?? "pending")) throw new HttpError("This request is already closed.");
    const note = r.requesterId === me.uid ? "Cancelled by requester" : `Cancelled by ${me.name}`;
    await store.collection("bloodRequests").doc(payload.requestId).set({ status: "cancelled", closedAt: nowIso(), timeline: FieldValue.arrayUnion({ status: "cancelled", at: nowIso(), note }) }, { merge: true });
    invalidate("public:urgentRequests", "public:locations");
    await log("request", me.name, `cancelled request ${r.code ?? r.id}`, r.requesterId);
    return { requestId: payload.requestId, status: "cancelled" };
  },

  "donations:listMine": async ({ me, store }) => {
    const mine = await rows(store.collection("donations").where("donorId", "==", me.uid));
    return serial(mine.sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date)));
  },

  "donations:bookAppointment": async ({ payload, me, store }) => {
    if (me.role !== "admin" && (await maintenanceOn())) throw new HttpError("BloodBridge is under maintenance, so bookings are paused. Try again later.");
    const input = payload.input ?? {};
    checkAppointment(input);
    const h = await one("hospitals", input.centerId);
    if (!h) throw new HttpError("That donation centre is no longer listed. Choose another.");
    const upcoming = await count(store.collection("donations").where("donorId", "==", me.uid).where("status", "==", "scheduled"));
    if (upcoming > 0) throw new HttpError("You already have an upcoming appointment. Ask a coordinator to cancel it before booking another.");
    const u = await one("users", me.uid);
    const ref = store.collection("donations").doc();
    const d = {
      id: ref.id,
      donorId: me.uid,
      donorName: u?.fullName ?? me.name,
      bloodGroup: u?.bloodGroup ?? "O+",
      centerId: h.id,
      centerName: h.name ?? "Donation centre",
      city: h.city ?? "",
      date: `${input.date}T${input.time}:00+05:00`,
      units: 1,
      status: "scheduled",
      createdAt: nowIso(),
    };
    await ref.set(d);
    // e.g. "Al Shifa, 17 Oct 2026 at 2:30 PM. Eat a meal and drink water beforehand."
    const when = `${formatDate(d.date)} at ${formatTime12(String(input.time))}`;
    await notify(me.uid, "appointment_reminder", "Appointment booked", `${h.name}, ${when}. Eat a meal and drink water beforehand.`, "/dashboard/donations");
    await log("donation", me.name, `booked an appointment at ${h.name} for ${when}`, me.uid);
    return serial(d);
  },

  "hospitals:donationSites": async ({ payload }) => {
    const origin = payload.origin;
    const facilities = await cached("public:hospitals", 60_000, () => all("hospitals"));
    const list = facilities
      .map((h) => ({ availableGroups: [], verified: false, ...h, ...(origin ? { distanceKm: round1(distanceKm(origin, pointFor(h.city, h.area))) } : {}) }))
      .sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return serial(list);
  },

  "notifications:list": async ({ me, store }) => {
    const mine = await rows(store.collection("notifications").where("userId", "==", me.uid));
    const list = mine
      .map((n) => ({ id: n.id, kind: n.kind ?? "announcement", title: n.title ?? "", body: n.body ?? "", createdAt: n.createdAt ?? nowIso(), read: Boolean(n.read), ...(n.href ? { href: n.href } : {}) }))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 200);
    return serial(list);
  },

  "notifications:unreadCount": async ({ me, store }) => {
    return { count: await count(store.collection("notifications").where("userId", "==", me.uid).where("read", "==", false)) };
  },

  "notifications:markRead": async ({ payload, me, store }) => {
    const ids: string[] = Array.isArray(payload.ids) ? payload.ids.map(String).slice(0, 200) : [];
    const found = await Promise.all(ids.map((id) => one("notifications", id)));
    const batch = store.batch();
    found.forEach((n) => {
      if (n && n.userId === me.uid) batch.set(store.collection("notifications").doc(n.id), { read: true }, { merge: true });
    });
    await batch.commit();
    return { ids };
  },

  "notifications:markAllRead": async ({ me, store }) => {
    const unread = await store.collection("notifications").where("userId", "==", me.uid).where("read", "==", false).get();
    for (let i = 0; i < unread.docs.length; i += 400) {
      const batch = store.batch();
      unread.docs.slice(i, i + 400).forEach((d) => batch.set(d.ref, { read: true }, { merge: true }));
      await batch.commit();
    }
    return { ok: true, updated: unread.docs.length };
  },

  /**
   * Cheap counters polled by the browser to detect new activity. Members get
   * their unread notifications; admins also get new contact messages and open
   * emergencies. Each value is a server-side count, so no documents are read.
   */
  "live:counts": async ({ me, store }) => {
    const unread = await count(store.collection("notifications").where("userId", "==", me.uid).where("read", "==", false));
    if (me.role !== "admin") return { unread };
    const [newMessages, emergencies] = await Promise.all([
      count(store.collection("contactMessages").where("status", "==", "new")),
      count(store.collection("bloodRequests").where("urgency", "==", "emergency").where("status", "in", OPEN)),
    ]);
    return { unread, newMessages, emergencies };
  },

  "dashboard:userOverview": async ({ me, store }) => {
    const [ds, rs, activity] = await Promise.all([
      rows(store.collection("donations").where("donorId", "==", me.uid)),
      rows(store.collection("bloodRequests").where("requesterId", "==", me.uid)),
      recentActivity(8, me.uid),
    ]);
    const done = ds.filter((d) => d.status === "completed").length;
    return serial({
      stats: {
        totalDonations: done,
        livesHelped: done * 3,
        activeRequests: rs.filter((r) => OPEN.includes(r.status ?? "pending") && r.status !== "pending").length,
        pendingRequests: rs.filter((r) => (r.status ?? "pending") === "pending").length,
      },
      activity,
    });
  },
};
