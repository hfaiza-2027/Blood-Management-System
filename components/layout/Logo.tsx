import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="32" height="32" rx="7" className="fill-hemo-600" />
      <path d="M16 6.5c3.6 4.6 7 8.6 7 12.3a7 7 0 0 1-14 0c0-3.7 3.4-7.7 7-12.3Z" fill="#fff" />
      <path d="M13 19.5a3 3 0 0 0 3 3" stroke="#A51C30" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "dark", sub }: { href?: string; tone?: "dark" | "light"; sub?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500">
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-[19px] font-bold tracking-tight", tone === "dark" ? "text-ink-900" : "text-white")}>Qatra</span>
        {sub && <span className={cn("mt-0.5 text-[11px] font-medium", tone === "dark" ? "text-ink-400" : "text-ink-300")}>{sub}</span>}
      </span>
    </Link>
  );
}
