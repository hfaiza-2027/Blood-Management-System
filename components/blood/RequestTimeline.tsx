import { Check } from "lucide-react";
import type { BloodRequest, RequestStatus } from "@/types";
import { REQUEST_STATUS_META, USER_REQUEST_FLOW } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

/** Step tracker: completed steps have timestamps; future steps are greyed. */
export function RequestTimeline({ request }: { request: BloodRequest }) {
  const terminal = request.status === "cancelled" || request.status === "rejected";
  const reached = new Map<RequestStatus, { at: string; note?: string }>();
  request.timeline.forEach((t) => reached.set(t.status, t));
  const steps: RequestStatus[] = terminal ? ["pending", request.status] : USER_REQUEST_FLOW;
  const currentIdx = terminal ? 1 : Math.max(0, steps.indexOf(request.status === "approved" ? "pending" : request.status));

  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => {
        const done = i <= currentIdx;
        const current = i === currentIdx;
        const info = reached.get(s);
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className={cn("absolute left-[11px] top-6 h-[calc(100%-1rem)] w-0.5", i < currentIdx ? "bg-ink-800" : "bg-line")} aria-hidden />}
            <span
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-white",
                terminal && current ? "border-ink-400 bg-ink-400" : done ? "border-ink-800 bg-ink-800" : "border-line bg-white",
                current && !terminal && "border-hemo-600 bg-hemo-600",
              )}
              aria-hidden
            >
              {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            </span>
            <div className="-mt-0.5 min-w-0">
              <p className={cn("text-sm font-medium", done ? "text-ink-900" : "text-ink-400")}>
                {REQUEST_STATUS_META[s].label}
                {current && <span className="sr-only"> (current step)</span>}
              </p>
              {info ? (
                <p className="text-[13px] text-ink-500">
                  {formatDateTime(info.at)}
                  {info.note && ` — ${info.note}`}
                </p>
              ) : (
                !done && <p className="text-[13px] text-ink-400">Not reached yet</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
