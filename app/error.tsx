"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <ErrorState title="Something stopped this page from loading" description="Your data is safe. Try again, and if it keeps happening, contact support." onRetry={reset} />
    </main>
  );
}
