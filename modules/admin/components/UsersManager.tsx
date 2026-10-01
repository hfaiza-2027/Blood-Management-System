"use client";

import { useCallback, useState, type FormEvent } from "react";
import { BadgeCheck, Eye, MoreHorizontal, Pencil, Power, Trash2, Users } from "lucide-react";
import type { AccountStatus, User, UserRole } from "@/types";
import { userService } from "@/services/userService";
import { useListControls } from "./useListControls";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSelect, Input, SearchInput, Select } from "@/components/ui/Field";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Dropdown } from "@/components/ui/Dropdown";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { AccountStatusBadge, VerificationBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BLOOD_GROUPS, CITIES, CITY_NAMES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";

const ROLE_LABEL: Record<UserRole, string> = { user: "Member", donor: "Donor", admin: "Admin" };

type Edit = { fullName: string; email: string; phone: string; bloodGroup: string; city: string; area: string; role: string };

export function UsersManager({ initial, initialQuery }: { initial: User[]; initialQuery: string }) {
  const toast = useToast();
  const [users, setUsers] = useState(initial);
  const [role, setRole] = useState<UserRole | "any">("any");
  const [status, setStatus] = useState<AccountStatus | "any">("any");
  const [viewing, setViewing] = useState<User | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Edit | null>(null);
  const [formErr, setFormErr] = useState<Errors<Edit>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  const filter = useCallback((u: User) => (role === "any" || u.role === role) && (status === "any" || u.status === status), [role, status]);
  const list = useListControls(users, filter, {
    initialQuery,
    search: (u) => [u.fullName, u.email, u.phone, u.location.city, u.location.area],
    sorters: { name: (u) => u.fullName, joined: (u) => +new Date(u.joinedAt), group: (u) => u.bloodGroup, location: (u) => u.location.city },
    initialSort: { key: "joined", dir: "desc" },
  });

  function patch(id: string, p: Partial<User>) {
    setUsers((xs) => xs.map((u) => (u.id === id ? { ...u, ...p } : u)));
  }

  async function toggleActive(u: User) {
    const next: AccountStatus = u.status === "active" ? "inactive" : "active";
    patch(u.id, { status: next });
    try {
      await userService.setStatus(u.id, next);
      toast.success(`${u.fullName} ${next === "active" ? "activated" : "deactivated"}.`);
    } catch {
      patch(u.id, { status: u.status });
      toast.error("Couldn't update the account. Please try again.");
    }
  }

  async function verify(u: User) {
    patch(u.id, { verified: true });
    await userService.verify(u.id);
    toast.success(`${u.fullName} verified.`);
  }

  function openEdit(u: User) {
    setEditing(u);
    setFormErr({});
    setForm({ fullName: u.fullName, email: u.email, phone: u.phone, bloodGroup: u.bloodGroup, city: u.location.city, area: u.location.area, role: u.role });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!form || !editing) return;
    const errs = validate(form, { fullName: [rules.required("a name")], email: [rules.required("an email"), rules.email()], phone: [rules.required("a phone number"), rules.phone()], bloodGroup: [rules.bloodGroup()], area: [rules.required("an area")] });
    setFormErr(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    const updated: User = { ...editing, fullName: form.fullName, email: form.email, phone: form.phone, bloodGroup: form.bloodGroup as User["bloodGroup"], role: form.role as UserRole, location: { ...editing.location, city: form.city, area: form.area } };
    try {
      await userService.update(updated);
      patch(editing.id, updated);
      setEditing(null);
      toast.success("User updated.");
    } catch (err) {
      toast.error("Unable to save changes", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await userService.remove(deleting.id);
      setUsers((xs) => xs.filter((u) => u.id !== deleting.id));
      toast.success(`${deleting.fullName} deleted.`);
      setDeleting(null);
    } catch {
      toast.error("Unable to delete the user.");
    } finally {
      setBusy(false);
    }
  }

  const actions = (u: User) => (
    <Dropdown
      label={`Actions for ${u.fullName}`}
      trigger={({ open, id, toggle }) => (
        <Button size="icon" variant="ghost" onClick={toggle} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="menu" aria-label={`Actions for ${u.fullName}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      )}
      items={[
        { label: "View", icon: <Eye className="h-4 w-4" aria-hidden />, onSelect: () => setViewing(u) },
        { label: "Edit", icon: <Pencil className="h-4 w-4" aria-hidden />, onSelect: () => openEdit(u) },
        { label: "Verify", icon: <BadgeCheck className="h-4 w-4" aria-hidden />, onSelect: () => verify(u), disabled: u.verified },
        { label: u.status === "active" ? "Deactivate" : "Activate", icon: <Power className="h-4 w-4" aria-hidden />, onSelect: () => toggleActive(u) },
        { label: "Delete", icon: <Trash2 className="h-4 w-4" aria-hidden />, onSelect: () => setDeleting(u), tone: "danger", disabled: u.role === "admin" },
      ]}
    />
  );

  const columns: Column<User>[] = [
    { key: "name", header: "Name", sortable: true, hideOnCard: true, cell: (u) => (
      <span className="flex items-center gap-3"><Avatar name={u.fullName} size="sm" /><span className="min-w-0"><span className="block font-medium text-ink-900">{u.fullName}</span>{u.verified && <span className="text-xs text-ok-700">Verified</span>}</span></span>
    ) },
    { key: "email", header: "Email", cell: (u) => <span className="block max-w-[13rem] truncate">{u.email}</span> },
    { key: "phone", header: "Phone", cell: (u) => <span className="whitespace-nowrap tabular-nums">{u.phone}</span> },
    { key: "group", header: "Blood group", sortable: true, cell: (u) => <BloodGroupBadge group={u.bloodGroup} size="sm" /> },
    { key: "location", header: "Location", sortable: true, cell: (u) => `${u.location.area}, ${u.location.city}` },
    { key: "role", header: "Role", cell: (u) => <Badge tone={u.role === "admin" ? "info" : "muted"} dot={false}>{ROLE_LABEL[u.role]}</Badge> },
    { key: "status", header: "Status", cell: (u) => <AccountStatusBadge status={u.status} /> },
    { key: "joined", header: "Joined", sortable: true, cell: (u) => <span className="whitespace-nowrap">{formatDate(u.joinedAt)}</span> },
    { key: "actions", header: "Actions", hideOnCard: true, align: "right", cell: actions },
  ];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput aria-label="Search users" placeholder="Search name, email, phone or city" value={list.query} onChange={(e) => list.setQuery(e.target.value)} className="md:max-w-sm md:flex-1" />
          <div className="grid grid-cols-2 gap-3 md:flex">
            <FilterSelect label="Role" value={role} onChange={(e) => { setRole(e.target.value as UserRole | "any"); list.resetPage(); }} className="md:w-36">
              <option value="any">All roles</option><option value="donor">Donors</option><option value="user">Members</option><option value="admin">Admins</option>
            </FilterSelect>
            <FilterSelect label="Status" value={status} onChange={(e) => { setStatus(e.target.value as AccountStatus | "any"); list.resetPage(); }} className="md:w-40">
              <option value="any">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
            </FilterSelect>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={list.visible}
          rowKey={(u) => u.id}
          caption="Users"
          sort={list.sort}
          onSort={list.onSort}
          cardTitle={(u) => <span className="flex items-center gap-2"><Avatar name={u.fullName} size="sm" />{u.fullName}</span>}
          cardActions={actions}
          empty={<EmptyState icon={<Users className="h-5 w-5" />} title="No users match your search" description="Try a different name, email or filter." />}
        />
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onChange={list.setPage} label="users" />
      </Card>

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing?.fullName ?? ""} description={viewing ? `${ROLE_LABEL[viewing.role]} since ${formatDate(viewing.joinedAt)}` : undefined}>
        {viewing && (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              ["Email", viewing.email], ["Phone", viewing.phone], ["Location", `${viewing.location.area}, ${viewing.location.city}`],
              ["Gender", { male: "Male", female: "Female", other: "Other" }[viewing.gender]], ["Date of birth", formatDate(viewing.dateOfBirth)],
            ].map(([k, val]) => (<div key={k}><dt className="text-xs text-ink-400">{k}</dt><dd className="text-ink-900">{val}</dd></div>))}
            <div><dt className="text-xs text-ink-400">Blood group</dt><dd className="mt-0.5"><BloodGroupBadge group={viewing.bloodGroup} size="sm" /></dd></div>
            <div><dt className="text-xs text-ink-400">Status</dt><dd className="mt-0.5"><AccountStatusBadge status={viewing.status} /></dd></div>
            <div><dt className="text-xs text-ink-400">Verification</dt><dd className="mt-0.5"><VerificationBadge value={viewing.verified} /></dd></div>
          </dl>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit user"
        size="lg"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button variant="secondary" type="submit" form="edit-user" loading={saving} loadingText="Saving…">Save changes</Button></>}
      >
        {form && (
          <form id="edit-user" onSubmit={saveEdit} noValidate className="grid gap-4 sm:grid-cols-2">
            <Input id="eu-name" label="Full name" value={form.fullName} error={formErr.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} wrapperClassName="sm:col-span-2" />
            <Input id="eu-email" label="Email" type="email" value={form.email} error={formErr.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input id="eu-phone" label="Phone" value={form.phone} error={formErr.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select id="eu-group" label="Blood group" value={form.bloodGroup} error={formErr.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Select id="eu-role" label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">Member</option><option value="donor">Donor</option><option value="admin">Admin</option>
            </Select>
            <Select id="eu-city" label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value, area: "" })}>
              {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select id="eu-area" label="Area" value={form.area} error={formErr.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
              <option value="">Choose an area</option>
              {(CITIES[form.city] ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.fullName ?? "this user"}?`}
        description="Their account, donor profile and request history will be permanently removed. Consider deactivating instead."
        confirmLabel="Delete user"
        cancelLabel="Cancel"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
