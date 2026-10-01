"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#blood-groups", label: "Blood groups" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only rounded bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70]">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={cn("rounded px-3 py-2 text-sm font-medium hover:text-ink-900", pathname === l.href ? "text-ink-900" : "text-ink-600")}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ButtonLink href="/auth/login" variant="ghost">Log in</ButtonLink>
          <ButtonLink href="/dashboard/request" variant="outline">Request blood</ButtonLink>
          <ButtonLink href="/auth/register">Become a donor</ButtonLink>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="ml-auto rounded p-2 text-ink-700 hover:bg-ink-50 lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="animate-fade-in border-t border-line bg-white px-4 pb-5 pt-2 lg:hidden">
          <ul className="divide-y divide-line">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-[15px] font-medium text-ink-800">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2">
            <ButtonLink href="/auth/register" size="lg">Become a donor</ButtonLink>
            <ButtonLink href="/dashboard/request" variant="outline" size="lg">Request blood</ButtonLink>
            <ButtonLink href="/auth/login" variant="ghost" size="lg">Log in</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
