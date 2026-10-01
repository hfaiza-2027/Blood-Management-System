import type { ActivityItem, AdminDashboardStats, GroupShare, SeriesPoint, UserDashboardStats } from "@/types";

export const userStats: UserDashboardStats = {
  totalDonations: 5,
  livesHelped: 15,
  activeRequests: 2,
  pendingRequests: 1,
};

export const adminStats: AdminDashboardStats = {
  totalUsers: 12_486,
  activeDonors: 4_349,
  bloodRequests: 1_127,
  completedDonations: 8_902,
  emergencyRequests: 4,
  availableUnits: 508,
};

export const monthlyDonations: SeriesPoint[] = [
  { label: "Oct", value: 612 }, { label: "Nov", value: 648 }, { label: "Dec", value: 702 },
  { label: "Jan", value: 588 }, { label: "Feb", value: 604 }, { label: "Mar", value: 541 },
  { label: "Apr", value: 667 }, { label: "May", value: 719 }, { label: "Jun", value: 694 },
  { label: "Jul", value: 736 }, { label: "Aug", value: 812 }, { label: "Sep", value: 779 },
];

export const monthlyRequests: SeriesPoint[] = [
  { label: "Oct", value: 81 }, { label: "Nov", value: 88 }, { label: "Dec", value: 97 },
  { label: "Jan", value: 84 }, { label: "Feb", value: 79 }, { label: "Mar", value: 90 },
  { label: "Apr", value: 94 }, { label: "May", value: 102 }, { label: "Jun", value: 111 },
  { label: "Jul", value: 98 }, { label: "Aug", value: 124 }, { label: "Sep", value: 119 },
];

export const fulfillmentRate: SeriesPoint[] = [
  { label: "Oct", value: 81 }, { label: "Nov", value: 83 }, { label: "Dec", value: 79 },
  { label: "Jan", value: 84 }, { label: "Feb", value: 86 }, { label: "Mar", value: 85 },
  { label: "Apr", value: 88 }, { label: "May", value: 87 }, { label: "Jun", value: 89 },
  { label: "Jul", value: 90 }, { label: "Aug", value: 88 }, { label: "Sep", value: 91 },
];

export const donorGroupDistribution: GroupShare[] = [
  { group: "B+", value: 1306 }, { group: "O+", value: 1172 }, { group: "A+", value: 954 }, { group: "AB+", value: 302 },
  { group: "B-", value: 176 }, { group: "O-", value: 181 }, { group: "A-", value: 168 }, { group: "AB-", value: 90 },
];

export const groupDemand: GroupShare[] = [
  { group: "O+", value: 312 }, { group: "B+", value: 288 }, { group: "A+", value: 201 }, { group: "O-", value: 96 },
  { group: "AB+", value: 74 }, { group: "A-", value: 58 }, { group: "B-", value: 55 }, { group: "AB-", value: 23 },
];

export const requestStatusBreakdown: SeriesPoint[] = [
  { label: "Pending", value: 38 },
  { label: "Active", value: 61 },
  { label: "Fulfilled", value: 982 },
  { label: "Cancelled", value: 46 },
];

export const cityDemand: SeriesPoint[] = [
  { label: "Lahore", value: 548 }, { label: "Karachi", value: 301 }, { label: "Islamabad", value: 127 },
  { label: "Faisalabad", value: 88 }, { label: "Sheikhupura", value: 63 },
];

export const userActivity: ActivityItem[] = [
  { id: "a1", kind: "request", message: "You created request REQ-24122 for O- blood at Ravi Valley General Hospital", at: "2026-09-27T05:30:00+05:00" },
  { id: "a2", kind: "accepted", message: "Ali Raza accepted your request for Parveen Akhtar", at: "2026-09-27T07:10:00+05:00" },
  { id: "a3", kind: "donation", message: "Donation completed at Model Town Thalassaemia & Blood Bank", at: "2026-08-13T12:15:00+05:00" },
  { id: "a4", kind: "profile", message: "You updated your availability to Available", at: "2026-08-02T20:40:00+05:00" },
];

export const adminActivity: ActivityItem[] = [
  { id: "aa1", kind: "request", actor: "Shoaib Yousaf", message: "created an emergency O+ request at Shalimar Heart & Trauma Centre", at: "2026-09-27T10:00:00+05:00" },
  { id: "aa2", kind: "verification", actor: "Sana Mirza", message: "verified donor Iqra Hussain (AB+)", at: "2026-09-27T09:48:00+05:00" },
  { id: "aa3", kind: "inventory", actor: "Model Town Blood Bank", message: "updated stock: +12 B+, −3 O-", at: "2026-09-27T09:45:00+05:00" },
  { id: "aa4", kind: "accepted", actor: "Ali Raza", message: "accepted request REQ-24073", at: "2026-09-27T07:10:00+05:00" },
  { id: "aa5", kind: "user", actor: "Mahnoor Iqbal", message: "registered and submitted donor details for review", at: "2026-09-27T06:20:00+05:00" },
  { id: "aa6", kind: "donation", actor: "Kamran Javed", message: "completed a donation at Canal View Donation Centre", at: "2026-09-26T17:05:00+05:00" },
  { id: "aa7", kind: "system", actor: "System", message: "sent 14 emergency alerts for REQ-24031", at: "2026-09-27T08:32:00+05:00" },
  { id: "aa8", kind: "user", actor: "Sana Mirza", message: "suspended user Imran Aslam after repeated no-shows", at: "2026-09-25T15:12:00+05:00" },
  { id: "aa9", kind: "request", actor: "Farah Naz", message: "marked request REQ-24052 as fulfilled", at: "2026-09-26T13:40:00+05:00" },
  { id: "aa10", kind: "inventory", actor: "Iqbal Town Community Blood Bank", message: "discarded 4 expired A+ units", at: "2026-09-26T09:15:00+05:00" },
  { id: "aa11", kind: "verification", actor: "Usman Tariq", message: "rejected donor documents for Bilal Ahmed (unreadable CNIC scan)", at: "2026-09-25T18:30:00+05:00" },
  { id: "aa12", kind: "system", actor: "System", message: "auto-expired 3 requests past their required-by time", at: "2026-09-25T00:05:00+05:00" },
  { id: "aa13", kind: "donation", actor: "Hira Batool", message: "booked an appointment at Canal View Donation Centre", at: "2026-09-24T20:10:00+05:00" },
  { id: "aa14", kind: "user", actor: "Sana Mirza", message: "added Wapda Town Family Hospital as a partner facility", at: "2026-09-24T11:00:00+05:00" },
];
