import type { BloodRequest, BloodRequestInput, GeoPoint, RequestStatus } from "@/types";
import { dataCall } from "./client";

export type RequestWithDistance = BloodRequest & { distanceKm: number };

const OPEN: RequestStatus[] = ["pending", "approved", "matching", "donor_found", "partially_fulfilled"];
export const isOpen = (r: BloodRequest) => OPEN.includes(r.status);

export const bloodRequestService = {
  list: (origin?: GeoPoint) => dataCall<RequestWithDistance[]>("bloodRequests", "list", { origin }),
  listMine: () => dataCall<BloodRequest[]>("bloodRequests", "listMine"),
  getById: (id: string) => dataCall<BloodRequest | null>("bloodRequests", "getById", { id }).then((r) => r ?? undefined),
  async nearbyEmergencies(origin: GeoPoint, radiusKm = 25) {
    const rows = await dataCall<RequestWithDistance[]>("bloodRequests", "nearbyPublic", { origin, radiusKm });
    return rows.filter((r) => isOpen(r) && r.urgency !== "normal" && r.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm);
  },
  create: (input: BloodRequestInput) => dataCall<BloodRequest>("bloodRequests", "create", { input }),
  respond: (requestId: string) => dataCall<{ requestId: string; accepted: boolean }>("bloodRequests", "respond", { requestId }),
  updateStatus: (requestId: string, status: RequestStatus) => dataCall<{ requestId: string; status: RequestStatus }>("bloodRequests", "updateStatus", { requestId, status }),
  cancel: (requestId: string) => dataCall<{ requestId: string; status: "cancelled" }>("bloodRequests", "cancel", { requestId }),
  openEmergencyCount: async () => (await dataCall<{ count: number }>("bloodRequests", "openEmergencyCount")).count,
  assignDonors: (requestId: string, donorIds: string[]) => dataCall<{ requestId: string; assigned: number }>("bloodRequests", "assignDonors", { requestId, donorIds }),
};
