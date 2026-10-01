"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Siren, Users } from "lucide-react";
import type { BloodGroup, BloodRequest, Hospital, Urgency } from "@/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { RequestStatusBadge } from "@/components/ui/StatusBadge";
import { RequestTimeline } from "@/components/blood/RequestTimeline";
import { bloodRequestService } from "@/services/bloodRequestService";
import { BLOOD_GROUPS, CITY_NAMES, URGENCY_META, canReceiveFrom } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { cn, formatDateTime } from "@/lib/utils";

type Values = {
  bloodGroup: string; unitsRequired: string; patientName: string; patientAge: string;
  hospitalId: string; hospitalAddress: string; city: string; requiredDate: string; requiredTime: string;
  urgency: string; reason: string; contactNumber: string; notes: string;
};

interface Props {
  hospitals: Hospital[];
  initialUrgency: Urgency;
  requester: { id: string; name: string; phone: string };
}

export function RequestBloodForm({ hospitals, initialUrgency, requester }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [v, setV] = useState<Values>({
    bloodGroup: "", unitsRequired: "1", patientName: "", patientAge: "", hospitalId: "", hospitalAddress: "", city: "Lahore",
    requiredDate: "", requiredTime: "", urgency: initialUrgency, reason: "", contactNumber: requester.phone, notes: "",
  });
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<BloodRequest | null>(null);

  const cityHospitals = useMemo(() => hospitals.filter((h) => h.city === v.city), [hospitals, v.city]);
  const emergency = v.urgency === "emergency";

  function set<K extends keyof Values>(k: K) {
    return (e: { target: { value: string } }) => {
      const value = e.target.value;
      setV((p) => {
        const next = { ...p, [k]: value };
        if (k === "hospitalId") next.hospitalAddress = hospitals.find((h) => h.id === value)?.address ?? "";
        if (k === "city") {
          next.hospitalId = "";
          next.hospitalAddress = "";
        }
        return next;
      });
      if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(v, {
      bloodGroup: [rules.bloodGroup()],
      unitsRequired: [rules.intRange("Units", 1, 10)],
      patientName: [rules.required("the patient's name")],
      patientAge: [rules.intRange("Patient age", 0, 120)],
      hospitalId: [rules.required("the hospital")],
      city: [rules.required("the city")],
      requiredDate: [rules.futureDate("the date needed")],
      reason: [rules.required("the reason")],
      contactNumber: [rules.required("a contact number"), rules.phone()],
    });
    setErrors(errs);
    if (hasErrors(errs)) {
      const first = Object.keys(errs)[0];
      document.getElementById(first)?.focus();
      return;
    }
    setLoading(true);
    try {
      const req = await bloodRequestService.create(
        {
          bloodGroup: v.bloodGroup as BloodGroup,
          unitsRequired: Number(v.unitsRequired),
          patientName: v.patientName,
          patientAge: Number(v.patientAge),
          hospitalId: v.hospitalId,
          hospitalAddress: v.hospitalAddress,
          city: v.city,
          requiredBy: new Date(`${v.requiredDate}T${v.requiredTime || "23:59"}`).toISOString(),
          urgency: v.urgency as Urgency,
          reason: v.reason,
          contactNumber: v.contactNumber,
          notes: v.notes || undefined,
        },
        requester,
      );
      setCreated(req);
      toast.success("Blood request created successfully.", `${req.code} is pending review.`);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("Unable to create your request", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    const donors = canReceiveFrom(created.bloodGroup);
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Request ${created.code} submitted`} description={`Created ${formatDateTime(created.createdAt)}`} action={<RequestStatusBadge status={created.status} />} />
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 rounded bg-paper p-4">
              <BloodGroupBadge group={created.bloodGroup} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{created.unitsRequired} unit{created.unitsRequired > 1 && "s"} for {created.patientName}</p>
                <p className="text-sm text-ink-500">{created.hospitalName}, needed by {formatDateTime(created.requiredBy)}</p>
              </div>
            </div>
            <div>
              <h2 className="mb-4 text-sm font-semibold text-ink-900">What happens next</h2>
              <RequestTimeline request={created} />
            </div>
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Alert tone={created.urgency === "emergency" ? "danger" : "info"} title={created.urgency === "emergency" ? "Coordinators are reviewing now" : "Review usually takes under 30 minutes"}>
            We&apos;ll alert donors with {donors.join(", ")} near the hospital once it&apos;s approved. You&apos;ll get a notification each time a donor responds.
          </Alert>
          <div className="grid gap-2">
            <ButtonLink href={`/dashboard/donors?group=${encodeURIComponent(created.bloodGroup)}&compatible=1`} icon={<Users className="h-4 w-4" aria-hidden />}>Find donors yourself</ButtonLink>
            <ButtonLink href="/dashboard/requests" variant="outline">Go to my requests</ButtonLink>
            <Button variant="ghost" onClick={() => setCreated(null)}>Create another request</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader title="How urgent is it?" as="h2" />
          <CardBody>
            <fieldset>
              <legend className="sr-only">Urgency</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(URGENCY_META) as Urgency[]).map((u) => {
                  const on = v.urgency === u;
                  return (
                    <label
                      key={u}
                      className={cn(
                        "flex cursor-pointer flex-col rounded-card border p-4 focus-within:ring-2 focus-within:ring-hemo-500",
                        on ? (u === "emergency" ? "border-hemo-600 bg-hemo-600 text-white" : "border-ink-900 bg-ink-900 text-white") : "border-line hover:border-ink-300",
                      )}
                    >
                      <input type="radio" name="urgency" value={u} checked={on} onChange={set("urgency")} className="sr-only" />
                      <span className="flex items-center gap-2 font-semibold">
                        {u === "emergency" && <Siren className="h-4 w-4" aria-hidden />}
                        {URGENCY_META[u].label}
                      </span>
                      <span className={cn("mt-1 text-[13px]", on ? "text-white/80" : "text-ink-500")}>{URGENCY_META[u].description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {emergency && (
              <Alert tone="danger" title="Emergency requests alert every compatible donor within 15 km" className="mt-4">
                Use this only when blood is needed within hours. If the patient is in immediate danger, also call the hospital&apos;s blood bank directly.
              </Alert>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Patient and blood" as="h2" />
          <CardBody className="space-y-5">
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-semibold text-ink-800">Blood group needed <span className="text-hemo-600" aria-hidden>*</span></legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {BLOOD_GROUPS.map((g) => (
                  <label key={g} className={cn("flex h-11 cursor-pointer items-center justify-center rounded border text-sm font-bold tabular-nums focus-within:ring-2 focus-within:ring-hemo-500", v.bloodGroup === g ? "border-hemo-600 bg-hemo-600 text-white" : "border-line text-ink-800 hover:border-ink-300")}>
                    <input id={g === "A+" ? "bloodGroup" : undefined} type="radio" name="bloodGroup" value={g} checked={v.bloodGroup === g} onChange={set("bloodGroup")} className="sr-only" />
                    {g}
                  </label>
                ))}
              </div>
              {errors.bloodGroup && <p className="mt-1.5 text-[13px] text-hemo-700" role="alert">{errors.bloodGroup}</p>}
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-3">
              <Input id="unitsRequired" label="Units required" type="number" min={1} max={10} inputMode="numeric" value={v.unitsRequired} onChange={set("unitsRequired")} error={errors.unitsRequired} hint="1 unit ≈ 450 ml" required />
              <Input id="patientName" label="Patient name" value={v.patientName} onChange={set("patientName")} error={errors.patientName} required wrapperClassName="sm:col-span-2" />
              <Input id="patientAge" label="Patient age" type="number" min={0} max={120} inputMode="numeric" value={v.patientAge} onChange={set("patientAge")} error={errors.patientAge} required />
              <Input id="reason" label="Reason" placeholder="e.g. Caesarean delivery, thalassaemia, surgery" value={v.reason} onChange={set("reason")} error={errors.reason} required wrapperClassName="sm:col-span-2" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Hospital and timing" as="h2" />
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <Select id="city" label="City" value={v.city} onChange={set("city")} error={errors.city} required>
              {CITY_NAMES.map((c) => <option key={c}>{c}</option>)}
            </Select>
            <Select id="hospitalId" label="Hospital" value={v.hospitalId} onChange={set("hospitalId")} error={errors.hospitalId} required>
              <option value="">Choose hospital</option>
              {cityHospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </Select>
            <Input id="hospitalAddress" label="Hospital address" value={v.hospitalAddress} onChange={set("hospitalAddress")} wrapperClassName="sm:col-span-2" hint="Filled in from the hospital you choose. Edit it to add a ward or floor." />
            <Input id="requiredDate" label="Needed by (date)" type="date" value={v.requiredDate} onChange={set("requiredDate")} error={errors.requiredDate} required />
            <Input id="requiredTime" label="Time" type="time" optional value={v.requiredTime} onChange={set("requiredTime")} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contact" as="h2" description="Shared only with donors who accept your request." />
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <Input id="contactNumber" label="Contact number" type="tel" value={v.contactNumber} onChange={set("contactNumber")} error={errors.contactNumber} required />
            <Textarea id="notes" label="Additional notes" optional rows={3} value={v.notes} onChange={set("notes")} placeholder="Ward, bed number, who to ask for at the blood bank" wrapperClassName="sm:col-span-2" />
          </CardBody>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Summary" as="h2" />
          <CardBody className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              {v.bloodGroup ? <BloodGroupBadge group={v.bloodGroup as BloodGroup} size="lg" /> : <span className="flex h-12 w-16 items-center justify-center rounded-md border-2 border-dashed border-line text-ink-300">?</span>}
              <div>
                <p className="font-semibold text-ink-900">{v.unitsRequired || "–"} unit{v.unitsRequired !== "1" && "s"}</p>
                <p className="text-ink-500">{URGENCY_META[v.urgency as Urgency].label}</p>
              </div>
            </div>
            {v.bloodGroup && (
              <p className="text-ink-600">
                Compatible donors: <span className="font-medium text-ink-900">{canReceiveFrom(v.bloodGroup as BloodGroup).join(", ")}</span>
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Submitting request…">
              {emergency ? "Submit emergency request" : "Submit request"}
            </Button>
            <p className="text-xs leading-relaxed text-ink-400">
              By submitting, you confirm the details are accurate. False requests lead to account suspension. <Link href="/faq#requests" className="underline">How requests work</Link>
            </p>
          </CardBody>
        </Card>
      </aside>
    </form>
  );
}
