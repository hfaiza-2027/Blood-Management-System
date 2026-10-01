import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { BarChart, ChartCard, DonutChart, HBarList, LineChart } from "@/components/charts/Charts";
import { StatisticCard } from "@/components/blood/StatisticCard";
import { ExportCsvButton } from "@/modules/admin/components/ExportCsvButton";
import { dashboardService } from "@/services/dashboardService";
import { LIVES_PER_UNIT } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const r = await dashboardService.reports();
  const donations = r.monthlyDonations.reduce((a, p) => a + p.value, 0);
  const requests = r.monthlyRequests.reduce((a, p) => a + p.value, 0);
  const avgFulfil = Math.round(r.fulfillmentRate.reduce((a, p) => a + p.value, 0) / Math.max(1, r.fulfillmentRate.length));
  const statusTotal = r.requestStatusBreakdown.reduce((a, p) => a + p.value, 0);

  const monthly = r.monthlyDonations.map((p, i) => ({ month: p.label, donations: p.value, requests: r.monthlyRequests[i]?.value ?? 0 }));
  const csv: (string | number)[][] = [["Month", "Donations", "Requests"], ...monthly.map((m) => [m.month, m.donations, m.requests])];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Twelve-month view of donations, requests and fulfilment across the network."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]}
        actions={<ExportCsvButton filename="qatra-monthly-report.csv" rows={csv} />}
      />

      <section aria-label="Report summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatisticCard label="Donations, 12 months" value={formatNumber(donations)} hint={`About ${formatNumber(donations * LIVES_PER_UNIT)} patients helped`} />
        <StatisticCard label="Requests, 12 months" value={formatNumber(requests)} />
        <StatisticCard label="Average fulfilment" value={`${avgFulfil}%`} hint="Requests fully met" />
        <StatisticCard label="Donations per request" value={(donations / Math.max(1, requests)).toFixed(2)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Monthly donations" description="Completed whole-blood donations">
          <BarChart data={r.monthlyDonations} caption="Monthly donations" highlightLast />
        </ChartCard>
        <ChartCard title="Monthly requests" description="New blood requests created">
          <BarChart data={r.monthlyRequests} caption="Monthly requests" highlightLast />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="Fulfilment rate" description="Share of requests fully met each month" className="xl:col-span-2">
          <LineChart data={r.fulfillmentRate} caption="Fulfilment rate by month" unit="%" min={60} />
        </ChartCard>
        <ChartCard title="Requests by status" description="This year">
          <DonutChart data={r.requestStatusBreakdown} caption="Requests by status" centerLabel="Requests" centerValue={formatNumber(statusTotal)} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Demand by blood group" description="Requests received this year">
          <HBarList data={r.groupDemand.map((g) => ({ label: g.group, value: g.value }))} caption="Requests by blood group" tone="hemo" />
        </ChartCard>
        <ChartCard title="Demand by city" description="Requests received this year">
          <HBarList data={r.cityDemand} caption="Requests by city" />
        </ChartCard>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Monthly figures" description="The same data as the charts above, for export and review." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Monthly donations and requests</caption>
            <thead className="bg-paper text-left text-xs font-semibold text-ink-500">
              <tr>
                <th scope="col" className="px-5 py-2.5">Month</th>
                <th scope="col" className="px-5 py-2.5 text-right">Donations</th>
                <th scope="col" className="px-5 py-2.5 text-right">Requests</th>
                <th scope="col" className="px-5 py-2.5 text-right">Fulfilment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {monthly.map((m, i) => (
                <tr key={m.month}>
                  <th scope="row" className="px-5 py-2.5 text-left font-medium text-ink-900">{m.month}</th>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatNumber(m.donations)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{formatNumber(m.requests)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{r.fulfillmentRate[i] ? `${r.fulfillmentRate[i].value}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
