import type { BloodGroup, Gender, ID, ApproxLocation } from "./common";

export type UserRole = "user" | "donor" | "admin";
export type AccountStatus = "active" | "inactive" | "suspended" | "pending";

export interface User {
  id: ID;
  fullName: string;
  email: string;
  phone: string;
  bloodGroup: BloodGroup;
  gender: Gender;
  dateOfBirth: string; // ISO date
  location: ApproxLocation;
  address?: string; // private — never rendered on public surfaces
  role: UserRole;
  status: AccountStatus;
  verified: boolean;
  joinedAt: string;
  avatarUrl?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
  preferences?: UserPreferences;
}

export interface Admin extends User {
  role: "admin";
  permissions: ("users" | "donors" | "requests" | "inventory" | "reports" | "settings")[];
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface UserPreferences {
  privacy: { donorVisible: boolean; contactVisible: boolean; locationVisible: boolean };
  notify: { email: boolean; sms: boolean; emergency: boolean; reminders: boolean };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  privacy: { donorVisible: true, contactVisible: false, locationVisible: true },
  notify: { email: true, sms: true, emergency: true, reminders: true },
};
