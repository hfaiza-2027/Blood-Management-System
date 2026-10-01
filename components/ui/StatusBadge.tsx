import { Badge } from "./Badge";
import { AVAILABILITY_META, DONATION_STATUS_META, REQUEST_STATUS_META, STOCK_META, URGENCY_META } from "@/lib/constants";
import type { DonationStatus, DonorAvailability, RequestStatus, StockLevel, Urgency, VerificationStatus, AccountStatus } from "@/types";
import { BadgeCheck, Siren, TriangleAlert } from "lucide-react";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const m = REQUEST_STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function AvailabilityBadge({ value }: { value: DonorAvailability }) {
  const m = AVAILABILITY_META[value];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  const m = DONATION_STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function StockBadge({ level }: { level: StockLevel }) {
  const m = STOCK_META[level];
  return <Badge tone={m.tone} icon={level === "critical" ? <TriangleAlert className="h-3 w-3" aria-hidden /> : undefined}>{m.label}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "emergency")
    return (
      <Badge tone="blood" icon={<Siren className="h-3 w-3" aria-hidden />}>
        {URGENCY_META.emergency.label}
      </Badge>
    );
  return <Badge tone={urgency === "urgent" ? "warn" : "neutral"}>{URGENCY_META[urgency].label}</Badge>;
}

export function VerificationBadge({ value }: { value: VerificationStatus | boolean }) {
  const v = typeof value === "boolean" ? (value ? "verified" : "pending") : value;
  if (v === "verified") return <Badge tone="info" icon={<BadgeCheck className="h-3.5 w-3.5" aria-hidden />}>Verified</Badge>;
  if (v === "pending") return <Badge tone="neutral">Pending review</Badge>;
  return <Badge tone="danger">Rejected</Badge>;
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  const map = { active: ["ok", "Active"], inactive: ["muted", "Inactive"], suspended: ["danger", "Suspended"], pending: ["warn", "Pending"] } as const;
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
