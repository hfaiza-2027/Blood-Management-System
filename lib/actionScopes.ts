/**
 * Which module each data action belongs to. Safe to import anywhere: the
 * browser uses it to pick the endpoint (/api/data or /api/admin), the server
 * uses it to decide who may run the action.
 */
export const PUBLIC_ACTIONS = [
  "inventory:list", "hospitals:list", "hospitals:locations", "bloodRequests:nearbyPublic", "public:overview", "contact:submit",
] as const;

export const ADMIN_ACTIONS = [
  "users:list", "users:setStatus", "users:verify", "users:remove",
  "donors:list", "donors:setVerification", "donors:setStatus",
  "bloodRequests:updateStatus", "bloodRequests:assignDonors", "bloodRequests:openEmergencyCount",
  "donations:listAll", "donations:updateStatus",
  "hospitals:save", "hospitals:remove", "hospitals:saveLocation", "inventory:adjust", "inventory:movements",
  "notifications:broadcast", "notifications:broadcastHistory",
  "contactMessages:list", "contactMessages:setStatus", "contactMessages:newCount",
  "dashboard:adminOverview", "dashboard:reports", "dashboard:activityLog",
  "system:seed", "system:status", "system:getSettings", "system:saveSettings",
] as const;

const PUBLIC = new Set<string>(PUBLIC_ACTIONS);
const ADMIN = new Set<string>(ADMIN_ACTIONS);

export type ActionScope = "public" | "client" | "admin";

export function scopeOf(key: string): ActionScope {
  return PUBLIC.has(key) ? "public" : ADMIN.has(key) ? "admin" : "client";
}
