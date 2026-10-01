"use client";

import { useCallback, useState, type FormEvent } from "react";
import { BadgeCheck, Ban, Eye, MessageCircle, MoreHorizontal, Pencil, RotateCcw, UsersRound } from "lucide-react";
import type { BloodGroup, Donor, DonorAvailability, VerificationStatus } from "@/types";
import { donorService } from "@/services/donorService";
import { useListControls } from "./useListControls";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSelect, Select, Textarea } from "@/components/ui/Field";
import { SearchInput } from "@/components/ui/Field";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { AvailabilityBadge, VerificationBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BLOOD_GROUPS } from "@/lib/constants";
import { daysBetween, formatDate, now } from "@/lib/utils";

export function DonorsManager({ initial }: { initial: Donor[] }) {
  const toast = useToast();
  const [donors, setDonors] = useState(initial);
  const [group, setGroup] = useState<BloodGroup | "any">("any");
  const [verification, setVerification] = useState<VerificationStatus | "any">("any");
  const [availability, setAvailability] = useState<DonorAvailability | "any">("any");
  const [viewing, setViewing] = useState<Donor | null>(null);
  const [editing, setEditing] = useState<Donor | null>(null);
  const [editAvail, setEditAvail] = useState<DonorAvailability>("available");
  const [suspending, setSuspending] = useState<Donor | null>(null);
  const [contacting, setContacting] = useState<Donor | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const filter = useCallback(
    (d: Donor) => (group === "any" || d.bloodGroup === group) && (verification === "any" || d.verification === verification) && (availability === "any" || d.availability === availability),
    [group, verification, availability],
  );
  const list = useListControls(donors, filter, {
    search: (d) => [d.name, d.location.city, d.location.area],
    sorters: { name: (d) => d.name, total: (d) => d.totalDonations, last: (d) => (d.lastDonationDate ? +new Date(d.lastDonationDate) : 0) },
    initialSort: { key: "total", dir: "desc" },
  });
  const pending = donors.filter((d) => d.verification === "pending").length;

  function patch(id: string, p: Partial<Donor>) {
    setDonors((xs) => xs.map((d) => (d.id === id ? { ...d, ...p } : d)));
  }

  async function verify(d: Donor, v: VerificationStatus) {
    const prev = d.verification;
    patch(d.id, { verification: v });
    try {
      await donorService.setVerification(d.id, v);
      toast.success(v === "verified" ? `${d.name} verified.` : `${d.name}'s verification rejected.`);
    } catch (err) {
      patch(d.id, { verification: prev });
      toast.error("Couldn't update verification.", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function suspend() {
    if (!suspending) return;
    setBusy(true);
    try {
      await donorService.setStatus(suspending.id, "suspended");
      patch(suspending.id, { status: "suspended", availability: "unavailable" });
      toast.success(`${suspending.name} suspended.`, "They no longer appear in donor search.");
      setSuspending(null);
    } catch (err) {
      toast.error("Couldn't suspend this donor.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reinstate(d: Donor) {
    patch(d.id, { status: "active" });
    try {
      await donorService.setStatus(d.id, "active");
      toast.success(`${d.name} reinstated.`);
    } catch (err) {
      patch(d.id, { status: "suspended" });
      toast.error("Couldn't reinstate this donor.", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await donorService.updateAvailability(editAvail, editing.id);
      patch(editing.id, { availability: editAvail });
      setEditing(null);
      toast.success("Donor updated.");
    } catch (err) {
      toast.error("Couldn't update this donor.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!contacting) return;
    if (!message.trim()) return toast.error("Write a message first.");
    setBusy(true);
    try {
      await donorService.contactDonor(contacting.id);
      toast.success(`Message sent to ${contacting.name}.`, "They'll see it in their notifications.");
      setContacting(null);
      setMessage("");
    } catch (err) {
      toast.error("Couldn't send the message.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const actions = (d: Donor) => (
    <Dropdown
      label={`Actions for ${d.name}`}
      trigger={({ open, toggle }) => (
        <Button size="icon" variant="ghost" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`Actions for ${d.name}`}><MoreHorizontal className="h-4 w-4" aria-hidden /></Button>
      )}
      items={[
        { label: "View", icon: <Eye className="h-4 w-4" aria-hidden />, onSelect: () => setViewing(d) },
        { label: "Verify", icon: <BadgeCheck className="h-4 w-4" aria-hidden />, onSelect: () => verify(d, "verified"), disabled: d.verification === "verified" },
        { label: "Edit availability", icon: <Pencil className="h-4 w-4" aria-hidden />, onSelect: () => { setEditing(d); setEditAvail(d.availability); } },
        { label: "Contact", icon: <MessageCircle className="h-4 w-4" aria-hidden />, onSelect: () => setContacting(d), disabled: d.status === "suspended" },
        d.status === "suspended"
          ? { label: "Reinstate", icon: <RotateCcw className="h-4 w-4" aria-hidden />, onSelect: () => reinstate(d) }
          : { label: "Suspend", icon: <Ban className="h-4 w-4" aria-hidden />, onSelect: () => setSuspending(d), tone: "danger" as const },
      ]}
    />
  );

  const columns: Column<Donor>[] = [
    { key: "name", header: "Donor", sortable: true, hideOnCard: true, cell: (d) => <span className="font-medium text-ink-900">{d.name}</span> },
    { key: "group", header: "Blood group", cell: (d) => <BloodGroupBadge group={d.bloodGroup} size="sm" /> },
    { key: "location", header: "Location", cell: (d) => `${d.location.area}, ${d.location.city}` },
    { key: "availability", header: "Availability", cell: (d) => <AvailabilityBadge value={d.availability} /> },
    { key: "verification", header: "Verification", cell: (d) => <VerificationBadge value={d.verification} /> },
    { key: "last", header: "Last donation", sortable: true, cell: (d) => (d.lastDonationDate ? <span className="whitespace-nowrap">{formatDate(d.lastDonationDate)}</span> : <span className="text-ink-400">Never</span>) },
    { key: "total", header: "Donations", sortable: true, align: "right", cell: (d) => <span className="tabular-nums">{d.totalDonations}</span> },
    { key: "status", header: "Status", cell: (d) => (d.status === "active" ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Suspended</Badge>) },
    { key: "actions", header: "Actions", hideOnCard: true, align: "right", cell: actions },
  ];

  return (
    <>
      {pending > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-warn-100 bg-warn-50 px-4 py-3 text-sm text-warn-700">
          <span><span className="font-semibold">{pending} donors</span> are waiting for verification.</span>
          <Button size="sm" variant="outline" onClick={() => { setVerification("pending"); list.resetPage(); }}>Review pending</Button>
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <SearchInput aria-label="Search donors" placeholder="Search name, city or area" value={list.query} onChange={(e) => list.setQuery(e.target.value)} className="lg:max-w-xs lg:flex-1" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
            <FilterSelect label="Blood group" value={group} onChange={(e) => { setGroup(e.target.value as BloodGroup | "any"); list.resetPage(); }} className="lg:w-36">
              <option value="any">All groups</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </FilterSelect>
            <FilterSelect label="Verification" value={verification} onChange={(e) => { setVerification(e.target.value as VerificationStatus | "any"); list.resetPage(); }} className="lg:w-40">
              <option value="any">Any verification</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="rejected">Rejected</option>
            </FilterSelect>
            <FilterSelect label="Availability" value={availability} onChange={(e) => { setAvailability(e.target.value as DonorAvailability | "any"); list.resetPage(); }} className="lg:w-44">
              <option value="any">Any availability</option><option value="available">Available</option><option value="temporarily_unavailable">Temporarily unavailable</option><option value="unavailable">Unavailable</option>
            </FilterSelect>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={list.visible}
          rowKey={(d) => d.id}
          caption="Donors"
          sort={list.sort}
          onSort={list.onSort}
          cardTitle={(d) => d.name}
          cardActions={actions}
          rowClassName={(d) => (d.status === "suspended" ? "opacity-60" : undefined)}
          empty={<EmptyState icon={<UsersRound className="h-5 w-5" />} title="No donors match these filters" />}
        />
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onChange={list.setPage} label="donors" />
      </Card>

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing?.name ?? ""} description={viewing ? `${viewing.location.area}, ${viewing.location.city}` : undefined}>
        {viewing && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2"><BloodGroupBadge group={viewing.bloodGroup} /><AvailabilityBadge value={viewing.availability} /><VerificationBadge value={viewing.verification} /></div>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-ink-400">Age</dt><dd className="text-ink-900">{viewing.age}</dd></div>
              <div><dt className="text-xs text-ink-400">Weight</dt><dd className="text-ink-900">{viewing.weightKg} kg</dd></div>
              <div><dt className="text-xs text-ink-400">Total donations</dt><dd className="text-ink-900">{viewing.totalDonations}</dd></div>
              <div><dt className="text-xs text-ink-400">Last donation</dt><dd className="text-ink-900">{viewing.lastDonationDate ? `${formatDate(viewing.lastDonationDate)} (${daysBetween(viewing.lastDonationDate, now())} days)` : "Never"}</dd></div>
              <div><dt className="text-xs text-ink-400">Preferred contact</dt><dd className="text-ink-900">{viewing.preferredContact === "whatsapp" ? "WhatsApp" : viewing.preferredContact === "sms" ? "SMS" : viewing.preferredContact === "email" ? "Email" : "Phone call"}</dd></div>
            </dl>
            {viewing.verification === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { verify(viewing, "verified"); setViewing(null); }}>Approve verification</Button>
                <Button size="sm" variant="danger" onClick={() => { verify(viewing, "rejected"); setViewing(null); }}>Reject</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={`Edit ${editing?.name ?? "donor"}`} size="sm" footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button variant="secondary" type="submit" form="edit-donor" loading={busy}>Save</Button></>}>
        <form id="edit-donor" onSubmit={saveEdit}>
          <Select id="ed-avail" label="Availability" value={editAvail} onChange={(e) => setEditAvail(e.target.value as DonorAvailability)}>
            <option value="available">Available</option><option value="temporarily_unavailable">Temporarily unavailable</option><option value="unavailable">Unavailable</option>
          </Select>
        </form>
      </Modal>

      <Modal open={contacting !== null} onClose={() => setContacting(null)} title={`Contact ${contacting?.name ?? ""}`} description="Sent through the donor's preferred channel. Their number isn't shown here." footer={<><Button variant="outline" onClick={() => setContacting(null)}>Cancel</Button><Button variant="secondary" onClick={sendMessage} loading={busy} loadingText="Sending…">Send message</Button></>}>
        <Textarea id="cd-msg" label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Assalam o Alaikum, a patient near you needs your blood group…" />
      </Modal>

      <ConfirmDialog
        open={suspending !== null}
        title={`Suspend ${suspending?.name ?? "this donor"}?`}
        description="They'll be hidden from search and won't receive request alerts until reinstated."
        confirmLabel="Suspend donor"
        cancelLabel="Cancel"
        loading={busy}
        onConfirm={suspend}
        onCancel={() => setSuspending(null)}
      />
    </>
  );
}
