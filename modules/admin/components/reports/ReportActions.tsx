"use client";

import { Download, Printer } from "lucide-react";
import type { ReportData } from "@/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { describeRange, toDateInput } from "@/lib/reportRange";

type Cell = string | number | null;

const esc = (v: Cell) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV with a titled block per report section, ready for Excel or Google Sheets. */
export function reportToCsv(r: ReportData, filterSummary: string): string {
  const blocks: Cell[][][] = [];
  const k = r.kpis;
  blocks.push([
    ["BloodBridge report"],
    ["Period", describeRange(r.filters.from, r.filters.to)],
    ["Compared with", describeRange(r.previous.from, r.previous.to)],
    ["Filters", filterSummary],
    ["Generated", new Date(r.generatedAt).toISOString()],
  ]);
  blocks.push([
    ["Summary", "This period", "Previous period"],
    ["Requests", k.requests.value, k.requests.previous],
    ["Units requested", k.unitsRequested.value, k.unitsRequested.previous],
    ["Fulfilment rate (%)", k.fulfilmentRate.value, k.fulfilmentRate.previous],
    ["Units fulfilled (%)", k.unitFulfilmentRate.value, k.unitFulfilmentRate.previous],
    ["Emergency requests", k.emergencies.value, k.emergencies.previous],
    ["Emergencies met on time (%)", k.emergencyOnTimeRate.value, k.emergencyOnTimeRate.previous],
    ["Median hours to first response", k.medianHoursToFirstResponse.value, k.medianHoursToFirstResponse.previous],
    ["Median hours to fulfil", k.medianHoursToFulfil.value, k.medianHoursToFulfil.previous],
    ["Donations completed", k.donationsCompleted.value, k.donationsCompleted.previous],
    ["New donors", k.newDonors.value, k.newDonors.previous],
    ["New members", k.newMembers.value, k.newMembers.previous],
    ["Stock units in", k.unitsIn.value, k.unitsIn.previous],
    ["Stock units out", k.unitsOut.value, k.unitsOut.previous],
  ]);
  blocks.push([["Trend", "Requests", "Units requested", "Donations completed", "Fulfilment rate (%)"], ...r.trend.map((t) => [t.key, t.requests, t.unitsRequested, t.donations, t.fulfilmentRate])]);
  blocks.push([["Request status", "Requests"], ...r.requestStatus.map((s) => [s.label, s.value])]);
  blocks.push([["Urgency", "Requests"], ...r.urgency.map((s) => [s.label, s.value])]);
  blocks.push([["Blood group", "Requests", "Units requested", "Units fulfilled", "Active donors", "Units in stock", "Stock level"], ...r.groups.map((g) => [g.group, g.requests, g.unitsRequested, g.unitsFulfilled, g.activeDonors, g.availableUnits, g.stockLevel])]);
  blocks.push([["City", "Requests", "Fulfilled", "Emergencies", "Donations completed"], ...r.cities.map((c) => [c.city, c.requests, c.fulfilled, c.emergencies, c.donations])]);
  blocks.push([["Facility", "City", "Requests", "Units requested", "Fulfilled", "Median hours to fulfil"], ...r.hospitals.map((h) => [h.name, h.city, h.requests, h.unitsRequested, h.fulfilled, h.medianHoursToFulfil])]);
  blocks.push([["Donation outcome", "Donations"], ...r.donationOutcomes.map((d) => [d.label, d.value])]);
  blocks.push([["Inventory", "Available", "Required", "Level", "Units in", "Units out"], ...r.inventory.map((i) => [i.group, i.available, i.required, i.stockLevel, i.unitsIn, i.unitsOut])]);
  blocks.push([["Donor verification", "Donors"], ...r.donorVerification.map((d) => [d.label, d.value])]);
  // Excel needs the BOM to read UTF-8 (e.g. en dashes in dates) correctly.
  return "﻿" + blocks.map((b) => b.map((row) => row.map(esc).join(",")).join("\n")).join("\n\n");
}

export function ReportActions({ report, filterSummary }: { report: ReportData; filterSummary: string }) {
  const toast = useToast();

  function download() {
    const csv = reportToCsv(report, filterSummary);
    const name = `bloodbridge-report-${toDateInput(report.filters.from)}-to-${toDateInput(report.filters.to)}.csv`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Report downloaded.", name);
  }

  return (
    <div className="flex gap-2 print:hidden">
      <Button variant="outline" icon={<Printer className="h-4 w-4" aria-hidden />} onClick={() => window.print()}>Print / PDF</Button>
      <Button variant="secondary" icon={<Download className="h-4 w-4" aria-hidden />} onClick={download}>Export CSV</Button>
    </div>
  );
}
