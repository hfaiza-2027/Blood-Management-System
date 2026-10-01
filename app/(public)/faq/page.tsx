import type { Metadata } from "next";
import Link from "next/link";
import { faqGroups } from "@/lib/faq";

export const metadata: Metadata = { title: "FAQ", description: "Answers about donating blood, requesting blood and privacy on Qatra." };

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-ink-900">Frequently asked questions</h1>
      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="FAQ sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {faqGroups.map((g) => (
              <li key={g.id}>
                <Link href={`#${g.id}`} className="block rounded px-3 py-1.5 text-sm font-medium text-ink-600 ring-1 ring-line hover:text-ink-900 lg:ring-0">{g.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-14">
          {faqGroups.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`${g.id}-t`} className="scroll-mt-24">
              <h2 id={`${g.id}-t`} className="text-xl font-semibold text-ink-900">{g.title}</h2>
              <div className="mt-4 divide-y divide-line border-y border-line">
                {g.items.map((f) => (
                  <details key={f.id} className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <span className="text-xl leading-none text-ink-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
          <p className="text-ink-600">
            Still stuck? <Link href="/contact" className="font-semibold text-ink-900 underline underline-offset-4">Contact the coordinators</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
