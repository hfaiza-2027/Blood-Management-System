"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LocateFixed, RotateCcw, SlidersHorizontal, UsersRound } from "lucide-react";
import type { BloodGroup, DonorSearchFilters, GeoPoint, NearbyDonor } from "@/types";
import { getNearbyDonors } from "@/services/donorService";
import { DonorCard } from "@/components/blood/DonorCard";
import { ContactDonorButton } from "@/modules/client/components/Actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { BLOOD_GROUPS, CITIES, CITY_NAMES, canReceiveFrom } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";

export interface DonorSearchInitial {
  group: BloodGroup | "any";
  city: string;
  compatible: boolean;
}

interface Props {
  origin: GeoPoint;
  originLabel: string;
  initial: DonorSearchInitial;
}

const DISTANCES = [
  { value: "0", label: "Any distance" },
  { value: "5", label: "Within 5 km" },
  { value: "10", label: "Within 10 km" },
  { value: "25", label: "Within 25 km" },
  { value: "50", label: "Within 50 km" },
];

export function DonorSearch({ origin, originLabel, initial }: Props) {
  const toast = useToast();
  const [filters, setFilters] = useState<DonorSearchFilters>({
    bloodGroup: initial.group,
    compatibleOnly: initial.compatible,
    city: initial.city,
    availability: "available",
    gender: "any",
  });
  const [point, setPoint] = useState<GeoPoint>(origin);
  const [pointLabel, setPointLabel] = useState(originLabel);
  const [rows, setRows] = useState<NearbyDonor[] | null>(null);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    setError(false);
    try {
      setRows(await getNearbyDonors(point, filters));
    } catch {
      setError(true);
    }
  }, [point, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof DonorSearchFilters>(key: K, value: DonorSearchFilters[K]) {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      if (key === "city") next.area = undefined;
      return next;
    });
  }

  function reset() {
    setFilters({ bloodGroup: "any", compatibleOnly: false, city: "", availability: "any", gender: "any" });
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPointLabel("your current location");
        setLocating(false);
        toast.success("Using your current location.", "Distances are now measured from where you are.");
      },
      () => {
        setLocating(false);
        toast.info("We couldn't get your location.", `Distances are still measured from ${originLabel}.`);
      },
      { timeout: 8000 },
    );
  }

  const group = filters.bloodGroup ?? "any";
  const compatibleGroups = useMemo(() => (group === "any" ? [] : canReceiveFrom(group)), [group]);
  const areas = filters.city ? CITIES[filters.city] ?? [] : [];
  const availableCount = rows?.filter((r) => r.availability === "available").length ?? 0;

  const filterControls = (
    <>
      <Select id="df-1" label="Blood group" value={group} onChange={(e) => update("bloodGroup", e.target.value as BloodGroup | "any")}>
        <option value="any">All blood groups</option>
        {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
      </Select>
      <Select id="df-2" label="City" value={filters.city ?? ""} onChange={(e) => update("city", e.target.value)}>
        <option value="">All cities</option>
        {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      <Select id="df-3" label="Area" value={filters.area ?? ""} disabled={!filters.city} onChange={(e) => update("area", e.target.value || undefined)}>
        <option value="">{filters.city ? "All areas" : "Choose a city first"}</option>
        {areas.map((a) => <option key={a} value={a}>{a}</option>)}
      </Select>
      <Select id="df-4" label="Distance" value={String(filters.maxDistanceKm ?? 0)} onChange={(e) => update("maxDistanceKm", Number(e.target.value) || undefined)}>
        {DISTANCES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </Select>
      <Select id="df-5" label="Availability" value={filters.availability ?? "any"} onChange={(e) => update("availability", e.target.value as DonorSearchFilters["availability"])}>
        <option value="any">Any availability</option>
        <option value="available">Available now</option>
        <option value="temporarily_unavailable">Temporarily unavailable</option>
        <option value="unavailable">Unavailable</option>
      </Select>
      <Select id="df-6" label="Last donation" value={String(filters.lastDonationWithinDays ?? 0)} onChange={(e) => update("lastDonationWithinDays", Number(e.target.value) || undefined)}>
        <option value="0">Any last donation</option>
        <option value="180">Donated in last 6 months</option>
        <option value="365">Donated in last year</option>
      </Select>
      <Select id="df-7" label="Gender" value={filters.gender ?? "any"} onChange={(e) => update("gender", e.target.value as DonorSearchFilters["gender"])}>
        <option value="any">Any gender</option>
        <option value="female">Female donors</option>
        <option value="male">Male donors</option>
      </Select>
    </>
  );

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <label className="inline-flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300 text-hemo-600 focus:ring-hemo-500"
                checked={Boolean(filters.compatibleOnly)}
                disabled={group === "any"}
                onChange={(e) => update("compatibleOnly", e.target.checked)}
              />
              Include all compatible groups
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ink-300 text-hemo-600 focus:ring-hemo-500"
                checked={Boolean(filters.verifiedOnly)}
                onChange={(e) => update("verifiedOnly", e.target.checked)}
              />
              Verified donors only
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={locateMe} loading={locating} loadingText="Locating…" icon={<LocateFixed className="h-4 w-4" aria-hidden />}>
              Use my location
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} icon={<RotateCcw className="h-4 w-4" aria-hidden />}>Reset</Button>
            <Button variant="outline" size="sm" className="md:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />}>
              Filters
            </Button>
          </div>
        </div>
        <div className={`mt-4 grid-cols-1 gap-3 sm:grid-cols-2 md:grid md:grid-cols-4 xl:grid-cols-7 ${showFilters ? "grid" : "hidden"}`}>{filterControls}</div>
      </Card>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between" aria-live="polite">
        <p className="text-sm text-ink-600">
          {rows === null ? "Searching donors…" : (
            <>
              <span className="font-semibold text-ink-900">{rows.length} donor{rows.length === 1 ? "" : "s"}</span> found, {availableCount} available now. Distances from {pointLabel}.
            </>
          )}
        </p>
        {filters.compatibleOnly && compatibleGroups.length > 0 && (
          <p className="text-[13px] text-ink-500">A {group} patient can receive {compatibleGroups.join(", ")}.</p>
        )}
      </div>

      {error ? (
        <Card><ErrorState title="We couldn't load donors" onRetry={load} /></Card>
      ) : rows === null ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-card border border-line bg-white p-4">
              <div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
              <Skeleton className="mt-5 h-5 w-24" />
              <Skeleton className="mt-5 h-9 w-full" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<UsersRound className="h-5 w-5" />}
            title="No nearby donors found."
            description="Try a wider distance, include compatible groups, or post a request so donors can find you."
            action={<Button variant="outline" onClick={reset}>Clear filters</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((d) => (
            <DonorCard
              key={d.id}
              donor={d}
              action={<ContactDonorButton donorId={d.id} donorName={d.name} bloodGroup={d.bloodGroup} disabled={d.availability !== "available"} className="w-full" />}
            />
          ))}
        </div>
      )}
      <p className="text-center text-xs text-ink-400">Exact addresses and phone numbers are never shown. Donors choose whether to share contact details after accepting a request.</p>
    </div>
  );
}
