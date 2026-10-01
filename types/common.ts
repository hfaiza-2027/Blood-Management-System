export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";
export type Gender = "male" | "female" | "other";
export type Urgency = "normal" | "urgent" | "emergency";
export type ID = string;

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Public-safe location: never contains a street address. */
export interface ApproxLocation {
  city: string;
  area: string;
  point: GeoPoint;
}
