import type { BloodGroup, RequestStatus, Urgency, DonorAvailability, StockLevel, DonationStatus } from "@/types";

export const APP_NAME = "Qatra";
export const APP_TAGLINE = "Blood donation and request network";

export const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

/** Which donor groups can give red cells to each recipient group. */
export const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};

export function canReceiveFrom(recipient: BloodGroup): BloodGroup[] {
  return COMPATIBLE_DONORS[recipient];
}

export function canDonateTo(donor: BloodGroup): BloodGroup[] {
  return BLOOD_GROUPS.filter((r) => COMPATIBLE_DONORS[r].includes(donor));
}

export const BLOOD_GROUP_NOTES: Record<BloodGroup, string> = {
  "O-": "Universal red-cell donor. Needed in trauma when there's no time to type.",
  "O+": "Most common group. Can give to every positive group.",
  "A+": "Common group. Receives from A and O.",
  "A-": "Can give to all A and AB patients.",
  "B+": "Common in South Asia. Receives from B and O.",
  "B-": "Rare. Can give to all B and AB patients.",
  "AB+": "Universal recipient. Universal plasma donor.",
  "AB-": "Rarest group. Plasma helps every group.",
};

/** Minimum days between whole-blood donations used for indicative checks. */
export const DONATION_INTERVAL_DAYS = 90;
export const MIN_WEIGHT_KG = 50;
export const MIN_AGE = 18;
export const MAX_AGE = 60;

export const CITIES: Record<string, string[]> = {
  Lahore: ["Johar Town", "Gulberg", "Model Town", "DHA Phase 5", "Iqbal Town", "Township", "Shadman", "Wapda Town", "Faisal Town", "Cantt"],
  Sheikhupura: ["Kot Abdul Malik", "Civil Lines", "Sharaqpur Road", "Jandiala"],
  Karachi: ["Clifton", "Gulshan-e-Iqbal", "PECHS", "North Nazimabad"],
  Islamabad: ["F-7", "G-9", "I-8", "E-11"],
  Faisalabad: ["Peoples Colony", "Madina Town", "Susan Road"],
};

export const CITY_NAMES = Object.keys(CITIES);

export const URGENCY_META: Record<Urgency, { label: string; description: string }> = {
  normal: { label: "Normal", description: "Needed within a few days" },
  urgent: { label: "Urgent", description: "Needed within 24 hours" },
  emergency: { label: "Emergency", description: "Needed within hours — alerts nearby donors now" },
};

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "neutral" },
  approved: { label: "Approved", tone: "info" },
  matching: { label: "Matching donors", tone: "info" },
  donor_found: { label: "Donor found", tone: "ok" },
  partially_fulfilled: { label: "Partially fulfilled", tone: "warn" },
  fulfilled: { label: "Fulfilled", tone: "ok" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export const USER_REQUEST_FLOW: RequestStatus[] = ["pending", "matching", "donor_found", "partially_fulfilled", "fulfilled"];

export const AVAILABILITY_META: Record<DonorAvailability, { label: string; tone: Tone }> = {
  available: { label: "Available", tone: "ok" },
  temporarily_unavailable: { label: "Temporarily unavailable", tone: "warn" },
  unavailable: { label: "Unavailable", tone: "muted" },
};

export const STOCK_META: Record<StockLevel, { label: string; tone: Tone }> = {
  normal: { label: "Normal", tone: "ok" },
  low: { label: "Low stock", tone: "warn" },
  critical: { label: "Critical", tone: "danger" },
};

export const DONATION_STATUS_META: Record<DonationStatus, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  completed: { label: "Completed", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "muted" },
  deferred: { label: "Deferred", tone: "warn" },
};

export type Tone = "neutral" | "info" | "ok" | "warn" | "danger" | "muted" | "blood";

export const LIVES_PER_UNIT = 3;
