import type { BloodGroup } from "./common";

export type StockLevel = "normal" | "low" | "critical";

export interface BloodInventory {
  bloodGroup: BloodGroup;
  available: number;
  reserved: number;
  expired: number;
  required: number;
  capacity: number;
  updatedAt: string;
}
