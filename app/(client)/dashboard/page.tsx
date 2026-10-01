import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CircleCheck, Droplet, FileText, HandHeart, HeartPulse, Hourglass, UserRound } from "lucide-react";
import { StatisticCard } from "@/components/blood/StatisticCard";
import { BloodRequestCard } from "@/components/blood/BloodRequestCard";
import { RespondButton, AvailabilityToggle } from "@/modules/client/components/Actions";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { AvailabilityBadge } from "@/components/ui/StatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { Alert } from "@/components/ui/Alert";
import { requireUser } from "@/lib/session";
import { dashboardService } from "@/services/dashboardService";
import { bloodRequestService } from "@/services/bloodRequestService";
import { donationService } from "@/services/donationService";
import { checkEligibility, ELIGIBILITY_DISCLAIMER } from "@/lib/eligibility";
import { addDays, ageFromDob, daysBetween, formatDate, greeting, now, timeAgo } from "@/lib/utils";
import { canDonateTo } from "@/lib/constants";
import type { ActivityItem } from "@/types";
import { donorService } from "@/services/donorService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "Dashboard" };

const activityIcon: Record<ActivityItem["kind"], typeof Droplet> = {
  donation: HandHeart, request: Droplet, accepted: CircleCheck, profile: UserRound,
  verification: CircleCheck, inventory: Droplet, user: UserRound, system: FileText,
};


export default async function DashboardPage() {
  const user = await requireUser();
  const [{ stats, activity }, nearbyAll, donations, donor] = await Promise.all([
    dashboardService.userOverview(),
    bloodRequestService.nearbyEmergencies(user.location.point, 20),
    donationService.listMine(),
    safe(donorService.getById(user.id), undefined),
  ]);
  // Your own requests are in Request history; don't offer to respond to them here.
  const nearby = nearbyAll.filter((r) => r.requesterId !== user.id);

  const last = donations.find((d) => d.status === "completed");
  const upcoming = donations.find((d) => d.status === "scheduled");
  const elig = checkEligibility({ age: ageFromDob(user.dateOfBirth), weightKg: donor?.weightKg || 74, lastDonationDate: last?.date ?? donor?.lastDonationDate ?? null });
  const compatible = canDonateTo(user.bloodGroup);
  const matching = nearby.filter((r) => compatible.includes(r.bloodGroup));
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-500">Your contribution can save lives. {matching.length > 0 && <>There {matching.length === 1 ? "is" : "are"} <span className="font-semibold text-ink-800">{matching.length} request{matching.length > 1 && "s"}</span> near you that your blood can help.</>}</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/dashboard/request" icon={<Droplet className="h-4 w-4" aria-hidden />}>Request blood</ButtonLink>
          <ButtonLink href="/dashboard/donate" variant="outline">Book a donation</ButtonLink>
        </div>
      </div>

      <section aria-label="Your statistics" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatisticCard label="Total donations" value={stats.totalDonations} icon={<HandHeart className="h-4 w-4" aria-hidden />} hint={last ? `Last on ${formatDate(last.date)}` : "No donations yet"} />
        <StatisticCard label="Lives potentially helped" value={stats.livesHelped} icon={<HeartPulse className="h-4 w-4" aria-hidden />} hint="Up to 3 per donation" />
        <StatisticCard label="Active requests" value={stats.activeRequests} icon={<Droplet className="h-4 w-4" aria-hidden />} hint="Being matched now" />
        <StatisticCard label="Pending requests" value={stats.pendingRequests} icon={<Hourglass className="h-4 w-4" aria-hidden />} hint="Awaiting review" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Nearby emergency requests"
              description={`Within 20 km of ${user.location.area}, compatible with your ${user.bloodGroup} shown first`}
              action={<Link href="/dashboard/blood-requests?tab=nearby" className="text-[13px] font-semibold text-hemo-700 hover:underline">View all</Link>}
            />
            <CardBody>
              {nearby.length === 0 ? (
                <EmptyState icon={<HeartPulse className="h-5 w-5" />} title="No urgent requests near you" description="We'll alert you as soon as someone nearby needs your blood group." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {[...matching, ...nearby.filter((r) => !compatible.includes(r.bloodGroup))].slice(0, 4).map((r) => {
                    const canHelp = compatible.includes(r.bloodGroup);
                    return (
                      <BloodRequestCard
                        key={r.id}
                        request={r}
                        action={
                          canHelp ? (
                            <RespondButton requestId={r.id} patientName={r.patientName} hospitalName={r.hospitalName} bloodGroup={r.bloodGroup} className="flex-1" />
                          ) : (
                            <p className="text-[13px] text-ink-500">Needs {r.bloodGroup}, which {user.bloodGroup} can&apos;t give to. Share it with friends.</p>
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent activity" />
            <ul className="divide-y divide-line">
              {activity
                .slice()
                .sort((a, b) => +new Date(b.at) - +new Date(a.at))
                .map((a) => {
                  const Icon = activityIcon[a.kind];
                  return (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500"><Icon className="h-4 w-4" aria-hidden /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-800">{a.message}</p>
                        <p className="text-xs text-ink-400"><time dateTime={a.at}>{timeAgo(a.at)}</time></p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Your blood profile" action={<ButtonLink href="/dashboard/profile" size="sm" variant="ghost">Edit</ButtonLink>} />
            <CardBody className="space-y-5">
              <div className="flex items-center gap-4">
                <BloodGroupBadge group={user.bloodGroup} size="lg" />
                <div>
                  <p className="text-sm text-ink-500">Donor status</p>
                  <div className="mt-1">{donor ? <AvailabilityBadge value={donor.availability} /> : <span className="text-sm text-ink-500">Not registered</span>}</div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-ink-500">Last donation</dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">{last ? `${daysBetween(last.date, now())} days ago` : "None yet"}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Next eligible</dt>
                  <dd className="mt-0.5 font-semibold text-ink-900">
                    {elig.status === "likely_eligible" ? <span className="text-ok-700">Available now</span> : formatDate(addDays(now(), elig.daysUntilEligible))}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-ink-500">Can give to</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">{compatible.map((g) => <BloodGroupBadge key={g} group={g} size="sm" />)}</dd>
                </div>
              </dl>
              {donor ? (
                <AvailabilityToggle initial={donor.availability} />
              ) : (
                <ButtonLink href="/dashboard/register-donor" size="sm" variant="outline">Register as a donor</ButtonLink>
              )}
              <p className="text-xs leading-relaxed text-ink-400">{ELIGIBILITY_DISCLAIMER}</p>
            </CardBody>
          </Card>

          {upcoming && (
            <Alert tone="info" title="Upcoming appointment">
              {upcoming.centerName}, {formatDate(upcoming.date, { weekday: "long", day: "numeric", month: "long" })} at 11:00.{" "}
              <Link href="/dashboard/donations" className="font-semibold underline">View details</Link>
            </Alert>
          )}

          <Card>
            <CardHeader title="Your profile" description="Complete profiles are matched faster" />
            <CardBody>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-600">Profile completion</span>
                <span className="font-semibold tabular-nums text-ink-900">85%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-ink-100"><div className="h-full w-[85%] rounded-full bg-ink-800" /></div>
              <ul className="mt-4 space-y-2 text-[13px] text-ink-600">
                <li className="flex items-center gap-2"><CircleCheck className="h-4 w-4 text-ok-600" aria-hidden /> Phone and email verified</li>
                <li className="flex items-center gap-2"><CircleCheck className="h-4 w-4 text-ok-600" aria-hidden /> Donor details reviewed</li>
                <li className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-ink-300" aria-hidden /> <Link href="/dashboard/profile" className="underline hover:text-ink-900">Add a profile photo</Link></li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
