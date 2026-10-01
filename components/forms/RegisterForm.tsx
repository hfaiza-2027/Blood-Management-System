"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { PasswordInput, StrengthMeter } from "./PasswordInput";
import { authService } from "@/services/authService";
import { BLOOD_GROUPS, CITIES, CITY_NAMES } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Values = {
  fullName: string; email: string; phone: string; password: string; confirm: string;
  dateOfBirth: string; gender: string; bloodGroup: string;
  city: string; area: string; address: string;
};

const initial: Values = { fullName: "", email: "", phone: "", password: "", confirm: "", dateOfBirth: "", gender: "", bloodGroup: "", city: "Lahore", area: "", address: "" };
const STEPS = ["Account", "About you", "Location"] as const;

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    setV((p) => ({ ...p, [k]: e.target.value, ...(k === "city" ? { area: "" } : {}) }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function validateStep(i: number) {
    const schemas: Partial<Record<keyof Values, ((s: string) => string | null)[]>>[] = [
      {
        fullName: [rules.required("your full name")],
        email: [rules.required("your email"), rules.email()],
        phone: [rules.required("your mobile number"), rules.phone()],
        password: [rules.password()],
        confirm: [(x) => (x && x === v.password ? null : "Passwords don't match.")],
      },
      { dateOfBirth: [rules.minAge(16)], gender: [rules.required("your gender")], bloodGroup: [rules.bloodGroup()] },
      { city: [rules.required("your city")], area: [rules.required("your area")] },
    ];
    const errs = validate(v, schemas[i]);
    setErrors(errs);
    return !hasErrors(errs);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!agree) {
      toast.error("Accept the terms to continue");
      return;
    }
    setLoading(true);
    try {
      await authService.register(v);
      toast.success("Account created", "Confirm your email to finish setting up.");
      router.push(`/auth/verify-email?email=${encodeURIComponent(v.email)}`);
    } catch (err) {
      toast.error("Unable to create your account", err instanceof Error ? err.message : "Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-ink-900">Create your account</h1>
        <p className="mt-2 text-[15px] text-ink-500">
          Already registered? <Link href="/auth/login" className="font-semibold text-hemo-700 hover:underline">Log in</Link>
        </p>
      </div>

      <ol className="mb-8 flex items-center gap-2" aria-label="Registration progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2" aria-current={i === step ? "step" : undefined}>
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", i < step ? "bg-ink-900 text-white" : i === step ? "bg-hemo-600 text-white" : "bg-ink-100 text-ink-500")}>
              {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={cn("hidden text-[13px] font-medium sm:inline", i === step ? "text-ink-900" : "text-ink-500")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} noValidate className="space-y-5">
        {step === 0 && (
          <>
            <Input id="fullName" label="Full name" autoComplete="name" value={v.fullName} onChange={set("fullName")} error={errors.fullName} required />
            <Input id="email" label="Email" type="email" autoComplete="email" value={v.email} onChange={set("email")} error={errors.email} required />
            <Input id="phone" label="Mobile number" type="tel" autoComplete="tel" placeholder="0300 1234567" value={v.phone} onChange={set("phone")} error={errors.phone} hint="Kept private. Used for emergency alerts and verification." required />
            <div>
              <PasswordInput id="password" label="Password" autoComplete="new-password" value={v.password} onChange={set("password")} error={errors.password} required />
              <StrengthMeter password={v.password} />
            </div>
            <PasswordInput id="confirm" label="Confirm password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} error={errors.confirm} required />
          </>
        )}

        {step === 1 && (
          <>
            <Input id="dateOfBirth" label="Date of birth" type="date" value={v.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} required max="2010-12-31" />
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">Gender <span className="text-hemo-600" aria-hidden>*</span></legend>
              <div className="grid grid-cols-3 gap-2">
                {[["male", "Male"], ["female", "Female"], ["other", "Prefer not to say"]].map(([val, label]) => (
                  <label key={val} className={cn("flex h-10 cursor-pointer items-center justify-center rounded border px-2 text-center text-[13px] font-medium", v.gender === val ? "border-ink-900 bg-ink-900 text-white" : "border-line text-ink-700 hover:border-ink-300")}>
                    <input type="radio" name="gender" value={val} checked={v.gender === val} onChange={set("gender")} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
              {errors.gender && <p className="mt-1.5 text-[13px] text-hemo-700" role="alert">{errors.gender}</p>}
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">Blood group <span className="text-hemo-600" aria-hidden>*</span></legend>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((g) => (
                  <label key={g} className={cn("flex h-11 cursor-pointer items-center justify-center rounded border text-sm font-bold tabular-nums focus-within:ring-2 focus-within:ring-hemo-500", v.bloodGroup === g ? "border-hemo-600 bg-hemo-600 text-white" : "border-line text-ink-800 hover:border-ink-300")}>
                    <input type="radio" name="bloodGroup" value={g} checked={v.bloodGroup === g} onChange={set("bloodGroup")} className="sr-only" />
                    {g}
                  </label>
                ))}
              </div>
              {errors.bloodGroup ? (
                <p className="mt-1.5 text-[13px] text-hemo-700" role="alert">{errors.bloodGroup}</p>
              ) : (
                <p className="mt-1.5 text-[13px] text-ink-500">Not sure? Choose your best guess — the blood bank confirms it at your first donation.</p>
              )}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select id="city" label="City" value={v.city} onChange={set("city")} error={errors.city} required>
                {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <Select id="area" label="Area" value={v.area} onChange={set("area")} error={errors.area} required>
                <option value="">Choose area</option>
                {(CITIES[v.city] ?? []).map((a) => <option key={a}>{a}</option>)}
              </Select>
            </div>
            <Textarea id="address" label="Address" optional rows={3} value={v.address} onChange={set("address")} hint="Never shown to other users. Helps coordinators in emergencies." />
            <p className="flex items-start gap-2 rounded bg-paper p-3 text-[13px] text-ink-600">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />
              People searching for donors see only your city, area and distance — never your address or phone number.
            </p>
            <label className="flex items-start gap-3 text-sm text-ink-700">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-line text-hemo-600 focus:ring-hemo-500" />
              <span>I agree to the terms of use and privacy policy, and consent to be contacted about blood requests.</span>
            </label>
          </>
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={loading} loadingText="Creating account…">
            {step < STEPS.length - 1 ? "Continue" : "Create account"}
          </Button>
        </div>
      </form>
    </>
  );
}
