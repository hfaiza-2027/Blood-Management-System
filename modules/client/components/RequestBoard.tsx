"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HeartPulse } from "lucide-react";
import type { BloodGroup } from "@/types";
import type { RequestWithDistance } from "@/services/bloodRequestService";
import { BloodRequestCard } from "@/components/blood/BloodRequestCard";
import { RespondButton } from "@/modules/client/components/Actions";
import { Tabs } from "@/components/ui/Tabs";
import { FilterSelect, SearchInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { buttonClasses } from "@/components/ui/Button";
import { BLOOD_GROUPS, canDonateTo } from "@/lib/constants";

export type BoardTab = "all" | "nearby" | "emergency" | "mine" | "fulfilled";

const OPEN = ["pending", "approved", "matching", "donor_found", "partially_fulfilled"];

interface Props {
  requests: RequestWithDistance[];
  userId: string;
  userGroup: BloodGroup;
  initialTab: BoardTab;
  respondTo?: string;
}

export function RequestBoard({ requests, userId, userGroup, initialTab, respondTo }: Props) {
  const [tab, setTab] = useState<BoardTab>(initialTab);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<BloodGroup | "any">("any");
  const [matchOnly, setMatchOnly] = useState(false);
  const canHelp = canDonateTo(userGroup);

  const byTab = useMemo(() => {
    const open = requests.filter((r) => OPEN.includes(r.status));
    return {
      all: open,
      nearby: open.filter((r) => r.distanceKm <= 10).sort((a, b) => a.distanceKm - b.distanceKm),
      emergency: open.filter((r) => r.urgency === "emergency"),
      mine: requests.filter((r) => r.requesterId === userId),
      fulfilled: requests.filter((r) => r.status === "fulfilled"),
    } satisfies Record<BoardTab, RequestWithDistance[]>;
  }, [requests, userId]);

  const rows = byTab[tab].filter((r) => {
    if (group !== "any" && r.bloodGroup !== group) return false;
    if (matchOnly && !canHelp.includes(r.bloodGroup)) return false;
    if (q) {
      const s = q.toLowerCase();
      return [r.code, r.hospitalName, r.location.area, r.location.city, r.patientName].some((x) => x.toLowerCase().includes(s));
    }
    return true;
  });

  const items = [
    { value: "all" as const, label: "All open", count: byTab.all.length },
    { value: "nearby" as const, label: "Nearby", count: byTab.nearby.length },
    { value: "emergency" as const, label: "Emergency", count: byTab.emergency.length },
    { value: "mine" as const, label: "My requests", count: byTab.mine.length },
    { value: "fulfilled" as const, label: "Fulfilled", count: byTab.fulfilled.length },
  ];

  return (
    <div className="space-y-4">
      <Tabs items={items} value={tab} onChange={setTab} label="Request categories" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput aria-label="Search requests" placeholder="Search by hospital, area or request ID" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-sm sm:flex-1" />
        <FilterSelect label="Blood group" value={group} onChange={(e) => setGroup(e.target.value as BloodGroup | "any")} className="sm:w-40">
          <option value="any">All groups</option>
          {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </FilterSelect>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded border border-line bg-white px-3 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-hemo-600" checked={matchOnly} onChange={(e) => setMatchOnly(e.target.checked)} />
          I can donate to these ({userGroup})
        </label>
      </div>

      <div role="tabpanel" aria-live="polite">
        {rows.length === 0 ? (
          <EmptyState
            icon={<HeartPulse className="h-6 w-6" aria-hidden />}
            title={tab === "mine" ? "You haven't posted any requests" : "No requests match these filters"}
            description={tab === "mine" ? "When you request blood, you can track matching and donor responses here." : "Try another tab or clear the search."}
            action={tab === "mine" ? <Link href="/dashboard/request" className={buttonClasses("primary")}>Request blood</Link> : undefined}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((r) => {
              const mine = r.requesterId === userId;
              const open = OPEN.includes(r.status);
              return (
                <BloodRequestCard
                  key={r.id}
                  request={r}
                  action={
                    mine ? (
                      <Link href={`/dashboard/requests/${r.id}`} className={buttonClasses("outline", "sm", "w-full sm:w-auto")}>Track request</Link>
                    ) : open ? (
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <RespondButton
                          requestId={r.id}
                          patientName={r.patientName}
                          hospitalName={r.hospitalName}
                          bloodGroup={r.bloodGroup}
                          defaultOpen={respondTo === r.id}
                          variant={canHelp.includes(r.bloodGroup) ? "primary" : "outline"}
                        />
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
