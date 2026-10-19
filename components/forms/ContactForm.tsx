"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { contactService } from "@/services/contactService";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";

type Values = { name: string; email: string; phone: string; topic: string; message: string; website: string };
const empty: Values = { name: "", email: "", phone: "", topic: "general", message: "", website: "" };

export function ContactForm() {
  const toast = useToast();
  const [v, setV] = useState<Values>(empty);
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(v, {
      name: [rules.required("your name")],
      email: [rules.required("your email"), rules.email()],
      phone: [(x) => (x.trim() ? rules.phone()(x) : null)],
      message: [rules.required("a message"), (x) => (x.trim().length < 10 ? "Write a message of at least 10 characters." : null)],
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    try {
      await contactService.submit(v);
      setV(empty);
      setSent(true);
      toast.success("Message sent", "A coordinator will reply within one working day.");
    } catch (err) {
      toast.error("Couldn't send your message", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-card border border-ok-200 bg-ok-50 p-6" role="status">
        <CircleCheck className="h-8 w-8 text-ok-700" aria-hidden />
        <h3 className="mt-3 text-lg font-semibold text-ink-900">Thanks, your message is with our coordinators</h3>
        <p className="mt-1 text-sm text-ink-600">We reply by email within one working day. For a medical emergency, call the hospital&apos;s blood bank directly.</p>
        <Button variant="outline" className="mt-4" onClick={() => setSent(false)}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Input id="c-name" label="Your name" value={v.name} onChange={set("name")} error={errors.name} required autoComplete="name" />
      <Input id="c-email" label="Email" type="email" value={v.email} onChange={set("email")} error={errors.email} required autoComplete="email" />
      <Input id="c-phone" label="Phone" type="tel" value={v.phone} onChange={set("phone")} error={errors.phone} optional autoComplete="tel" />
      <Select id="c-topic" label="Topic" value={v.topic} onChange={set("topic")}>
        <option value="general">General question</option>
        <option value="partner">Hospital or blood bank partnership</option>
        <option value="drive">Organise a blood drive</option>
        <option value="report">Report a problem</option>
      </Select>
      <Textarea id="c-message" label="Message" value={v.message} onChange={set("message")} error={errors.message} required wrapperClassName="sm:col-span-2" rows={5} maxLength={2000} />
      {/* Hidden from people; bots that fill it are ignored by the server. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={loading} loadingText="Sending…">Send message</Button>
      </div>
    </form>
  );
}
