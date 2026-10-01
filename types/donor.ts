import type { BloodGroup, Gender, ID, ApproxLocation } from "./common";

export type DonorAvailability = "available" | "unavailable" | "temporarily_unavailable";
export type VerificationStatus = "verified" | "pending" | "rejected";
export type ContactMethod = "phone" | "sms" | "whatsapp" | "email";

export interface Donor {
  id: ID;
  userId: ID;
  name: string;
  bloodGroup: BloodGroup;
  gender: Gender;
  age: number;
  weightKg: number;
  location: ApproxLocation;
  availability: DonorAvailability;
  verification: VerificationStatus;
  lastDonationDate: string | null;
  totalDonations: number;
  preferredContact: ContactMethod;
  status: "active" | "suspended";
}

/** Donor as returned from a proximity search. */
export interface NearbyDonor extends Donor {
  distanceKm: number;
}

export interface DonorSearchFilters {
  bloodGroup?: BloodGroup | "any";
  compatibleOnly?: boolean;
  city?: string;
  area?: string;
  maxDistanceKm?: number;
  availability?: DonorAvailability | "any";
  lastDonationWithinDays?: number;
  gender?: "male" | "female" | "any";
  verifiedOnly?: boolean;
}

export interface EligibilityAnswers {
  feelingWell: boolean;
  recentIllness: boolean;
  recentTattoo: boolean;
  onMedication: boolean;
  recentSurgery: boolean;
  pregnantOrNursing: boolean;
}

export interface EligibilityResult {
  status: "likely_eligible" | "wait" | "consult";
  daysUntilEligible: number;
  reasons: string[];
}
