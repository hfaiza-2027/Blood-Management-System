import { cn } from "@/lib/utils";

export function Progress({ value, max = 100, label, tone = "hemo", className }: { value: number; max?: number; label: string; tone?: "hemo" | "ink" | "ok" | "warn"; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = { hemo: "bg-hemo-600", ink: "bg-ink-700", ok: "bg-ok-600", warn: "bg-warn-600" }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-ink-100", className)} role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}
