import type { ReactNode } from "react";
import type { ReportMetric } from "@/types";
import { cn, formatNumber } from "@/lib/utils";

export type KpiFormat = "count" | "percent" | "hours";

/** 45 min, 5.2 h or 3.1 days: whichever reads naturally. */
export function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

export function formatMetric(v: number | null, format: KpiFormat): string {
  if (v === null || v === undefined) return "–";
  if (format === "percent") return `${Math.round(v * 10) / 10}%`;
  if (format === "hours") return formatHours(v);
  return formatNumber(v);
}

/** Change against the previous period. Rates change in points; counts and times in percent. */
function change(m: ReportMetric, format: KpiFormat) {
  if (m.value === null || m.previous === null) return null;
  if (format === "percent") {
    const d = Math.round((m.value - m.previous) * 10) / 10;
    return { delta: d, text: `${Math.abs(d)} pts` };
  }
  if (m.previous === 0) return m.value === 0 ? { delta: 0, text: "0%" } : null;
  const d = Math.round(((m.value - m.previous) / m.previous) * 100);
  return { delta: d, text: `${Math.abs(d)}%` };
}

interface Props {
  label: string;
  metric: ReportMetric;
  format?: KpiFormat;
  /** Whether a rise is good news (requests met) or bad news (hours waited). Neutral just reports the change. */
  better?: "up" | "down" | "neutral";
  icon?: ReactNode;
  hint?: string;
}

export function ReportKpi({ label, metric, format = "count", better = "up", icon, hint }: Props) {
  const c = change(metric, format);
  const good = c && c.delta !== 0 && better !== "neutral" ? (better === "up" ? c.delta > 0 : c.delta < 0) : null;
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card print:break-inside-avoid print:shadow-none sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-500">{label}</p>
        {icon && <span className="rounded-md bg-ink-50 p-1.5 text-ink-500 print:hidden">{icon}</span>}
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none tracking-tight tabular-nums text-ink-900">{formatMetric(metric.value, format)}</p>
      <p className="mt-2 text-[12px] text-ink-500">
        {c ? (
          <>
            <span className={cn("mr-1 font-semibold", good === null ? "text-ink-600" : good ? "text-ok-700" : "text-hemo-700")}>
              {c.delta > 0 ? "▲" : c.delta < 0 ? "▼" : "■"} {c.text}
            </span>
            vs {formatMetric(metric.previous, format)} before
          </>
        ) : metric.previous === null || metric.previous === 0 ? (
          hint ?? "No earlier figure to compare"
        ) : (
          `Previous: ${formatMetric(metric.previous, format)}`
        )}
      </p>
    </div>
  );
}
