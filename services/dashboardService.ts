import type { ActivityItem, AdminDashboardStats, BloodInventory, BloodRequest, GroupShare, ReportData, ReportFilters, SeriesPoint, UserDashboardStats } from "@/types";
import { dataCall } from "./client";

export interface PublicOverview { activeDonors: number; donationsArranged: number; bloodRequests: number; users: number; facilities: number }
export interface UserOverview { stats: UserDashboardStats; activity: ActivityItem[] }
export interface AdminOverview {
  stats: AdminDashboardStats;
  emergencies: BloodRequest[];
  inventory: BloodInventory[];
  activity: ActivityItem[];
  monthlyDonations: SeriesPoint[];
  monthlyRequests: SeriesPoint[];
  donorGroupDistribution: GroupShare[];
  requestStatusBreakdown: SeriesPoint[];
}

export const EMPTY_PUBLIC_OVERVIEW: PublicOverview = { activeDonors: 0, donationsArranged: 0, bloodRequests: 0, users: 0, facilities: 0 };

export const dashboardService = {
  publicOverview: () => dataCall<PublicOverview>("public", "overview"),
  userOverview: () => dataCall<UserOverview>("dashboard", "userOverview"),
  adminOverview: () => dataCall<AdminOverview>("dashboard", "adminOverview"),
  reports: (filters: ReportFilters) => dataCall<ReportData>("dashboard", "reports", { filters }),
  activityLog: () => dataCall<ActivityItem[]>("dashboard", "activityLog"),
};
