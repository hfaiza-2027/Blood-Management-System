import type { Donor, DonorSearchFilters, GeoPoint, NearbyDonor } from "@/types";
import { dataCall } from "./client";

export async function getNearbyDonors(origin: GeoPoint, filters: DonorSearchFilters = {}): Promise<NearbyDonor[]> {
  return dataCall<NearbyDonor[]>("donors", "nearby", { origin, filters });
}

export const donorService = {
  getNearbyDonors,
  list: () => dataCall<Donor[]>("donors", "list"),
  getById: (id: string) => dataCall<Donor | null>("donors", "getById", { id }).then((d) => d ?? undefined),
  setVerification: (id: string, verification: Donor["verification"]) =>
    dataCall<{ id: string; verification: Donor["verification"] }>("donors", "setVerification", { id, verification }),
  setStatus: (id: string, status: Donor["status"]) => dataCall<{ id: string; status: Donor["status"] }>("donors", "setStatus", { id, status }),
  registerDonor: (input: Partial<Donor>) => dataCall<{ donorId: string; verification: Donor["verification"] }>("donors", "registerDonor", { input }),
  updateAvailability: (availability: Donor["availability"], donorId?: string) =>
    dataCall<{ availability: Donor["availability"] }>("donors", "updateAvailability", { availability, donorId }),
  contactDonor: (donorId: string, requestCode?: string) =>
    dataCall<{ sent: boolean; donorId: string; requestCode?: string }>("donors", "contactDonor", { donorId, requestCode }),
};
