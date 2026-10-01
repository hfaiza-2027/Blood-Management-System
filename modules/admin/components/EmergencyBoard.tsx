"use client";

import { useState } from "react";
import { Building2, CheckCircle2, MapPin, Phone, Siren, Timer, Users } from "lucide-react";
import type { BloodRequest } from "@/types";
import { AssignDonorsModal } from "./AssignDonorsModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { RequestStatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { bloodRequestService } from "@/services/bloodRequestService";
import { cn, timeRemaining } from "@/lib/utils";

export function EmergencyBoard({ initial }: { initial: BloodRequest[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [assigning, setAssigning] = useState<BloodRequest | null>(null);

  async function fulfil(r: BloodRequest) {
    try {
      await bloodRequestService.updateStatus(r.id, "fulfilled");
      setRows((xs) => xs.filter((x) => x.id !== r.id));
      toast.success(`${r.code} marked fulfilled.`, `${r.patientName} has all ${r.unitsRequired} units.`);
    } catch (err) {
      toast.error("Couldn't update this request.", err instanceof Error ? err.message : "Please try again.");
    }
  }

  if (rows.length === 0) {
    return <Card><EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="No open emergencies" description="Every emergency request has been fulfilled or closed." /></Card>;
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map((r) => {
          const left = timeRemaining(r.requiredBy);
          const critical = left.hours < 3;
          return (
            <article key={r.id} id={r.id} className="scroll-mt-24 overflow-hidden rounded-card border border-hemo-300 bg-white shadow-card ring-1 ring-hemo-200" aria-label={`Emergency ${r.code}`}>
              <div className={cn("flex items-center justify-between gap-3 px-5 py-2.5 text-white", critical ? "bg-hemo-700" : "bg-hemo-600")}>
                <span className="flex items-center gap-2 text-sm font-semibold"><Siren className={cn("h-4 w-4", critical && "motion-safe:animate-pulse")} aria-hidden /> {r.code}</span>
                <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums"><Timer className="h-4 w-4" aria-hidden />{left.label}</span>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <BloodGroupBadge group={r.bloodGroup} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-ink-900">{r.unitsRequired} units for {r.patientName}, {r.patientAge}</p>
                    <p className="text-sm text-ink-500">{r.reason}</p>
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>
                <dl className="mt-4 grid gap-2.5 text-sm sm:grid-cols-2">
                  <div className="flex gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden /><div><dt className="sr-only">Hospital</dt><dd className="text-ink-800">{r.hospitalName}</dd></div></div>
                  <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden /><div><dt className="sr-only">Location</dt><dd className="text-ink-800">{r.location.area}, {r.location.city}</dd></div></div>
                  <div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden /><div><dt className="sr-only">Contact</dt><dd><a href={`tel:${r.contactNumber.replace(/\s/g, "")}`} className="font-medium text-ink-900 hover:underline">{r.contactNumber}</a></dd></div></div>
                  <div className="flex gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden /><div><dt className="sr-only">Donors contacted</dt><dd className="text-ink-800"><span className="font-semibold tabular-nums">{r.donorsContacted}</span> donors contacted</dd></div></div>
                </dl>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-ink-500"><span>Fulfilment</span><span className="tabular-nums">{r.unitsFulfilled} of {r.unitsRequired} units</span></div>
                  <Progress value={r.unitsFulfilled} max={r.unitsRequired} label={`Fulfilment for ${r.code}`} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={() => setAssigning(r)} icon={<Users className="h-4 w-4" aria-hidden />}>Find nearby donors</Button>
                  <Button variant="outline" onClick={() => fulfil(r)}>Mark fulfilled</Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <AssignDonorsModal
        request={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={(id, n) => setRows((xs) => xs.map((r) => (r.id === id ? { ...r, donorsContacted: r.donorsContacted + n, status: r.status === "approved" || r.status === "pending" ? "matching" : r.status } : r)))}
      />
    </>
  );
}
