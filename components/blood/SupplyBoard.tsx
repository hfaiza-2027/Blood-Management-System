import type { BloodInventory } from "@/types";
import { stockLevel } from "@/services/inventoryService";
import { STOCK_META } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

/**
 * The signature element of the public site: eight vials showing today's
 * supply against demand for each blood group.
 */
export function SupplyBoard({ inventory, city = "Lahore" }: { inventory: BloodInventory[]; city?: string }) {
  const latest = inventory.reduce<string | null>((a, i) => (!a || +new Date(i.updatedAt) > +new Date(a) ? i.updatedAt : a), null);
  return (
    <figure className="rounded-card border border-ink-800 bg-ink-900 p-5 text-white shadow-pop sm:p-6">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] font-semibold">{city} supply today</span>
        {latest && <span className="text-[12px] text-ink-300">Updated {formatDate(latest, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
      </figcaption>
      {inventory.length === 0 && (
        <p className="mt-6 rounded-md border border-dashed border-ink-700 px-4 py-8 text-center text-sm text-ink-300">Stock levels will appear here once partner blood banks report them.</p>
      )}
      <ul className="mt-6 grid grid-cols-4 gap-x-2 gap-y-6 min-[400px]:gap-x-3 sm:gap-x-5">
        {inventory.map((i, idx) => {
          const level = stockLevel(i);
          const scale = Math.max(1, i.available, i.required * 1.4);
          const pct = Math.min(100, Math.round((i.available / scale) * 100));
          return (
            <li key={i.bloodGroup} className="flex flex-col items-center">
              <div className="relative h-24 w-9 overflow-hidden rounded-b-full rounded-t-md border-2 border-ink-500 bg-ink-800 sm:h-28 sm:w-10" aria-hidden>
                <div
                  className={cn("absolute inset-x-0 bottom-0 origin-bottom animate-fill-vial motion-reduce:animate-none", level === "critical" ? "bg-hemo-400" : "bg-hemo-600")}
                  style={{ height: `${pct}%`, animationDelay: `${idx * 70}ms` }}
                />
                <div className="absolute inset-x-0 border-t border-dashed border-white/50" style={{ bottom: `${Math.min(95, (i.required / scale) * 100)}%` }} />
              </div>
              <span className="mt-2 text-base font-bold tabular-nums">{i.bloodGroup}</span>
              <span className={cn("text-[11px]", level === "normal" ? "text-ink-300" : level === "low" ? "text-warn-100" : "font-semibold text-hemo-200")}>
                {level === "normal" ? `${i.available} units` : STOCK_META[level].label}
              </span>
              <span className="sr-only">
                {i.bloodGroup}: {i.available} units available, {i.required} needed this week, {STOCK_META[level].label}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 flex items-center gap-2 border-t border-white/10 pt-4 text-[12px] text-ink-300">
        <span className="inline-block w-5 border-t border-dashed border-white/60" aria-hidden /> Weekly need at partner blood banks
      </p>
    </figure>
  );
}
