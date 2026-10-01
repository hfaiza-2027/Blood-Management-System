"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Trash2 } from "lucide-react";
import type { User } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Progress } from "@/components/ui/Progress";
import { Alert } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";
import { AvailabilityToggle } from "@/modules/client/components/Actions";
import { userService } from "@/services/userService";
import { BLOOD_GROUPS, CITIES, CITY_NAMES } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";

type Values = {
  fullName: string; email: string; phone: string; bloodGroup: string; city: string; area: string; address: string;
  ecName: string; ecPhone: string; ecRelation: string;
};

const MAX_BYTES = 2 * 1024 * 1024;

export function ProfileForm({ user, showDonorPrompt, availability }: { user: User; showDonorPrompt: boolean; availability?: "available" | "unavailable" | "temporarily_unavailable" | null }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(user.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors<Values>>({});
  const [v, setV] = useState<Values>({
    fullName: user.fullName, email: user.email, phone: user.phone, bloodGroup: user.bloodGroup,
    city: user.location.city, area: user.location.area, address: user.address ?? "",
    ecName: user.emergencyContact?.name ?? "", ecPhone: user.emergencyContact?.phone ?? "", ecRelation: user.emergencyContact?.relation ?? "",
  });

  useEffect(() => () => {
    if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
  }, [photo]);

  const completion = useMemo(() => {
    const checks = [v.fullName, v.email, v.phone, v.bloodGroup, v.city, v.area, v.address, v.ecName && v.ecPhone, photo, user.verified ? "y" : ""];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [v, photo, user.verified]);

  const missing = [
    !photo && "a profile photo",
    !v.address && "your address",
    !(v.ecName && v.ecPhone) && "an emergency contact",
  ].filter(Boolean) as string[];

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    setV((p) => ({ ...p, [k]: e.target.value, ...(k === "city" ? { area: "" } : {}) }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Choose an image file (JPG or PNG).");
    if (f.size > MAX_BYTES) return toast.error("That photo is larger than 2 MB.", "Choose a smaller image.");
    setPhoto(URL.createObjectURL(f));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(v, {
      fullName: [rules.required("your full name")],
      email: [rules.required("your email"), rules.email()],
      phone: [rules.required("your phone number"), rules.phone()],
      bloodGroup: [rules.bloodGroup()],
      city: [rules.required("your city")],
      area: [rules.required("your area")],
      ...(v.ecPhone ? { ecPhone: [rules.phone()] } : {}),
      ...(v.ecPhone || v.ecRelation ? { ecName: [rules.required("the contact's name")] } : {}),
    });
    setErrors(errs);
    if (hasErrors(errs)) {
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }
    setSaving(true);
    try {
      await userService.update({
        ...user, fullName: v.fullName, email: v.email, phone: v.phone, bloodGroup: v.bloodGroup as User["bloodGroup"], address: v.address,
        location: { ...user.location, city: v.city, area: v.area },
        emergencyContact: v.ecName ? { name: v.ecName, phone: v.ecPhone, relation: v.ecRelation } : undefined,
      });
      toast.success("Profile updated.");
      router.refresh();
    } catch (err) {
      toast.error("Unable to save your profile.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:order-2">
        <Card>
          <CardBody className="flex flex-col items-center text-center">
            <div className="relative">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not optimisable
                <img src={photo} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-card" />
              ) : (
                <Avatar name={v.fullName || user.fullName} size="xl" />
              )}
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500 focus-visible:ring-offset-2" aria-label="Change profile photo">
                <Camera className="h-4 w-4" aria-hidden />
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onPhoto} tabIndex={-1} aria-hidden />
            </div>
            <p className="mt-3 font-semibold text-ink-900">{v.fullName}</p>
            <p className="text-sm text-ink-500">{v.area}{v.area && ", "}{v.city}</p>
            {photo && (
              <button type="button" onClick={() => setPhoto(null)} className="mt-2 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-hemo-700">
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove photo
              </button>
            )}
            <p className="mt-2 text-xs text-ink-400">JPG, PNG or WebP, up to 2 MB.</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-semibold text-ink-900">Profile completion</p>
              <p className="text-sm font-semibold tabular-nums text-ink-900">{completion}%</p>
            </div>
            <Progress value={completion} label="Profile completion" tone={completion === 100 ? "ok" : "hemo"} />
            <p className="mt-3 text-[13px] text-ink-500">
              {missing.length ? <>Add {missing.join(", ")} to reach 100%. Complete profiles are matched faster.</> : "Your profile is complete."}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Availability" as="h3" description="Tell requesters whether you can donate right now." />
          <CardBody>
            {availability ? (
              <AvailabilityToggle initial={availability} />
            ) : (
              <ButtonLink href="/dashboard/register-donor" size="sm" variant="outline">Register as a donor first</ButtonLink>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-2 lg:order-1">
        {showDonorPrompt && (
          <Alert tone="info" title="Finish setting up your donor profile" action={<ButtonLink href="/dashboard/register-donor" size="sm" variant="secondary">Register as donor</ButtonLink>}>
            Your account is ready. Add a few health details so we can match you with patients who need your blood group.
          </Alert>
        )}
        <Card>
          <CardHeader title="Personal details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Input id="fullName" label="Full name" value={v.fullName} onChange={set("fullName")} error={errors.fullName} autoComplete="name" wrapperClassName="sm:col-span-2" />
            <Input id="email" label="Email" type="email" value={v.email} readOnly disabled error={errors.email} autoComplete="email" hint="Your login email. Contact support to change it." />
            <Input id="phone" label="Phone" type="tel" value={v.phone} onChange={set("phone")} error={errors.phone} autoComplete="tel" hint="Private. Shared only when you accept a request." />
            <Select id="bloodGroup" label="Blood group" value={v.bloodGroup} onChange={set("bloodGroup")} error={errors.bloodGroup} hint="Changes are re-verified at your next donation.">
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Location" description="Only your area is visible to others. Your address stays private." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Select id="city" label="City" value={v.city} onChange={set("city")} error={errors.city}>
              {CITY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select id="area" label="Area" value={v.area} onChange={set("area")} error={errors.area}>
              <option value="">Choose an area</option>
              {(CITIES[v.city] ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
            <Textarea id="address" label="Address" optional rows={2} value={v.address} onChange={set("address")} wrapperClassName="sm:col-span-2" hint="Used only by coordinators for home-collection drives." />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Emergency contact" description="Someone we can reach if you feel unwell after donating." />
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <Input id="ecName" label="Name" value={v.ecName} onChange={set("ecName")} error={errors.ecName} />
            <Input id="ecPhone" label="Phone" type="tel" value={v.ecPhone} onChange={set("ecPhone")} error={errors.ecPhone} />
            <Input id="ecRelation" label="Relation" optional value={v.ecRelation} onChange={set("ecRelation")} />
          </CardBody>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="submit" loading={saving} loadingText="Saving profile…">Save profile</Button>
        </div>
      </div>
    </form>
  );
}
