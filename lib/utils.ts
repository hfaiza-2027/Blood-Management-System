/** Join class names, skipping falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const DAY = 86_400_000;

/** Fixed "today" for mock data so demo screens stay consistent across runs. */
export const MOCK_NOW = new Date("2026-09-27T10:30:00+05:00");

/** With Firebase configured the real clock is used; mock mode uses MOCK_NOW. */
const LIVE_CLOCK = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.NEXT_PUBLIC_API_URL);

export function now(): Date {
  return LIVE_CLOCK ? new Date() : MOCK_NOW;
}

export function daysBetween(a: Date | string, b: Date | string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / DAY);
}

export function addDays(d: Date | string, days: number): Date {
  return new Date(new Date(d).getTime() + days * DAY);
}

/** All dates render in Pakistan time so server and browser output match (no hydration mismatch). */
export const TIME_ZONE = "Asia/Karachi";

export function formatDate(d: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, ...(opts ?? { day: "numeric", month: "short", year: "numeric" }) }).format(new Date(d));
}

export function formatDateTime(d: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

export function timeAgo(d: string | Date, from: Date = now()): string {
  const diff = from.getTime() - new Date(d).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(d);
}

/** Human description of time left until a deadline, e.g. "5 h left" or "Overdue". */
export function timeRemaining(deadline: string | Date, from: Date = now()): { label: string; hours: number } {
  const hours = (new Date(deadline).getTime() - from.getTime()) / 3_600_000;
  if (hours <= 0) return { label: "Overdue", hours };
  if (hours < 1) return { label: `${Math.max(1, Math.round(hours * 60))} min left`, hours };
  if (hours < 48) return { label: `${Math.round(hours)} h left`, hours };
  return { label: `${Math.round(hours / 24)} days left`, hours };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ageFromDob(dob: string, from: Date = now()): number {
  const b = new Date(dob);
  let age = from.getFullYear() - b.getFullYear();
  const m = from.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && from.getDate() < b.getDate())) age--;
  return age;
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Mask a phone number for public display: 0300 ••• ••67 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "•••";
  return `${digits.slice(0, 4)} ••• ••${digits.slice(-2)}`;
}
