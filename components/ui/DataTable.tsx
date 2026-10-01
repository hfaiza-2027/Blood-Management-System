import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  /** Hide on the mobile card view (e.g. redundant with the title). */
  hideOnCard?: boolean;
  align?: "left" | "right";
}

export interface SortState { key: string; dir: "asc" | "desc" }

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  /** Rendered as the heading of each mobile card. */
  cardTitle: (row: T) => ReactNode;
  cardActions?: (row: T) => ReactNode;
  sort?: SortState;
  onSort?: (key: string) => void;
  empty?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
}

/**
 * Table on md+ screens, stacked cards below. Both views come from the same
 * column definitions so they never drift apart.
 */
export function DataTable<T>({ columns, rows, rowKey, caption, cardTitle, cardActions, sort, onSort, empty, rowClassName }: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-paper">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-ink-500", c.align === "right" && "text-right", c.className)}
                  >
                    {c.sortable && onSort ? (
                      <button onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 rounded hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500">
                        {c.header}
                        {active ? sort!.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={cn("hover:bg-paper/70", rowClassName?.(r))}>
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-ink-700", c.align === "right" && "text-right", c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {rows.map((r) => (
          <li key={rowKey(r)} className={cn("px-4 py-4", rowClassName?.(r))}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 font-medium text-ink-900">{cardTitle(r)}</div>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-sm min-[360px]:grid-cols-2">
              {columns
                .filter((c) => !c.hideOnCard)
                .map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-ink-400">{c.header}</dt>
                    <dd className="mt-0.5 truncate text-ink-700">{c.cell(r)}</dd>
                  </div>
                ))}
            </dl>
            {cardActions && <div className="mt-3 flex flex-wrap gap-2">{cardActions(r)}</div>}
          </li>
        ))}
      </ul>
    </>
  );
}
