import type { Metadata } from "next";
import Link from "next/link";
import { Activity, BadgeCheck, ClipboardList, Droplets, HandHeart, Siren, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { StockBadge } from "@/components/ui/StatusBadge";
import { StatisticCard } from "@/components/blood/StatisticCard";
import { BloodRequestCard } from "@/components/blood/BloodRequestCard";
import { BarChart, ChartCard, DonutChart, HBarList, LineChart } from "@/components/charts/Charts";
import { dashboardService } from "@/services/dashboardService";
import { bloodRequestService, isOpen } from "@/services/bloodRequestService";
import { inventoryService, stockLevel } from "@/services/inventoryService";
import { formatNumber, timeAgo } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [o, requests, inventory] = await Promise.all([dashboardService.adminOverview(), bloodRequestService.list(), inventoryService.list()]);
  const s = o.stats;
  const emergencies = requests.filter((r) => isOpen(r) && r.urgency === "emergency").slice(0, 2);
  const lowStock = inventory.filter((i) => stockLevel(i) !== "normal").sort((a, b) => a.available / a.required - b.available / b.required);
  const donorTotal = o.donorGroupDistribution.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Network health across all cities, updated every few minutes."
        actions={<ButtonLink href="/admin/emergency" icon={<Siren className="h-4 w-4" aria-hidden />}>Emergency queue</ButtonLink>}
      />

      {inventory.length === 0 && (
        <Alert tone="info" title="Your database is empty">
          Load the starter hospitals, blood stock and cities from <Link href="/admin/settings" className="font-semibold underline">System settings</Link> so donation booking and requests have facilities to choose from.
        </Alert>
      )}

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <StatisticCard label="Total users" value={formatNumber(s.totalUsers)} icon={<Users className="h-4 w-4" aria-hidden />} hint="Registered accounts" />
        <StatisticCard label="Active donors" value={formatNumber(s.activeDonors)} icon={<BadgeCheck className="h-4 w-4" aria-hidden />} hint="Ready to donate" />
        <StatisticCard label="Blood requests" value={formatNumber(s.bloodRequests)} icon={<ClipboardList className="h-4 w-4" aria-hidden />} hint="Last 12 months" />
        <StatisticCard label="Completed donations" value={formatNumber(s.completedDonations)} icon={<HandHeart className="h-4 w-4" aria-hidden />} hint="All time" />
        <StatisticCard label="Emergency requests" value={s.emergencyRequests} icon={<Siren className="h-4 w-4" aria-hidden />} hint="Open right now" tone="blood" />
        <StatisticCard label="Available units" value={formatNumber(s.availableUnits)} icon={<Droplets className="h-4 w-4" aria-hidden />} hint="Across partner banks" />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Monthly donations" description="Completed donations, last 12 months" className="xl:col-span-2">
          <BarChart data={o.monthlyDonations} caption="Monthly donations" highlightLast />
        </ChartCard>
        <ChartCard title="Blood group distribution" description="Registered active donors">
          <DonutChart data={o.donorGroupDistribution.map((g) => ({ label: g.group, value: g.value }))} caption="Donors by blood group" centerLabel="Donors" centerValue={formatNumber(donorTotal)} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Donation trend" description="Month-on-month donations" className="xl:col-span-2">
          <LineChart data={o.monthlyDonations} caption="Donation trend" />
        </ChartCard>
        <ChartCard title="Blood requests" description="Current status of this year's requests" action={<Link href="/admin/requests" className="text-[13px] font-semibold text-hemo-700 hover:underline">Manage</Link>}>
          <HBarList data={o.requestStatusBreakdown} caption="Requests by status" />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Open emergencies" description="Needing action from coordinators" action={<Link href="/admin/emergency" className="text-[13px] font-semibold text-hemo-700 hover:underline">View all</Link>} />
          <CardBody className="grid gap-4 md:grid-cols-2">
            {emergencies.map((r) => <BloodRequestCard key={r.id} request={r} action={<ButtonLink size="sm" href={`/admin/emergency#${r.id}`} variant="outline">Coordinate</ButtonLink>} />)}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Stock alerts" description="Below weekly requirement" action={<Link href="/admin/inventory" className="text-[13px] font-semibold text-hemo-700 hover:underline">Inventory</Link>} />
          <ul className="divide-y divide-line">
            {lowStock.map((i) => (
              <li key={i.bloodGroup} className="flex items-center gap-3 px-5 py-3">
                <BloodGroupBadge group={i.bloodGroup} size="sm" />
                <p className="flex-1 text-sm text-ink-700"><span className="font-semibold tabular-nums text-ink-900">{i.available}</span> of {i.required} units needed</p>
                <StockBadge level={stockLevel(i)} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent activity" action={<Link href="/admin/activity" className="text-[13px] font-semibold text-hemo-700 hover:underline">Activity log</Link>} />
        <ul className="divide-y divide-line">
          {o.activity.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              <p className="min-w-0 flex-1 text-ink-700">{a.actor && <span className="font-semibold text-ink-900">{a.actor} </span>}{a.message}</p>
              <time dateTime={a.at} className="shrink-0 text-xs text-ink-400">{timeAgo(a.at)}</time>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
