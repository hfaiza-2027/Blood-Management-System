"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileClock } from "lucide-react";
import type { BloodRequest, RequestStatus } from "@/types";
import { DataTable, type Column, type SortState } from "@/components/ui/DataTable";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { FilterSelect, SearchInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { buttonClasses } from "@/components/ui/Button";
import { REQUEST_STATUS_META } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export function RequestHistory({ requests }: { requests: BloodRequest[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [sort, setSort] = useState<SortState>({ key: "created", dir: "desc" });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const dir = sort.dir === "asc" ? 1 : -1;
    return requests
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => !s || [r.code, r.patientName, r.hospitalName].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => {
        if (sort.key === "needed") return a.requiredBy.localeCompare(b.requiredBy) * dir;
        return a.createdAt.localeCompare(b.createdAt) * dir;
      });
  }, [requests, q, status, sort]);

  const columns: Column<BloodRequest>[] = [
    { key: "code", header: "Request", hideOnCard: true, cell: (r) => <Link href={`/dashboard/requests/${r.id}`} className="font-semibold text-ink-900 hover:text-hemo-700 hover:underline">{r.code}</Link> },
    { key: "patient", header: "Patient", cell: (r) => r.patientName },
    { key: "group", header: "Group", cell: (r) => <BloodGroupBadge group={r.bloodGroup} size="sm" /> },
    { key: "units", header: "Units", cell: (r) => <span className="tabular-nums">{r.unitsFulfilled} of {r.unitsRequired}</span> },
    { key: "hospital", header: "Hospital", className: "max-w-[14rem] truncate", cell: (r) => r.hospitalName },
    { key: "urgency", header: "Urgency", cell: (r) => <UrgencyBadge urgency={r.urgency} /> },
    { key: "created", header: "Created", sortable: true, cell: (r) => <span className="tabular-nums">{formatDate(r.createdAt)}</span> },
    { key: "needed", header: "Needed by", sortable: true, cell: (r) => <span className="tabular-nums">{formatDateTime(r.requiredBy)}</span> },
    { key: "status", header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
  ];

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row">
        <SearchInput aria-label="Search your requests" placeholder="Search by ID, patient or hospital" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs sm:flex-1" />
        <FilterSelect label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | "all")} className="sm:w-48">
          <option value="all">All statuses</option>
          {(Object.keys(REQUEST_STATUS_META) as RequestStatus[]).map((s) => <option key={s} value={s}>{REQUEST_STATUS_META[s].label}</option>)}
        </FilterSelect>
      </div>
      <DataTable
        caption="Your blood requests"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
        cardTitle={(r) => r.code}
        cardActions={(r) => <Link href={`/dashboard/requests/${r.id}`} className={buttonClasses("outline", "sm")}>View details</Link>}
        empty={
          <EmptyState
            icon={<FileClock className="h-6 w-6" aria-hidden />}
            title={requests.length === 0 ? "No requests yet" : "No requests match your search"}
            description={requests.length === 0 ? "Requests you post will appear here with live status updates." : "Try a different status or search term."}
            action={requests.length === 0 ? <Link href="/dashboard/request" className={buttonClasses("primary")}>Request blood</Link> : undefined}
          />
        }
      />
    </>
  );
}
