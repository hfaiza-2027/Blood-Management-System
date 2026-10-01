import type { ActivityItem, AdminDashboardStats, GroupShare, SeriesPoint, UserDashboardStats } from "@/types";
import { adminActivity, adminStats, cityDemand, donorGroupDistribution, fulfillmentRate, groupDemand, monthlyDonations, monthlyRequests, requestStatusBreakdown, userActivity, userStats } from "@/data/mockStats";
import { mock, dataCall, USE_MOCKS } from "./client";

export interface PublicOverview { activeDonors: number; donationsArranged: number; bloodRequests: number; users: number }
export interface UserOverview { stats: UserDashboardStats; activity: ActivityItem[] }
export interface AdminOverview {
  stats: AdminDashboardStats;
  activity: ActivityItem[];
  monthlyDonations: SeriesPoint[];
  monthlyRequests: SeriesPoint[];
  donorGroupDistribution: GroupShare[];
  requestStatusBreakdown: SeriesPoint[];
}
export interface Reports {
  monthlyDonations: SeriesPoint[];
  monthlyRequests: SeriesPoint[];
  fulfillmentRate: SeriesPoint[];
  groupDemand: GroupShare[];
  cityDemand: SeriesPoint[];
  donorGroupDistribution: GroupShare[];
  requestStatusBreakdown: SeriesPoint[];
}

const byNewest = [...adminActivity].sort((a, b) => +new Date(b.at) - +new Date(a.at));

export const dashboardService = {
  async publicOverview(): Promise<PublicOverview> {
    return USE_MOCKS ? mock<PublicOverview>({ activeDonors: 4349, donationsArranged: 8902, bloodRequests: 1240, users: 0 }) : dataCall<PublicOverview>("public", "overview");
  },
  async userOverview(): Promise<UserOverview> {
    return USE_MOCKS ? mock<UserOverview>({ stats: userStats, activity: userActivity }) : dataCall<UserOverview>("dashboard", "userOverview");
  },
  async adminOverview(): Promise<AdminOverview> {
    return USE_MOCKS
      ? mock<AdminOverview>({ stats: adminStats, activity: byNewest, monthlyDonations, monthlyRequests, donorGroupDistribution, requestStatusBreakdown })
      : dataCall<AdminOverview>("dashboard", "adminOverview");
  },
  async reports(): Promise<Reports> {
    return USE_MOCKS
      ? mock<Reports>({ monthlyDonations, monthlyRequests, fulfillmentRate, groupDemand, cityDemand, donorGroupDistribution, requestStatusBreakdown })
      : dataCall<Reports>("dashboard", "reports");
  },
  async activityLog(): Promise<ActivityItem[]> {
    return USE_MOCKS ? mock(byNewest) : dataCall<ActivityItem[]>("dashboard", "activityLog");
  },
};
