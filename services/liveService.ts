import { dataCall } from "./client";

/** Counters the app watches to know when to refresh. Admin-only fields are absent for members. */
export interface LiveCounts { unread: number; newMessages?: number; emergencies?: number }

export const liveService = {
  counts: () => dataCall<LiveCounts>("live", "counts"),
};
