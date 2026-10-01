import type { GeoPoint } from "@/types";

/** Great-circle distance in km (Haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

/**
 * Coarsen a coordinate to roughly 1 km so exact homes can't be inferred.
 * Real backends should apply this server-side before data leaves the API.
 */
export function coarsen(p: GeoPoint): GeoPoint {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 };
}

/** Default location used when the browser does not share one (Johar Town, Lahore). */
export const DEFAULT_POINT: GeoPoint = { lat: 31.4697, lng: 74.2728 };
