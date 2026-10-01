"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Building2, Pencil, Plus, ShieldCheck } from "lucide-react";
import type { BloodGroup, FacilityType, Hospital } from "@/types";
import { hospitalService } from "@/services/hospitalService";
import { useListControls } from "./useListControls";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSelect, Input, SearchInput, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { VerificationBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BLOOD_GROUPS, CITIES, CITY_NAMES } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<FacilityType, string> = { hospital: "Hospital", blood_bank: "Blood bank", donation_center: "Donation centre" };

type FormValues = { name: string; type: string; address: string; city: string; area: string; phone: string; email: string; openingHours: string };
const EMPTY: FormValues = { name: "", type: "hospital", address: "", city: "Lahore", area: CITIES.Lahore[0], phone: "", email: "", openingHours: "Open 24 hours" };

export function HospitalsManager({ initial }: { initial: Hospital[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<FacilityType | "all">("all");
  const [city, setCity] = useState("any");
  const [editing, setEditing] = useState<Hospital | "new" | null>(null);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [groups, setGroups] = useState<BloodGroup[]>([]);
  const [errors, setErrors] = useState<Errors<FormValues>>({});
  const [busy, setBusy] = useState(false);

  const filter = useCallback((h: Hospital) => (tab === "all" || h.type === tab) && (city === "any" || h.city === city), [tab, city]);
  const list = useListControls(rows, filter, {
    search: (h) => [h.name, h.area, h.city, h.email],
    sorters: { name: (h) => h.name, city: (h) => `${h.city} ${h.area}` },
    initialSort: { key: "name", dir: "asc" },
  });

  const count = (t: FacilityType) => rows.filter((h) => h.type === t).length;

  function openForm(h: Hospital | "new") {
    setEditing(h);
    setErrors({});
    if (h === "new") {
      setValues(EMPTY);
      setGroups([]);
    } else {
      setValues({ name: h.name, type: h.type, address: h.address, city: h.city, area: h.area, phone: h.phone, email: h.email, openingHours: h.openingHours });
      setGroups(h.availableGroups);
    }
  }

  const set = (k: keyof FormValues) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setValues((s) => (k === "city" ? { ...s, city: v, area: CITIES[v]?.[0] ?? "" } : { ...s, [k]: v }));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validate(values, {
      name: [rules.required("the facility name")],
      address: [rules.required("the street address")],
      phone: [rules.required("a phone number")],
      email: [rules.required("an email"), rules.email()],
      openingHours: [rules.required("opening hours")],
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    const base = editing && editing !== "new" ? editing : null;
    const record: Hospital = {
      id: base?.id ?? `h${Date.now()}`,
      ...values,
      type: values.type as FacilityType,
      availableGroups: values.type === "donation_center" ? [] : groups,
      verified: base?.verified ?? false,
    };
    setBusy(true);
    try {
      await hospitalService.save(record);
      setRows((xs) => (base ? xs.map((x) => (x.id === base.id ? record : x)) : [record, ...xs]));
      toast.success(base ? `${record.name} updated.` : `${record.name} added.`, base ? undefined : "It stays unverified until a coordinator visits.");
      setEditing(null);
    } catch (err) {
      toast.error("Unable to save this facility", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVerified(h: Hospital) {
    const next = { ...h, verified: !h.verified };
    setRows((xs) => xs.map((x) => (x.id === h.id ? next : x)));
    try {
      await hospitalService.save(next);
      toast.success(next.verified ? `${h.name} marked as verified.` : `Verification removed from ${h.name}.`);
    } catch (err) {
      setRows((xs) => xs.map((x) => (x.id === h.id ? h : x)));
      toast.error("Couldn't update this facility.", err instanceof Error ? err.message : "Please try again.");
    }
  }

  const actions = (h: Hospital) => (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="ghost" icon={<ShieldCheck className="h-4 w-4" aria-hidden />} onClick={() => toggleVerified(h)}>{h.verified ? "Unverify" : "Verify"}</Button>
      <Button size="sm" variant="outline" icon={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => openForm(h)}>Edit</Button>
    </div>
  );

  const columns: Column<Hospital>[] = [
    { key: "name", header: "Facility", sortable: true, hideOnCard: true, cell: (h) => <span><span className="block font-semibold text-ink-900">{h.name}</span><span className="text-xs text-ink-500">{h.address}</span></span> },
    { key: "type", header: "Type", cell: (h) => TYPE_LABEL[h.type] },
    { key: "city", header: "Location", sortable: true, cell: (h) => `${h.area}, ${h.city}` },
    { key: "phone", header: "Contact", cell: (h) => <span className="whitespace-nowrap tabular-nums">{h.phone}</span> },
    { key: "hours", header: "Hours", cell: (h) => <span className="text-ink-600">{h.openingHours}</span> },
    {
      key: "groups", header: "Stocks", cell: (h) => h.availableGroups.length ? (
        <span className="flex flex-wrap gap-1">{h.availableGroups.map((g) => <BloodGroupBadge key={g} group={g} size="sm" />)}</span>
      ) : <span className="text-ink-400">Collection only</span>,
    },
    { key: "verified", header: "Status", cell: (h) => <VerificationBadge value={h.verified} /> },
    { key: "actions", header: "Actions", hideOnCard: true, align: "right", cell: actions },
  ];

  const isCenter = values.type === "donation_center";

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 pt-3">
          <Tabs
            label="Facility type"
            value={tab}
            onChange={(v) => { setTab(v); list.resetPage(); }}
            items={[
              { value: "all", label: "All", count: rows.length },
              { value: "hospital", label: "Hospitals", count: count("hospital") },
              { value: "blood_bank", label: "Blood banks", count: count("blood_bank") },
              { value: "donation_center", label: "Donation centres", count: count("donation_center") },
            ]}
          />
        </div>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput aria-label="Search facilities" placeholder="Search name, area or email" value={list.query} onChange={(e) => list.setQuery(e.target.value)} className="md:max-w-sm md:flex-1" />
          <FilterSelect label="City" value={city} onChange={(e) => { setCity(e.target.value); list.resetPage(); }} className="md:w-40">
            <option value="any">All cities</option>
            {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>
          <Button className="md:ml-auto" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => openForm("new")}>Add facility</Button>
        </div>
        <DataTable
          columns={columns}
          rows={list.visible}
          rowKey={(h) => h.id}
          caption="Hospitals, blood banks and donation centres"
          sort={list.sort}
          onSort={list.onSort}
          cardTitle={(h) => h.name}
          cardActions={actions}
          empty={<EmptyState icon={<Building2 className="h-5 w-5" />} title="No facilities match" description="Try another city or clear the search." />}
        />
        <Pagination page={list.page} pageSize={list.pageSize} total={list.total} onChange={list.setPage} label="facilities" />
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add facility" : "Edit facility"}
        description="Facility addresses and phone numbers are public so donors can find them."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="facility-form" loading={busy} loadingText="Saving…">Save facility</Button>
          </>
        }
      >
        <form id="facility-form" onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
          <Input id="f-name" label="Facility name" required value={values.name} onChange={set("name")} error={errors.name} wrapperClassName="sm:col-span-2" />
          <Select id="f-type" label="Type" value={values.type} onChange={set("type")}>
            {(Object.keys(TYPE_LABEL) as FacilityType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </Select>
          <Input id="f-hours" label="Opening hours" required value={values.openingHours} onChange={set("openingHours")} error={errors.openingHours} />
          <Input id="f-address" label="Street address" required value={values.address} onChange={set("address")} error={errors.address} wrapperClassName="sm:col-span-2" />
          <Select id="f-city" label="City" value={values.city} onChange={set("city")}>
            {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select id="f-area" label="Area" value={values.area} onChange={set("area")}>
            {(CITIES[values.city] ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Input id="f-phone" label="Phone" required type="tel" value={values.phone} onChange={set("phone")} error={errors.phone} placeholder="042 3575 1100" />
          <Input id="f-email" label="Email" required type="email" value={values.email} onChange={set("email")} error={errors.email} />
          {!isCenter && (
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-[13px] font-semibold text-ink-800">Blood groups usually in stock</legend>
              <div className="flex flex-wrap gap-2">
                {BLOOD_GROUPS.map((g) => {
                  const on = groups.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setGroups((gs) => (on ? gs.filter((x) => x !== g) : [...gs, g]))}
                      className={cn("h-9 min-w-[3rem] rounded border px-3 text-sm font-semibold transition-colors", on ? "border-hemo-600 bg-hemo-600 text-white" : "border-line bg-white text-ink-700 hover:border-hemo-300")}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </form>
      </Modal>
    </>
  );
}
