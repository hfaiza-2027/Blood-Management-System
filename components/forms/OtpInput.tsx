"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export function OtpInput({ value, onChange, error, length = 6 }: { value: string; onChange: (v: string) => void; error?: string; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").split("").slice(0, length);

  function setAt(i: number, d: string) {
    const arr = digits.map((c) => (c === " " ? "" : c));
    arr[i] = d;
    onChange(arr.join(""));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onPaste(e: ClipboardEvent) {
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (t) {
      e.preventDefault();
      onChange(t);
      refs.current[Math.min(t.length, length - 1)]?.focus();
    }
  }

  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold text-ink-800">Verification code</legend>
      <div className="flex gap-2 sm:gap-3" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={Boolean(error) || undefined}
            value={d.trim()}
            onKeyDown={(e) => onKey(e, i)}
            onChange={(e) => {
              const c = e.target.value.replace(/\D/g, "").slice(-1);
              setAt(i, c);
              if (c && i < length - 1) refs.current[i + 1]?.focus();
            }}
            className={cn(
              "h-12 w-full min-w-0 rounded border bg-white text-center text-xl font-semibold tabular-nums focus:border-hemo-500 focus:outline-none focus:ring-2 focus:ring-hemo-500/30",
              error ? "border-hemo-500" : "border-line",
            )}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-[13px] text-hemo-700" role="alert">{error}</p>}
    </fieldset>
  );
}
