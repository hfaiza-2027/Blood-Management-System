import type { ReactNode } from "react";
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertTone = "info" | "ok" | "warn" | "danger";

const styles: Record<AlertTone, string> = {
  info: "border-info-100 bg-info-50 text-info-700",
  ok: "border-ok-100 bg-ok-50 text-ok-700",
  warn: "border-warn-100 bg-warn-50 text-warn-700",
  danger: "border-hemo-200 bg-hemo-50 text-hemo-800",
};
const icons = { info: Info, ok: CircleCheck, warn: TriangleAlert, danger: OctagonAlert };

export function Alert({ tone = "info", title, children, action, className }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = icons[tone];
  return (
    <div className={cn("flex gap-3 rounded-card border p-4 text-sm", styles[tone], className)} role={tone === "danger" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-[13px] leading-relaxed opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
