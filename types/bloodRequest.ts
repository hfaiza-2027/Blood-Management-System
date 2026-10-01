import type { BloodGroup, ID, Urgency, ApproxLocation } from "./common";

export type RequestStatus =
  | "pending"
  | "approved"
  | "matching"
  | "donor_found"
  | "partially_fulfilled"
  | "fulfilled"
  | "rejected"
  | "cancelled";

export interface BloodRequest {
  id: ID;
  code: string; // human-readable e.g. REQ-24031
  requesterId: ID;
  requesterName: string;
  patientName: string;
  patientAge: number;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalId: ID;
  hospitalName: string;
  location: ApproxLocation;
  requiredBy: string; // ISO date-time
  urgency: Urgency;
  reason: string;
  contactNumber: string;
  notes?: string;
  status: RequestStatus;
  donorsContacted: number;
  createdAt: string;
  timeline: { status: RequestStatus; at: string; note?: string }[];
}

export interface BloodRequestInput {
  bloodGroup: BloodGroup;
  unitsRequired: number;
  patientName: string;
  patientAge: number;
  hospitalId: string;
  hospitalAddress: string;
  city: string;
  requiredBy: string;
  urgency: Urgency;
  reason: string;
  contactNumber: string;
  notes?: string;
}
