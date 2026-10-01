import { cn, initials } from "@/lib/utils";

const palette = ["bg-ink-100 text-ink-800", "bg-hemo-50 text-hemo-800", "bg-info-50 text-info-700", "bg-ok-50 text-ok-700", "bg-warn-50 text-warn-700"];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;
  const s = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm", xl: "h-20 w-20 text-xl" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", palette[idx], s, className)} aria-hidden>
      {initials(name)}
    </span>
  );
}
