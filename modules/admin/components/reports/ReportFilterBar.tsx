"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReportPreset } from "@/types";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/Field";
import { BLOOD_GROUPS } from "@/lib/constants";
import { DEFAULT_PRESET, REPORT_PRESETS, toDateInput } from "@/lib/reportRange";
import { cn } from "@/lib/utils";

export interface FilterState {
  range: ReportPreset;
  from: string;
  to: string;
  city: string;
  group: string;
  urgency: string;
  hospital: string;
}

interface Props {
  initial: FilterState;
  cities: string[];
  hospitals: { id: string; name: string; city: string }[];
}

const dateInput = "h-10 rounded border border-line bg-white px-3 text-sm text-ink-900 focus:border-hemo-500 focus:outline-none focus:ring-2 focus:ring-hemo-500/30";

/** Report filters live in the URL so a report can be bookmarked or shared with the same view. */
export function ReportFilterBar({ initial, cities, hospitals }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState<FilterState>(initial);
  const [dateError, setDateError] = useState<string>();

  // Keep local state in step when the server re-renders with new params (e.g. browser back).
  useEffect(() => setF(initial), [initial]);

  function apply(next: FilterState) {
    setF(next);
    if (next.range === "custom") {
      if (!next.from || !next.to) return; // wait until both dates are chosen
      if (next.from > next.to) return setDateError("The start date must be before the end date.");
    }
    setDateError(undefined);
    const q = new URLSearchParams();
    if (next.range !== DEFAULT_PRESET) q.set("range", next.range);
    if (next.range === "custom") {
      q.set("from", next.from);
      q.set("to", next.to);
    }
    if (next.city) q.set("city", next.city);
    if (next.group) q.set("group", next.group);
    if (next.urgency) q.set("urgency", next.urgency);
    if (next.hospital) q.set("hospital", next.hospital);
    const qs = q.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const set = (k: keyof FilterState) => (e: { target: { value: string } }) => {
    const next = { ...f, [k]: e.target.value };
    // Switching to a custom range starts from the dates currently shown.
    if (k === "range" && e.target.value === "custom" && (!f.from || !f.to)) {
      next.from = initial.from;
      next.to = initial.to;
    }
    apply(next as FilterState);
  };

  const active = f.city || f.group || f.urgency || f.hospital || f.range !== DEFAULT_PRESET;
  const visibleHospitals = f.city ? hospitals.filter((h) => h.city === f.city) : hospitals;
  const today = toDateInput(new Date());

  return (
    <section aria-label="Report filters" className="rounded-card border border-line bg-white p-4 shadow-card print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 pr-1 text-[13px] font-semibold text-ink-700">
          <CalendarRange className="h-4 w-4 text-ink-400" aria-hidden /> Period
        </span>
        <FilterSelect label="Date range" value={f.range} onChange={set("range")} className="w-full sm:w-44">
          {REPORT_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </FilterSelect>
        {f.range === "custom" && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="r-from">From</label>
            <input id="r-from" type="date" className={cn(dateInput, "min-w-0 flex-1 sm:w-40")} value={f.from} max={f.to || today} onChange={set("from")} />
            <span className="text-sm text-ink-400" aria-hidden>to</span>
            <label className="sr-only" htmlFor="r-to">To</label>
            <input id="r-to" type="date" className={cn(dateInput, "min-w-0 flex-1 sm:w-40")} value={f.to} min={f.from} max={today} onChange={set("to")} />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {pending && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-500" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Updating…
            </span>
          )}
          {active && (
            <Button
              size="sm"
              variant="ghost"
              icon={<RotateCcw className="h-4 w-4" aria-hidden />}
              onClick={() => apply({ range: DEFAULT_PRESET, from: "", to: "", city: "", group: "", urgency: "", hospital: "" })}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
      {dateError && <p className="mt-2 text-[13px] text-hemo-700" role="alert">{dateError}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <FilterSelect label="City" value={f.city} onChange={(e) => apply({ ...f, city: e.target.value, hospital: "" })}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>
        <FilterSelect label="Blood group" value={f.group} onChange={set("group")}>
          <option value="">All blood groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </FilterSelect>
        <FilterSelect label="Urgency" value={f.urgency} onChange={set("urgency")}>
          <option value="">Any urgency</option>
          <option value="emergency">Emergency</option>
          <option value="urgent">Urgent</option>
          <option value="normal">Normal</option>
        </FilterSelect>
        <FilterSelect label="Facility" value={f.hospital} onChange={set("hospital")}>
          <option value="">All facilities</option>
          {visibleHospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </FilterSelect>
      </div>
    </section>
  );
}
