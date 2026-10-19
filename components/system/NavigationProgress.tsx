"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin progress bar at the top of the window while a page is loading, so
 * every link click gives instant feedback even before the next page streams in.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A finished navigation: complete the bar, then hide it.
  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    timer.current = setTimeout(() => setState("idle"), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pathname, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState("loading");
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5" role="progressbar" aria-label="Loading page" aria-busy={state === "loading"}>
      <div className={state === "loading" ? "h-full w-full origin-left animate-nav-progress bg-hemo-600" : "h-full w-full bg-hemo-600 opacity-0 transition-opacity duration-300"} />
    </div>
  );
}
