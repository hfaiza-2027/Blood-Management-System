import type { BloodGroup } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  group: BloodGroup;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-6 min-w-[2.25rem] px-1.5 text-xs",
  md: "h-8 min-w-[2.75rem] px-2 text-sm",
  lg: "h-12 min-w-[4rem] px-3 text-xl",
};

/**
 * Rh-positive groups are filled; Rh-negative groups are outlined with a
 * heavier ring. The group name is always rendered as text, so meaning never
 * depends on colour.
 */
export function BloodGroupBadge({ group, size = "md", className }: Props) {
  const negative = group.endsWith("-");
  const abo = group.slice(0, -1);
  const rh = negative ? "−" : "+";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-px rounded-md font-bold tabular-nums tracking-tight",
        negative ? "bg-white text-hemo-700 ring-2 ring-inset ring-hemo-600" : "bg-hemo-600 text-white",
        sizes[size],
        className,
      )}
      aria-label={`Blood group ${abo} ${negative ? "negative" : "positive"}`}
      title={`${abo} ${negative ? "negative" : "positive"}`}
    >
      <span aria-hidden>{abo}</span>
      <span aria-hidden className={cn(size === "lg" ? "text-base" : "text-[0.8em]", "font-extrabold")}>{rh}</span>
    </span>
  );
}
