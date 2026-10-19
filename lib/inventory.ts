import type { BloodInventory, StockLevel } from "@/types";

/** Below half the target is critical, below the target is low. Safe to use in the browser and on the server. */
export function stockLevel(i: Pick<BloodInventory, "available" | "required">): StockLevel {
  const ratio = i.available / Math.max(1, i.required);
  if (ratio < 0.5) return "critical";
  if (ratio < 1) return "low";
  return "normal";
}
