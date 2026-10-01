"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> { id: string; label: string; error?: string; hint?: string }

export function PasswordInput({ id, label, error, hint, className, required, ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required}>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            "block h-10 w-full rounded border bg-white px-3 pr-10 text-sm text-ink-900 focus:border-hemo-500 focus:outline-none focus:ring-2 focus:ring-hemo-500/30",
            error ? "border-hemo-500" : "border-line",
            className,
          )}
          {...props}
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-ink-400 hover:text-ink-700" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score: s as 0 | 1 | 2 | 3 | 4, label: labels[s] };
}

export function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  return (
    <div className="mt-2 flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i < score ? (score <= 1 ? "bg-hemo-500" : score === 2 ? "bg-warn-600" : "bg-ok-600") : "bg-ink-100")} />
        ))}
      </div>
      <span className="text-xs text-ink-500">Password strength: {label}</span>
    </div>
  );
}
