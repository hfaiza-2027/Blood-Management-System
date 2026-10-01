import type { BloodInventory } from "@/types";

const updatedAt = "2026-09-27T09:45:00+05:00";

export const mockInventory: BloodInventory[] = [
  { bloodGroup: "A+", available: 142, reserved: 18, expired: 4, required: 90, capacity: 220, updatedAt },
  { bloodGroup: "A-", available: 11, reserved: 3, expired: 1, required: 20, capacity: 50, updatedAt },
  { bloodGroup: "B+", available: 168, reserved: 24, expired: 6, required: 120, capacity: 260, updatedAt },
  { bloodGroup: "B-", available: 9, reserved: 2, expired: 0, required: 18, capacity: 45, updatedAt },
  { bloodGroup: "O+", available: 121, reserved: 31, expired: 3, required: 130, capacity: 260, updatedAt },
  { bloodGroup: "O-", available: 6, reserved: 4, expired: 0, required: 30, capacity: 70, updatedAt },
  { bloodGroup: "AB+", available: 47, reserved: 5, expired: 2, required: 25, capacity: 80, updatedAt },
  { bloodGroup: "AB-", available: 4, reserved: 1, expired: 0, required: 8, capacity: 25, updatedAt },
];
