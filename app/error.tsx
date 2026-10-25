"use client";

import { RouteError } from "@/components/system/RouteError";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <RouteError error={error} reset={reset} />
    </main>
  );
}
