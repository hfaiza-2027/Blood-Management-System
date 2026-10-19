/* Admin report engine: reads only the records inside the chosen period and builds every figure on the server. */
import type { Firestore, Query } from "firebase-admin/firestore";
import type { BloodGroup, ReportData, ReportFilters, ReportMetric } from "@/types";
import { BLOOD_GROUPS } from "@/lib/constants";
import { stockLevel } from "@/lib/inventory";
import { bucketFor, bucketKey, bucketsBetween, previousPeriod } from "@/lib/reportRange";
import { STATUSES, STATUS_LABEL, all, count, inRange, fulfilledAt, firstResponseAt, normaliseInventory, serial, type Row } from "./core";

const HOUR_MS = 3_600_000;

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const m = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return Math.round(m * 10) / 10;
}

const within = (iso: unknown, from: string, to: string) => typeof iso === "string" && iso >= from && iso <= to;
const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / HOUR_MS;

/** Request-level figures for one period. */
function requestFigures(reqs: Row[]) {
  const live = reqs.filter((r) => r.status !== "cancelled");
  const fulfilled = live.filter((r) => r.status === "fulfilled");
  const unitsRequested = live.reduce((a, r) => a + Number(r.unitsRequired ?? 1), 0);
  const unitsFulfilled = live.reduce((a, r) => a + Math.min(Number(r.unitsFulfilled ?? 0), Number(r.unitsRequired ?? 1)), 0);
  const emergencies = live.filter((r) => r.urgency === "emergency");
  const now = new Date().toISOString();
  // On time = fulfilled before the required-by deadline. Only emergencies that are fulfilled or past due count.
  const dueEmergencies = emergencies.filter((r) => r.status === "fulfilled" || String(r.requiredBy ?? "") <= now);
  const onTime = dueEmergencies.filter((r) => {
    const at = fulfilledAt(r);
    return r.status === "fulfilled" && at !== null && at <= String(r.requiredBy ?? at);
  });
  const responseHours = reqs.map((r) => (firstResponseAt(r) ? hoursBetween(String(r.createdAt), firstResponseAt(r) as string) : null)).filter((h): h is number => h !== null && h >= 0);
  const fulfilHours = fulfilled.map((r) => (fulfilledAt(r) ? hoursBetween(String(r.createdAt), fulfilledAt(r) as string) : null)).filter((h): h is number => h !== null && h >= 0);
  return {
    requests: reqs.length,
    unitsRequested: reqs.reduce((a, r) => a + Number(r.unitsRequired ?? 1), 0),
    fulfilmentRate: pct(fulfilled.length, live.length),
    unitFulfilmentRate: pct(unitsFulfilled, unitsRequested),
    emergencies: reqs.filter((r) => r.urgency === "emergency").length,
    emergencyOnTimeRate: pct(onTime.length, dueEmergencies.length),
    medianHoursToFirstResponse: median(responseHours),
    medianHoursToFulfil: median(fulfilHours),
  };
}

const metric = (value: number | null, previous: number | null): ReportMetric => ({ value, previous });

export async function buildReport(store: Firestore, filters: ReportFilters): Promise<ReportData> {
  const { from, to } = filters;
  const prev = previousPeriod(from, to);
  const bucket = bucketFor(from, to);
  const notes: string[] = [];

  const matchesRequest = (r: Row) =>
    (!filters.city || (r.location?.city ?? r.city) === filters.city) &&
    (!filters.bloodGroup || r.bloodGroup === filters.bloodGroup) &&
    (!filters.urgency || (r.urgency ?? "normal") === filters.urgency) &&
    (!filters.hospitalId || r.hospitalId === filters.hospitalId);
  const matchesDonation = (d: Row) =>
    (!filters.city || d.city === filters.city) &&
    (!filters.bloodGroup || d.bloodGroup === filters.bloodGroup) &&
    (!filters.hospitalId || d.centerId === filters.hospitalId);
  const matchesDonor = (d: Row) => (!filters.city || d.location?.city === filters.city) && (!filters.bloodGroup || d.bloodGroup === filters.bloodGroup);

  /** Active donors with the report's city/group filters, counted on the server. */
  const donorQuery = (extra: (q: Query) => Query) => {
    let q: Query = store.collection("donors");
    if (filters.city) q = q.where("location.city", "==", filters.city);
    return extra(q);
  };

  // One read per collection covering both periods; everything else is counted, not downloaded.
  const [reqRows, donRows, donorRows, movementRows, inventoryRows, membersNow, membersPrev, supply, verification] = await Promise.all([
    inRange("bloodRequests", "createdAt", prev.from, to),
    inRange("donations", "date", prev.from, to),
    inRange("donors", "registeredAt", prev.from, to),
    inRange("inventoryMovements", "at", prev.from, to),
    all("inventory"),
    count(store.collection("users").where("joinedAt", ">=", from).where("joinedAt", "<=", to)),
    count(store.collection("users").where("joinedAt", ">=", prev.from).where("joinedAt", "<=", prev.to)),
    Promise.all(BLOOD_GROUPS.map((g) => count(donorQuery((q) => q.where("status", "==", "active").where("bloodGroup", "==", g))))),
    Promise.all(
      (["verified", "pending", "rejected"] as const).map((v) =>
        count(donorQuery((q) => (filters.bloodGroup ? q.where("bloodGroup", "==", filters.bloodGroup) : q).where("verification", "==", v))),
      ),
    ),
  ]);

  const reqs = reqRows.filter(matchesRequest);
  const reqNow = reqs.filter((r) => within(r.createdAt, from, to));
  const reqPrev = reqs.filter((r) => within(r.createdAt, prev.from, prev.to));
  const dons = donRows.filter(matchesDonation);
  const donNow = dons.filter((d) => within(d.date, from, to));
  const donPrev = dons.filter((d) => within(d.date, prev.from, prev.to));
  const donors = donorRows.filter(matchesDonor);
  const moves = movementRows.filter((m) => !filters.bloodGroup || m.group === filters.bloodGroup);
  const movesNow = moves.filter((m) => within(m.at, from, to));
  const movesPrev = moves.filter((m) => within(m.at, prev.from, prev.to));

  const fNow = requestFigures(reqNow);
  const fPrev = requestFigures(reqPrev);
  const unitsIn = (ms: Row[]) => ms.reduce((a, m) => a + Math.max(0, Number(m.delta ?? 0)), 0);
  const unitsOut = (ms: Row[]) => ms.reduce((a, m) => a + Math.max(0, -Number(m.delta ?? 0)), 0);
  const completed = (ds: Row[]) => ds.filter((d) => d.status === "completed").length;

  // Trend buckets
  const buckets = bucketsBetween(from, to, bucket);
  const trend = buckets.map((b) => {
    const inBucket = reqNow.filter((r) => bucketKey(String(r.createdAt), bucket) === b.key);
    const live = inBucket.filter((r) => r.status !== "cancelled");
    return {
      key: b.key,
      label: b.label,
      requests: inBucket.length,
      unitsRequested: inBucket.reduce((a, r) => a + Number(r.unitsRequired ?? 1), 0),
      donations: donNow.filter((d) => d.status === "completed" && bucketKey(String(d.date), bucket) === b.key).length,
      fulfilmentRate: pct(live.filter((r) => r.status === "fulfilled").length, live.length),
    };
  });

  // Breakdowns for the current period
  const requestStatus = STATUSES.map((s) => ({ label: STATUS_LABEL[s], value: reqNow.filter((r) => (r.status ?? "pending") === s).length })).filter((s) => s.value > 0);
  const urgency = (["emergency", "urgent", "normal"] as const).map((u) => ({ label: u[0].toUpperCase() + u.slice(1), value: reqNow.filter((r) => (r.urgency ?? "normal") === u).length }));
  const donationOutcomes = (["completed", "scheduled", "deferred", "cancelled"] as const)
    .map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: donNow.filter((d) => d.status === s).length }))
    .filter((s) => s.value > 0);

  const stock = new Map(inventoryRows.map((i) => [String(i.bloodGroup ?? i.id), normaliseInventory(i)]));
  const groups = BLOOD_GROUPS.filter((g) => !filters.bloodGroup || g === filters.bloodGroup).map((g) => {
    const rs = reqNow.filter((r) => r.bloodGroup === g && r.status !== "cancelled");
    const inv = stock.get(g) ?? normaliseInventory({ id: g, bloodGroup: g });
    return {
      group: g as BloodGroup,
      requests: rs.length,
      unitsRequested: rs.reduce((a, r) => a + Number(r.unitsRequired ?? 1), 0),
      unitsFulfilled: rs.reduce((a, r) => a + Math.min(Number(r.unitsFulfilled ?? 0), Number(r.unitsRequired ?? 1)), 0),
      activeDonors: supply[BLOOD_GROUPS.indexOf(g)] ?? 0,
      availableUnits: inv.available,
      stockLevel: stockLevel(inv),
    };
  });

  const cityNames = new Set<string>([...reqNow.map((r) => String(r.location?.city ?? r.city ?? "Other")), ...donNow.map((d) => String(d.city || "Other"))]);
  const cities = [...cityNames]
    .map((city) => {
      const rs = reqNow.filter((r) => String(r.location?.city ?? r.city ?? "Other") === city);
      return {
        city,
        requests: rs.length,
        fulfilled: rs.filter((r) => r.status === "fulfilled").length,
        emergencies: rs.filter((r) => r.urgency === "emergency").length,
        donations: donNow.filter((d) => String(d.city || "Other") === city && d.status === "completed").length,
      };
    })
    .sort((a, b) => b.requests - a.requests || b.donations - a.donations);

  const byHospital = new Map<string, Row[]>();
  reqNow.forEach((r) => {
    const key = String(r.hospitalId ?? r.hospitalName ?? "unknown");
    byHospital.set(key, [...(byHospital.get(key) ?? []), r]);
  });
  const hospitals = [...byHospital.entries()]
    .map(([hospitalId, rs]) => {
      const fulfilledRows = rs.filter((r) => r.status === "fulfilled");
      return {
        hospitalId,
        name: String(rs[0].hospitalName ?? "Hospital"),
        city: String(rs[0].location?.city ?? rs[0].city ?? ""),
        requests: rs.length,
        unitsRequested: rs.reduce((a, r) => a + Number(r.unitsRequired ?? 1), 0),
        fulfilled: fulfilledRows.length,
        medianHoursToFulfil: median(fulfilledRows.map((r) => (fulfilledAt(r) ? hoursBetween(String(r.createdAt), fulfilledAt(r) as string) : -1)).filter((h) => h >= 0)),
      };
    })
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 15);

  const inventory = BLOOD_GROUPS.filter((g) => !filters.bloodGroup || g === filters.bloodGroup).map((g) => {
    const inv = stock.get(g) ?? normaliseInventory({ id: g, bloodGroup: g });
    const ms = movesNow.filter((m) => m.group === g);
    return { group: g as BloodGroup, available: inv.available, required: inv.required, stockLevel: stockLevel(inv), unitsIn: unitsIn(ms), unitsOut: unitsOut(ms) };
  });

  if (filters.city) notes.push("Blood stock and stock movements are network-wide, so the city filter doesn't apply to them.");
  if (filters.urgency) notes.push("Urgency applies to requests only; donation and donor figures ignore it.");
  if (filters.hospitalId) notes.push("The facility filter applies to requests and donations booked at that facility.");
  notes.push("New members counts every sign-up in the period and ignores the city, group and facility filters.");

  return serial({
    filters,
    previous: prev,
    bucket,
    generatedAt: new Date().toISOString(),
    kpis: {
      requests: metric(fNow.requests, fPrev.requests),
      unitsRequested: metric(fNow.unitsRequested, fPrev.unitsRequested),
      fulfilmentRate: metric(fNow.fulfilmentRate, fPrev.fulfilmentRate),
      unitFulfilmentRate: metric(fNow.unitFulfilmentRate, fPrev.unitFulfilmentRate),
      emergencies: metric(fNow.emergencies, fPrev.emergencies),
      emergencyOnTimeRate: metric(fNow.emergencyOnTimeRate, fPrev.emergencyOnTimeRate),
      medianHoursToFirstResponse: metric(fNow.medianHoursToFirstResponse, fPrev.medianHoursToFirstResponse),
      medianHoursToFulfil: metric(fNow.medianHoursToFulfil, fPrev.medianHoursToFulfil),
      donationsCompleted: metric(completed(donNow), completed(donPrev)),
      newDonors: metric(donors.filter((d) => within(d.registeredAt, from, to)).length, donors.filter((d) => within(d.registeredAt, prev.from, prev.to)).length),
      newMembers: metric(membersNow, membersPrev),
      unitsIn: metric(unitsIn(movesNow), unitsIn(movesPrev)),
      unitsOut: metric(unitsOut(movesNow), unitsOut(movesPrev)),
    },
    trend,
    requestStatus,
    urgency,
    donationOutcomes,
    groups,
    cities,
    hospitals,
    inventory,
    donorVerification: [
      { label: "Verified", value: verification[0] },
      { label: "Pending", value: verification[1] },
      { label: "Rejected", value: verification[2] },
    ],
    notes,
  });
}
