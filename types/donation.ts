import type { BloodGroup, ID } from "./common";

export type DonationStatus = "scheduled" | "completed" | "cancelled" | "deferred";

export interface Donation {
  id: ID;
  donorId: ID;
  donorName: string;
  bloodGroup: BloodGroup;
  centerId: ID;
  centerName: string;
  city: string;
  date: string;
  units: number;
  status: DonationStatus;
  certificateId?: string;
  linkedRequestCode?: string;
}

export interface AppointmentInput {
  centerId: ID;
  date: string;
  time: string;
}
