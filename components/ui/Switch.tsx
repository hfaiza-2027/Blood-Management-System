"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  id: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, id, disabled }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-ink-900">{label}</label>
        {description && <p className="mt-0.5 text-[13px] text-ink-500">{description}</p>}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 focus-visible:ring-offset-2 disabled:opacity-50",
          checked ? "bg-ink-900" : "bg-ink-200",
        )}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}
