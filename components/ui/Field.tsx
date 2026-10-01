import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-300 transition-colors " +
  "focus:outline-none focus:ring-2 focus:ring-hemo-500/30 focus:border-hemo-500 disabled:bg-ink-50 disabled:text-ink-400";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ id, label, error, hint, required, optional, className, children }: FieldProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-[13px] font-semibold text-ink-800">
        {label}
        {required && <span className="text-hemo-600" aria-hidden>*</span>}
        {optional && <span className="font-normal text-ink-400">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-hemo-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type Base = { id: string; label: string; error?: string; hint?: string; optional?: boolean; wrapperClassName?: string };

export function Input({ id, label, error, hint, optional, wrapperClassName, className, required, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} optional={optional} className={wrapperClassName}>
      <input
        id={id}
        name={props.name ?? id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, error, hint)}
        required={required}
        className={cn(control, "h-10", error ? "border-hemo-500" : "border-line", className)}
        {...props}
      />
    </Field>
  );
}

export function Select({ id, label, error, hint, optional, wrapperClassName, className, required, children, ...props }: Base & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} optional={optional} className={wrapperClassName}>
      <div className="relative">
        <select
          id={id}
          name={props.name ?? id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(id, error, hint)}
          required={required}
          className={cn(control, "h-10 appearance-none pr-9", error ? "border-hemo-500" : "border-line", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
      </div>
    </Field>
  );
}

export function Textarea({ id, label, error, hint, optional, wrapperClassName, className, required, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field id={id} label={label} error={error} hint={hint} required={required} optional={optional} className={wrapperClassName}>
      <textarea
        id={id}
        name={props.name ?? id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(id, error, hint)}
        required={required}
        className={cn(control, "min-h-[96px] py-2.5", error ? "border-hemo-500" : "border-line", className)}
        {...props}
      />
    </Field>
  );
}

/** Bare search box used in toolbars. */
export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement> & { "aria-label": string }) {
  return (
    <div className={cn("relative", className)}>
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" className={cn(control, "h-10 border-line pl-9")} {...props} />
    </div>
  );
}

/** Inline filter select without a visible label (label still announced). */
export function FilterSelect({ label, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className={cn("relative", className)}>
      <select aria-label={label} className={cn(control, "h-10 appearance-none border-line pr-9")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden />
    </div>
  );
}
