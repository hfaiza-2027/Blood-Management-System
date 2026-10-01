import { dataCall, mock, USE_MOCKS } from "./client";

export type SystemStatus = Record<"hospitals" | "inventory" | "locations" | "users" | "donors" | "bloodRequests", number>;

export const systemService = {
  live: !USE_MOCKS,
  async status(): Promise<SystemStatus> {
    return USE_MOCKS
      ? mock({ hospitals: 12, inventory: 8, locations: 5, users: 19, donors: 69, bloodRequests: 16 })
      : dataCall<SystemStatus>("system", "status");
  },
  async getSettings<T>(): Promise<T | null> {
    return USE_MOCKS ? mock(null) : dataCall<T | null>("system", "getSettings");
  },
  async saveSettings(patch: Record<string, unknown>): Promise<{ ok: boolean }> {
    return USE_MOCKS ? mock({ ok: true }, 600) : dataCall<{ ok: boolean }>("system", "saveSettings", patch);
  },
  /** Loads partner facilities, stock levels and cities into an empty database. */
  async seed(): Promise<{ written: Record<string, number> }> {
    return USE_MOCKS ? mock({ written: {} }, 600) : dataCall<{ written: Record<string, number> }>("system", "seed");
  },
};
