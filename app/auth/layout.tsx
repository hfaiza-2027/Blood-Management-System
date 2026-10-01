import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col">
        <Logo tone="light" />
        <div className="mt-auto max-w-md">
          <p className="font-display text-3xl sm:text-4xl font-semibold leading-tight">&ldquo;The call came at 2 a.m. I was six minutes away.&rdquo;</p>
          <p className="mt-4 text-ink-300">Hira Nadeem, O-negative donor since 2023</p>
        </div>
        <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 text-sm">
          {[["4,349", "active donors"], ["12", "partner facilities"], ["38 min", "median first reply"]].map(([v, l]) => (
            <div key={l}>
              <dt className="text-ink-300">{l}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <svg className="pointer-events-none absolute -right-24 top-24 h-[420px] w-[420px] opacity-[0.07]" viewBox="0 0 32 32" aria-hidden>
          <path d="M16 3c5 6.4 10 12 10 17.2a10 10 0 0 1-20 0C6 15 11 9.4 16 3Z" fill="#fff" />
        </svg>
      </aside>
      <main id="main" className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
