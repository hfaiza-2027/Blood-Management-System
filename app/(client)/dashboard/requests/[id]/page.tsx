import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, MapPin, Phone, UserRound, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { Progress } from "@/components/ui/Progress";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { RequestTimeline } from "@/components/blood/RequestTimeline";
import { CancelRequestButton } from "@/modules/client/components/CancelRequestButton";
import { bloodRequestService, isOpen } from "@/services/bloodRequestService";
import { canReceiveFrom } from "@/lib/constants";
import { formatDateTime, maskPhone, timeRemaining } from "@/lib/utils";
import { requireUser } from "@/lib/session";
import { safe } from "@/services/client";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const r = await safe(bloodRequestService.getById(id), undefined);
  return { title: r ? `Request ${r.code}` : "Request not found" };
}

export default async function RequestDetailPage({ params }: P) {
  const { id } = await params;
  const r = await bloodRequestService.getById(id);
  if (!r) notFound();
  const user = await requireUser();
  const mine = r.requesterId === user.id;

  const open = isOpen(r);
  const left = timeRemaining(r.requiredBy);
  const rows = [
    { icon: UserRound, label: "Patient", value: `${r.patientName}, ${r.patientAge} years` },
    { icon: Building2, label: "Hospital", value: r.hospitalName },
    { icon: MapPin, label: "Area", value: `${r.location.area}, ${r.location.city}` },
    { icon: CalendarClock, label: "Needed by", value: `${formatDateTime(r.requiredBy)}${open && left.hours > 0 ? ` (${left.label})` : ""}` },
    { icon: Phone, label: "Contact number", value: mine ? r.contactNumber : maskPhone(r.contactNumber) },
    { icon: UsersRound, label: "Donors contacted", value: String(r.donorsContacted) },
  ];

  return (
    <>
      <PageHeader
        title={`Request ${r.code}`}
        description={`Created ${formatDateTime(r.createdAt)}`}
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Request history", href: "/dashboard/requests" }, { label: r.code }]}
        actions={
          open && mine ? (
            <>
              <ButtonLink href={`/dashboard/donors?group=${encodeURIComponent(r.bloodGroup)}&city=${encodeURIComponent(r.location.city)}&compatible=1`} variant="secondary">Find more donors</ButtonLink>
              <CancelRequestButton requestId={r.id} code={r.code} />
            </>
          ) : undefined
        }
      />

      {r.status === "partially_fulfilled" && (
        <Alert tone="warn" title={`${r.unitsRequired - r.unitsFulfilled} more units needed`} className="mb-6">
          We&apos;ve widened the search radius and alerted additional compatible donors.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <BloodGroupBadge group={r.bloodGroup} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-ink-900">{r.unitsRequired} units of {r.bloodGroup}</p>
                <p className="text-sm text-ink-500">{r.reason}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <UrgencyBadge urgency={r.urgency} />
                  <RequestStatusBadge status={r.status} />
                </div>
              </div>
              <div className="sm:w-48">
                <p className="mb-1.5 text-xs text-ink-500">{r.unitsFulfilled} of {r.unitsRequired} units arranged</p>
                <Progress value={r.unitsFulfilled} max={r.unitsRequired} label={`${r.unitsFulfilled} of ${r.unitsRequired} units arranged`} tone={r.unitsFulfilled >= r.unitsRequired ? "ok" : "hemo"} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Request details" />
            <CardBody>
              <dl className="grid gap-4 sm:grid-cols-2">
                {rows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-400">{label}</dt>
                      <dd className="text-sm font-medium text-ink-800">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {r.notes && <p className="mt-5 rounded bg-paper p-3 text-sm text-ink-700"><span className="font-medium text-ink-900">Notes: </span>{r.notes}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Who can donate" description="The hospital cross-matches every unit before transfusion." />
            <CardBody className="flex flex-wrap gap-2">
              {canReceiveFrom(r.bloodGroup).map((g) => <BloodGroupBadge key={g} group={g} />)}
            </CardBody>
          </Card>
        </div>

        <Card className="lg:self-start">
          <CardHeader title="Progress" />
          <CardBody>
            <RequestTimeline request={r} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
