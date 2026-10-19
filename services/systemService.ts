import { dataCall } from "./client";

export type SystemStatus = Record<"hospitals" | "inventory" | "locations" | "users" | "donors" | "bloodRequests", number>;

export const systemService = {
  status: () => dataCall<SystemStatus>("system", "status"),
  getSettings: <T>() => dataCall<T | null>("system", "getSettings"),
  saveSettings: (patch: Record<string, unknown>) => dataCall<{ ok: boolean }>("system", "saveSettings", patch),
  /** Loads sample facilities, stock targets and cities into an empty database. */
  seed: () => dataCall<{ written: Record<string, number> }>("system", "seed"),
};
