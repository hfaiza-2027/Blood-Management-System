import type { CityLocation, FacilityType, GeoPoint, Hospital } from "@/types";
import { dataCall } from "./client";

export const hospitalService = {
  list: (type?: FacilityType, origin?: GeoPoint) => dataCall<Hospital[]>("hospitals", "list", { type, origin }),
  donationSites: (origin?: GeoPoint) => dataCall<Hospital[]>("hospitals", "donationSites", { origin }),
  save: (h: Hospital) => dataCall<Hospital>("hospitals", "save", { h }),
  remove: (id: string) => dataCall<{ id: string }>("hospitals", "remove", { id }),
  locations: () => dataCall<CityLocation[]>("hospitals", "locations"),
  saveLocation: (location: { id?: string; city: string; areas: string[] }) =>
    dataCall<{ id: string; city: string; areas: string[] }>("hospitals", "saveLocation", { location }),
};
