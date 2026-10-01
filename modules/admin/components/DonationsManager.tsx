"use client";

import { useCallback, useState } from "react";
import { CalendarHeart, CheckCircle2, Clock, MoreHorizontal, XCircle } from "lucide-react";
import type { BloodGroup, Donation, DonationStatus } from "@/types";
import { donationService } from "@/services/donationService";
import { useListControls } from "./useListControls";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSelect, SearchInput } from "@/components/ui/Field";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { DonationStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BLOOD_GROUPS, DONATION_STATUS_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export function DonationsManager({ initial }: { initial: Donation[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [status, setStatus] = useState<DonationStatus | "any">("any");
  const [group, setGroup] = useState<BloodGroup | "any">("any");

  const filter = useCallback((d: Donation) => (status === "any" || d.status === status) && (group === "any" || d.bloodGroup === group), [status, group]);
  const list = useListControls(rows, filter, {
    search: (d) => [d.donorName, d.centerName, d.city, d.certificateId ?? "", d.linkedRequestCode ?? ""],
    sorters: { date: (d) => +new Date(d.date), donor: (d) => d.donorName, units: (d) => d.units },
    initialSort: { key: "date", dir: "desc" },
  });

  async function update(d: Donation, s: DonationStatus) {
    const before = rows;
    setRows((xs) => xs.map((x) => (x.id === d.id ? { ...x, status: s } : x)));
    try {
      const res = (await donationService.updateStatus(d.id, s)) as { certificateId?: string };
      const certificateId = res?.certificateId ?? (s === "completed" && !d.certificateId ? `QTR-C-${90000 + Math.floor(Math.random() * 9000)}` : d.certificateId);
      setRows((xs) => xs.map((x) => (x.id === d.id ? { ...x, status: s, certificateId } : x)));
      toast.success(`Donation by ${d.donorName} marked ${DONATION_STATUS_META[s].label.toLowerCase()}.`, s === "completed" && certificateId ? `Certificate ${certificateId} issued.` : undefined);
    } catch (err) {
      setRows(before);
      toast.error("Couldn't update this donation.", err instanceof Error ? err.message : "Please try again.");
    }
  }

  const actions = (d: Donation) => (
    <Dropdown
      label={`Actions for donation by ${d.donorName}`}
      trigger={({ open, toggle }) => <Button size="icon" variant="ghost" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`Actions for donation by ${d.donorName}`}><MoreHorizontal className="h-4 w-4" aria-hidden /></Button>}
      items={[
        { label: "Mark completed", icon: <CheckCircle2 className="h-4 w-4" aria-hidden />, onSelect: () => update(d, "completed"), disabled: d.status === "completed" },
        { label: "Defer donor", icon: <Clock className="h-4 w-4" aria-hidden />, onSelect: () => update(d, "deferred"), disabled: d.status !== "scheduled" },
        { label: "Cancel appointment", icon: <XCircle className="h-4 w-4" aria-hidden />, onSelect: () => update(d, "cancelled"), disabled: d.status !== "scheduled", tone: "danger" },
      ]}
    />
  );

  const columns: Column<Donation>[] = [
    { key: "date", header: "Date", sortable: true, hideOnCard: true, cell: (d) => <span className="whitespace-nowrap font-medium text-ink-900">{formatDate(d.date)}</span> },
    { key: "donor", header: "Donor", sortable: true, cell: (d) => d.donorName },
    { key: "group", header: "Group", cell: (d) => <BloodGroupBadge group={d.bloodGroup} size="sm" /> },
    { key: "center", header: "Location", cell: (d) => <span className="block max-w-[15rem] truncate">{d.centerName}<span className="text-ink-400">, {d.city}</span></span> },
    { key: "units", header: "Units", sortable: true, align: "right", cell: (d) => <span className="tabular-nums">{d.units}</span> },
    { key: "request", header: "Linked request", cell: (d) => d.linkedRequestCode ?? <span className="text-ink-400">General stock</span> },
    { key: "status", header: "Status", cell: (d) => <DonationStatusBadge status={d.status} /> },
    { key: "cert", header: "Certificate", cell: (d) => d.certificateId ?? <span className="text-ink-400">None</span> },
    { key: "actions", header: "Actions", hideOnCard: true, align: "right", cell: actions },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <SearchInput aria-label="Search donations" placeholder="Search donor, centre, certificate or request" value={list.query} onChange={(e) => list.setQuery(e.target.value)} className="md:max-w-sm md:flex-1" />
        <div className="grid grid-cols-2 gap-3 md:flex">
          <FilterSelect label="Status" value={status} onChange={(e) => { setStatus(e.target.value as DonationStatus | "any"); list.resetPage(); }} className="md:w-40">
            <option value="any">All statuses</option>
            {(Object.keys(DONATION_STATUS_META) as DonationStatus[]).map((s) => <option key={s} value={s}>{DONATION_STATUS_META[s].label}</option>)}
          </FilterSelect>
          <FilterSelect label="Blood group" value={group} onChange={(e) => { setGroup(e.target.value as BloodGroup | "any"); list.resetPage(); }} className="md:w-36">
            <option value="any">All groups</option>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </FilterSelect>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={list.visible}
        rowKey={(d) => d.id}
        caption="Donation records"
        sort={list.sort}
        onSort={list.onSort}
        cardTitle={(d) => `${formatDate(d.date)}, ${d.donorName}`}
        cardActions={actions}
        empty={<EmptyState icon={<CalendarHeart className="h-5 w-5" />} title="No donations match these filters" />}
      />
      <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onChange={list.setPage} label="donations" />
    </Card>
  );
}
