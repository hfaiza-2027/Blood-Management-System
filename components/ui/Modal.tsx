"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

/**
 * Built on the native <dialog> element: focus is trapped, Esc closes it,
 * and the rest of the page is inert while it is open.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        // Phones: a bottom sheet that spans the width. Larger screens: a centred dialog.
        "mx-0 mb-0 mt-auto w-full max-w-none rounded-t-2xl bg-white p-0 text-ink-900 shadow-pop backdrop:bg-ink-900/40 open:animate-slide-up",
        "sm:m-auto sm:w-[calc(100%-2rem)] sm:rounded-card",
        { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size],
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col sm:max-h-[85vh]">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="modal-title" className="text-base font-semibold">{title}</h2>
              {description && <div className="mt-1 text-sm text-ink-500">{description}</div>}
            </div>
            <button onClick={onClose} className="-mr-1 rounded p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500" aria-label="Close dialog">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-paper px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end sm:pb-3 [&>*]:w-full sm:[&>*]:w-auto">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
