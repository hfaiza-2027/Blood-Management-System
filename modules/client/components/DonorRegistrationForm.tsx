"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { BadgeCheck, CalendarHeart, Search } from "lucide-react";
import type { EligibilityAnswers, User } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { EligibilityResultCard } from "@/components/blood/EligibilityResult";
import { donorService } from "@/services/donorService";
import { checkEligibility } from "@/lib/eligibility";
import { BLOOD_GROUPS, CITIES, CITY_NAMES } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { ageFromDob, cn } from "@/lib/utils";

type Values = {
  bloodGroup: string; dateOfBirth: string; gender: string; weight: string; city: string; area: string; address: string;
  availability: string; lastDonation: string; neverDonated: string; contact: string;
};

const QUESTIONS: { key: keyof EligibilityAnswers; q: string; eligibleAnswer: boolean }[] = [
  { key: "feelingWell", q: "Are you feeling well and healthy today?", eligibleAnswer: true },
  { key: "recentIllness", q: "Have you had a fever, cold or infection in the last 2 weeks?", eligibleAnswer: false },
  { key: "recentTattoo", q: "Have you had a tattoo, piercing or cupping (hijama) in the last 6 months?", eligibleAnswer: false },
  { key: "onMedication", q: "Are you currently taking any prescribed medicine?", eligibleAnswer: false },
  { key: "recentSurgery", q: "Have you had surgery or a major dental procedure in the last 6 months?", eligibleAnswer: false },
  { key: "pregnantOrNursing", q: "Are you pregnant, or have you given birth or been breastfeeding in the last 6 months?", eligibleAnswer: false },
];

export function DonorRegistrationForm({ user }: { user: User }) {
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState<Values>({
    bloodGroup: user.bloodGroup, dateOfBirth: user.dateOfBirth, gender: user.gender, weight: "", city: user.location.city, area: user.location.area,
    address: user.address ?? "", availability: "available", lastDonation: "", neverDonated: "", contact: "phone",
  });
  const [answers, setAnswers] = useState<Partial<Record<keyof EligibilityAnswers, boolean>>>({});
  const [errors, setErrors] = useState<Errors<Values> & { answers?: string }>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    setV((p) => ({ ...p, [k]: e.target.value, ...(k === "city" ? { area: "" } : {}) }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const answered = QUESTIONS.every((q) => answers[q.key] !== undefined);
  const result = useMemo(
    () => checkEligibility({
      age: v.dateOfBirth ? ageFromDob(v.dateOfBirth) : 0,
      weightKg: Number(v.weight) || 0,
      lastDonationDate: v.neverDonated === "yes" ? null : v.lastDonation || null,
      answers,
    }),
    [v.dateOfBirth, v.weight, v.lastDonation, v.neverDonated, answers],
  );
  const showResult = answered && Boolean(v.weight) && Boolean(v.dateOfBirth);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Errors<Values> & { answers?: string } = validate(v, {
      bloodGroup: [rules.bloodGroup()],
      dateOfBirth: [rules.minAge(18)],
      gender: [rules.required("your gender")],
      weight: [rules.intRange("Weight (kg)", 50, 250)],
      city: [rules.required("your city")],
      area: [rules.required("your area")],
      ...(v.neverDonated === "yes" ? {} : { lastDonation: [rules.pastDate("your last donation date")] }),
    });
    if (!answered) errs.answers = "Answer every health question so we can guide you.";
    setErrors(errs);
    if (hasErrors(errs)) {
      document.getElementById(Object.keys(errs)[0] === "answers" ? "q-feelingWell-yes" : Object.keys(errs)[0])?.focus();
      return;
    }
    setLoading(true);
    try {
      await donorService.registerDonor({ id: user.id, userId: user.id, name: user.fullName, bloodGroup: v.bloodGroup as any, gender: v.gender as any, age: ageFromDob(v.dateOfBirth), weightKg: Number(v.weight), location: { ...user.location, city: v.city, area: v.area }, availability: v.availability as any, verification: "pending", lastDonationDate: v.neverDonated === "yes" ? null : (v.lastDonation || null), totalDonations: 0, preferredContact: v.contact as any, status: "active" });
      setDone(true);
      toast.success("Donor profile submitted.", "We'll verify your blood group at your first donation.");
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Unable to register you as a donor", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardBody className="space-y-5 py-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-50 text-ok-700"><BadgeCheck className="h-7 w-7" aria-hidden /></div>
          <div>
            <h2 className="text-xl font-semibold text-ink-900">You&apos;re registered as a {v.bloodGroup} donor</h2>
            <p className="mt-1 text-sm text-ink-500">Your profile is pending verification. You&apos;ll appear in donor search with a verified badge after your first screened donation.</p>
          </div>
          <EligibilityResultCard result={result} className="text-left" />
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <ButtonLink href="/dashboard/donate" icon={<CalendarHeart className="h-4 w-4" aria-hidden />}>Book a donation</ButtonLink>
            <ButtonLink href="/dashboard/blood-requests?tab=nearby" variant="outline" icon={<Search className="h-4 w-4" aria-hidden />}>See nearby requests</ButtonLink>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="About you" description="Pre-filled from your account. Update anything that's changed." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Select id="bloodGroup" label="Blood group" value={v.bloodGroup} onChange={set("bloodGroup")} error={errors.bloodGroup}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
            <Input id="dateOfBirth" label="Date of birth" type="date" value={v.dateOfBirth} onChange={set("dateOfBirth")} error={errors.dateOfBirth} />
            <Select id="gender" label="Gender" value={v.gender} onChange={set("gender")} error={errors.gender}>
              <option value="">Choose</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
            <Input id="weight" label="Weight (kg)" inputMode="numeric" value={v.weight} onChange={set("weight")} error={errors.weight} hint="Donors usually weigh at least 50 kg." />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Location and contact" description="Others only see your area and distance." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Select id="city" label="City" value={v.city} onChange={set("city")} error={errors.city}>
              {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select id="area" label="Area" value={v.area} onChange={set("area")} error={errors.area}>
              <option value="">Choose an area</option>
              {(CITIES[v.city] ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Textarea id="address" label="Address" optional rows={2} value={v.address} onChange={set("address")} wrapperClassName="sm:col-span-2" hint="Private. Never shown on your donor card." />
            <Select id="availability" label="Availability" value={v.availability} onChange={set("availability")}>
              <option value="available">Available to donate</option>
              <option value="temporarily_unavailable">Temporarily unavailable</option>
              <option value="unavailable">Unavailable</option>
            </Select>
            <Select id="contact" label="Preferred contact method" value={v.contact} onChange={set("contact")}>
              <option value="phone">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Donation history and health" description="Answer honestly. This only guides you and is never shared with requesters." />
          <CardBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="lastDonation" label="Last donation date" type="date" value={v.lastDonation} disabled={v.neverDonated === "yes"} onChange={set("lastDonation")} error={errors.lastDonation} />
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink-700">
                <input type="checkbox" className="h-4 w-4 rounded border-ink-300 text-hemo-600 focus:ring-hemo-500" checked={v.neverDonated === "yes"} onChange={(e) => { setV((p) => ({ ...p, neverDonated: e.target.checked ? "yes" : "", lastDonation: "" })); setErrors((x) => ({ ...x, lastDonation: undefined })); }} />
                I&apos;ve never donated blood
              </label>
            </div>
            <Field id="answers" label="Health questions" error={errors.answers}>
              <ul className="divide-y divide-line rounded border border-line">
                {QUESTIONS.map((q) => (
                  <li key={q.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span id={`q-${q.key}`} className="text-sm text-ink-800">{q.q}</span>
                    <div role="radiogroup" aria-labelledby={`q-${q.key}`} className="flex shrink-0 gap-1.5">
                      {[true, false].map((val) => {
                        const selected = answers[q.key] === val;
                        return (
                          <button
                            key={String(val)}
                            id={`q-${q.key}-${val ? "yes" : "no"}`}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => { setAnswers((a) => ({ ...a, [q.key]: val })); setErrors((x) => ({ ...x, answers: undefined })); }}
                            className={cn(
                              "h-8 min-w-[3.5rem] rounded border px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500",
                              selected ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-ink-700 hover:bg-ink-50",
                            )}
                          >
                            {val ? "Yes" : "No"}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader title="Your eligibility" as="h3" />
          <CardBody>
            {showResult ? (
              <EligibilityResultCard result={result} />
            ) : (
              <p className="text-sm text-ink-500">Enter your weight and answer the health questions to see whether you&apos;re likely to be able to donate.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2 text-[13px] text-ink-600">
            <p className="font-semibold text-ink-900">What donors usually need</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Aged 18 to 60</li>
              <li>Weight 50 kg or more</li>
              <li>90 days since your last whole-blood donation</li>
              <li>Your CNIC on the day</li>
            </ul>
          </CardBody>
        </Card>
        <Button type="submit" className="w-full" loading={loading} loadingText="Registering…">Register as a donor</Button>
      </div>
    </form>
  );
}
