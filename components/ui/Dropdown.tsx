"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

interface DropdownProps {
  trigger: (props: { open: boolean; id: string; toggle: () => void }) => ReactNode;
  items?: DropdownItem[];
  children?: ReactNode;
  align?: "left" | "right";
  className?: string;
  label: string;
}

const GAP = 6;
const EDGE = 8;
/** Fixed + hidden while measuring, so the menu takes its natural width (not the full page width). */
const HIDDEN: CSSProperties = { position: "fixed", top: 0, left: 0, visibility: "hidden" };

/**
 * The menu is rendered into <body> with fixed positioning, so it is never
 * cut off by scrolling tables or cards with overflow hidden. It opens upward
 * when there isn't enough room below the trigger.
 */
export function Dropdown({ trigger, items, children, align = "right", className, label }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>(HIDDEN);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  // Measure after render, then place the menu below (or above) the trigger.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      // Measure the trigger button itself, not the wrapper (which can be wider).
      const anchor = (root.current?.firstElementChild as HTMLElement | null) ?? root.current;
      const t = anchor?.getBoundingClientRect();
      const m = menu.current;
      if (!t || !m) return;
      const mw = m.offsetWidth;
      const mh = m.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const below = vh - t.bottom - GAP - EDGE;
      const above = t.top - GAP - EDGE;
      const up = mh > below && above > below;
      let left = align === "right" ? t.right - mw : t.left;
      left = Math.min(Math.max(EDGE, left), vw - mw - EDGE);
      const top = up ? Math.max(EDGE, t.top - GAP - mh) : t.bottom + GAP;
      const maxHeight = Math.max(160, up ? above : below);
      setStyle({ position: "fixed", top, left, maxHeight, visibility: "visible" });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, align]);

  useEffect(() => {
    if (!open) {
      setStyle(HIDDEN);
      return;
    }
    const inside = (n: Node) => Boolean(root.current?.contains(n) || menu.current?.contains(n));
    const onDoc = (e: MouseEvent) => {
      if (!inside(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // A scrolling page would leave the fixed menu behind, so close it (but not when scrolling the menu itself).
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node && menu.current?.contains(e.target))) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    const t = window.setTimeout(() => menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function onMenuKey(e: ReactKeyboardEvent) {
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const els = Array.from(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? []);
    const i = els.indexOf(document.activeElement as HTMLElement);
    els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
  }

  return (
    <div ref={root} className={cn("relative inline-flex", className)}>
      {trigger({ open, id, toggle: () => setOpen((o) => !o) })}
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            style={style}
            className="z-[70] w-max min-w-[12rem] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-card border border-line bg-white py-1 shadow-pop animate-fade-in"
          >
            {children}
            {items?.map((it) => (
              <button
                key={it.label}
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm focus:bg-ink-50 focus:outline-none disabled:opacity-40",
                  it.tone === "danger" ? "text-hemo-700 hover:bg-hemo-50" : "text-ink-700 hover:bg-ink-50",
                )}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}