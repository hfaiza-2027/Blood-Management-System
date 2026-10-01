import type { Metadata } from "next";
import { Check } from "lucide-react";
import type { BloodGroup } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { StockBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { BLOOD_GROUPS, BLOOD_GROUP_NOTES, COMPATIBLE_DONORS, canDonateTo } from "@/lib/constants";
import { dashboardService } from "@/services/dashboardService";
import { inventoryService, stockLevel } from "@/services/inventoryService";
import { cn, formatNumber } from "@/lib/utils";
import type { BloodInventory } from "@/types";

export const metadata: Metadata = { title: "Blood groups" };

interface Row { group: BloodGroup; donors: number; demand: number; stock?: BloodInventory }

export default async function BloodGroupsPage() {
  const [reports, inventory] = await Promise.all([dashboardService.reports(), inventoryService.list()]);
  const rows: Row[] = BLOOD_GROUPS.map((g) => ({
    group: g,
    donors: reports.donorGroupDistribution.find((d) => d.group === g)?.value ?? 0,
    demand: reports.groupDemand.find((d) => d.group === g)?.value ?? 0,
    stock: inventory.find((i) => i.bloodGroup === g),
  }));
  const totalDonors = rows.reduce((a, r) => a + r.donors, 0);

  const columns: Column<Row>[] = [
    { key: "group", header: "Group", hideOnCard: true, cell: (r) => <BloodGroupBadge group={r.group} size="sm" /> },
    { key: "donors", header: "Active donors", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.donors)} <span className="text-ink-400">({Math.round((r.donors / totalDonors) * 100)}%)</span></span> },
    { key: "demand", header: "Requests this year", align: "right", cell: (r) => <span className="tabular-nums">{r.demand}</span> },
    { key: "ratio", header: "Donors per request", align: "right", cell: (r) => <span className={cn("tabular-nums font-semibold", r.donors / Math.max(1, r.demand) < 3 ? "text-hemo-700" : "text-ink-900")}>{(r.donors / Math.max(1, r.demand)).toFixed(1)}</span> },
    { key: "stock", header: "Stock", cell: (r) => (r.stock ? <span className="inline-flex items-center gap-2"><span className="tabular-nums">{r.stock.available} units</span><StockBadge level={stockLevel(r.stock)} /></span> : "No data") },
    { key: "gives", header: "Can give to", cell: (r) => <span className="text-ink-600">{canDonateTo(r.group).join(", ")}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blood groups"
        description="Donor supply, demand and stock for each group, with the red-cell compatibility used in matching."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Blood groups" }]}
      />

      <Card className="overflow-hidden">
        <CardHeader title="Supply and demand" description="Groups with fewer than 3 active donors per request are highlighted." />
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.group} caption="Supply and demand by blood group" cardTitle={(r) => <BloodGroupBadge group={r.group} size="sm" />} />
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Red-cell compatibility" description="Rows are patients, columns are donors. Matching uses this table; plasma and platelets follow different rules." />
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full min-w-[34rem] border-separate border-spacing-1 text-center text-sm">
            <caption className="sr-only">Red-cell compatibility: which donor groups each patient group can receive from</caption>
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-left text-xs font-semibold text-ink-500">Patient ↓ Donor →</th>
                {BLOOD_GROUPS.map((d) => <th key={d} scope="col" className="px-2 py-1 font-semibold text-ink-800">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {BLOOD_GROUPS.map((p) => (
                <tr key={p}>
                  <th scope="row" className="px-2 py-1 text-left font-semibold text-ink-800">{p}</th>
                  {BLOOD_GROUPS.map((d) => {
                    const ok = COMPATIBLE_DONORS[p].includes(d);
                    return (
                      <td key={d} className={cn("h-9 rounded", ok ? "bg-ok-50 text-ok-700" : "bg-paper text-ink-300")}>
                        {ok ? <Check className="mx-auto h-4 w-4" aria-label="Compatible" /> : <span aria-label="Not compatible">·</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section aria-label="Group notes" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {BLOOD_GROUPS.map((g) => (
          <Card key={g} className="flex gap-3 p-4">
            <BloodGroupBadge group={g} />
            <p className="text-sm text-ink-600">{BLOOD_GROUP_NOTES[g]}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
