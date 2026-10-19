"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Laptop, LogOut } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PasswordInput, StrengthMeter } from "@/components/forms/PasswordInput";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";

export interface AccountSummary { id: string; name: string; email: string; phone: string }

/** Name and phone, shared by the member settings and the admin "My account" page. */
export function AccountDetailsCard({ account }: { account: AccountSummary }) {
  const toast = useToast();
  const router = useRouter();
  const [acc, setAcc] = useState({ name: account.name, phone: account.phone });
  const [errors, setErrors] = useState<Errors<typeof acc>>({});
  const [saving, setSaving] = useState(false);
  const dirty = acc.name.trim() !== account.name || acc.phone.trim() !== account.phone;

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validate(acc, { name: [rules.required("your name")], phone: [rules.required("your phone number"), rules.phone()] });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      await userService.updateSelf({ id: account.id, fullName: acc.name.trim(), phone: acc.phone.trim() });
      toast.success("Account details saved.");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't save your details.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Account" description="Your name and contact details." />
      <CardBody>
        <form onSubmit={save} noValidate className="space-y-4">
          <Input id="name" label="Full name" value={acc.name} error={errors.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} autoComplete="name" />
          <Input id="email" label="Email" type="email" value={account.email} readOnly disabled hint="This is your login email. Contact support to change it." />
          <Input id="phone" label="Phone" type="tel" value={acc.phone} error={errors.phone} onChange={(e) => setAcc({ ...acc, phone: e.target.value })} autoComplete="tel" hint="Used for emergency alerts. Never shown publicly." />
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={saving} loadingText="Saving…" disabled={!dirty} className="w-full sm:w-auto">Save changes</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

type Pw = { current: string; next: string; confirm: string };

export function ChangePasswordCard() {
  const toast = useToast();
  const [pw, setPw] = useState<Pw>({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Errors<Pw>>({});
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validate(pw, { current: [rules.required("your current password")], next: [rules.password()], confirm: [rules.required("the new password again")] });
    if (!errs.confirm && pw.confirm !== pw.next) errs.confirm = "Passwords don't match.";
    if (!errs.next && pw.next === pw.current) errs.next = "Choose a password you haven't used here before.";
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      await authService.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password updated.", "Use the new password next time you log in.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      if (/current password/i.test(msg)) setErrors({ current: msg });
      else toast.error("Couldn't update your password.", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Change password" />
      <CardBody>
        <form onSubmit={save} noValidate className="space-y-4">
          <PasswordInput id="current" label="Current password" value={pw.current} error={errors.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          <div>
            <PasswordInput id="next" label="New password" value={pw.next} error={errors.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
            <StrengthMeter password={pw.next} />
          </div>
          <PasswordInput id="confirm" label="Confirm new password" value={pw.confirm} error={errors.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
          <div className="flex justify-end">
            <Button type="submit" variant="secondary" loading={saving} loadingText="Updating…" icon={<KeyRound className="h-4 w-4" aria-hidden />} className="w-full sm:w-auto">Update password</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function describeDevice() {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "your device";
  return `${browser} on ${os}`;
}

export function SessionsCard() {
  const toast = useToast();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    setBusy(true);
    try {
      await userService.signOutEverywhere();
      await authService.logout();
      toast.success("Signed out of all devices.", "Log in again to continue.");
      router.replace("/auth/login");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't sign out other devices.", err instanceof Error ? err.message : "Please try again.");
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Sessions" description="Where you're signed in." />
      <ul className="divide-y divide-line">
        <li className="flex items-center gap-3 px-5 py-3.5">
          <Laptop className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900" suppressHydrationWarning>{describeDevice()}</p>
            <p className="text-xs text-ink-500">Active now</p>
          </div>
          <Badge tone="ok">This device</Badge>
        </li>
      </ul>
      <div className="border-t border-line px-5 py-4">
        <p className="text-sm text-ink-600">Lost a phone or used a shared computer? Sign out everywhere, including here.</p>
        <Button variant="outline" className="mt-3 w-full sm:w-auto" icon={<LogOut className="h-4 w-4" aria-hidden />} onClick={() => setConfirm(true)}>
          Sign out of all devices
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Sign out of all devices?"
        description="Every device, including this one, will need your password to get back in."
        confirmLabel="Sign out everywhere"
        cancelLabel="Cancel"
        loading={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={signOutEverywhere}
      />
    </Card>
  );
}
