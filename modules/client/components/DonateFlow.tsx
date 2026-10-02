"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, CalendarCheck, Check, Clock, MapPin, Phone } from "lucide-react";
import type { Donation, EligibilityResult, FacilityType, Hospital } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { EligibilityResultCard } from "@/components/blood/EligibilityResult";
import { donationService } from "@/services/donationService";
import { formatDistance } from "@/lib/geo";
import { addDays, cn, formatDate, formatTime12, joinPlace } from "@/lib/utils";

const STEPS = ["Eligibility", "Donation centre", "Appointment", "Confirmation"] as const;
const CHECKS = [
  "I am between 18 and 60 years old",
  "I weigh at least 50 kg",
  "I feel well today and have no fever or cold",
  "I have eaten a meal in the last 4 hours",
  "I will bring my CNIC",
];
/** Pakistan time. Values stay 24-hour for the server; people see 12-hour AM/PM. 12:30–2:00 PM is the lunch break. */
const TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"];
const TYPE_LABEL: Record<FacilityType, string> = { hospital: "Hospital", blood_bank: "Blood bank", donation_center: "Donation centre" };

interface Props { sites: Hospital[]; eligibility: EligibilityResult; today: string }

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Current time in Pakistan as "YYYY-MM-DD" and "HH:MM", so slots that have already passed today can be disabled. */
function nowInPakistan() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function DonateFlow({ sites, eligibility, today }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [type, setType] = useState<FacilityType | "all">("all");
  const [centerId, setCenterId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [err, setErr] = useState<{ center?: string; date?: string; time?: string; checks?: string }>({});
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState<Donation | null>(null);

  const earliest = useMemo(() => {
    const t = new Date(today);
    const e = eligibility.daysUntilEligible > 0 ? addDays(t, eligibility.daysUntilEligible) : addDays(t, 1);
    return isoDate(e);
  }, [today, eligibility.daysUntilEligible]);
  const latest = isoDate(addDays(new Date(today), 60));

  const shown = sites.filter((s) => type === "all" || s.type === type);
  const center = sites.find((s) => s.id === centerId);

  function next() {
    if (step === 0) {
      if (!checked.every(Boolean)) return setErr({ checks: "Confirm each item. If one doesn't apply to you, speak to the centre before booking." });
    }
    if (step === 1 && !centerId) return setErr({ center: "Choose where you'd like to donate." });
    setErr({});
    setStep((s) => s + 1);
  }

  async function book() {
    const e: typeof err = {};
    const pk = nowInPakistan();
    if (!date) e.date = "Choose a date.";
    else if (date < earliest) e.date = `The earliest date you can book is ${formatDate(earliest)}.`;
    else if (date > latest) e.date = "Appointments open up to 60 days ahead.";
    if (!time) e.time = "Choose a time.";
    else if (date === pk.date && time <= pk.time) e.time = "That time has already passed. Choose a later slot.";
    setErr(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const d = await donationService.bookAppointment({ centerId, date, time });
      setBooked(d);
      setStep(3);
      toast.success("Your donation appointment has been scheduled.");
      router.refresh();
    } catch (err) {
      toast.error("Unable to book your appointment", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s} className="min-w-0" aria-current={i === step ? "step" : undefined}>
            <div className={cn("h-1 rounded-full", i <= step ? "bg-hemo-600" : "bg-ink-100")} />
            <p className={cn("mt-2 truncate text-xs font-medium sm:text-[13px]", i === step ? "text-ink-900" : "text-ink-400")}>
              <span className="sm:hidden">{i + 1}. </span><span className="hidden sm:inline">{i + 1}. {s}</span><span className="sm:hidden">{s.split(" ")[0]}</span>
            </p>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader title="Before you book" description="Quick checks so your visit isn't wasted." />
          <CardBody className="space-y-5">
            <EligibilityResultCard result={eligibility} />
            <fieldset>
              <legend className="mb-2 text-[13px] font-semibold text-ink-800">Donation checklist</legend>
              <ul className="space-y-2">
                {CHECKS.map((c, i) => (
                  <li key={c}>
                    <label className="flex cursor-pointer items-center gap-3 rounded border border-line px-3 py-2.5 text-sm text-ink-800 hover:bg-paper has-[:checked]:border-ink-300 has-[:checked]:bg-paper">
                      <input type="checkbox" className="h-4 w-4 rounded border-ink-300 text-hemo-600 focus:ring-hemo-500" checked={checked[i]} onChange={(e) => { setChecked((xs) => xs.map((x, j) => (j === i ? e.target.checked : x))); setErr({}); }} />
                      {c}
                    </label>
                  </li>
                ))}
              </ul>
              {err.checks && <p className="mt-2 text-[13px] text-hemo-700" role="alert">{err.checks}</p>}
            </fieldset>
            <div className="flex justify-end"><Button onClick={next}>Continue</Button></div>
          </CardBody>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader title="Choose a donation centre" description="Sorted by distance from your area." action={
            <Segmented<FacilityType | "all">
              label="Facility type"
              value={type}
              onChange={setType}
              items={[{ value: "all", label: "All" }, { value: "hospital", label: "Hospitals" }, { value: "blood_bank", label: "Banks" }, { value: "donation_center", label: "Centres" }]}
            />
          } />
          <CardBody className="space-y-4">
            <div role="radiogroup" aria-label="Donation centre" className="grid gap-3 md:grid-cols-2">
              {shown.map((s) => {
                const sel = s.id === centerId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => { setCenterId(s.id); setErr({}); }}
                    className={cn("relative rounded-card border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500", sel ? "border-ink-900 bg-paper ring-1 ring-ink-900" : "border-line bg-white hover:border-ink-200")}
                  >
                    {sel && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-ink-900 text-white"><Check className="h-3 w-3" aria-hidden /></span>}
                    <p className="pr-6 text-sm font-semibold text-ink-900">{s.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge tone="muted" dot={false}>{TYPE_LABEL[s.type]}</Badge>
                      {s.distanceKm !== undefined && <Badge tone="neutral" dot={false}>{formatDistance(s.distanceKm)}</Badge>}
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-[13px] text-ink-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{joinPlace(s.address, s.area, s.city)}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-500"><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />{s.openingHours}</p>
                  </button>
                );
              })}
            </div>
            {err.center && <p className="text-[13px] text-hemo-700" role="alert">{err.center}</p>}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={next}>Continue</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && center && (
        <Card>
          <CardHeader title="Pick a date and time" description={center.name} />
          <CardBody className="space-y-5">
            {eligibility.daysUntilEligible > 0 && (
              <Alert tone="warn">Your usual 90-day interval ends on {formatDate(earliest)}, so dates before then aren&apos;t available.</Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="date" label="Date" type="date" min={earliest} max={latest} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); setErr((x) => ({ ...x, date: undefined })); }} error={err.date} />
              <Select id="time" label="Time" value={time} onChange={(e) => { setTime(e.target.value); setErr((x) => ({ ...x, time: undefined })); }} error={err.time} hint="Pakistan time. Closed 12:30 to 2:00 PM for lunch.">
                <option value="">Choose a time</option>
                {TIMES.map((t) => {
                  const pk = nowInPakistan();
                  const past = date === pk.date && t <= pk.time;
                  return <option key={t} value={t} disabled={past}>{formatTime12(t)}{past ? " (passed)" : ""}</option>;
                })}
              </Select>
              <Input id="location" label="Location" value={joinPlace(center.address, center.area, center.city)} readOnly wrapperClassName="sm:col-span-2" />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={book} loading={loading} loadingText="Booking appointment…" icon={<CalendarCheck className="h-4 w-4" aria-hidden />}>Book appointment</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && booked && center && (
        <Card>
          <CardBody className="space-y-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ok-50 text-ok-700"><CalendarCheck className="h-7 w-7" aria-hidden /></div>
            <div>
              <h2 className="text-xl font-semibold text-ink-900">Your donation appointment has been scheduled.</h2>
              <p className="mt-1 text-sm text-ink-500">We&apos;ll send a reminder the day before.</p>
            </div>
            <dl className="mx-auto grid max-w-lg gap-3 rounded-card border border-line bg-paper p-4 text-left text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-ink-400">Date</dt><dd className="font-medium text-ink-900">{formatDate(date)}</dd></div>
              <div><dt className="text-xs text-ink-400">Time</dt><dd className="font-medium text-ink-900">{formatTime12(time)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink-400">Location</dt><dd className="flex items-start gap-1.5 font-medium text-ink-900"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden />{joinPlace(center.name, center.address, center.area, center.city)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink-400">Centre phone</dt><dd className="flex items-center gap-1.5 font-medium text-ink-900"><Phone className="h-4 w-4 text-ink-400" aria-hidden />{center.phone}</dd></div>
            </dl>
            <p className="mx-auto max-w-md text-[13px] text-ink-500">Drink plenty of water, eat a proper meal and bring your CNIC. Screening staff will confirm your eligibility on arrival.</p>
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href="/dashboard/donations">View my donations</ButtonLink>
              <ButtonLink href="/dashboard" variant="outline">Back to dashboard</ButtonLink>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}