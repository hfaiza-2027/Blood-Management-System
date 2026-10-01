"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeartPulse, LayoutGrid, List } from "lucide-react";
import type { BloodGroup } from "@/types";
import type { RequestWithDistance } from "@/services/bloodRequestService";
import { BloodRequestCard } from "@/components/blood/BloodRequestCard";
import { RespondButton } from "@/modules/client/components/Actions";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { FilterSelect, SearchInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { BLOOD_GROUPS, canDonateTo } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";
import { formatDateTime } from "@/lib/utils";

export type RequestTab = "all" | "nearby" | "emergency" | "mine" | "fulfilled";
const OPEN = ["pending", "approved", "matching", "donor_found", "partially_fulfilled"];

interface Props {
  requests: RequestWithDistance[];
  userId: string;
  userGroup: BloodGroup;
  initialTab: RequestTab;
  respondId?: string;
}

export function RequestsBoard({ requests, userId, userGroup, initialTab, respondId }: Props) {
  const [tab, setTab] = useState<RequestTab>(initialTab);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<BloodGroup | "any">("any");
  const [view, setView] = useState<"cards" | "list">("cards");
  const canHelp = useMemo(() => canDonateTo(userGroup), [userGroup]);

  const byTab = useMemo(() => {
    const open = requests.filter((r) => OPEN.includes(r.status));
    return {
      all: requests,
      nearby: open.filter((r) => r.distanceKm <= 15).sort((a, b) => a.distanceKm - b.distanceKm),
      emergency: open.filter((r) => r.urgency === "emergency"),
      mine: requests.filter((r) => r.requesterId === userId),
      fulfilled: requests.filter((r) => r.status === "fulfilled"),
    } satisfies Record<RequestTab, RequestWithDistance[]>;
  }, [requests, userId]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = byTab[tab]
      .filter((r) => group === "any" || r.bloodGroup === group)
      .filter((r) => !term || [r.hospitalName, r.location.area, r.location.city, r.patientName, r.code].some((s) => s.toLowerCase().includes(term)));
    if (tab === "all") {
      return [...list].sort((a, b) => {
        const rank = (x: RequestWithDistance) => (OPEN.includes(x.status) ? (x.urgency === "emergency" ? 0 : x.urgency === "urgent" ? 1 : 2) : 3);
        return rank(a) - rank(b) || a.distanceKm - b.distanceKm;
      });
    }
    return list;
  }, [byTab, tab, q, group]);

  function action(r: RequestWithDistance) {
    const mine = r.requesterId === userId;
    if (mine) return <ButtonLink href={`/dashboard/requests/${r.id}`} size="sm" variant="outline">Track request</ButtonLink>;
    if (!OPEN.includes(r.status)) return <ButtonLink href={`/dashboard/requests/${r.id}`} size="sm" variant="ghost">View details</ButtonLink>;
    if (!canHelp.includes(r.bloodGroup)) return <span className="text-[13px] text-ink-400">Your {userGroup} isn&apos;t compatible</span>;
    return <RespondButton requestId={r.id} patientName={r.patientName} hospitalName={r.hospitalName} bloodGroup={r.bloodGroup} defaultOpen={respondId === r.id || respondId === r.code} />;
  }

  const columns: Column<RequestWithDistance>[] = [
    { key: "group", header: "Blood group", cell: (r) => <BloodGroupBadge group={r.bloodGroup} size="sm" />, hideOnCard: true },
    { key: "units", header: "Units", cell: (r) => <span className="tabular-nums">{r.unitsFulfilled}/{r.unitsRequired}</span> },
    { key: "hospital", header: "Hospital", cell: (r) => <span className="block max-w-[14rem] truncate">{r.hospitalName}</span> },
    { key: "location", header: "Location", cell: (r) => `${r.location.area}, ${r.location.city}` },
    { key: "distance", header: "Distance", cell: (r) => <span className="tabular-nums">{formatDistance(r.distanceKm)}</span> },
    { key: "urgency", header: "Urgency", cell: (r) => <UrgencyBadge urgency={r.urgency} /> },
    { key: "date", header: "Required by", cell: (r) => formatDateTime(r.requiredBy) },
    { key: "status", header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
    { key: "requester", header: "Requester", cell: (r) => (r.requesterId === userId ? "You" : r.requesterName) },
    { key: "action", header: "Action", cell: action, hideOnCard: true, align: "right" },
  ];

  return (
    <div className="space-y-5">
      <Tabs<RequestTab>
        label="Filter blood requests"
        value={tab}
        onChange={setTab}
        items={[
          { value: "all", label: "All", count: byTab.all.length },
          { value: "nearby", label: "Nearby", count: byTab.nearby.length },
          { value: "emergency", label: "Emergency", count: byTab.emergency.length },
          { value: "mine", label: "My requests", count: byTab.mine.length },
          { value: "fulfilled", label: "Fulfilled", count: byTab.fulfilled.length },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput aria-label="Search requests" placeholder="Search hospital, area or request ID" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs sm:flex-1" />
        <FilterSelect label="Blood group" value={group} onChange={(e) => setGroup(e.target.value as BloodGroup | "any")} className="sm:w-44">
          <option value="any">All blood groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </FilterSelect>
        <div className="ml-auto hidden rounded border border-line bg-white p-0.5 md:inline-flex" role="group" aria-label="Layout">
          <button onClick={() => setView("cards")} aria-pressed={view === "cards"} className={`rounded-[4px] p-1.5 ${view === "cards" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`} aria-label="Card view"><LayoutGrid className="h-4 w-4" aria-hidden /></button>
          <button onClick={() => setView("list")} aria-pressed={view === "list"} className={`rounded-[4px] p-1.5 ${view === "list" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`} aria-label="Table view"><List className="h-4 w-4" aria-hidden /></button>
        </div>
      </div>

      {tab === "emergency" && rows.length > 0 && (
        <p className="rounded border border-hemo-200 bg-hemo-50 px-4 py-2.5 text-sm text-hemo-800">
          These patients need blood within hours. If you can help, respond now and go to the hospital&apos;s blood bank with your CNIC.
        </p>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HeartPulse className="h-5 w-5" />}
            title={tab === "mine" ? "You haven't requested blood yet" : "No requests match these filters"}
            description={tab === "mine" ? "When you create a request it appears here with live status updates." : "Try another tab or clear the search."}
            action={tab === "mine" ? <ButtonLink href="/dashboard/request">Request blood</ButtonLink> : undefined}
          />
        </Card>
      ) : view === "list" ? (
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            caption="Blood requests"
            cardTitle={(r) => (
              <span className="flex items-center gap-2">
                <BloodGroupBadge group={r.bloodGroup} size="sm" />
                <Link href={`/dashboard/requests/${r.id}`} className="hover:underline">{r.code}</Link>
              </span>
            )}
            cardActions={action}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => <BloodRequestCard key={r.id} request={r} action={action(r)} />)}
        </div>
      )}
    </div>
  );
}
