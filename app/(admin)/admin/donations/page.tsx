import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, Clock, Droplets } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatisticCard } from "@/components/blood/StatisticCard";
import { DonationsManager } from "@/modules/admin/components/DonationsManager";
import { donationService } from "@/services/donationService";

export const metadata: Metadata = { title: "Donations" };

export default async function AdminDonationsPage() {
  const rows = await donationService.listAll();
  const completed = rows.filter((d) => d.status === "completed");
  return (
    <>
      <PageHeader title="Donations" description="Every donation and appointment across partner centres." breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Donations" }]} />
      <section aria-label="Donation summary" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatisticCard label="Completed" value={completed.length} icon={<CheckCircle2 className="h-4 w-4" aria-hidden />} hint="In this list" />
        <StatisticCard label="Units collected" value={completed.reduce((s, d) => s + d.units, 0)} icon={<Droplets className="h-4 w-4" aria-hidden />} hint="From completed donations" />
        <StatisticCard label="Scheduled" value={rows.filter((d) => d.status === "scheduled").length} icon={<CalendarClock className="h-4 w-4" aria-hidden />} hint="Upcoming appointments" />
        <StatisticCard label="Deferred" value={rows.filter((d) => d.status === "deferred").length} icon={<Clock className="h-4 w-4" aria-hidden />} hint="Failed screening" />
      </section>
      <DonationsManager initial={rows} />
    </>
  );
}
