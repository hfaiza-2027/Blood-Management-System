"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { sleep } from "@/lib/utils";

type Values = { name: string; email: string; topic: string; message: string };
const empty: Values = { name: "", email: "", topic: "general", message: "" };

export function ContactForm() {
  const toast = useToast();
  const [v, setV] = useState<Values>(empty);
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(v, { name: [rules.required("your name")], email: [rules.required("your email"), rules.email()], message: [rules.required("a message")] });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    await sleep(800);
    setLoading(false);
    setV(empty);
    toast.success("Message sent", "A coordinator will reply within one working day.");
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Input id="c-name" label="Your name" value={v.name} onChange={set("name")} error={errors.name} required autoComplete="name" />
      <Input id="c-email" label="Email" type="email" value={v.email} onChange={set("email")} error={errors.email} required autoComplete="email" />
      <Select id="c-topic" label="Topic" value={v.topic} onChange={set("topic")} wrapperClassName="sm:col-span-2">
        <option value="general">General question</option>
        <option value="partner">Hospital or blood bank partnership</option>
        <option value="drive">Organise a blood drive</option>
        <option value="report">Report a problem</option>
      </Select>
      <Textarea id="c-message" label="Message" value={v.message} onChange={set("message")} error={errors.message} required wrapperClassName="sm:col-span-2" rows={5} />
      <div className="sm:col-span-2">
        <Button type="submit" loading={loading} loadingText="Sending…">Send message</Button>
      </div>
    </form>
  );
}
