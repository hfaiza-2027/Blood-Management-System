/* Shared server-only helpers for the admin and client data handlers. */
import { Timestamp, type Firestore, type Query } from "firebase-admin/firestore";
import { adminDb, getSessionUser } from "@/lib/firebase/admin";
import { STOCK_TARGETS } from "@/data/starter";
import { AREA_POINTS } from "@/data/locations";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any> & { id: string };
export type Payload = Record<string, any>;
export interface Actor { uid: string; role: string; name: string; status: string }

export const OPEN = ["pending", "approved", "matching", "donor_found", "partially_fulfilled"];
export const STATUSES = ["pending", "approved", "matching", "donor_found", "partially_fulfilled", "fulfilled", "rejected", "cancelled"];
export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review", approved: "Approved", matching: "Matching donors", donor_found: "Donor found",
  partially_fulfilled: "Partially fulfilled", fulfilled: "Fulfilled", rejected: "Rejected", cancelled: "Cancelled",
};

export class HttpError extends Error {}

export function db(): Firestore {
  if (!adminDb) throw new HttpError("FIREBASE_SERVER_NOT_CONFIGURED");
  return adminDb;
}

/** Firestore Timestamps → ISO strings so results are JSON-safe. */
export function serial<T>(v: T): T {
  return JSON.parse(JSON.stringify(v ?? null, (_k, x) => (x instanceof Timestamp ? x.toDate().toISOString() : x)));
}

/** Reads every document of a collection. Keep this for small collections (hospitals, locations, inventory). */
export async function all(collection: string): Promise<Row[]> {
  return rows(db().collection(collection));
}

/** Runs a query and returns plain rows with their ids. */
export async function rows(query: Query): Promise<Row[]> {
  const snap = await query.get();
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

/** Documents whose ISO-string `field` falls inside [from, to]. Uses Firestore's automatic single-field index. */
export async function inRange(collection: string, field: string, from: string, to: string): Promise<Row[]> {
  return rows(db().collection(collection).where(field, ">=", from).where(field, "<=", to));
}

/** Server-side count without downloading documents. */
export async function count(query: Query): Promise<number> {
  return (await query.count().get()).data().count;
}

export async function one(collection: string, id: string): Promise<Row | undefined> {
  if (!id) return undefined;
  const s = await db().collection(collection).doc(String(id)).get();
  return s.exists ? { ...s.data(), id: s.id } : undefined;
}

export const slug = (city: string) => `loc-${city.toLowerCase().replace(/\s+/g, "-")}`;

export function pointFor(city?: string, area?: string) {
  return (city && area && AREA_POINTS[city]?.[area]) || (city && AREA_POINTS[city] && Object.values(AREA_POINTS[city])[0]) || { lat: 31.5204, lng: 74.3587 };
}

export function withLocation(loc: any) {
  const city = loc?.city ?? "Lahore";
  const area = loc?.area ?? "";
  return { city, area, point: loc?.point?.lat != null ? loc.point : pointFor(city, area) };
}

export const nowIso = () => new Date().toISOString();

/* ---------- short-lived cache ---------- */

/**
 * Per-instance memory cache for public, read-heavy data (home page stock,
 * facility lists, network totals). Writes that change the data call
 * invalidate(), so the instance that made the change shows it at once and
 * other instances catch up within the TTL.
 */
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  // A failed load must not stay cached.
  value.catch(() => cache.delete(key));
  return value;
}

export function invalidate(...prefixes: string[]) {
  for (const key of [...cache.keys()]) if (prefixes.some((p) => key.startsWith(p))) cache.delete(key);
}

/* ---------- auth ---------- */

export async function getActor(): Promise<Actor | null> {
  const decoded = await getSessionUser();
  if (!decoded) return null;
  const profile = await one("users", decoded.uid);
  return {
    uid: decoded.uid,
    role: (decoded as any).role === "admin" || profile?.role === "admin" ? "admin" : profile?.role ?? "user",
    name: profile?.fullName ?? decoded.name ?? decoded.email ?? "Member",
    status: profile?.status ?? "active",
  };
}

export function normaliseUser(u: Row): Row {
  return {
    ...u,
    fullName: u.fullName ?? u.name ?? u.email ?? "Member",
    email: u.email ?? "",
    phone: u.phone ?? "",
    bloodGroup: u.bloodGroup ?? "O+",
    gender: u.gender ?? "other",
    dateOfBirth: u.dateOfBirth ?? "1995-01-01",
    location: withLocation(u.location),
    role: u.role ?? "user",
    status: u.status ?? "active",
    verified: Boolean(u.verified),
    joinedAt: u.joinedAt ?? nowIso(),
  };
}

/** Used by Server Component layouts/pages via the registry in services/client.ts. */
export async function currentSessionUser() {
  if (!adminDb) return null;
  const decoded = await getSessionUser();
  if (!decoded) return null;
  const profile = await one("users", decoded.uid);
  if (!profile) return null;
  return serial(normaliseUser(profile));
}

export function normaliseRequest(r: Row): Row {
  return {
    ...r,
    code: r.code ?? `REQ-${String(r.id).slice(0, 5).toUpperCase()}`,
    requesterName: r.requesterName ?? "Member",
    patientName: r.patientName ?? "Patient",
    unitsRequired: Number(r.unitsRequired ?? 1),
    unitsFulfilled: Number(r.unitsFulfilled ?? 0),
    hospitalName: r.hospitalName ?? "Hospital",
    location: withLocation(r.location ?? { city: r.city }),
    requiredBy: r.requiredBy ?? r.createdAt ?? nowIso(),
    urgency: r.urgency ?? "normal",
    reason: r.reason ?? "",
    contactNumber: r.contactNumber ?? "",
    status: STATUSES.includes(r.status) ? r.status : "pending",
    donorsContacted: Number(r.donorsContacted ?? 0),
    createdAt: r.createdAt ?? nowIso(),
    timeline: Array.isArray(r.timeline) ? r.timeline : [{ status: r.status ?? "pending", at: r.createdAt ?? nowIso() }],
  };
}

export function normaliseDonor(d: Row): Row {
  return {
    ...d,
    userId: d.userId ?? d.id,
    name: d.name ?? "Donor",
    location: withLocation(d.location),
    availability: d.availability ?? "available",
    verification: d.verification ?? "pending",
    lastDonationDate: d.lastDonationDate ?? null,
    totalDonations: Number(d.totalDonations ?? 0),
    status: d.status ?? "active",
    preferredContact: d.preferredContact ?? "phone",
  };
}

export function normaliseInventory(i: Row) {
  const target = STOCK_TARGETS.find((m) => m.bloodGroup === (i.bloodGroup ?? i.id));
  return {
    bloodGroup: i.bloodGroup ?? i.id,
    available: Number(i.available ?? 0),
    reserved: Number(i.reserved ?? 0),
    expired: Number(i.expired ?? 0),
    required: Number(i.required ?? target?.required ?? 0),
    capacity: Number(i.capacity ?? target?.capacity ?? 100),
    updatedAt: i.updatedAt ?? nowIso(),
  };
}

/* ---------- request timing ---------- */

/** When a request became fulfilled: the stored field, or the timeline entry for older records. */
export function fulfilledAt(r: Row): string | null {
  if (r.fulfilledAt) return String(r.fulfilledAt);
  const entry = Array.isArray(r.timeline) ? r.timeline.find((t: any) => t?.status === "fulfilled") : undefined;
  return entry?.at ? String(entry.at) : null;
}

/** When the first donor responded or was found. */
export function firstResponseAt(r: Row): string | null {
  if (r.firstResponseAt) return String(r.firstResponseAt);
  const entry = Array.isArray(r.timeline) ? r.timeline.find((t: any) => t?.status === "donor_found" || t?.status === "partially_fulfilled" || t?.status === "fulfilled") : undefined;
  return entry?.at ? String(entry.at) : null;
}

/* ---------- side effects ---------- */

export async function log(kind: string, actor: string, message: string, userId?: string) {
  try {
    await db().collection("activity").add({ kind, actor, message, userId: userId ?? null, at: nowIso() });
  } catch {
    /* logging must never break the action */
  }
}

export async function notify(userId: string | undefined, kind: string, title: string, body: string, href?: string) {
  if (!userId) return;
  try {
    await db().collection("notifications").add({ userId, kind, title, body, href: href ?? null, createdAt: nowIso(), read: false });
  } catch {
    /* ignore */
  }
}

/* ---------- series helpers ---------- */

export function lastMonths(n = 12) {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, label: m.toLocaleString("en-GB", { month: "short" }) });
  }
  return out;
}

export function monthly(rowsIn: Row[], field: string, where: (r: Row) => boolean = () => true) {
  return lastMonths().map((m) => ({ label: m.label, value: rowsIn.filter((r) => where(r) && String(r[field] ?? "").startsWith(m.key)).length }));
}

/** ISO timestamp for the first day of the month, `n - 1` months ago. */
export function monthsAgoIso(n = 12) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - (n - 1), 1).toISOString();
}

const toActivity = (a: Row) => ({ id: a.id, kind: a.kind ?? "system", actor: a.actor ?? undefined, message: a.message ?? "", at: a.at ?? nowIso() });

/** Newest activity first. Reads only `limit` documents instead of the whole log. */
export async function recentActivity(limit: number, userId?: string) {
  if (userId) {
    // One member's own history is small; sorting it here avoids a composite index.
    const mine = await rows(db().collection("activity").where("userId", "==", userId));
    return mine.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, limit).map(toActivity);
  }
  return (await rows(db().collection("activity").orderBy("at", "desc").limit(limit))).map(toActivity);
}

export async function maintenanceOn() {
  return cached("settings:maintenance", 30_000, async () => {
    const s = await db().collection("settings").doc("system").get();
    return Boolean(s.data()?.flags?.maintenance);
  });
}

export type Handler = (ctx: { payload: Payload; me: Actor; store: Firestore }) => Promise<unknown>;
