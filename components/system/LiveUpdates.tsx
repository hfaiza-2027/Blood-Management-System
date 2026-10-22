"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { liveService, type LiveCounts } from "@/services/liveService";

/** How often to check for new activity while the tab is visible. */
const POLL_MS = 15_000;

const signature = (c: LiveCounts) => `${c.unread}|${c.newMessages ?? ""}|${c.emergencies ?? ""}`;

/**
 * Keeps badges and lists current without a manual reload. It polls a few
 * server-side counters (one tiny request, no documents read) every 15 seconds
 * while the tab is visible, and immediately when the tab regains focus. When
 * any counter changes, it refreshes the page data in place, so new messages,
 * notifications and emergencies appear on their own.
 */
export function LiveUpdates({ initial }: { initial: LiveCounts }) {
  const router = useRouter();
  const last = useRef(signature(initial));

  // A server render (navigation or refresh) brings fresh counts; remember them.
  useEffect(() => {
    last.current = signature(initial);
  }, [initial]);

  useEffect(() => {
    let stopped = false;
    let busy = false;

    async function check() {
      if (busy || stopped || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const next = signature(await liveService.counts());
        if (!stopped && next !== last.current) {
          last.current = next;
          router.refresh();
        }
      } catch {
        // Offline or signed out: try again on the next tick.
      } finally {
        busy = false;
      }
    }

    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [router]);

  return null;
}
