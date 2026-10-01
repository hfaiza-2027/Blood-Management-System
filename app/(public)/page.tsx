import Link from "next/link";
import { Building2, CalendarCheck, Clock, EyeOff, HeartHandshake, MapPin, Quote, ShieldCheck, Siren, Stethoscope } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { BloodRequestCard } from "@/components/blood/BloodRequestCard";
import { SupplyBoard } from "@/components/blood/SupplyBoard";
import { BloodGroupExplorer } from "@/components/public/BloodGroupExplorer";
import { NearbyMap } from "@/components/public/NearbyMap";
import { inventoryService } from "@/services/inventoryService";
import { bloodRequestService } from "@/services/bloodRequestService";
import { dashboardService } from "@/services/dashboardService";
import { safe } from "@/services/client";
import { BLOOD_GROUPS, CITY_NAMES } from "@/lib/constants";
import { DEFAULT_POINT } from "@/lib/geo";
import { faqGroups } from "@/lib/faq";

const steps = [
  { title: "Register once", body: "Add your blood group, area and availability. It takes about two minutes, and your address stays private." },
  { title: "Get matched", body: "When a hospital near you needs your group, you get an alert with the hospital, the units needed and the deadline." },
  { title: "Donate at the hospital", body: "Confirm you're coming, go to the blood bank, and the staff take it from there. The request updates for the family." },
];

const reasons = [
  { icon: Clock, title: "Blood can't be manufactured", body: "Red cells last about 42 days in storage, so supply depends on regular donors." },
  { icon: HeartHandshake, title: "One donation, up to three patients", body: "A single unit can be split into red cells, plasma and platelets." },
  { icon: Stethoscope, title: "A free mini health check", body: "Every donation includes a blood pressure and haemoglobin check." },
];

const testimonials = [
  { quote: "My son has thalassaemia and needs blood every three weeks. Before Qatra I spent whole nights phoning relatives. Now donors near the blood bank reply within the hour.", name: "Nadia Perveen", role: "Mother, Model Town" },
  { quote: "I got an alert for O-negative at 2 a.m., six minutes from my flat. The patient was a road accident victim. I've donated four times since.", name: "Hira Nadeem", role: "Donor, DHA Lahore" },
  { quote: "Coordinators used to keep donor lists in spreadsheets. Seeing live stock and matched donors on one screen has cut our emergency response time in half.", name: "Dr. Kamran Javed", role: "Transfusion officer, Ravi Valley General" },
];

export default async function HomePage() {
  const [inventory, emergencies, publicStats] = await Promise.all([
    safe(inventoryService.list(), []),
    safe(bloodRequestService.nearbyEmergencies(DEFAULT_POINT, 30), []),
    safe(dashboardService.publicOverview(), { activeDonors: 0, donationsArranged: 0, bloodRequests: 0, users: 0 }),
  ]);
  const topEmergencies = emergencies.filter((r) => r.urgency === "emergency").slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <h1 className="font-display text-[38px] font-semibold leading-[1.04] min-[400px]:text-[44px] tracking-tight text-ink-900 text-balance sm:text-6xl lg:text-[68px]">
              Every drop can save a life.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-600 text-pretty">
              Connect blood donors with patients who need them. Find available blood, request donations, and help save lives in your community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard/donate" size="lg">Donate blood</ButtonLink>
              <ButtonLink href="/dashboard/request" size="lg" variant="secondary">Request blood</ButtonLink>
            </div>
            <p className="mt-5 text-sm text-ink-500">
              <Link href="/dashboard/donors" className="font-semibold text-ink-800 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-800">Find blood near you</Link>
              <span className="mx-2 text-ink-300" aria-hidden>/</span>
              <Link href="/auth/register" className="font-semibold text-ink-800 underline decoration-ink-300 underline-offset-4 hover:decoration-ink-800">Become a donor</Link>
            </p>
          </div>
          <SupplyBoard inventory={inventory} />
        </div>
      </section>

      {/* Search */}
      <section aria-labelledby="search-title" className="bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <form action="/dashboard/donors" method="get" className="grid gap-4 rounded-card border border-line bg-white p-5 shadow-card md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
            <div>
              <h2 id="search-title" className="text-lg font-semibold text-ink-900">Search for blood</h2>
              <p className="text-sm text-ink-500">See available donors by group and city.</p>
            </div>
            <div>
              <label htmlFor="s-group" className="mb-1.5 block text-[13px] font-semibold text-ink-800">Blood group</label>
              <select id="s-group" name="group" className="h-11 w-full rounded border border-line bg-white px-3 text-sm focus:border-hemo-500 focus:outline-none focus:ring-2 focus:ring-hemo-500/30">
                <option value="any">Any group</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="s-city" className="mb-1.5 block text-[13px] font-semibold text-ink-800">City</label>
              <select id="s-city" name="city" defaultValue="Lahore" className="h-11 w-full rounded border border-line bg-white px-3 text-sm focus:border-hemo-500 focus:outline-none focus:ring-2 focus:ring-hemo-500/30">
                {CITY_NAMES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="h-11 rounded bg-hemo-600 px-6 text-sm font-semibold text-white hover:bg-hemo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 focus-visible:ring-offset-2">
              Find donors
            </button>
          </form>

          <dl className="mt-8 grid grid-cols-2 gap-y-6 md:grid-cols-4">
            {[
              [publicStats.activeDonors.toLocaleString(), "active donors"],
              [publicStats.donationsArranged.toLocaleString(), "completed donations"],
              [publicStats.bloodRequests.toLocaleString(), "blood requests"],
              ["24/7", "emergency coordination"],
            ].map(([v, l]) => (
              <div key={l} className="flex flex-col border-l-2 border-hemo-600 pl-4">
                <dt className="order-2 text-sm text-ink-500">{l}</dt>
                <dd className="text-2xl font-bold tabular-nums text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="how-title" className="max-w-xl font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">From alert to transfusion, usually within hours.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-ink-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Emergency */}
      <section aria-labelledby="emergency-title" className="bg-hemo-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-sm font-semibold text-hemo-100">
                <Siren className="h-4 w-4" aria-hidden />
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
                Live in Lahore now
              </p>
              <h2 id="emergency-title" className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">These patients need blood in the next few hours.</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/dashboard/blood-requests?tab=emergency" variant="outline" className="border-white bg-white text-hemo-700 hover:bg-hemo-50">See all emergencies</ButtonLink>
              <ButtonLink href="/dashboard/request?urgency=emergency" variant="ghost" className="text-white ring-1 ring-inset ring-white/50 hover:bg-white/10">Post an emergency request</ButtonLink>
            </div>
          </div>
          <div className="mt-10 grid gap-4 text-ink-900 md:grid-cols-3">
            {topEmergencies.map((r) => (
              <BloodRequestCard key={r.id} request={r} action={<ButtonLink href={`/dashboard/blood-requests?respond=${r.id}`} size="sm" className="w-full">I can donate</ButtonLink>} />
            ))}
          </div>
        </div>
      </section>

      {/* Blood groups */}
      <section id="blood-groups" aria-labelledby="groups-title" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="groups-title" className="max-w-xl font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">Who can your blood help?</h2>
          <p className="mt-3 max-w-xl text-ink-600">Red cell compatibility decides who can receive your donation. Pick a group to see it.</p>
          <div className="mt-10">
            <BloodGroupExplorer />
          </div>
        </div>
      </section>

      {/* Nearby + privacy */}
      <section aria-labelledby="nearby-title" className="border-y border-line bg-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <NearbyMap />
          </div>
          <div className="order-1 lg:order-2">
            <h2 id="nearby-title" className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">Nearby donors first. Your home stays private.</h2>
            <p className="mt-4 leading-relaxed text-ink-600">We match requests to compatible donors closest to the hospital, so help arrives faster. Donors are shown by area and approximate distance only.</p>
            <ul className="mt-8 space-y-5">
              {[
                { icon: MapPin, t: "Area and distance, never an address", b: "Other users see \"Johar Town, 2.4 km away\" — not your street." },
                { icon: EyeOff, t: "Your number stays hidden", b: "You decide whether to share contact details for each request." },
                { icon: ShieldCheck, t: "Verified donors and hospitals", b: "Coordinators check donor details and partner facilities before they get a badge." },
              ].map(({ icon: Icon, t, b }) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-ink-700 ring-1 ring-line"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
                  <div>
                    <p className="font-semibold text-ink-900">{t}</p>
                    <p className="text-sm text-ink-600">{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why donate */}
      <section aria-labelledby="why-title" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <h2 id="why-title" className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">Why donate?</h2>
              <p className="mt-4 text-ink-600">Pakistan needs around 1.5 million units of blood a year. Most of it still comes from relatives found in a hurry.</p>
              <ButtonLink href="/auth/register" className="mt-8" size="lg">Become a donor</ButtonLink>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
              {reasons.map(({ icon: Icon, title, body }) => (
                <li key={title} className="bg-white p-6">
                  <Icon className="h-6 w-6 text-hemo-600" aria-hidden />
                  <p className="mt-5 font-semibold text-ink-900">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section aria-labelledby="stories-title" className="bg-ink-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="stories-title" className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">From donors, families and hospitals</h2>
          <ul className="mt-12 grid gap-8 md:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.name}>
                <figure className="flex h-full flex-col border-t border-white/15 pt-6">
                  <Quote className="h-5 w-5 text-hemo-400" aria-hidden />
                  <blockquote className="mt-4 flex-1 font-display text-lg leading-relaxed text-ink-100">{t.quote}</blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="font-semibold text-white">{t.name}</span>
                    <span className="block text-ink-300">{t.role}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 id="faq-title" className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">Questions people ask</h2>
            <p className="mt-4 text-ink-600">
              More answers on the <Link href="/faq" className="font-semibold text-ink-900 underline underline-offset-4">FAQ page</Link>.
            </p>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {faqGroups.flatMap((g) => g.items.slice(0, 2)).map((f) => (
              <details key={f.id} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-ink-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-white ring-1 ring-line"><Building2 className="h-5 w-5 text-ink-700" aria-hidden /></span>
            <div>
              <p className="text-lg font-semibold text-ink-900">Run a hospital or blood bank?</p>
              <p className="text-ink-600">Share live stock, post requests and reach verified donors near you.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/contact#partners" variant="secondary" icon={<CalendarCheck className="h-4 w-4" aria-hidden />}>Become a partner</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
