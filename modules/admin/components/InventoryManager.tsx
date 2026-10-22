"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { History, Package, SlidersHorizontal } from "lucide-react";
import type { BloodInventory } from "@/types";
import { inventoryService, stockLevel, type InventoryMovement } from "@/services/inventoryService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { StockBadge } from "@/components/ui/StatusBadge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useServerState } from "@/lib/hooks/useServerState";

const BAR: Record<string, string> = { normal: "bg-ok-600", low: "bg-warn-600", critical: "bg-hemo-600" };
const REASONS = ["New donations received", "Issued to hospital", "Transferred from partner bank", "Expired units discarded", "Stock count correction"];

export function InventoryManager({ initial, initialMovements = [] }: { initial: BloodInventory[]; initialMovements?: InventoryMovement[] }) {
  const toast = useToast();
  const [rows, setRows] = useServerState(initial);
  const [movements, setMovements] = useServerState(initialMovements);
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
      const res = await inventoryService.adjust(target.bloodGroup, delta, reason);
      const at = new Date().toISOString();
      // The server's balance is the source of truth (another coordinator may have changed it too).
      setRows((xs) => xs.map((x) => (x.bloodGroup === target.bloodGroup ? { ...x, available: res.available, expired: reason.startsWith("Expired") ? x.expired + n : x.expired, updatedAt: at } : x)));
      setMovements((ms) => [{ id: `local-${at}`, group: target.bloodGroup, delta: res.delta, reason, balance: res.available, at, by: "You" }, ...ms].slice(0, 50));
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

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-6 w-6" aria-hidden />}
        title="No stock records yet"
        description="Load the stock targets for all eight blood groups from System settings, then record units as they arrive."
        action={<Link href="/admin/settings" className="text-sm font-semibold text-hemo-700 hover:underline">Open System settings</Link>}
      />
    );
  }

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

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Recent stock movements</h2>
          <p className="text-sm text-ink-500">Every adjustment is recorded and feeds the units in / out figures in Reports.</p>
        </div>
        {movements.length === 0 ? (
          <EmptyState icon={<History className="h-5 w-5" aria-hidden />} title="No movements yet" description="Adjustments you make appear here." className="border-0 shadow-none" />
        ) : (
          <ul className="divide-y divide-line">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <BloodGroupBadge group={m.group} size="sm" />
                <span className={cn("w-14 shrink-0 font-semibold tabular-nums", m.delta >= 0 ? "text-ok-700" : "text-hemo-700")}>{m.delta >= 0 ? "+" : ""}{m.delta}</span>
                <span className="min-w-0 flex-1 truncate text-ink-700">{m.reason || "No reason given"}<span className="text-ink-400"> · {m.by}</span></span>
                <span className="hidden shrink-0 tabular-nums text-ink-500 sm:inline">Balance {m.balance}</span>
                <time dateTime={m.at} title={formatDateTime(m.at)} className="shrink-0 text-xs text-ink-400">{timeAgo(m.at)}</time>
              </li>
            ))}
          </ul>
        )}
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

