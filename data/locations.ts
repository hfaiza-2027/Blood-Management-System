import type { ApproxLocation, CityLocation, GeoPoint } from "@/types";

/** Approximate centroids of areas. Donor positions are jittered around these. */
export const AREA_POINTS: Record<string, Record<string, GeoPoint>> = {
  Lahore: {
    "Johar Town": { lat: 31.4697, lng: 74.2728 },
    Gulberg: { lat: 31.5204, lng: 74.3487 },
    "Model Town": { lat: 31.4834, lng: 74.3256 },
    "DHA Phase 5": { lat: 31.464, lng: 74.41 },
    "Iqbal Town": { lat: 31.5102, lng: 74.2885 },
    Township: { lat: 31.4505, lng: 74.308 },
    Shadman: { lat: 31.539, lng: 74.328 },
    "Wapda Town": { lat: 31.433, lng: 74.266 },
    "Faisal Town": { lat: 31.48, lng: 74.305 },
    Cantt: { lat: 31.51, lng: 74.39 },
  },
  Sheikhupura: {
    "Kot Abdul Malik": { lat: 31.6, lng: 74.22 },
    "Civil Lines": { lat: 31.7131, lng: 73.9783 },
    "Sharaqpur Road": { lat: 31.7, lng: 74.0 },
    Jandiala: { lat: 31.74, lng: 74.03 },
  },
  Karachi: {
    Clifton: { lat: 24.8138, lng: 67.03 },
    "Gulshan-e-Iqbal": { lat: 24.918, lng: 67.0971 },
    PECHS: { lat: 24.87, lng: 67.06 },
    "North Nazimabad": { lat: 24.942, lng: 67.04 },
  },
  Islamabad: {
    "F-7": { lat: 33.7215, lng: 73.055 },
    "G-9": { lat: 33.69, lng: 73.03 },
    "I-8": { lat: 33.668, lng: 73.075 },
    "E-11": { lat: 33.698, lng: 72.979 },
  },
  Faisalabad: {
    "Peoples Colony": { lat: 31.41, lng: 73.108 },
    "Madina Town": { lat: 31.42, lng: 73.11 },
    "Susan Road": { lat: 31.43, lng: 73.1 },
  },
};

export function loc(city: string, area: string, jitter = 0): ApproxLocation {
  const p = AREA_POINTS[city]?.[area] ?? { lat: 31.52, lng: 74.35 };
  return { city, area, point: { lat: p.lat + jitter * 0.01, lng: p.lng - jitter * 0.008 } };
}

export const mockLocations: CityLocation[] = [
  { id: "loc-lhr", city: "Lahore", areas: Object.keys(AREA_POINTS.Lahore), activeDonors: 1842, openRequests: 37, facilities: 9 },
  { id: "loc-skp", city: "Sheikhupura", areas: Object.keys(AREA_POINTS.Sheikhupura), activeDonors: 312, openRequests: 6, facilities: 1 },
  { id: "loc-khi", city: "Karachi", areas: Object.keys(AREA_POINTS.Karachi), activeDonors: 1206, openRequests: 22, facilities: 1 },
  { id: "loc-isb", city: "Islamabad", areas: Object.keys(AREA_POINTS.Islamabad), activeDonors: 588, openRequests: 9, facilities: 1 },
  { id: "loc-fsd", city: "Faisalabad", areas: Object.keys(AREA_POINTS.Faisalabad), activeDonors: 401, openRequests: 5, facilities: 1 },
];
