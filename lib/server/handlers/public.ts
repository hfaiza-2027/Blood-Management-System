/* eslint-disable @typescript-eslint/no-explicit-any */
/* Actions anyone can call, signed in or not (home page, public stock). */
import { BLOOD_GROUPS, CITIES } from "@/lib/constants";
import { distanceKm } from "@/lib/geo";
import { OPEN, serial, all, slug, pointFor, normaliseRequest, normaliseInventory, type Handler } from "../core";

export const publicHandlers: Record<string, Handler> = {
  "bloodRequests:nearbyPublic": async ({ payload, me, store }) => {
    const origin = payload.origin ?? pointFor("Lahore", "Johar Town");
    const radius = Number(payload.radiusKm ?? 30);
    const rows = (await all("bloodRequests"))
      .map(normaliseRequest)
      .filter((r) => OPEN.includes(r.status) && r.urgency !== "normal")
      .map((r) => ({ ...r, contactNumber: "", distanceKm: Math.round(distanceKm(origin, r.location.point) * 10) / 10 }))
      .filter((r) => r.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return serial(rows);
  },

  "hospitals:list": async ({ payload, me, store }) => {
    const origin = payload.origin;
    const rows = (await all("hospitals"))
      .filter((h) => !payload.type || h.type === payload.type)
      .map((h) => ({ availableGroups: [], verified: false, ...h, ...(origin ? { distanceKm: Math.round(distanceKm(origin, pointFor(h.city, h.area)) * 10) / 10 } : {}) }));
    return serial(rows.sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || String(a.name).localeCompare(String(b.name))));
  },

  "hospitals:locations": async ({ payload, me, store }) => {
    const [stored, donors, requests, hospitals] = await Promise.all([all("locations"), all("donors"), all("bloodRequests"), all("hospitals")]);
    const base = stored.length
      ? stored.map((l) => ({ id: l.id, city: String(l.city ?? l.id), areas: Array.isArray(l.areas) ? l.areas : [] }))
      : Object.entries(CITIES).map(([city, areas]) => ({ id: slug(city), city, areas }));
    return serial(base.map((l) => ({
      ...l,
      activeDonors: donors.filter((d) => d.location?.city === l.city && (d.status ?? "active") === "active").length,
      openRequests: requests.filter((r) => (r.location?.city ?? r.city) === l.city && OPEN.includes(r.status ?? "pending")).length,
      facilities: hospitals.filter((h) => h.city === l.city).length,
    })));
  },

  "inventory:list": async ({ payload, me, store }) => {
    const rows = (await all("inventory")).map(normaliseInventory);
    return serial(BLOOD_GROUPS.map((g) => rows.find((r) => r.bloodGroup === g)).filter(Boolean));
  },

  "public:overview": async ({ payload, me, store }) => {
    const [users, donors, reqs, dons] = await Promise.all([
      store.collection("users").count().get(),
      store.collection("donors").where("status", "==", "active").count().get(),
      store.collection("bloodRequests").count().get(),
      store.collection("donations").where("status", "==", "completed").count().get(),
    ]);
    return { activeDonors: donors.data().count, donationsArranged: dons.data().count, bloodRequests: reqs.data().count, users: users.data().count };
  },
};
