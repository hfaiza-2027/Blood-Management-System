import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const tones: Record<Tone, { box: string; dot: string }> = {
  neutral: { box: "bg-ink-50 text-ink-700 ring-ink-200", dot: "bg-ink-400" },
  info: { box: "bg-info-50 text-info-700 ring-info-100", dot: "bg-info-600" },
  ok: { box: "bg-ok-50 text-ok-700 ring-ok-100", dot: "bg-ok-600" },
  warn: { box: "bg-warn-50 text-warn-700 ring-warn-100", dot: "bg-warn-600" },
  danger: { box: "bg-hemo-50 text-hemo-700 ring-hemo-100", dot: "bg-hemo-600" },
  blood: { box: "bg-hemo-600 text-white ring-hemo-600", dot: "bg-white" },
  muted: { box: "bg-white text-ink-500 ring-line", dot: "bg-ink-300" },
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

/** Status is always conveyed by text; the dot/colour is reinforcement only. */
export function Badge({ tone = "neutral", children, dot = true, icon, className }: BadgeProps) {
  const t = tones[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", t.box, className)}>
      {icon ?? (dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden />)}
      {children}
    </span>
  );
}
