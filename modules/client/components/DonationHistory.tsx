"use client";

import { useMemo, useState } from "react";
import { Award, Printer } from "lucide-react";
import type { Donation, DonationStatus } from "@/types";
import { DataTable, type Column, type SortState } from "@/components/ui/DataTable";
import { DonationStatusBadge } from "@/components/ui/StatusBadge";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { LogoMark } from "@/components/layout/Logo";
import { formatDate } from "@/lib/utils";

export function DonationHistory({ donations }: { donations: Donation[] }) {
  const [status, setStatus] = useState<DonationStatus | "all">("all");
  const [sort, setSort] = useState<SortState>({ key: "date", dir: "desc" });
  const [cert, setCert] = useState<Donation | null>(null);

  const rows = useMemo(() => {
    const r = donations.filter((d) => status === "all" || d.status === status);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sort.key === "center") return a.centerName.localeCompare(b.centerName) * dir;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    });
  }, [donations, status, sort]);

  const columns: Column<Donation>[] = [
    { key: "date", header: "Date", sortable: true, cell: (d) => <span className="tabular-nums">{formatDate(d.date)}</span>, hideOnCard: true },
    { key: "center", header: "Centre", sortable: true, cell: (d) => <span className="font-medium text-ink-800">{d.centerName}</span> },
    { key: "group", header: "Group", cell: (d) => <BloodGroupBadge group={d.bloodGroup} size="sm" /> },
    { key: "units", header: "Units", align: "right", cell: (d) => d.units },
    { key: "linked", header: "For request", cell: (d) => d.linkedRequestCode ?? <span className="text-ink-400">General stock</span> },
    { key: "status", header: "Status", cell: (d) => <DonationStatusBadge status={d.status} /> },
    { key: "actions", header: "Certificate", align: "right", hideOnCard: true, cell: (d) => d.certificateId ? <Button size="sm" variant="ghost" onClick={() => setCert(d)} icon={<Award className="h-4 w-4" aria-hidden />}>View</Button> : <span className="text-ink-400">—</span> },
  ];

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-ink-900">All donations</h2>
        <FilterSelect label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as DonationStatus | "all")} className="w-44">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="scheduled">Scheduled</option>
          <option value="deferred">Deferred</option>
          <option value="cancelled">Cancelled</option>
        </FilterSelect>
      </div>
      <DataTable
        caption="Your donation history"
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        cardTitle={(d) => formatDate(d.date)}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
        cardActions={(d) => d.certificateId ? <Button size="sm" variant="outline" onClick={() => setCert(d)} icon={<Award className="h-4 w-4" aria-hidden />}>Certificate</Button> : null}
        empty={<EmptyState title="No donations with this status" description="Choose another status to see more of your history." />}
      />

      <Modal
        open={!!cert}
        onClose={() => setCert(null)}
        title="Donation certificate"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCert(null)}>Close</Button>
            <Button onClick={() => window.print()} icon={<Printer className="h-4 w-4" aria-hidden />}>Print or save as PDF</Button>
          </>
        }
      >
        {cert && (
          <div className="rounded-card border-2 border-hemo-200 bg-gradient-to-b from-hemo-50 to-white p-6 text-center sm:p-10">
            <LogoMark className="mx-auto h-10 w-10" />
            <p className="mt-4 font-display text-2xl text-ink-900 sm:text-3xl">Certificate of appreciation</p>
            <p className="mt-4 text-sm text-ink-600">This certifies that</p>
            <p className="mt-1 text-xl font-semibold text-ink-900">{cert.donorName}</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">
              donated {cert.units} unit of {cert.bloodGroup} blood at {cert.centerName}, {cert.city} on {formatDate(cert.date)}. One donation can help up to three patients.
            </p>
            <p className="mt-6 text-xs text-ink-400">Certificate ID {cert.certificateId}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
