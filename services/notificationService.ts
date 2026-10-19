import type { Notification } from "@/types";
import { dataCall } from "./client";

export interface BroadcastRecord { id: string; title: string; body: string; audience: string; sent: number; at: string; by?: string }

export const notificationService = {
  list: () => dataCall<Notification[]>("notifications", "list"),
  markRead: (ids: string[]) => dataCall<{ ids: string[] }>("notifications", "markRead", { ids }),
  markAllRead: () => dataCall<{ ok: boolean }>("notifications", "markAllRead"),
  unreadCount: async () => (await dataCall<{ count: number }>("notifications", "unreadCount")).count,
  broadcastHistory: () => dataCall<BroadcastRecord[]>("notifications", "broadcastHistory"),
  broadcast: (input: { title: string; body: string; audience: string }) => dataCall<{ sent: number }>("notifications", "broadcast", { input }),
};
