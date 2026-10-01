import type { Metadata } from "next";
import { CalendarCheck, CalendarClock, Droplet, HandHeart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { StatisticCard } from "@/components/blood/StatisticCard";
import { DonationHistory } from "@/modules/client/components/DonationHistory";
import { donationService } from "@/services/donationService";
import { addDays, daysBetween, formatDate, now } from "@/lib/utils";
import { DONATION_INTERVAL_DAYS, LIVES_PER_UNIT } from "@/lib/constants";

export const metadata: Metadata = { title: "Donation history" };

export default async function DonationsPage() {
  const donations = await donationService.listMine();
  const completed = donations.filter((d) => d.status === "completed");
  const units = completed.reduce((s, d) => s + d.units, 0);
  const last = [...completed].sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextEligible = last ? addDays(last.date, DONATION_INTERVAL_DAYS) : now();
  const waitDays = Math.max(0, daysBetween(now(), nextEligible));
  const upcoming = donations.find((d) => d.status === "scheduled");

  return (
    <>
      <PageHeader
        title="Donation history"
        description="Every donation you've made through Qatra, with certificates for completed ones."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Donation history" }]}
        actions={<ButtonLink href="/dashboard/donate">Book a donation</ButtonLink>}
      />

      <section aria-label="Donation summary" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatisticCard label="Total donations" value={completed.length} icon={<HandHeart className="h-4 w-4" aria-hidden />} hint={`Up to ${units * LIVES_PER_UNIT} patients helped`} tone="blood" />
        <StatisticCard label="Units donated" value={units} icon={<Droplet className="h-4 w-4" aria-hidden />} hint="About 450 ml per unit" />
        <StatisticCard label="Last donation" value={last ? formatDate(last.date, { day: "numeric", month: "short" }) : "None"} icon={<CalendarCheck className="h-4 w-4" aria-hidden />} hint={last ? last.centerName : "Book your first one"} />
        <StatisticCard label="Next eligible" value={waitDays > 0 ? formatDate(nextEligible, { day: "numeric", month: "short" }) : "Now"} icon={<CalendarClock className="h-4 w-4" aria-hidden />} hint={waitDays > 0 ? `In ${waitDays} days` : "You can book today"} />
      </section>

      {upcoming && (
        <Alert tone="info" title={`Upcoming appointment on ${formatDate(upcoming.date)}`} className="mb-6">
          {upcoming.centerName}, {upcoming.city}. Eat a proper meal and drink plenty of water beforehand. The centre will confirm your eligibility on the day.
        </Alert>
      )}

      <Card className="overflow-hidden">
        <DonationHistory donations={donations} />
      </Card>
    </>
  );
}
