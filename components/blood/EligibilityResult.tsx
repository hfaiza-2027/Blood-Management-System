import { CircleCheck, Clock, Stethoscope } from "lucide-react";
import type { EligibilityResult } from "@/types";
import { ELIGIBILITY_DISCLAIMER } from "@/lib/eligibility";
import { cn } from "@/lib/utils";

const META = {
  likely_eligible: { icon: CircleCheck, title: "Based on your information, you may currently be eligible to donate.", box: "border-ok-100 bg-ok-50", ic: "text-ok-700" },
  wait: { icon: Clock, title: "You may need to wait before your next donation.", box: "border-warn-100 bg-warn-50", ic: "text-warn-700" },
  consult: { icon: Stethoscope, title: "Please speak to the donation centre's doctor first.", box: "border-info-100 bg-info-50", ic: "text-info-700" },
} as const;

export function EligibilityResultCard({ result, className }: { result: EligibilityResult; className?: string }) {
  const m = META[result.status];
  const Icon = m.icon;
  return (
    <div className={cn("rounded-card border p-4", m.box, className)} role="status" aria-live="polite">
      <div className="flex gap-3">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", m.ic)} aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink-900">{m.title}</p>
          {result.status === "wait" && result.daysUntilEligible > 0 && (
            <p className="mt-1 text-ink-700">You could be eligible again in about <span className="font-semibold">{result.daysUntilEligible} days</span>.</p>
          )}
          {result.reasons.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-ink-700">
              {result.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-ink-500">{ELIGIBILITY_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
