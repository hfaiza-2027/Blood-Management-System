import type { ReactNode } from "react";
import { Clock, MapPin } from "lucide-react";
import type { NearbyDonor } from "@/types";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { AvailabilityBadge, VerificationBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { formatDistance } from "@/lib/geo";
import { daysBetween, now } from "@/lib/utils";

function lastDonationText(date: string | null) {
  if (!date) return "No donations recorded";
  const d = daysBetween(date, now());
  if (d < 31) return `Donated ${d} days ago`;
  const m = Math.round(d / 30);
  return `Donated ${m} month${m > 1 ? "s" : ""} ago`;
}

/** Public donor card — shows area and distance only, never an address or number. */
export function DonorCard({ donor, action }: { donor: NearbyDonor; action?: ReactNode }) {
  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-4 shadow-card" aria-label={`${donor.name}, blood group ${donor.bloodGroup}`}>
      <div className="flex items-start gap-3">
        <Avatar name={donor.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-ink-900">{donor.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {donor.location.city}, {donor.location.area}
            </span>
          </p>
        </div>
        <BloodGroupBadge group={donor.bloodGroup} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <AvailabilityBadge value={donor.availability} />
        {donor.verification === "verified" && <VerificationBadge value="verified" />}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[13px]">
        <div>
          <dt className="sr-only">Distance</dt>
          <dd className="font-semibold tabular-nums text-ink-900">{formatDistance(donor.distanceKm)}</dd>
        </div>
        <div>
          <dt className="sr-only">Last donation</dt>
          <dd className="flex items-center gap-1 text-ink-500">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {lastDonationText(donor.lastDonationDate)}
          </dd>
        </div>
      </dl>

      {action && <div className="mt-4">{action}</div>}
    </article>
  );
}
