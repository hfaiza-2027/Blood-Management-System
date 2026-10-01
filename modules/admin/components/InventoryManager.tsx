"use client";

import { useState, type FormEvent } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { BloodInventory } from "@/types";
import { inventoryService, stockLevel } from "@/services/inventoryService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { StockBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime } from "@/lib/utils";

const BAR: Record<string, string> = { normal: "bg-ok-600", low: "bg-warn-600", critical: "bg-hemo-600" };
const REASONS = ["New donations received", "Issued to hospital", "Transferred from partner bank", "Expired units discarded", "Stock count correction"];

export function InventoryManager({ initial }: { initial: BloodInventory[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [target, setTarget] = useState<BloodInventory | null>(null);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  function open(i: BloodInventory) {
    setTarget(i);
    setMode("add");
    setAmount("");
    setReason(REASONS[0]);
    setErr(undefined);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) return setErr("Enter a whole number of units, 1 or more.");
    if (mode === "remove" && n > target.available) return setErr(`Only ${target.available} units are available.`);
    const delta = mode === "add" ? n : -n;
    setBusy(true);
    try {
      await inventoryService.adjust(target.bloodGroup, delta, reason);
      setRows((xs) => xs.map((x) => (x.bloodGroup === target.bloodGroup ? { ...x, available: x.available + delta, expired: reason.startsWith("Expired") ? x.expired + n : x.expired, updatedAt: new Date().toISOString() } : x)));
      toast.success(`${target.bloodGroup} stock ${mode === "add" ? "increased" : "reduced"} by ${n} units.`, reason);
      setTarget(null);
    } catch (err) {
      toast.error("Unable to update stock", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<BloodInventory>[] = [
    { key: "group", header: "Blood group", hideOnCard: true, cell: (i) => <BloodGroupBadge group={i.bloodGroup} size="sm" /> },
    { key: "available", header: "Available", align: "right", cell: (i) => <span className="font-semibold tabular-nums text-ink-900">{i.available}</span> },
    { key: "reserved", header: "Reserved", align: "right", cell: (i) => <span className="tabular-nums">{i.reserved}</span> },
    { key: "expired", header: "Expired", align: "right", cell: (i) => <span className="tabular-nums">{i.expired}</span> },
    { key: "required", header: "Required", align: "right", cell: (i) => <span className="tabular-nums">{i.required}</span> },
    { key: "status", header: "Status", cell: (i) => <StockBadge level={stockLevel(i)} /> },
    { key: "actions", header: "", hideOnCard: true, align: "right", cell: (i) => <Button size="sm" variant="outline" onClick={() => open(i)}>Adjust</Button> },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Stock by blood group" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {rows.map((i) => {
          const level = stockLevel(i);
          const pct = Math.min(100, Math.round((i.available / i.capacity) * 100));
          const reqPct = Math.min(100, Math.round((i.required / i.capacity) * 100));
          return (
            <Card key={i.bloodGroup} className={cn("p-4", level === "critical" && "border-hemo-300 ring-1 ring-hemo-200")}>
              <div className="flex items-start justify-between gap-2">
                <BloodGroupBadge group={i.bloodGroup} />
                <StockBadge level={level} />
              </div>
              <p className="mt-3 text-2xl font-bold tabular-nums text-ink-900">{i.available}<span className="ml-1 text-sm font-medium text-ink-400">units</span></p>
              <div className="relative mt-2 h-2 rounded-full bg-ink-100" role="img" aria-label={`${i.available} of ${i.capacity} capacity, ${i.required} required`}>
                <div className={cn("h-2 rounded-full", BAR[level])} style={{ width: `${pct}%` }} />
                <span className="absolute -top-1 h-4 w-0.5 bg-ink-900" style={{ left: `${reqPct}%` }} aria-hidden />
              </div>
              <p className="mt-2 text-xs text-ink-500">{i.reserved} reserved, {i.required} needed weekly</p>
              <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={() => open(i)} icon={<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />}>Adjust</Button>
            </Card>
          );
        })}
      </section>
      <p className="-mt-3 text-xs text-ink-500">The black marker shows the weekly requirement. Low stock is below requirement; critical is below half.</p>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Inventory detail</h2>
          <p className="text-sm text-ink-500">Last updated {formatDateTime(rows[0]?.updatedAt ?? new Date())}</p>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(i) => i.bloodGroup} caption="Blood inventory by group" cardTitle={(i) => <BloodGroupBadge group={i.bloodGroup} size="sm" />} cardActions={(i) => <Button size="sm" variant="outline" onClick={() => open(i)}>Adjust stock</Button>} />
      </Card>

      <Modal open={target !== null} onClose={() => setTarget(null)} size="sm" title={`Adjust ${target?.bloodGroup ?? ""} stock`} description={target ? `${target.available} units currently available.` : undefined}
        footer={<><Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button><Button variant="secondary" type="submit" form="adjust-form" loading={busy} loadingText="Saving…">Save adjustment</Button></>}>
        <form id="adjust-form" onSubmit={save} noValidate className="space-y-4">
          <Select id="adj-mode" label="Adjustment" value={mode} onChange={(e) => setMode(e.target.value as "add" | "remove")}>
            <option value="add">Add units</option><option value="remove">Remove units</option>
          </Select>
          <Input id="adj-amount" label="Units" inputMode="numeric" value={amount} error={err} onChange={(e) => { setAmount(e.target.value); setErr(undefined); }} />
          <Select id="adj-reason" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </form>
      </Modal>
    </div>
  );
}

