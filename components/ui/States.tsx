import type { ReactNode } from "react";
import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-50 text-ink-400">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "This section didn't load", description = "Check your connection and try again.", onRetry, className }: { title?: string; description?: string; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)} role="alert">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hemo-50 text-hemo-600">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-[15px] font-semibold text-ink-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500">
          <RefreshCw className="h-4 w-4" aria-hidden /> Try again
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-12 text-sm text-ink-500", className)} role="status">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-ink-100", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-card lg:col-span-2" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
