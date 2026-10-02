/* eslint-disable @typescript-eslint/no-explicit-any */
/* Actions for signed-in members. Some also accept admins (e.g. cancelling any request). */
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase/admin";
import { canReceiveFrom } from "@/lib/constants";
import { coarsen, distanceKm } from "@/lib/geo";
import { formatDate, formatTime12 } from "@/lib/utils";
import { checkAppointment, checkDonorInput, checkProfilePatch, checkRequestInput } from "../validate";
import { OPEN, HttpError, serial, all, one, pointFor, withLocation, nowIso, normaliseUser, normaliseRequest, normaliseDonor, log, notify, recentActivity, maintenanceOn, type Handler, type Row, type Payload } from "../core";

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

  "users:revokeSessions": async ({ payload, me, store }) => {
    if (adminAuth) await adminAuth.revokeRefreshTokens(me.uid);
    await log("profile", me.name, "signed out of all devices", me.uid);
    return { ok: true };
  },

  "donors:nearby": async ({ payload, me, store }) => {
    const f = payload.filters ?? {};
    const origin = payload.origin ?? pointFor("Lahore", "Johar Town");
    const groups = f.bloodGroup && f.bloodGroup !== "any" ? (f.compatibleOnly ? canReceiveFrom(f.bloodGroup) : [f.bloodGroup]) : null;
    const q = String(f.query ?? "").trim().toLowerCase();
    const rows = (await all("donors"))
      .map(normaliseDonor)
      .filter((d) => d.status === "active" && d.verification !== "rejected" && !d.hidden)
      .filter((d) => !groups || groups.includes(d.bloodGroup))
      .filter((d) => !f.city || d.location.city === f.city)
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
        return { ...pub, location: { ...d.location, point: coarsen(d.location.point) }, distanceKm: Math.round(distanceKm(origin, d.location.point) * 10) / 10 };
      })
      .filter((d) => !f.maxDistanceKm || d.distanceKm <= f.maxDistanceKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return serial(rows);
  },

  "donors:getById": async ({ payload, me, store }) => {
    const d = await one("donors", payload.id);
    return d ?