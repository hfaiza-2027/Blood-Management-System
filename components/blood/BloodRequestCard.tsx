import type { ReactNode } from "react";
import { Building2, CalendarClock, MapPin, Siren } from "lucide-react";
import type { BloodRequest } from "@/types";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { Progress } from "@/components/ui/Progress";
import { formatDistance } from "@/lib/geo";
import { cn, formatDateTime, timeRemaining } from "@/lib/utils";

interface Props {
  request: BloodRequest & { distanceKm?: number };
  action?: ReactNode;
  compact?: boolean;
}

export function BloodRequestCard({ request: r, action, compact }: Props) {
  const emergency = r.urgency === "emergency";
  const left = timeRemaining(r.requiredBy);
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-card border bg-white shadow-card",
        emergency ? "border-hemo-300 ring-1 ring-hemo-200" : "border-line",
      )}
      aria-label={`${r.urgency} request for ${r.unitsRequired} units of ${r.bloodGroup}`}
    >
      {emergency && (
        <div className="flex items-center justify-between gap-2 rounded-t-card bg-hemo-600 px-4 py-1.5 text-[13px] font-semibold text-white">
          <span className="flex items-center gap-1.5">
            <Siren className="h-3.5 w-3.5" aria-hidden /> Emergency
          </span>
          <span className="tabular-nums">{left.label}</span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <BloodGroupBadge group={r.bloodGroup} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink-900">
              {r.unitsRequired} unit{r.unitsRequired > 1 ? "s" : ""} for {r.patientName}
            </p>
            <p className="mt-0.5 line-clamp-1 text-[13px] text-ink-500">{r.reason}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {!emergency && <UrgencyBadge urgency={r.urgency} />}
              <RequestStatusBadge status={r.status} />
            </div>
          </div>
        </div>

        {!compact && (
          <dl className="mt-4 space-y-1.5 text-[13px] text-ink-600">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Hospital</dt>
              <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
              <dd className="truncate">{r.hospitalName}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Location</dt>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
              <dd className="truncate">
                {r.location.area}, {r.location.city}
                {r.distanceKm !== undefined && r.distanceKm > 0 && <span className="font-medium text-ink-900"> — {formatDistance(r.distanceKm)}</span>}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Required by</dt>
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
              <dd>
                Needed by {formatDateTime(r.requiredBy)}
                {!emergency && left.hours > 0 && <span className="text-ink-400"> ({left.label})</span>}
              </dd>
            </div>
          </dl>
        )}

        {r.unitsFulfilled > 0 && r.status !== "fulfilled" && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-ink-500">
              <span>Collected</span>
              <span className="tabular-nums">
                {r.unitsFulfilled} of {r.unitsRequired} units
              </span>
            </div>
            <Progress value={r.unitsFulfilled} max={r.unitsRequired} label="Units collected" />
          </div>
        )}

        {action && <div className="mt-auto flex flex-wrap gap-2 pt-4">{action}</div>}
      </div>
    </article>
  );
}
