import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "About", description: "Why Qatra exists and how the blood network is run." };

const principles = [
  { t: "Patients first", b: "Every design decision starts with the family standing in a hospital corridor at night, looking for one more donor." },
  { t: "Donor privacy by default", b: "Donors are shown by area and approximate distance only. Contact details are shared one request at a time, with consent." },
  { t: "Hospitals decide medically", b: "Qatra gives guidance on eligibility, but screening and cross-matching always happen at the blood bank." },
  { t: "Free, always", b: "The network is free for donors and patients. We never sell data or accept payment to prioritise requests." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="max-w-3xl font-display text-4xl sm:text-5xl font-semibold tracking-tight text-ink-900 text-balance">We make finding a blood donor as fast as finding a pharmacy.</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5 text-[17px] leading-[1.7] text-ink-700">
          <p>
            In most Pakistani hospitals, a patient&apos;s family is still asked to arrange replacement donors. That means phone trees, WhatsApp forwards and waiting — often at the moment people can least afford it.
          </p>
          <p>
            Qatra started in Lahore as a volunteer effort to put that search in one place: donors say where they are and when they&apos;re available, hospitals post what they need, and the system connects the two, closest first.
          </p>
          <p>
            Today the network works with blood banks and hospitals in five cities. Coordinators verify donors, review emergency requests and keep stock levels current, so the numbers you see reflect what&apos;s actually on the shelf.
          </p>
        </div>
        <div className="rounded-card border border-line bg-paper p-6">
          <p className="font-semibold text-ink-900">The network in September 2026</p>
          <dl className="mt-5 space-y-4">
            {[["Partner facilities", "12"], ["Cities", "5"], ["Active donors", "4,349"], ["Requests fulfilled", "91%"]].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between border-b border-line pb-3 last:border-0">
                <dt className="text-sm text-ink-600">{k}</dt>
                <dd className="text-xl font-bold tabular-nums text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <h2 className="mt-20 font-display text-3xl font-semibold text-ink-900">What we hold ourselves to</h2>
      <ul className="mt-8 grid gap-8 sm:grid-cols-2">
        {principles.map((p) => (
          <li key={p.t} className="border-t-2 border-ink-900 pt-5">
            <p className="text-lg font-semibold text-ink-900">{p.t}</p>
            <p className="mt-2 leading-relaxed text-ink-600">{p.b}</p>
          </li>
        ))}
      </ul>
      <div className="mt-16 flex flex-wrap gap-3">
        <ButtonLink href="/auth/register" size="lg">Become a donor</ButtonLink>
        <ButtonLink href="/contact" size="lg" variant="outline">Contact the team</ButtonLink>
      </div>
    </div>
  );
}
