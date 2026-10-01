import type { BloodGroup, ID } from "./common";

export type FacilityType = "hospital" | "blood_bank" | "donation_center";

export interface Hospital {
  id: ID;
  name: string;
  type: FacilityType;
  address: string; // facilities are public places, so address is fine to show
  city: string;
  area: string;
  phone: string;
  email: string;
  openingHours: string;
  availableGroups: BloodGroup[];
  verified: boolean;
  distanceKm?: number;
}

export interface CityLocation {
  id: ID;
  city: string;
  areas: string[];
  activeDonors: number;
  openRequests: number;
  facilities: number;
}
