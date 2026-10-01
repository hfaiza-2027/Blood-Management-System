"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Laptop, LogOut, ShieldCheck } from "lucide-react";
import type { UserPreferences } from "@/types";
import { DEFAULT_PREFERENCES } from "@/types/user";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { PasswordInput, StrengthMeter } from "@/components/forms/PasswordInput";
import { OtpInput } from "@/components/forms/OtpInput";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { USE_MOCKS } from "@/services/client";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { sleep } from "@/lib/utils";

interface Props {
  account: { id: string; name: string; email: string; phone: string };
  preferences?: Partial<UserPreferences>;
}

type Account = { name: string; phone: string };
type Pw = { current: string; next: string; confirm: string };

function describeDevice() {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "your device";
  return `${browser} on ${os}`;
}

export function SettingsPanel({ account, preferences }: Props) {
  const toast = useToast();
  const router = useRouter();

  const [acc, setAcc] = useState<Account>({ name: account.name, phone: account.phone });
  const [accErr, setAccErr] = useState<Errors<Account>>({});
  const [savingAcc, setSavingAcc] = useState(false);

  const [privacy, setPrivacy] = useState({ ...DEFAULT_PREFERENCES.privacy, ...(preferences?.privacy ?? {}) });
  const [notify, setNotify] = useState({ ...DEFAULT_PREFERENCES.notify, ...(preferences?.notify ?? {}) });

  const [pw, setPw] = useState<Pw>({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<Errors<Pw>>({});
  const [savingPw, setSavingPw] = useState(false);

  // Two-factor is a demo-only flow; live projects need Firebase Identity Platform for SMS MFA.
  const [twoFa, setTwoFa] = useState(false);
  const [twoFaOpen, setTwoFaOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpErr, setOtpErr] = useState<string>();
  const [verifying, setVerifying] = useState(false);

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function saveAccount(e: FormEvent) {
    e.preventDefault();
    const errs = validate(acc, { name: [rules.required("your name")], phone: [rules.required("your phone number"), rules.phone()] });
    setAccErr(errs);
    if (hasErrors(errs)) return;
    setSavingAcc(true);
    try {
      await userService.updateSelf({ id: account.id, fullName: acc.name.trim(), phone: acc.phone.trim() });
      toast.success("Account details saved.");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't save your details.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingAcc(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    const errs = validate(pw, { current: [rules.required("your current password")], next: [rules.password()], confirm: [rules.required("the new password again")] });
    if (!errs.confirm && pw.confirm !== pw.next) errs.confirm = "Passwords don't match.";
    if (!errs.next && pw.next === pw.current) errs.next = "Choose a password you haven't used here before.";
    setPwErr(errs);
    if (hasErrors(errs)) return;
    setSavingPw(true);
    try {
      await authService.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password updated.", "Use the new password next time you log in.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again.";
      if (/current password/i.test(msg)) setPwErr({ current: msg });
      else toast.error("Couldn't update your password.", msg);
    } finally {
      setSavingPw(false);
    }
  }

  async function confirm2fa() {
    if (!/^\d{6}$/.test(otp)) return setOtpErr("Enter the 6-digit code.");
    setVerifying(true);
    await sleep(700);
    setVerifying(false);
    setTwoFa(true);
    setTwoFaOpen(false);
    setOtp("");
    toast.success("Two-factor authentication is on.");
  }

  async function signOutEverywhere() {
    setSigningOut(true);
    try {
      await userService.signOutEverywhere();
      await authService.logout();
      toast.success("Signed out of all devices.", "Log in again to continue.");
      router.replace("/auth/login");
      router.refresh();
    } catch (err) {
      toast.error("Couldn't sign out other devices.", err instanceof Error ? err.message : "Please try again.");
      setSigningOut(false);
      setConfirmSignOut(false);
    }
  }

  /** Save one preference right away; put it back if the save fails. */
  function pref<K extends "privacy" | "notify">(group: K, key: string, label: string) {
    return async (v: boolean) => {
      const current = group === "privacy" ? privacy : notify;
      const next = { ...current, [key]: v };
      if (group === "privacy") setPrivacy(next as typeof privacy);
      else setNotify(next as typeof notify);
      try {
        await userService.updateSelf({ id: account.id, preferences: { privacy, notify, [group]: next } as UserPreferences });
        toast.info(`${label} ${v ? "turned on" : "turned off"}.`);
      } catch (err) {
        if (group === "privacy") setPrivacy(current as typeof privacy);
        else setNotify(current as typeof notify);
        toast.error(`Couldn't change ${label.toLowerCase()}.`, err instanceof Error ? err.message : "Please try again.");
      }
    };
  }

  const maskedPhone = account.phone ? `${account.phone.slice(0, 4)} ••• ${account.phone.slice(-3)}` : "your phone";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title="Account" description="Your name and contact details." />
        <CardBody>
          <form onSubmit={saveAccount} noValidate className="space-y-4">
            <Input id="name" label="Full name" value={acc.name} error={accErr.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} autoComplete="name" />
            <Input id="email" label="Email" type="email" value={account.email} readOnly disabled hint="This is your login email. Contact support to change it." />
            <Input id="phone" label="Phone" type="tel" value={acc.phone} error={accErr.phone} onChange={(e) => setAcc({ ...acc, phone: e.target.value })} autoComplete="tel" hint="Used for emergency alerts. Never shown publicly." />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" loading={savingAcc} loadingText="Saving…" className="w-full sm:w-auto">Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Privacy" description="Control what other members can see." />
          <CardBody className="divide-y divide-line py-1">
            <Switch id="p-donor" label="Show me in donor search" description="Patients' families can find you by blood group and area." checked={privacy.donorVisible} onChange={pref("privacy", "donorVisible", "Donor visibility")} />
            <Switch id="p-contact" label="Share my phone after I accept a request" description="Otherwise coordinators relay messages for you." checked={privacy.contactVisible} onChange={pref("privacy", "contactVisible", "Contact sharing")} />
            <Switch id="p-loc" label="Show my area and distance" description="We never show your street address." checked={privacy.locationVisible} onChange={pref("privacy", "locationVisible", "Location visibility")} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Notifications" description="Choose how we reach you." />
          <CardBody className="divide-y divide-line py-1">
            <Switch id="n-email" label="Email notifications" checked={notify.email} onChange={pref("notify", "email", "Email notifications")} />
            <Switch id="n-sms" label="SMS notifications" checked={notify.sms} onChange={pref("notify", "sms", "SMS notifications")} />
            <Switch id="n-emg" label="Emergency alerts" description="Urgent requests for compatible blood within 15 km." checked={notify.emergency} onChange={pref("notify", "emergency", "Emergency alerts")} />
            <Switch id="n-rem" label="Donation reminders" description="When you become eligible and before appointments." checked={notify.reminders} onChange={pref("notify", "reminders", "Donation reminders")} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Change password" />
        <CardBody>
          <form onSubmit={savePassword} noValidate className="space-y-4">
            <PasswordInput id="current" label="Current password" value={pw.current} error={pwErr.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
            <div>
              <PasswordInput id="next" label="New password" value={pw.next} error={pwErr.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
              <StrengthMeter password={pw.next} />
            </div>
            <PasswordInput id="confirm" label="Confirm new password" value={pw.confirm} error={pwErr.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            <div className="flex justify-end">
              <Button type="submit" variant="secondary" loading={savingPw} loadingText="Updating…" icon={<KeyRound className="h-4 w-4" aria-hidden />} className="w-full sm:w-auto">Update password</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-6">
        {USE_MOCKS && (
          <Card>
            <CardHeader title="Two-factor authentication" description="Require a code from your phone when you sign in on a new device." action={twoFa ? <Badge tone="ok">On</Badge> : <Badge tone="muted">Off</Badge>} />
            <CardBody>
              {twoFa ? (
                <Button variant="outline" onClick={() => { setTwoFa(false); toast.info("Two-factor authentication turned off."); }}>Turn off</Button>
              ) : (
                <Button variant="secondary" onClick={() => setTwoFaOpen(true)} icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>Set up two-factor</Button>
              )}
            </CardBody>
          </Card>
        )}
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
            <Button variant="outline" className="mt-3 w-full sm:w-auto" icon={<LogOut className="h-4 w-4" aria-hidden />} onClick={() => setConfirmSignOut(true)}>
              Sign out of all devices
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={twoFaOpen}
        onClose={() => setTwoFaOpen(false)}
        title="Set up two-factor authentication"
        description={`We sent a 6-digit code to ${maskedPhone}.`}
        size="sm"
        footer={<><Button variant="outline" onClick={() => setTwoFaOpen(false)}>Cancel</Button><Button variant="secondary" onClick={confirm2fa} loading={verifying} loadingText="Verifying…">Turn on</Button></>}
      >
        <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpErr(undefined); }} error={otpErr} />
      </Modal>
      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out of all devices?"
        description="Every device, including this one, will need your password to get back in."
        confirmLabel="Sign out everywhere"
        cancelLabel="Cancel"
        loading={signingOut}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={signOutEverywhere}
      />
    </div>
  );
}
