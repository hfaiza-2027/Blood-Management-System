/* eslint-disable @typescript-eslint/no-explicit-any */
/* Actions anyone can call, signed in or not (home page, public stock, contact form). */
import { BLOOD_GROUPS, CITIES } from "@/lib/constants";
import { distanceKm } from "@/lib/geo";
import { checkContactMessage } from "../validate";
import { OPEN, serial, all, rows, count, cached, slug, pointFor, nowIso, normaliseRequest, normaliseInventory, log, type Handler } from "../core";

/** Public data changes rarely, so each server instance reuses it for a minute. */
const PUBLIC_TTL = 60_000;

const round1 = (n: number) => Math.round(n * 10) / 10;

export const publicHandlers: Record<string, Handler> = {
  "bloodRequests:nearbyPublic": async ({ payload, store }) => {
    const origin = payload.origin ?? pointFor("Lahore", "Johar Town");
    const radius = Number(payload.radiusKm ?? 30);
    // Only urgent and emergency requests are public, so never read routine ones.
    const open = await cached("public:urgentRequests", 20_000, () => rows(store.collection("bloodRequests").where("urgency", "in", ["urgent", "emergency"])));
    const list = open
      .map(normaliseRequest)
      .filter((r) => OPEN.includes(r.status))
      // Contact numbers and requester names never leave the server here.
      .map((r) => ({ ...r, contactNumber: "", requesterName: "", distanceKm: round1(distanceKm(origin, r.location.point)) }))
      .filter((r) => r.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return serial(list);
  },

  "hospitals:list": async ({ payload }) => {
    const origin = payload.origin;
    const facilities = await cached("public:hospitals", PUBLIC_TTL, () => all("hospitals"));
    const list = facilities
      .filter((h) => !payload.type || h.type === payload.type)
      .map((h) => ({ availableGroups: [], verified: false, ...h, ...(origin ? { distanceKm: round1(distanceKm(origin, pointFor(h.city, h.area))) } : {}) }));
    return serial(list.sort((a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || String(a.name).localeCompare(String(b.name))));
  },

  "hospitals:locations": async ({ store }) => {
    return cached("public:locations", PUBLIC_TTL, async () => {
      const [stored, hospitals] = await Promise.all([all("locations"), all("hospitals")]);
      const base = stored.length
        ? stored.map((l) => ({ id: l.id, city: String(l.city ?? l.id), areas: Array.isArray(l.areas) ? l.areas : [] }))
        : Object.entries(CITIES).map(([city, areas]) => ({ id: slug(city), city, areas }));
      // Count queries per city instead of downloading every donor and request.
      const withCounts = await Promise.all(
        base.map(async (l) => {
          const [activeDonors, openRequests] = await Promise.all([
            count(store.collection("donors").where("location.city", "==", l.city).where("status", "==", "active")),
            count(store.collection("bloodRequests").where("location.city", "==", l.city).where("status", "in", OPEN)),
          ]);
          return { ...l, activeDonors, openRequests, facilities: hospitals.filter((h) => h.city === l.city).length };
        }),
      );
      return serial(withCounts.sort((a, b) => a.city.localeCompare(b.city)));
    });
  },

  "inventory:list": async () => {
    const stock = await cached("public:inventory", PUBLIC_TTL, () => all("inventory"));
    const list = stock.map(normaliseInventory);
    return serial(BLOOD_GROUPS.map((g) => list.find((r) => r.bloodGroup === g)).filter(Boolean));
  },

  "public:overview": async ({ store }) => {
    return cached("public:overview", PUBLIC_TTL, async () => {
      const [users, donors, reqs, dons, facilities] = await Promise.all([
        count(store.collection("users")),
        count(store.collection("donors").where("status", "==", "active")),
        count(store.collection("bloodRequests")),
        count(store.collection("donations").where("status", "==", "completed")),
        count(store.collection("hospitals")),
      ]);
      return { activeDonors: donors, donationsArranged: dons, bloodRequests: reqs, users, facilities };
    });
  },

  "contact:submit": async ({ payload, store }) => {
    const input = payload.input ?? {};
    // Bots fill hidden fields; pretend success so they move on.
    if (String(input.website ?? "").trim()) return { ok: true };
    checkContactMessage(input);
    await store.collection("contactMessages").add({
      name: String(input.name).trim(),
      email: String(input.email).trim().toLowerCase(),
      phone: String(input.phone ?? "").trim(),
      topic: String(input.topic ?? "general"),
      message: String(input.message).trim(),
      status: "new",
      createdAt: nowIso(),
    });
    await log("system", String(input.name).trim(), "sent a message through the contact form");
    return { ok: true };
  },
};
