"use client";

import { RouteError } from "@/components/system/RouteError";

/** Keeps the sidebar and top bar on screen when only the page content fails. */
export default function SectionError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} className="min-h-[50vh]" />;
}
