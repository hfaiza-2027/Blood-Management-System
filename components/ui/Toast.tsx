"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CircleCheck, Info, OctagonAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface ToastItem { id: number; tone: ToastTone; title: string; description?: string }

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-6 sm:items-end lg:bottom-6">
        {items.map((t) => {
          const Icon = t.tone === "success" ? CircleCheck : t.tone === "error" ? OctagonAlert : Info;
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-card border border-line bg-white p-4 shadow-pop">
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", t.tone === "success" ? "text-ok-600" : t.tone === "error" ? "text-hemo-600" : "text-info-600")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-ink-500">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-ink-400 hover:text-ink-700" aria-label="Dismiss notification">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
