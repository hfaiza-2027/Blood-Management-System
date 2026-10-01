"use client";

import { useState, type FormEvent } from "react";
import { Megaphone, Send } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { BLOOD_GROUPS, CITY_NAMES } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { formatNumber, timeAgo } from "@/lib/utils";

interface Sent { id: string; title: string; body: string; audience: string; sent: number; at: string }

const AUDIENCES = [
  { value: "all", label: "Everyone" },
  { value: "donors", label: "All active donors" },
  ...BLOOD_GROUPS.map((g) => ({ value: `group:${g}`, label: `${g} donors` })),
  ...CITY_NAMES.map((c) => ({ value: `city:${c}`, label: `Donors in ${c}` })),
];
const audienceLabel = (v: string) => AUDIENCES.find((a) => a.value === v)?.label ?? v;

const HISTORY: Sent[] = [
  { id: "b3", title: "O- stock is critical in Lahore", body: "Model Town and Iqbal Town blood banks are below half their weekly need for O-. If you are O- and eligible, please book a slot this week.", audience: "group:O-", sent: 181, at: "2026-09-26T18:00:00+05:00" },
  { id: "b2", title: "Weekend donation drive at DHA", body: "The mobile unit will be at Phase 5 Commercial on Saturday and Sunday, 10:00 to 16:00. Walk-ins welcome.", audience: "city:Lahore", sent: 1842, at: "2026-09-19T11:30:00+05:00" },
  { id: "b1", title: "Updated eligibility questions", body: "We simplified the pre-donation questionnaire. It now takes under two minutes.", audience: "all", sent: 12486, at: "2026-09-02T09:00:00+05:00" },
];

type Values = { title: string; body: string; audience: string };

export function BroadcastPanel({ initialHistory }: { initialHistory?: Sent[] }) {
  const toast = useToast();
  const [values, setValues] = useState<Values>({ title: "", body: "", audience: "donors" });
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Sent[]>(initialHistory ?? HISTORY);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setValues((s) => ({ ...s, [k]: e.target.value }));

  function review(e: FormEvent) {
    e.preventDefault();
    const errs = validate(values, { title: [rules.required("a title")], body: [rules.required("a message")] });
    if (!errs.body && values.body.length > 280) errs.body = "Keep the message under 280 characters so it fits in an SMS.";
    setErrors(errs);
    if (!hasErrors(errs)) setConfirm(true);
  }

  async function send() {
    setBusy(true);
    try {
      const { sent } = await notificationService.broadcast(values);
      setHistory((h) => [{ id: `b${Date.now()}`, ...values, sent, at: new Date().toISOString() }, ...h]);
      toast.success("Notification sent.", `Delivered to ${formatNumber(sent)} people.`);
      setValues({ title: "", body: "", audience: values.audience });
    } catch (err) {
      toast.error("Unable to send the notification", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader title="New broadcast" description="Sent as an in-app notification and SMS." />
        <CardBody>
          <form onSubmit={review} noValidate className="space-y-4">
            <Select id="b-audience" label="Audience" value={values.audience} onChange={set("audience")}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
            <Input id="b-title" label="Title" required value={values.title} onChange={set("title")} error={errors.title} maxLength={80} placeholder="B- donors needed in Karachi" />
            <Textarea id="b-body" label="Message" required rows={5} value={values.body} onChange={set("body")} error={errors.body} hint={`${values.body.length}/280 characters`} />
            <p className="text-[13px] text-ink-500">Never include patient names, phone numbers or exact addresses in broadcasts.</p>
            <Button type="submit" icon={<Send className="h-4 w-4" aria-hidden />} className="w-full sm:w-auto">Review and send</Button>
          </form>
        </CardBody>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader title="Sent broadcasts" description="Most recent first" />
        {history.length ? (
          <ul className="divide-y divide-line">
            {history.map((b) => (
              <li key={b.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{b.title}</p>
                  <Badge tone="info" dot={false}>{audienceLabel(b.audience)}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-600">{b.body}</p>
                <p className="mt-2 text-xs text-ink-400">Sent to {formatNumber(b.sent)} people, <time dateTime={b.at}>{timeAgo(b.at)}</time></p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Megaphone className="h-5 w-5" />} title="No broadcasts yet" />
        )}
      </Card>

      <ConfirmDialog
        open={confirm}
        tone="primary"
        title={`Send to ${audienceLabel(values.audience).toLowerCase()}?`}
        description={<><span className="font-semibold text-ink-900">{values.title}</span><br />{values.body}</>}
        confirmLabel="Send now"
        cancelLabel="Edit message"
        loading={busy}
        onConfirm={send}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
