"use client";

import { useMemo, useState } from "react";
import type { SortState } from "@/components/ui/DataTable";

interface Options<T> {
  search: (row: T) => string[];
  sorters: Record<string, (row: T) => string | number>;
  pageSize?: number;
  initialQuery?: string;
  initialSort?: SortState;
}

/** Search + sort + pagination state shared by every admin table. */
export function useListControls<T>(rows: T[], filter: (row: T) => boolean, { search, sorters, pageSize = 10, initialQuery = "", initialSort }: Options<T>) {
  const [query, setQueryRaw] = useState(initialQuery);
  const [sort, setSort] = useState<SortState | undefined>(initialSort);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter(filter).filter((r) => !q || search(r).some((s) => s.toLowerCase().includes(q)));
    if (sort && sorters[sort.key]) {
      const get = sorters[sort.key];
      out = [...out].sort((a, b) => {
        const x = get(a), y = get(b);
        const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.dir === "asc" ? c : -c;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search/sorters are stable per table
  }, [rows, filter, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  return {
    query,
    setQuery: (q: string) => { setQueryRaw(q); setPage(1); },
    sort,
    onSort: (key: string) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })),
    page: current,
    setPage,
    pageSize,
    total: filtered.length,
    visible,
    resetPage: () => setPage(1),
  };
}
