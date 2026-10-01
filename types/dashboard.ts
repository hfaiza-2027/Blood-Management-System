import type { BloodGroup } from "./common";

export interface UserDashboardStats {
  totalDonations: number;
  livesHelped: number;
  activeRequests: number;
  pendingRequests: number;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeDonors: number;
  bloodRequests: number;
  completedDonations: number;
  emergencyRequests: number;
  availableUnits: number;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface GroupShare {
  group: BloodGroup;
  value: number;
}

export interface ActivityItem {
  id: string;
  kind: "donation" | "request" | "accepted" | "profile" | "verification" | "inventory" | "user" | "system";
  message: string;
  actor?: string;
  at: string;
}
