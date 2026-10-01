import type { ReactNode } from "react";
import { cn, formatNumber } from "@/lib/utils";

interface Props {
  label: string;
  value: number | string;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "blood";
  trend?: { value: number; label: string };
}

export function StatisticCard({ label, value, icon, hint, tone = "default", trend }: Props) {
  return (
    <div className={cn("rounded-card border p-5 shadow-card", tone === "blood" ? "border-hemo-700 bg-hemo-600 text-white" : "border-line bg-white")}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-[13px] font-medium", tone === "blood" ? "text-hemo-100" : "text-ink-500")}>{label}</p>
        {icon && <span className={cn("rounded-md p-1.5", tone === "blood" ? "bg-white/15 text-white" : "bg-ink-50 text-ink-500")}>{icon}</span>}
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
      {(hint || trend) && (
        <p className={cn("mt-2 text-[13px]", tone === "blood" ? "text-hemo-100" : "text-ink-500")}>
          {trend && (
            <span className={cn("mr-1 font-semibold", tone === "blood" ? "text-white" : trend.value >= 0 ? "text-ok-700" : "text-hemo-700")}>
              {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
            </span>
          )}
          {trend?.label ?? hint}
        </p>
      )}
    </div>
  );
}
