"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, Mail, Phone, RotateCcw } from "lucide-react";
import type { Notification } from "@/types";
import { contactService, type ContactMessage } from "@/services/contactService";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Tabs, Segmented } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import { useServerState } from "@/lib/hooks/useServerState";

const TOPIC: Record<string, string> = {
  general: "General question",
  partner: "Partnership",
  drive: "Blood drive",
  report: "Problem report",
};

type Tab = "messages" | "notifications";
/** Pending = still needs action (unread or read). Unread messages are highlighted inside it. */
type Filter = "pending" | "resolved" | "all";

export function AdminInbox({ messages, notifications, initialTab }: { messages: ContactMessage[]; notifications: Notification[]; initialTab: Tab }) {
  const toast = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [items, setItems] = useServerState(messages);
  const [filter, setFilter] = useState<Filter>("pending");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      unread: items.filter((m) => m.status === "new").length,
      pending: items.filter((m) => m.status !== "resolved").length,
      resolved: items.filter((m) => m.status === "resolved").length,
    }),
    [items],
  );
  const rows = items.filter((m) => filter === "all" || (filter === "pending" ? m.status !== "resolved" : m.status === "resolved"));
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  async function setStatus(m: ContactMessage, status: ContactMessage["status"]) {
    const before = items;
    setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, status } : x)));
    try {
      await contactService.setStatus(m.id, status);
      if (status === "resolved") toast.success("Marked as resolved.");
      router.refresh();
    } catch (err) {
      setItems(before);
      toast.error("Couldn't update the message.", err instanceof Error ? err.message : "Please try again.");
    }
  }

  function open(m: ContactMessage) {
    setOpenId((id) => (id === m.id ? null : m.id));
    if (m.status === "new") void setStatus(m, "read");
  }

  return (
    <div className="space-y-4">
      <Tabs
        label="Inbox sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: "messages", label: "Contact messages", count: counts.unread },
          { value: "notifications", label: "My notifications", count: unreadNotifications },
        ]}
      />

      {tab === "notifications" ? (
        <NotificationCenter initial={notifications} emptyText="System alerts and updates sent to your account appear here." />
      ) : (
        <div className="rounded-card border border-line bg-white shadow-card">
          <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <Segmented
              label="Filter messages"
              value={filter}
              onChange={setFilter}
              items={[
                { value: "pending", label: "Pending", count: counts.pending },
                { value: "resolved", label: "Resolved", count: counts.resolved },
                { value: "all", label: "All", count: items.length },
              ]}
            />
            {counts.unread > 0 && (
              <p className="text-[13px] text-ink-500">
                <span className="font-semibold text-hemo-700">{counts.unread} unread</span> · opening a message marks it as read
              </p>
            )}
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden />}
              title={filter === "resolved" ? "Nothing resolved yet" : filter === "pending" ? "You're all caught up" : "No messages yet"}
              description="Messages sent from the public contact page arrive here."
              className="border-0 shadow-none"
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((m) => {
                const expanded = openId === m.id;
                return (
                  <li key={m.id} className={cn("px-4 py-4", m.status === "new" && "bg-hemo-50/40")}>
                    <button onClick={() => open(m)} aria-expanded={expanded} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn("text-sm text-ink-900", m.status === "new" && "font-semibold")}>{m.name}</p>
                          <Badge tone="muted">{TOPIC[m.topic] ?? m.topic}</Badge>
                          {m.status === "new" && <Badge tone="danger">New</Badge>}
                          {m.status === "resolved" && <Badge tone="ok">Resolved</Badge>}
                        </div>
                        <p className={cn("mt-1 text-sm text-ink-600", !expanded && "line-clamp-2")}>{m.message}</p>
                      </div>
                      <time dateTime={m.createdAt} className="shrink-0 text-xs text-ink-400" title={formatDateTime(m.createdAt)}>{timeAgo(m.createdAt)}</time>
                    </button>
                    {expanded && (
                      <div className="mt-3 flex flex-col gap-3 rounded-md bg-paper p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                          <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 font-medium text-ink-800 hover:underline"><Mail className="h-4 w-4 text-ink-400" aria-hidden />{m.email}</a>
                          {m.phone && <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-ink-800 hover:underline"><Phone className="h-4 w-4 text-ink-400" aria-hidden />{m.phone}</a>}
                        </div>
                        {m.status === "resolved" ? (
                          <Button size="sm" variant="outline" icon={<RotateCcw className="h-4 w-4" aria-hidden />} onClick={() => setStatus(m, "read")}>Reopen</Button>
                        ) : (
                          <Button size="sm" variant="secondary" icon={<Check className="h-4 w-4" aria-hidden />} onClick={() => setStatus(m, "resolved")}>Mark resolved</Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
