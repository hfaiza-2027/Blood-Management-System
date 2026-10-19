import type { BloodInventory } from "@/types";
import { dataCall } from "./client";

export { stockLevel } from "@/lib/inventory";

export interface InventoryMovement {
  id: string;
  group: BloodInventory["bloodGroup"];
  delta: number;
  reason: string | null;
  balance: number;
  at: string;
  by: string;
}

export const inventoryService = {
  list: () => dataCall<BloodInventory[]>("inventory", "list"),
  adjust: (group: string, delta: number, reason: string) =>
    dataCall<{ group: string; delta: number; reason: string; available: number }>("inventory", "adjust", { group, delta, reason }),
  movements: (limit = 50) => dataCall<InventoryMovement[]>("inventory", "movements", { limit }),
};
