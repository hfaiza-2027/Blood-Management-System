import type { BloodGroup, Urgency } from "./common";
import type { StockLevel } from "./inventory";

/** Preset ranges offered in the report filter bar. */
export type ReportPreset = "7d" | "30d" | "90d" | "12m" | "ytd" | "custom";

/** Filters for the admin report. Dates are ISO strings (inclusive range). */
export interface ReportFilters {
  from: string;
  to: string;
  city?: string;
  bloodGroup?: BloodGroup;
  urgency?: Urgency;
  hospitalId?: string;
}

export type ReportBucket = "day" | "week" | "month";

/** A headline number with the same figure for the previous period of equal length. */
export interface ReportMetric {
  value: number | null;
  previous: number | null;
}

export interface ReportTrendPoint {
  key: string;
  label: string;
  requests: number;
  unitsRequested: number;
  donations: number;
  /** Share of requests created in this bucket that were fulfilled; null when there were none. */
  fulfilmentRate: number | null;
}

export interface ReportGroupRow {
  group: BloodGroup;
  requests: number;
  unitsRequested: number;
  unitsFulfilled: number;
  activeDonors: number;
  availableUnits: number;
  stockLevel: StockLevel;
}

export interface ReportCityRow {
  city: string;
  requests: number;
  fulfilled: number;
  emergencies: number;
  donations: number;
}

export interface ReportHospitalRow {
  hospitalId: string;
  name: string;
  city: string;
  requests: number;
  unitsRequested: number;
  fulfilled: number;
  medianHoursToFulfil: number | null;
}

export interface ReportInventoryRow {
  group: BloodGroup;
  available: number;
  required: number;
  stockLevel: StockLevel;
  unitsIn: number;
  unitsOut: number;
}

export interface ReportData {
  filters: ReportFilters;
  previous: { from: string; to: string };
  bucket: ReportBucket;
  generatedAt: string;
  kpis: {
    requests: ReportMetric;
    unitsRequested: ReportMetric;
    fulfilmentRate: ReportMetric;
    unitFulfilmentRate: ReportMetric;
    emergencies: ReportMetric;
    emergencyOnTimeRate: ReportMetric;
    medianHoursToFirstResponse: ReportMetric;
    medianHoursToFulfil: ReportMetric;
    donationsCompleted: ReportMetric;
    newDonors: ReportMetric;
    newMembers: ReportMetric;
    unitsIn: ReportMetric;
    unitsOut: ReportMetric;
  };
  trend: ReportTrendPoint[];
  requestStatus: { label: string; value: number }[];
  urgency: { label: string; value: number }[];
  donationOutcomes: { label: string; value: number }[];
  groups: ReportGroupRow[];
  cities: ReportCityRow[];
  hospitals: ReportHospitalRow[];
  inventory: ReportInventoryRow[];
  donorVerification: { label: string; value: number }[];
  /** Notes about the data, e.g. which figures ignore a filter. */
  notes: string[];
}
