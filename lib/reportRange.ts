/**
 * Date ranges and time buckets for admin reports. Browser-safe and pure, so
 * the filter bar, the server and the tests all agree on the same periods.
 *
 * Pakistan Standard Time has no daylight saving, so a fixed +05:00 offset is
 * exact: "today" and every bucket boundary are calendar days in Pakistan.
 */
import type { BloodGroup, ReportBucket, ReportFilters, ReportPreset, Urgency } from "@/types";
import { BLOOD_GROUPS } from "@/lib/constants";

const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export const REPORT_PRESETS: { value: ReportPreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "ytd", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export const DEFAULT_PRESET: ReportPreset = "90d";

/** Pakistan calendar parts of an instant. */
function pk(d: Date) {
  const s = new Date(d.getTime() + OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), d: s.getUTCDate(), dow: s.getUTCDay() };
}

/** Midnight in Pakistan for the given calendar date, as a UTC instant. */
function pkMidnight(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d) - OFFSET_MS);
}

const endOfDay = (start: Date) => new Date(start.getTime() + DAY_MS - 1);

/** "YYYY-MM-DD" in Pakistan time, for date inputs. */
export function toDateInput(iso: string | Date): string {
  const p = pk(new Date(iso));
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function parseDateInput(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  const out = pkMidnight(y, m - 1, d);
  return Number.isNaN(+out) ? null : out;
}

export interface ReportQuery {
  range?: string;
  from?: string;
  to?: string;
  city?: string;
  group?: string;
  urgency?: string;
  hospital?: string;
}

/** Turns URL search params into concrete report filters. Unknown values fall back to safe defaults. */
export function resolveReportFilters(q: ReportQuery, now: Date = new Date()): { preset: ReportPreset; filters: ReportFilters } {
  const today = pk(now);
  const todayStart = pkMidnight(today.y, today.m, today.d);
  const todayEnd = endOfDay(todayStart);
  let preset = (REPORT_PRESETS.some((p) => p.value === q.range) ? q.range : DEFAULT_PRESET) as ReportPreset;

  let from: Date;
  let to: Date = todayEnd;
  switch (preset) {
    case "7d": from = new Date(todayStart.getTime() - 6 * DAY_MS); break;
    case "30d": from = new Date(todayStart.getTime() - 29 * DAY_MS); break;
    case "12m": from = pkMidnight(today.y, today.m - 11, 1); break;
    case "ytd": from = pkMidnight(today.y, 0, 1); break;
    case "custom": {
      const f = parseDateInput(q.from);
      const t = parseDateInput(q.to);
      if (f && t && f <= t) {
        from = f;
        to = endOfDay(t);
        // Two years at most, and never past today.
        if (to > todayEnd) to = todayEnd;
        if (to.getTime() - from.getTime() > 731 * DAY_MS) from = new Date(to.getTime() - 730 * DAY_MS + 1);
      } else {
        preset = DEFAULT_PRESET;
        from = new Date(todayStart.getTime() - 89 * DAY_MS);
      }
      break;
    }
    default: from = new Date(todayStart.getTime() - 89 * DAY_MS);
  }

  const filters: ReportFilters = { from: from.toISOString(), to: to.toISOString() };
  if (q.city && q.city.length <= 60) filters.city = q.city;
  if (q.group && (BLOOD_GROUPS as readonly string[]).includes(q.group)) filters.bloodGroup = q.group as BloodGroup;
  if (q.urgency && ["normal", "urgent", "emergency"].includes(q.urgency)) filters.urgency = q.urgency as Urgency;
  if (q.hospital && q.hospital.length <= 80) filters.hospitalId = q.hospital;
  return { preset, filters };
}

/** The period of equal length immediately before the given one. */
export function previousPeriod(from: string, to: string) {
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  const span = t - f;
  return { from: new Date(f - span - 1).toISOString(), to: new Date(f - 1).toISOString() };
}

/** Daily up to a month, weekly up to ~4 months, monthly beyond. */
export function bucketFor(from: string, to: string): ReportBucket {
  const days = (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS;
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

/** Bucket key for an instant, in Pakistan time. Weeks start on Monday. */
export function bucketKey(iso: string, bucket: ReportBucket): string {
  const p = pk(new Date(iso));
  if (bucket === "month") return `${p.y}-${String(p.m + 1).padStart(2, "0")}`;
  if (bucket === "week") {
    const back = (p.dow + 6) % 7; // days since Monday
    const monday = new Date(pkMidnight(p.y, p.m, p.d).getTime() - back * DAY_MS);
    return toDateInput(monday);
  }
  return toDateInput(iso);
}

const label = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", ...opts }).format(d);

/** Every bucket between from and to, in order, with a short label for charts. */
export function bucketsBetween(from: string, to: string, bucket: ReportBucket): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const seen = new Set<string>();
  const end = new Date(to).getTime();
  const spansYears = pk(new Date(from)).y !== pk(new Date(to)).y;
  let t = new Date(from).getTime();
  while (t <= end && out.length < 800) {
    const key = bucketKey(new Date(t).toISOString(), bucket);
    if (!seen.has(key)) {
      seen.add(key);
      const start = bucket === "month" ? pkMidnight(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1) : (parseDateInput(key) as Date);
      out.push({
        key,
        label: bucket === "month" ? label(start, spansYears ? { month: "short", year: "2-digit" } : { month: "short" }) : label(start, { day: "numeric", month: "short" }),
      });
    }
    t += bucket === "month" ? 27 * DAY_MS : DAY_MS;
  }
  return out;
}

/** Human description of a range, e.g. "1 Jul – 28 Sep 2026". */
export function describeRange(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const sameYear = pk(f).y === pk(t).y;
  return `${label(f, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" })} – ${label(t, { day: "numeric", month: "short", year: "numeric" })}`;
}
