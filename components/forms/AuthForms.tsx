"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { PasswordInput, StrengthMeter } from "./PasswordInput";
import { OtpInput } from "./OtpInput";
import { authService } from "@/services/authService";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase/client";
import { confirmPasswordReset, reload, sendEmailVerification } from "firebase/auth";

/** Only allow redirects back into this app. */
function safeNext(raw: string | null, fallback: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/auth") ? raw : fallback;
}
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";

function Heading({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] font-bold tracking-tight text-ink-900">{title}</h1>
      {sub && <p className="mt-2 text-[15px] text-ink-500">{sub}</p>}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [v, setV] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors<typeof v>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setNext(q.get("next"));
    if (q.get("suspended")) setFormError("This account has been suspended. Contact support to restore access.");
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(v, { email: [rules.required("your email"), rules.email()], password: [rules.required("your password")] });
    setErrors(errs);
    setFormError("");
    if (hasErrors(errs)) return;
    setLoading(true);
    try {
      const session = await authService.login(v);
      const home = session.user.role === "admin" ? "/admin" : "/dashboard";
      const target = safeNext(next, home);
      // Members can't open the admin console, so don't send them there.
      router.replace(target.startsWith("/admin") && session.user.role !== "admin" ? "/dashboard" : target);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "We couldn't log you in. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Heading title="Log in to Qatra" sub={<>New here? <Link href="/auth/register" className="font-semibold text-hemo-700 hover:underline">Create an account</Link></>} />
      {formError && <Alert tone="danger" className="mb-6">{formError}</Alert>}
      <form onSubmit={submit} noValidate className="space-y-5">
        <Input id="email" label="Email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errors.email} required />
        <div>
          <PasswordInput id="password" label="Password" autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} required />
          <div className="mt-2 text-right">
            <Link href="/auth/forgot-password" className="text-[13px] font-medium text-ink-600 hover:text-ink-900 hover:underline">Forgot password?</Link>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Logging in…">Log in</Button>
      </form>
      {!firebaseConfigured && (
        <div className="mt-8 rounded-card border border-dashed border-line bg-paper p-4 text-[13px] text-ink-600">
          <p className="font-semibold text-ink-800">Demo mode</p>
          <p className="mt-1">Any email and password opens the donor dashboard. Use an address ending in <span className="font-semibold">@qatra.pk</span> for the admin console.</p>
        </div>
      )}
    </>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate({ email }, { email: [rules.required("your email"), rules.email()] });
    setError(errs.email);
    if (errs.email) return;
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send the link. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent)
    return (
      <div>
        <MailCheck className="h-10 w-10 text-ok-600" aria-hidden />
        <Heading title="Check your email" sub={<>If an account exists for <span className="font-semibold text-ink-800">{email}</span>, you&apos;ll get a reset link in the next few minutes. It expires in 30 minutes.</>} />
        {!firebaseConfigured && <ButtonLink href="/auth/reset-password" variant="outline" className="w-full">Open the reset link (demo)</ButtonLink>}
        <Link href="/auth/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to log in</Link>
      </div>
    );

  return (
    <>
      <Heading title="Reset your password" sub="Enter the email you signed up with and we'll send you a reset link." />
      <form onSubmit={submit} noValidate className="space-y-5">
        <Input id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} required />
        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Sending link…">Send reset link</Button>
      </form>
      <Link href="/auth/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"><ArrowLeft className="h-4 w-4" aria-hidden /> Back to log in</Link>
    </>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors<typeof v>>({});
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("oobCode")); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(v, { password: [rules.password()], confirm: [(x) => (x === v.password ? null : "Passwords don't match.")] });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setLoading(true);
    try {
      if (firebaseConfigured && firebaseAuth && token) await confirmPasswordReset(firebaseAuth, token, v.password);
      else await authService.resetPassword(token ?? "token", v.password);
      toast.success("Password updated", "Log in with your new password.");
      router.push("/auth/login");
    } catch (err) {
      setErrors({ password: err instanceof Error ? err.message : "This reset link is invalid or expired." });
      setLoading(false);
    }
  }

  return (
    <>
      <Heading title="Choose a new password" sub="Use at least 8 characters with a mix of letters and numbers." />
      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <PasswordInput id="password" label="New password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={errors.password} required />
          <StrengthMeter password={v.password} />
        </div>
        <PasswordInput id="confirm" label="Confirm new password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} error={errors.confirm} required />
        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Updating…">Update password</Button>
      </form>
    </>
  );
}

function ResendButton({ onResend }: { onResend: () => Promise<unknown> }) {
  const [wait, setWait] = useState(30);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={wait > 0}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await onResend();
        setBusy(false);
        setWait(30);
      }}
    >
      {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
    </Button>
  );
}

export function VerifyEmail({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  async function check() {
    setChecking(true);
    try {
      if (!firebaseConfigured) {
        router.push("/dashboard/profile?setup=donor");
        return;
      }
      const u = firebaseAuth?.currentUser;
      if (!u) {
        toast.info("Log in to continue", "Use the email and password you just created.");
        router.push("/auth/login");
        return;
      }
      await reload(u);
      if (u.emailVerified) {
        // Refresh the session so the server records the verified email.
        const idToken = await u.getIdToken(true);
        await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
        toast.success("Email verified", "Your account is ready.");
        router.push("/dashboard/profile?setup=donor");
        router.refresh();
        return;
      }
      toast.info("Not verified yet", "Open the link in the email, then tap continue again.");
    } catch (err) {
      toast.error("Couldn't check verification", err instanceof Error ? err.message : "Try again.");
    } finally {
      setChecking(false);
    }
  }
  return (
    <div>
      <MailCheck className="h-10 w-10 text-hemo-600" aria-hidden />
      <Heading title="Confirm your email" sub={<>We sent a confirmation link to <span className="font-semibold text-ink-800">{email}</span>. Open it on this device to activate your account.</>} />
      <div className="space-y-3">
        <Button onClick={check} size="lg" className="w-full" loading={checking} loadingText="Checking…">I&apos;ve confirmed — continue</Button>
        <ButtonLink href="/dashboard" size="lg" variant="outline" className="w-full">Skip for now</ButtonLink>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm text-ink-500">
        <span>Didn&apos;t get it? Check spam.</span>
        <ResendButton onResend={async () => { try { if (firebaseAuth?.currentUser) await sendEmailVerification(firebaseAuth.currentUser); toast.info("Verification email sent again"); } catch { toast.error("Wait a minute before requesting another email."); } }} />
      </div>
    </div>
  );
}

export function VerifyOtpForm({ phone }: { phone: string }) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const msg = rules.otp()(code.replace(/\s/g, ""));
    setError(msg ?? undefined);
    if (msg) return;
    setLoading(true);
    try {
      await authService.verifyOtp(code);
      toast.success("Phone number verified", "Next, complete your donor profile.");
      router.push("/dashboard/profile?setup=donor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
      setLoading(false);
    }
  }

  return (
    <>
      <Heading title="Enter the 6-digit code" sub={<>We sent it by SMS to <span className="font-semibold text-ink-800">{phone}</span>. It expires in 10 minutes.</>} />
      <form onSubmit={submit} noValidate className="space-y-6">
        <OtpInput value={code} onChange={setCode} error={error} />
        <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Verifying…">Verify</Button>
      </form>
      <div className="mt-6 flex items-center justify-between text-sm text-ink-500">
        <span>Try 000000 to see the expired-code error.</span>
        <ResendButton onResend={() => authService.resendCode()} />
      </div>
    </>
  );
}
