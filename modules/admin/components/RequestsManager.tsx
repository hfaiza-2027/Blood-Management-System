"use client";

import { useCallback, useMemo, useState } from "react";
import { Ban, CheckCircle2, ClipboardList, Eye, MoreHorizontal, RefreshCw, ThumbsDown, ThumbsUp, UserPlus } from "lucide-react";
import type { BloodRequest, RequestStatus, Urgency } from "@/types";
import { bloodRequestService } from "@/services/bloodRequestService";
import { useListControls } from "./useListControls";
import { AssignDonorsModal } from "./AssignDonorsModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSelect, SearchInput, Select } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Dropdown, type DropdownItem } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { RequestTimeline } from "@/components/blood/RequestTimeline";
import { useToast } from "@/components/ui/Toast";
import { REQUEST_STATUS_META } from "@/lib/constants";
import { formatDateTime, now } from "@/lib/utils";

type Tab = "review" | "active" | "closed" | "all";
const ACTIVE: RequestStatus[] = ["approved", "matching", "donor_found", "partially_fulfilled"];
const CLOSED: RequestStatus[] = ["fulfilled", "rejected", "cancelled"];
const ALL_STATUSES = Object.keys(REQUEST_STATUS_META) as RequestStatus[];

export function RequestsManager({ initial }: { initial: BloodRequest[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<Tab>("review");
  const [urgency, setUrgency] = useState<Urgency | "any">("any");
  const [viewing, setViewing] = useState<BloodRequest | null>(null);
  const [assigning, setAssigning] = useState<BloodRequest | null>(null);
  const [statusFor, setStatusFor] = useState<BloodRequest | null>(null);
  const [nextStatus, setNextStatus] = useState<RequestStatus>("matching");
  const [confirm, setConfirm] = useState<{ r: BloodRequest; kind: "reject" | "cancel" } | null>(null);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => ({
    review: rows.filter((r) => r.status === "pending").length,
    active: rows.filter((r) => ACTIVE.includes(r.status)).length,
    closed: rows.filter((r) => CLOSED.includes(r.status)).length,
    all: rows.length,
  }), [rows]);

  const filter = useCallback((r: BloodRequest) => {
    const inTab = tab === "all" || (tab === "review" ? r.status === "pending" : tab === "active" ? ACTIVE.includes(r.status) : CLOSED.includes(r.status));
    return inTab && (urgency === "any" || r.urgency === urgency);
  }, [tab, urgency]);

  const list = useListControls(rows, filter, {
    search: (r) => [r.code, r.patientName, r.hospitalName, r.requesterName, r.location.city],
    sorters: { code: (r) => r.code, required: (r) => +new Date(r.requiredBy), created: (r) => +new Date(r.createdAt), urgency: (r) => ({ emergency: 0, urgent: 1, normal: 2 })[r.urgency] },
    initialSort: { key: "urgency", dir: "asc" },
  });

  function apply(id: string, status: RequestStatus, note: string, extra: Partial<BloodRequest> = {}) {
    const at = now().toISOString();
    setRows((xs) => xs.map((r) => (r.id === id ? { ...r, ...extra, status, timeline: [...r.timeline, { status, at, note }] } : r)));
  }

  async function setStatus(r: BloodRequest, status: RequestStatus, note: string, success: string) {
    try {
      await bloodRequestService.updateStatus(r.id, status);
      apply(r.id, status, note, status === "fulfilled" ? { unitsFulfilled: r.unitsRequired } : {});
      toast.success(success);
    } catch (err) {
      toast.error("Unable to update the request", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy(true);
    const { r, kind } = confirm;
    await setStatus(r, kind === "reject" ? "rejected" : "cancelled", kind === "reject" ? "Rejected by coordinator" : "Cancelled by coordinator", `${r.code} ${kind === "reject" ? "rejected" : "cancelled"}.`);
    setBusy(false);
    setConfirm(null);
  }

  const actions = (r: BloodRequest) => {
    const open = !CLOSED.includes(r.status);
    const items: DropdownItem[] = [{ label: "View request", icon: <Eye className="h-4 w-4" aria-hidden />, onSelect: () => setViewing(r) }];
    if (r.status === "pending") {
      items.push({ label: "Approve", icon: <ThumbsUp className="h-4 w-4" aria-hidden />, onSelect: () => setStatus(r, "approved", "Approved by coordinator", `${r.code} approved.`) });
      items.push({ label: "Reject", icon: <ThumbsDown className="h-4 w-4" aria-hidden />, onSelect: () => setConfirm({ r, kind: "reject" }), tone: "danger" });
    }
    if (open && r.status !== "pending") items.push({ label: "Assign donors", icon: <UserPlus className="h-4 w-4" aria-hidden />, onSelect: () => setAssigning(r) });
    if (open) {
      items.push({ label: "Update status", icon: <RefreshCw className="h-4 w-4" aria-hidden />, onSelect: () => { setStatusFor(r); setNextStatus(r.status); } });
      items.push({ label: "Mark fulfilled", icon: <CheckCircle2 className="h-4 w-4" aria-hidden />, onSelect: () => setStatus(r, "fulfilled", "All units collected", `${r.code} marked fulfilled.`), disabled: r.status === "pending" });
      items.push({ label: "Cancel request", icon: <Ban className="h-4 w-4" aria-hidden />, onSelect: () => setConfirm({ r, kind: "cancel" }), tone: "danger" });
    }
    return (
      <div className="flex items-center justify-end gap-1">
        {r.status === "pending" && (
          <Button size="sm" variant="secondary" className="hidden xl:inline-flex" onClick={() => setStatus(r, "approved", "Approved by coordinator", `${r.code} approved.`)}>Approve</Button>
        )}
        <Dropdown
          label={`Actions for ${r.code}`}
          trigger={({ open: o, toggle }) => <Button size="icon" variant="ghost" onClick={toggle} aria-expanded={o} aria-haspopup="menu" aria-label={`Actions for ${r.code}`}><MoreHorizontal className="h-4 w-4" aria-hidden /></Button>}
          items={items}
        />
      </div>
    );
  };

  const columns: Column<BloodRequest>[] = [
    { key: "code", header: "Request", sortable: true, hideOnCard: true, cell: (r) => <button onClick={() => setViewing(r)} className="font-semibold text-ink-900 hover:text-hemo-700 hover:underline">{r.code}</button> },
    { key: "group", header: "Group", cell: (r) => <BloodGroupBadge group={r.bloodGroup} size="sm" /> },
    { key: "patient", header: "Patient", cell: (r) => <span className="whitespace-nowrap">{r.patientName}, {r.patientAge}</span> },
    { key: "units", header: "Units", cell: (r) => <span className="tabular-nums">{r.unitsFulfilled}/{r.unitsRequired}</span> },
    { key: "hospital", header: "Hospital", cell: (r) => <span className="block max-w-[13rem] truncate">{r.hospitalName}<span className="text-ink-400">, {r.location.city}</span></span> },
    { key: "urgency", header: "Urgency", sortable: true, cell: (r) => <UrgencyBadge urgency={r.urgency} /> },
    { key: "required", header: "Required by", sortable: true, cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.requiredBy)}</span> },
    { key: "status", header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
    { key: "actions", header: "Actions", hideOnCard: true, align: "right", cell: actions },
  ];

  return (
    <>
      <Tabs<Tab>
        label="Request queue"
        value={tab}
        onChange={(t) => { setTab(t); list.resetPage(); }}
        className="mb-4"
        items={[
          { value: "review", label: "Needs review", count: counts.review },
          { value: "active", label: "Active", count: counts.active },
          { value: "closed", label: "Closed", count: counts.closed },
          { value: "all", label: "All", count: counts.all },
        ]}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput aria-label="Search requests" placeholder="Search code, patient, hospital or city" value={list.query} onChange={(e) => list.setQuery(e.target.value)} className="sm:max-w-sm sm:flex-1" />
          <FilterSelect label="Urgency" value={urgency} onChange={(e) => { setUrgency(e.target.value as Urgency | "any"); list.resetPage(); }} className="sm:w-40">
            <option value="any">Any urgency</option><option value="emergency">Emergency</option><option value="urgent">Urgent</option><option value="normal">Normal</option>
          </FilterSelect>
        </div>
        <DataTable
          columns={columns}
          rows={list.visible}
          rowKey={(r) => r.id}
          caption="Blood requests"
          sort={list.sort}
          onSort={list.onSort}
          cardTitle={(r) => <span className="flex items-center gap-2"><BloodGroupBadge group={r.bloodGroup} size="sm" />{r.code}</span>}
          cardActions={actions}
          rowClassName={(r) => (r.urgency === "emergency" && !CLOSED.includes(r.status) ? "bg-hemo-50/40" : undefined)}
          empty={<EmptyState icon={<ClipboardList className="h-5 w-5" />} title={tab === "review" ? "Nothing waiting for review" : "No requests match"} description={tab === "review" ? "New requests will appear here as soon as they're submitted." : "Try a different search or filter."} />}
        />
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onChange={list.setPage} label="requests" />
      </Card>

      <Modal open={viewing !== null} onClose={() => setViewing(null)} size="lg" title={viewing ? `${viewing.code}, ${viewing.unitsRequired} units of ${viewing.bloodGroup}` : ""} description={viewing ? `${viewing.patientName} at ${viewing.hospitalName}` : undefined}>
        {viewing && (
          <div className="grid gap-6 sm:grid-cols-2">
            <dl className="space-y-3 text-sm">
              {[["Requester", viewing.requesterName], ["Contact", viewing.contactNumber], ["Reason", viewing.reason], ["Required by", formatDateTime(viewing.requiredBy)], ["Location", `${viewing.location.area}, ${viewing.location.city}`], ["Donors contacted", String(viewing.donorsContacted)]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-ink-400">{k}</dt><dd className="text-ink-900">{v}</dd></div>
              ))}
              {viewing.notes && <div><dt className="text-xs text-ink-400">Notes</dt><dd className="text-ink-700">{viewing.notes}</dd></div>}
              <div className="flex flex-wrap gap-1.5 pt-1"><UrgencyBadge urgency={viewing.urgency} /><RequestStatusBadge status={viewing.status} /></div>
            </dl>
            <RequestTimeline request={viewing} />
          </div>
        )}
      </Modal>

      <Modal
        open={statusFor !== null}
        onClose={() => setStatusFor(null)}
        size="sm"
        title={`Update ${statusFor?.code ?? ""}`}
        footer={<><Button variant="outline" onClick={() => setStatusFor(null)}>Cancel</Button><Button variant="secondary" onClick={async () => { if (statusFor) { await setStatus(statusFor, nextStatus, "Status updated by coordinator", `${statusFor.code} is now ${REQUEST_STATUS_META[nextStatus].label.toLowerCase()}.`); setStatusFor(null); } }}>Update status</Button></>}
      >
        <Select id="next-status" label="New status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value as RequestStatus)}>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{REQUEST_STATUS_META[s].label}</option>)}
        </Select>
      </Modal>

      <AssignDonorsModal
        request={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={(id, n) => setRows((xs) => xs.map((r) => (r.id === id ? { ...r, donorsContacted: r.donorsContacted + n, status: r.status === "approved" ? "matching" : r.status } : r)))}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === "reject" ? `Reject ${confirm.r.code}?` : "Are you sure you want to cancel this blood request?"}
        description={confirm?.kind === "reject" ? "The requester will be told why and can resubmit with corrected details." : "Donors already contacted will be told they're no longer needed."}
        confirmLabel={confirm?.kind === "reject" ? "Reject request" : "Cancel request"}
        loading={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
