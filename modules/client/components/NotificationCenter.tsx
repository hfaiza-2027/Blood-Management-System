"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, BellOff, CalendarClock, CheckCheck, CircleCheck, HandHeart, Megaphone, Siren } from "lucide-react";
import type { Notification, NotificationKind } from "@/types";
import { notificationService } from "@/services/notificationService";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { cn, timeAgo } from "@/lib/utils";

const ICONS: Record<NotificationKind, { icon: typeof Bell; className: string }> = {
  emergency_nearby: { icon: Siren, className: "bg-hemo-100 text-hemo-700" },
  appointment_reminder: { icon: CalendarClock, className: "bg-info-100 text-info-700" },
  request_accepted: { icon: CircleCheck, className: "bg-ok-100 text-ok-700" },
  donor_responded: { icon: HandHeart, className: "bg-hemo-50 text-hemo-700" },
  request_fulfilled: { icon: CheckCheck, className: "bg-ok-100 text-ok-700" },
  account_verified: { icon: BadgeCheck, className: "bg-ok-100 text-ok-700" },
  announcement: { icon: Megaphone, className: "bg-ink-100 text-ink-700" },
};

type Filter = "all" | "unread" | "emergency";

export function NotificationCenter({ initial }: { initial: Notification[] }) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  const rows = items.filter((n) => filter === "all" || (filter === "unread" ? !n.read : n.kind === "emergency_nearby"));

  async function markRead(id: string) {
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationService.markRead([id]);
      router.refresh();
    } catch {
      setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read: false } : n)));
      toast.error("Couldn't mark that as read.");
    }
  }

  async function markAll() {
    setBusy(true);
    try {
      await notificationService.markAllRead();
      setItems((xs) => xs.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't update notifications.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Filter notifications"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "All", count: items.length },
            { value: "unread", label: "Unread", count: unread },
            { value: "emergency", label: "Emergencies" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={markAll} loading={busy} disabled={unread === 0} icon={<CheckCheck className="h-4 w-4" aria-hidden />}>
          Mark all as read
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" aria-hidden />}
          title={filter === "unread" ? "You're all caught up" : "No notifications here"}
          description="Emergency alerts near you, request updates and appointment reminders will appear here."
          className="border-0 shadow-none"
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((n) => {
            const meta = ICONS[n.kind];
            const Icon = meta.icon;
            return (
              <li key={n.id} className={cn("flex gap-3 px-4 py-4 sm:gap-4", !n.read && "bg-hemo-50/40")}>
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.className)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-sm text-ink-900", !n.read && "font-semibold")}>
                      {!n.read && <span className="sr-only">Unread: </span>}
                      {n.title}
                    </p>
                    <time dateTime={n.createdAt} className="shrink-0 text-xs text-ink-400">{timeAgo(n.createdAt)}</time>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-600">{n.body}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {n.href && (
                      <Link href={n.href} onClick={() => markRead(n.id)} className="font-medium text-hemo-700 hover:underline">
                        View details
                      </Link>
                    )}
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="font-medium text-ink-500 hover:text-ink-900">
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-hemo-600" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
