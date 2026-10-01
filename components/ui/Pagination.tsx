"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { page: number; pageSize: number; total: number; onChange: (p: number) => void; label?: string }

export function Pagination({ page, pageSize, total, onChange, label = "results" }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const nums: (number | "…")[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }

  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded px-2 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 disabled:opacity-40";

  return (
    <nav className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row" aria-label="Pagination">
      <p className="text-[13px] text-ink-500">
        Showing <span className="font-medium text-ink-800">{from}–{to}</span> of <span className="font-medium text-ink-800">{total}</span> {label}
      </p>
      <div className="flex items-center gap-1">
        <button className={cn(btn, "text-ink-600 hover:bg-ink-50")} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-ink-400">…</span>
          ) : (
            <button key={n} onClick={() => onChange(n)} aria-current={n === page ? "page" : undefined} className={cn(btn, n === page ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50")}>
              {n}
            </button>
          ),
        )}
        <button className={cn(btn, "text-ink-600 hover:bg-ink-50")} disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
