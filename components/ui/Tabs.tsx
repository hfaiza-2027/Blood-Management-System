"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> { value: T; label: string; count?: number }

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, i: number) {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % items.length;
    if (e.key === "ArrowLeft") next = (i - 1 + items.length) % items.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(items[next].value);
    }
  }

  return (
    <div className={cn("-mx-1 overflow-x-auto px-1", className)}>
      <div role="tablist" aria-label={label} className="flex min-w-max gap-1 border-b border-line">
        {items.map((t, i) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => onChange(t.value)}
              className={cn(
                "relative -mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-hemo-500",
                active ? "border-hemo-600 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums", active ? "bg-hemo-50 text-hemo-700" : "bg-ink-100 text-ink-500")}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Segmented control for small option sets. */
export function Segmented<T extends string>({ items, value, onChange, label }: TabsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded border border-line bg-white p-0.5">
      {items.map((t) => (
        <button
          key={t.value}
          role="radio"
          aria-checked={t.value === value}
          onClick={() => onChange(t.value)}
          className={cn(
            "rounded-[4px] px-3 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500",
            t.value === value ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
