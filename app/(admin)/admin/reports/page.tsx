import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Activity, BadgeCheck, Clock, Droplet, HandHeart, Package, Siren, Timer, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { StockBadge } from "@/components/ui/StatusBadge";
import { ChartCard, DonutChart, DualBarChart, HBarList, LineChart } from "@/components/charts/Charts";
import { ReportFilterBar, type FilterState } from "@/modules/admin/components/reports/ReportFilterBar";
import { ReportActions } from "@/modules/admin/components/reports/ReportActions";
import { ReportKpi, formatHours } from "@/modules/admin/components/reports/ReportKpi";
import { dashboardService } from "@/services/dashboardService";
import { hospitalService } from "@/services/hospitalService";
import { safe } from "@/services/client";
import { CITY_NAMES } from "@/lib/constants";
import { describeRange, resolveReportFilters, toDateInput, type ReportQuery } from "@/lib/reportRange";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const BUCKET_LABEL = { day: "Daily", week: "Weekly", month: "Monthly" } as const;

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 print:break-inside-avoid">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">{title}</h2>
        {description && <p className="text-sm text-ink-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Plain, responsive data table used by every report section. */
function Table({ caption, head, rows, empty }: { caption: string; head: { label: string; align?: "right" }[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-paper text-left text-xs font-semibold text-ink-500">
          <tr>
            {head.map((h) => (
              <th key={h.label} scope="col" className={h.align === "right" ? "px-5 py-2.5 text-right" : "px-5 py-2.5"}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-5 py-8 text-center text-ink-500">{empty}</td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="hover:bg-paper/60">
                {r.map((cell, j) => (
                  <td key={j} className={head[j]?.align === "right" ? "px-5 py-2.5 text-right tabular-nums" : "px-5 py-2.5"}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const pctOf = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");

type Params = { [K in keyof ReportQuery]?: string | string[] };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  // A repeated parameter (?city=a&city=b) arrives as an array; only the first value counts.
  const query = Object.fromEntries(Object.entries(raw).map(([key, v]) => [key, Array.isArray(v) ? v[0] : v])) as ReportQuery;
  const { preset, filters } = resolveReportFilters(query);
  const [report, facilities, locations] = await Promise.all([
    dashboardService.reports(filters),
    safe(hospitalService.list(), []),
    safe(hospitalService.locations(), []),
  ]);

  const cities = locations.length ? locations.map((l) => l.city) : CITY_NAMES;
  const hospitalName = facilities.find((h) => h.id === filters.hospitalId)?.name;
  const filterSummary = [
    filters.city ?? "All cities",
    filters.bloodGroup ? `${filters.bloodGroup} only` : "All blood groups",
    filters.urgency ? `${filters.urgency} requests` : "Any urgency",
    hospitalName ?? (filters.hospitalId ? "One facility" : "All facilities"),
  ].join(" · ");
  const initial: FilterState = {
    range: preset,
    from: toDateInput(filters.from),
    to: toDateInput(filters.to),
    city: filters.city ?? "",
    group: filters.bloodGroup ?? "",
    urgency: filters.urgency ?? "",
    hospital: filters.hospitalId ?? "",
  };

  const k = report.kpis;
  const range = describeRange(filters.from, filters.to);
  const statusTotal = report.requestStatus.reduce((a, s) => a + s.value, 0);
  const donationTotal = report.donationOutcomes.reduce((a, s) => a + s.value, 0);
  const lowStock = report.inventory.filter((i) => i.stockLevel !== "normal");

  return (
    <div className="space-y-8 print:space-y-6">
      <PageHeader
        title="Reports"
        description={<>{range} <span className="text-ink-400">· compared with the previous {preset === "custom" ? "period of the same length" : "period"}</span></>}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Reports" }]}
        actions={<ReportActions report={report} filterSummary={filterSummary} />}
      />

      <ReportFilterBar initial={initial} cities={cities} hospitals={facilities.map((h) => ({ id: h.id, name: h.name, city: h.city }))} />

      {/* Printed reports carry their own context line, since filters and navigation are hidden on paper. */}
      <p className="hidden text-sm text-ink-700 print:block">
        <strong>BloodBridge report</strong> · {range} · {filterSummary} · generated {new Date(report.generatedAt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" })}
      </p>

      {lowStock.length > 0 && (
        <Alert tone={lowStock.some((i) => i.stockLevel === "critical") ? "danger" : "warn"} title="Stock needs attention">
          {lowStock.map((i) => `${i.group}: ${i.available} of ${i.required} units`).join(" · ")}
        </Alert>
      )}

      <Section title="Summary" description="Headline figures for the selected period.">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <ReportKpi label="Blood requests" metric={k.requests} better="neutral" icon={<Droplet className="h-4 w-4" aria-hidden />} />
          <ReportKpi label="Fulfilment rate" metric={k.fulfilmentRate} format="percent" icon={<BadgeCheck className="h-4 w-4" aria-hidden />} hint="Requests fully met, excluding cancelled" />
          <ReportKpi label="Emergencies met on time" metric={k.emergencyOnTimeRate} format="percent" icon={<Siren className="h-4 w-4" aria-hidden />} hint="Fulfilled before the required-by time" />
          <ReportKpi label="Donations completed" metric={k.donationsCompleted} icon={<HandHeart className="h-4 w-4" aria-hidden />} />
          <ReportKpi label="Median time to first donor" metric={k.medianHoursToFirstResponse} format="hours" better="down" icon={<Timer className="h-4 w-4" aria-hidden />} hint="From request to first donor response" />
          <ReportKpi label="Median time to fulfil" metric={k.medianHoursToFulfil} format="hours" better="down" icon={<Clock className="h-4 w-4" aria-hidden />} />
          <ReportKpi label="New donors" metric={k.newDonors} icon={<UserPlus className="h-4 w-4" aria-hidden />} />
          <ReportKpi label="New members" metric={k.newMembers} icon={<Users className="h-4 w-4" aria-hidden />} />
        </div>
      </Section>

      <Section title="Trends" description={`${BUCKET_LABEL[report.bucket]} figures across the period.`}>
        <div className="grid gap-6 xl:grid-cols-5">
          <ChartCard title="Requests and donations" description="New requests against completed donations" className="xl:col-span-3">
            <DualBarChart
              data={report.trend.map((t) => ({ label: t.label, a: t.requests, b: t.donations }))}
              series={["Requests", "Donations completed"]}
              caption="Requests and completed donations by period"
              emptyText="No requests or donations in this period."
            />
          </ChartCard>
          <ChartCard title="Fulfilment rate" description="Share of requests fully met; gaps mean no requests" className="xl:col-span-2">
            <LineChart data={report.trend.map((t) => ({ label: t.label, value: t.fulfilmentRate }))} caption="Fulfilment rate by period" unit="%" emptyText="No requests in this period." />
          </ChartCard>
        </div>
      </Section>

      <Section title="Requests" description={`${formatNumber(k.unitsRequested.value ?? 0)} units requested · ${k.unitFulfilmentRate.value ?? "–"}${k.unitFulfilmentRate.value === null ? "" : "%"} of units supplied · ${formatNumber(k.emergencies.value ?? 0)} emergencies`}>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="By status" description="Where this period's requests stand now">
            <DonutChart data={report.requestStatus} caption="Requests by status" centerLabel="Requests" centerValue={formatNumber(statusTotal)} />
          </ChartCard>
          <ChartCard title="By urgency">
            <HBarList data={report.urgency} caption="Requests by urgency" tone="hemo" />
          </ChartCard>
        </div>
      </Section>

      <Section title="Demand and supply by blood group" description="Requests compared with active donors and current stock.">
        <Card className="overflow-hidden">
          <Table
            caption="Demand and supply by blood group"
            head={[{ label: "Group" }, { label: "Requests", align: "right" }, { label: "Units requested", align: "right" }, { label: "Units supplied", align: "right" }, { label: "Active donors", align: "right" }, { label: "In stock", align: "right" }, { label: "Stock" }]}
            rows={report.groups.map((g) => [
              <BloodGroupBadge key="g" group={g.group} size="sm" />,
              formatNumber(g.requests),
              formatNumber(g.unitsRequested),
              <span key="s">{formatNumber(g.unitsFulfilled)} <span className="text-ink-400">({pctOf(g.unitsFulfilled, g.unitsRequested)})</span></span>,
              formatNumber(g.activeDonors),
              formatNumber(g.availableUnits),
              <StockBadge key="l" level={g.stockLevel} />,
            ])}
            empty="No blood groups match these filters."
          />
        </Card>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Cities">
          <Card className="overflow-hidden">
            <Table
              caption="Requests and donations by city"
              head={[{ label: "City" }, { label: "Requests", align: "right" }, { label: "Fulfilled", align: "right" }, { label: "Emergencies", align: "right" }, { label: "Donations", align: "right" }]}
              rows={report.cities.map((c) => [<span key="c" className="font-medium text-ink-900">{c.city}</span>, formatNumber(c.requests), `${formatNumber(c.fulfilled)} (${pctOf(c.fulfilled, c.requests)})`, formatNumber(c.emergencies), formatNumber(c.donations)])}
              empty="No requests or donations in this period."
            />
          </Card>
        </Section>
        <Section title="Facilities" description="The 15 facilities with the most requests.">
          <Card className="overflow-hidden">
            <Table
              caption="Requests by facility"
              head={[{ label: "Facility" }, { label: "Requests", align: "right" }, { label: "Units", align: "right" }, { label: "Fulfilled", align: "right" }, { label: "Median to fulfil", align: "right" }]}
              rows={report.hospitals.map((h) => [
                <span key="h"><span className="block font-medium text-ink-900">{h.name}</span><span className="text-xs text-ink-500">{h.city}</span></span>,
                formatNumber(h.requests),
                formatNumber(h.unitsRequested),
                `${formatNumber(h.fulfilled)} (${pctOf(h.fulfilled, h.requests)})`,
                h.medianHoursToFulfil === null ? "–" : formatHours(h.medianHoursToFulfil),
              ])}
              empty="No requests in this period."
            />
          </Card>
        </Section>
      </div>

      <Section title="Donations and donors">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Appointment outcomes" description="Donation appointments dated in this period">
            <DonutChart data={report.donationOutcomes} caption="Donation appointments by outcome" centerLabel="Appointments" centerValue={formatNumber(donationTotal)} />
          </ChartCard>
          <ChartCard title="Donor verification" description="All registered donors matching the city and group filters">
            <HBarList data={report.donorVerification} caption="Donors by verification status" />
          </ChartCard>
        </div>
      </Section>

      <Section title="Blood stock" description={`${formatNumber(k.unitsIn.value ?? 0)} units recorded in and ${formatNumber(k.unitsOut.value ?? 0)} out during the period.`}>
        <Card className="overflow-hidden">
          <CardHeader title="Stock by group" description="Current balance with movements recorded in Blood inventory" action={<Package className="h-4 w-4 text-ink-400" aria-hidden />} />
          <Table
            caption="Blood stock by group"
            head={[{ label: "Group" }, { label: "Available", align: "right" }, { label: "Required", align: "right" }, { label: "Units in", align: "right" }, { label: "Units out", align: "right" }, { label: "Level" }]}
            rows={report.inventory.map((i) => [
              <BloodGroupBadge key="g" group={i.group} size="sm" />,
              formatNumber(i.available),
              formatNumber(i.required),
              <span key="in" className="text-ok-700">+{formatNumber(i.unitsIn)}</span>,
              <span key="out" className="text-hemo-700">−{formatNumber(i.unitsOut)}</span>,
              <StockBadge key="l" level={i.stockLevel} />,
            ])}
            empty="No stock records yet. Load stock targets in System settings."
          />
        </Card>
      </Section>

      {report.notes.length > 0 && (
        <aside className="rounded-card border border-dashed border-line bg-paper p-4 text-[13px] text-ink-600">
          <p className="mb-1 inline-flex items-center gap-1.5 font-semibold text-ink-800"><Activity className="h-4 w-4" aria-hidden /> About these figures</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {report.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            <li>Times are measured from when a request is created. Rates exclude cancelled requests.</li>
          </ul>
        </aside>
      )}
    </div>
  );
}
