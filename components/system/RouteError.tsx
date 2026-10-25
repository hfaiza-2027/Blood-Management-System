"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw, TriangleAlert, WifiOff } from "lucide-react";

/** Silent retries before the error message is shown. */
const AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 900;

// Shared across remounts so a page that keeps failing doesn't retry forever.
const attempts = new Map<string, { count: number; at: number }>();

function attemptsFor(key: string) {
  const a = attempts.get(key);
  // Forget old failures after a minute so a later hiccup gets fresh retries.
  if (!a || Date.now() - a.at > 60_000) return { count: 0, at: Date.now() };
  return a;
}

/**
 * Error screen for a route segment. Most failures are momentary (a slow
 * network on a phone waking up, a server cold start), so it first retries
 * quietly with a "Reconnecting" note. Only if that keeps failing does it show
 * the error with a Try again button. Retrying refreshes the server data
 * (router.refresh) as well as re-rendering, which a plain reset() does not do.
 */
export function RouteError({ error, reset, className = "min-h-[60vh]" }: { error: Error & { digest?: string }; reset: () => void; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [offline, setOffline] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const key = useRef(typeof window === "undefined" ? "" : window.location.pathname).current;

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  useEffect(() => {
    console.error(error);
    if (!navigator.onLine) {
      setOffline(true);
      const back = () => {
        setOffline(false);
        retry();
      };
      window.addEventListener("online", back, { once: true });
      return () => window.removeEventListener("online", back);
    }
    const a = attemptsFor(key);
    if (a.count >= AUTO_RETRIES) {
      setGaveUp(true);
      return;
    }
    attempts.set(key, { count: a.count + 1, at: Date.now() });
    const t = setTimeout(retry, RETRY_DELAY_MS * (a.count + 1));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (offline) {
    return (
      <Shell className={className} icon={<WifiOff className="h-5 w-5" aria-hidden />} title="You're offline" text="This page will load again as soon as your connection is back." />
    );
  }

  if (!gaveUp) {
    return (
      <div className={`flex items-center justify-center gap-2 px-6 text-sm text-ink-500 ${className}`} role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Reconnecting…
      </div>
    );
  }

  return (
    <Shell
      className={className}
      icon={<TriangleAlert className="h-5 w-5" aria-hidden />}
      title="This page couldn't load"
      text="Your data is safe. Check your connection and try again. If it keeps happening, contact support."
      action={
        <button
          onClick={() => {
            attempts.delete(key);
            retry();
          }}
          disabled={pending}
          className="mt-5 inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 disabled:opacity-60"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />} Try again
        </button>
      }
    />
  );
}

function Shell({ className, icon, title, text, action }: { className: string; icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${className}`} role="alert">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-hemo-50 text-hemo-600">{icon}</div>
      <p className="text-[15px] font-semibold text-ink-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>
      {action}
    </div>
  );
}
