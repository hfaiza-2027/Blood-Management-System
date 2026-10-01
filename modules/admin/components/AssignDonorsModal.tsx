"use client";

import { useEffect, useState } from "react";
import type { BloodRequest, NearbyDonor } from "@/types";
import { getNearbyDonors } from "@/services/donorService";
import { bloodRequestService } from "@/services/bloodRequestService";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { VerificationBadge } from "@/components/ui/StatusBadge";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { formatDistance } from "@/lib/geo";

interface Props {
  request: BloodRequest | null;
  onClose: () => void;
  onAssigned: (requestId: string, count: number) => void;
}

/** Finds available, compatible donors closest to the hospital and lets a coordinator alert them. */
export function AssignDonorsModal({ request, onClose, onAssigned }: Props) {
  const toast = useToast();
  const [donors, setDonors] = useState<NearbyDonor[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request) return;
    setDonors(null);
    setPicked([]);
    getNearbyDonors(request.location.point, { bloodGroup: request.bloodGroup, compatibleOnly: true, availability: "available", maxDistanceKm: 30 }).then((rows) => {
      setDonors(rows.slice(0, 12));
      setPicked(rows.slice(0, Math.min(rows.length, request.unitsRequired * 2)).map((d) => d.id));
    });
  }, [request]);

  async function assign() {
    if (!request || picked.length === 0) return;
    setBusy(true);
    try {
      const res = await bloodRequestService.assignDonors(request.id, picked);
      onAssigned(request.id, res.assigned);
      toast.success(`${res.assigned} donors alerted for ${request.code}.`, "They'll receive an SMS and app notification now.");
      onClose();
    } catch (err) {
      toast.error("Unable to alert donors", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={request !== null}
      onClose={onClose}
      size="lg"
      title={request ? `Find nearby donors for ${request.code}` : ""}
      description={request ? `Available donors compatible with ${request.bloodGroup}, within 30 km of ${request.hospitalName}.` : undefined}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={assign} loading={busy} loadingText="Alerting donors…" disabled={picked.length === 0}>Alert {picked.length} donor{picked.length === 1 ? "" : "s"}</Button></>}
    >
      {donors === null ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : donors.length === 0 ? (
        <EmptyState title="No nearby donors found." description="No available compatible donors within 30 km. Try contacting partner blood banks." />
      ) : (
        <fieldset>
          <legend className="sr-only">Donors to alert</legend>
          <ul className="divide-y divide-line rounded border border-line">
            {donors.map((d) => (
              <li key={d.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-paper">
                  <input type="checkbox" className="h-4 w-4 rounded border-ink-300 text-hemo-600 focus:ring-hemo-500" checked={picked.includes(d.id)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, d.id] : p.filter((x) => x !== d.id)))} />
                  <BloodGroupBadge group={d.bloodGroup} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">{d.name}</span>
                    <span className="block text-xs text-ink-500">{d.location.area}, {formatDistance(d.distanceKm)}</span>
                  </span>
                  {d.verification === "verified" && <VerificationBadge value="verified" />}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </Modal>
  );
}
