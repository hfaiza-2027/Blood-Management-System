import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb { label: string; href?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-500">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-ink-300" aria-hidden />}
            {c.href ? (
              <Link href={c.href} className="hover:text-ink-900 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-700">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }: { title: string; description?: ReactNode; actions?: ReactNode; breadcrumb?: Crumb[] }) {
  return (
    <header className="mb-6">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
