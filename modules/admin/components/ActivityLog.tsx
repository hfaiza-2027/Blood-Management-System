"use client";

import { useMemo, useState } from "react";
import { Activity, BadgeCheck, Droplet, HandHeart, Package, Settings2, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import type { ActivityItem } from "@/types";
import { Card } from "@/components/ui/Card";
import { FilterSelect, SearchInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";

const KIND: Record<ActivityItem["kind"], { label: string; icon: LucideIcon }> = {
  request: { label: "Requests", icon: Droplet },
  accepted: { label: "Responses", icon: HandHeart },
  donation: { label: "Donations", icon: HandHeart },
  verification: { label: "Verification", icon: BadgeCheck },
  inventory: { label: "Inventory", icon: Package },
  user: { label: "Users", icon: UserPlus },
  profile: { label: "Profiles", icon: UserRound },
  system: { label: "System", icon: Settings2 },
};

export function ActivityLog({ items }: { items: ActivityItem[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ActivityItem["kind"] | "any">("any");

  const days = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = items
      .filter((a) => (kind === "any" || a.kind === kind) && (!needle || `${a.actor ?? ""} ${a.message}`.toLowerCase().includes(needle)))
      .sort((a, b) => +new Date(b.at) - +new Date(a.at));
    const map = new Map<string, ActivityItem[]>();
    rows.forEach((a) => {
      const d = formatDate(a.at);
      map.set(d, [...(map.get(d) ?? []), a]);
    });
    return [...map.entries()];
  }, [items, q, kind]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <SearchInput aria-label="Search activity" placeholder="Search person or action" value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-sm md:flex-1" />
        <FilterSelect label="Type" value={kind} onChange={(e) => setKind(e.target.value as ActivityItem["kind"] | "any")} className="md:w-44">
          <option value="any">All activity</option>
          {(Object.keys(KIND) as ActivityItem["kind"][]).map((k) => <option key={k} value={k}>{KIND[k].label}</option>)}
        </FilterSelect>
      </div>
      {days.length ? (
        days.map(([day, rows]) => (
          <section key={day} aria-label={day}>
            <h2 className="border-b border-line bg-paper px-4 py-2 text-xs font-semibold text-ink-500 sm:px-5">{day}</h2>
            <ul className="divide-y divide-line">
              {rows.map((a) => {
                const Icon = KIND[a.kind]?.icon ?? Activity;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-50 text-ink-500"><Icon className="h-4 w-4" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-700">{a.actor && <span className="font-semibold text-ink-900">{a.actor} </span>}{a.message}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{KIND[a.kind]?.label}</p>
                    </div>
                    <time dateTime={a.at} className="shrink-0 text-xs tabular-nums text-ink-400">{formatDate(a.at, { hour: "2-digit", minute: "2-digit" })}</time>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState icon={<Activity className="h-5 w-5" />} title="No activity matches" description="Try a different type or search." />
      )}
    </Card>
  );
}
