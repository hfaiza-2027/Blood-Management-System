"use client";

import { useState, type FormEvent } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { Alert } from "@/components/ui/Alert";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { APP_NAME, DONATION_INTERVAL_DAYS } from "@/lib/constants";
import { hasErrors, rules, validate, type Errors } from "@/lib/validations";
import { systemService, type SystemStatus } from "@/services/systemService";
import { Database } from "lucide-react";

type General = { orgName: string; supportEmail: string; helpline: string; defaultCity: string };
type Matching = { radiusKm: string; emergencyRadiusKm: string; intervalDays: string; expireHours: string; maxAlerts: string };
type Flags = { manualApproval: boolean; requireVerifiedDonors: boolean; smsAlerts: boolean; whatsappAlerts: boolean; publicStats: boolean; maintenance: boolean };
export interface StoredSettings { general?: Partial<General>; matching?: Partial<Matching>; flags?: Partial<Flags> }

const DEFAULT_FLAGS: Flags = { manualApproval: true, requireVerifiedDonors: false, smsAlerts: true, whatsappAlerts: false, publicStats: true, maintenance: false };

export function AdminSettings({ initial, status }: { initial?: StoredSettings | null; status?: SystemStatus | null }) {
  const toast = useToast();
  const [general, setGeneral] = useState<General>({ orgName: `${APP_NAME} Blood Network`, supportEmail: "help@qatra.pk", helpline: "042 111 782 872", defaultCity: "Lahore", ...(initial?.general ?? {}) });
  const [matching, setMatching] = useState<Matching>({ radiusKm: "10", emergencyRadiusKm: "25", intervalDays: String(DONATION_INTERVAL_DAYS), expireHours: "72", maxAlerts: "3", ...(initial?.matching ?? {}) });
  const [counts, setCounts] = useState<SystemStatus | null>(status ?? null);
  const [seeding, setSeeding] = useState(false);
  const [gErr, setGErr] = useState<Errors<General>>({});
  const [mErr, setMErr] = useState<Errors<Matching>>({});
  const [flags, setFlags] = useState<Flags>({ ...DEFAULT_FLAGS, ...(initial?.flags ?? {}) });
  const [saving, setSaving] = useState<"general" | "matching" | null>(null);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);

  async function saveGeneral(e: FormEvent) {
    e.preventDefault();
    const errs = validate(general, { orgName: [rules.required("the organisation name")], supportEmail: [rules.required("a support email"), rules.email()], helpline: [rules.required("a helpline number")] });
    setGErr(errs);
    if (hasErrors(errs)) return;
    setSaving("general");
    try {
      await systemService.saveSettings({ general });
      toast.success("General settings saved.");
    } catch (err) {
      toast.error("Couldn't save settings.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function saveMatching(e: FormEvent) {
    e.preventDefault();
    const errs = validate(matching, {
      radiusKm: [rules.intRange("Search radius", 1, 50)],
      emergencyRadiusKm: [rules.intRange("Emergency radius", 1, 100)],
      intervalDays: [rules.intRange("Donation interval", 56, 180)],
      expireHours: [rules.intRange("Auto-expiry", 6, 240)],
      maxAlerts: [rules.intRange("Alerts per donor", 1, 10)],
    });
    if (!errs.emergencyRadiusKm && Number(matching.emergencyRadiusKm) < Number(matching.radiusKm)) errs.emergencyRadiusKm = "Emergency radius should be at least the normal search radius.";
    setMErr(errs);
    if (hasErrors(errs)) return;
    setSaving("matching");
    try {
      await systemService.saveSettings({ matching });
      toast.success("Matching rules updated.", "New requests will use these values.");
    } catch (err) {
      toast.error("Couldn't save matching rules.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function applyFlag(k: keyof Flags, v: boolean, label: string) {
    const prev = flags;
    const next = { ...flags, [k]: v };
    setFlags(next);
    try {
      await systemService.saveSettings({ flags: next });
      toast.info(`${label} ${v ? "turned on" : "turned off"}.`);
    } catch (err) {
      setFlags(prev);
      toast.error(`Couldn't change ${label.toLowerCase()}.`, err instanceof Error ? err.message : "Please try again.");
    }
  }

  const flag = (k: keyof Flags, label: string) => (v: boolean) => {
    if (k === "maintenance" && v) return setMaintenanceConfirm(true);
    void applyFlag(k, v, label);
  };

  async function seed() {
    setSeeding(true);
    try {
      const { written } = await systemService.seed();
      const parts = Object.entries(written).map(([k, n]) => `${n} ${k}`);
      toast.success(parts.length ? "Starter data loaded." : "Nothing to add.", parts.length ? parts.join(", ") : "Every starter collection already has data.");
      setCounts(await systemService.status().catch(() => counts));
    } catch (err) {
      toast.error("Couldn't load starter data.", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSeeding(false);
    }
  }

  const g = (k: keyof General) => (e: { target: { value: string } }) => setGeneral((s) => ({ ...s, [k]: e.target.value }));
  const m = (k: keyof Matching) => (e: { target: { value: string } }) => setMatching((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {flags.maintenance && (
        <Alert tone="warn" title="Maintenance mode is on" className="xl:col-span-2">
          Members can sign in and view data, but new requests and appointments are paused. Emergency requests still route to coordinators by phone.
        </Alert>
      )}

      <Card>
        <CardHeader title="General" description="Shown in emails, SMS and the public site footer." />
        <CardBody>
          <form onSubmit={saveGeneral} noValidate className="grid gap-4 sm:grid-cols-2">
            <Input id="s-org" label="Organisation name" required value={general.orgName} onChange={g("orgName")} error={gErr.orgName} wrapperClassName="sm:col-span-2" />
            <Input id="s-email" label="Support email" type="email" required value={general.supportEmail} onChange={g("supportEmail")} error={gErr.supportEmail} />
            <Input id="s-help" label="Helpline" type="tel" required value={general.helpline} onChange={g("helpline")} error={gErr.helpline} />
            <Select id="s-city" label="Default city" value={general.defaultCity} onChange={g("defaultCity")} hint="Used when a visitor's location is unknown.">
              {["Lahore", "Karachi", "Islamabad", "Faisalabad", "Sheikhupura"].map((c) => <option key={c}>{c}</option>)}
            </Select>
            <div className="flex items-end sm:justify-end">
              <Button type="submit" loading={saving === "general"} loadingText="Saving…">Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Matching rules" description="How requests reach donors." />
        <CardBody>
          <form onSubmit={saveMatching} noValidate className="grid gap-4 sm:grid-cols-2">
            <Input id="s-radius" label="Search radius (km)" inputMode="numeric" value={matching.radiusKm} onChange={m("radiusKm")} error={mErr.radiusKm} />
            <Input id="s-eradius" label="Emergency radius (km)" inputMode="numeric" value={matching.emergencyRadiusKm} onChange={m("emergencyRadiusKm")} error={mErr.emergencyRadiusKm} />
            <Input id="s-interval" label="Days between donations" inputMode="numeric" value={matching.intervalDays} onChange={m("intervalDays")} error={mErr.intervalDays} hint="Whole blood. Follow your medical director's guidance." />
            <Input id="s-expire" label="Auto-expire requests after (hours)" inputMode="numeric" value={matching.expireHours} onChange={m("expireHours")} error={mErr.expireHours} />
            <Input id="s-alerts" label="Max alerts per donor per week" inputMode="numeric" value={matching.maxAlerts} onChange={m("maxAlerts")} error={mErr.maxAlerts} />
            <div className="flex items-end sm:justify-end">
              <Button type="submit" loading={saving === "matching"} loadingText="Saving…">Save rules</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Review and verification" />
        <CardBody className="space-y-5">
          <Switch id="f-approval" label="Approve requests before donors are alerted" description="Coordinators check hospital details first. Emergencies skip the queue." checked={flags.manualApproval} onChange={flag("manualApproval", "Manual approval")} />
          <Switch id="f-verified" label="Only alert verified donors" description="Fewer alerts, higher show-up rate. Slower in small cities." checked={flags.requireVerifiedDonors} onChange={flag("requireVerifiedDonors", "Verified-only alerts")} />
          <Switch id="f-stats" label="Show live stock on the public site" description="Group-level totals only, never facility-level numbers." checked={flags.publicStats} onChange={flag("publicStats", "Public stock board")} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Channels and system" />
        <CardBody className="space-y-5">
          <Switch id="f-sms" label="SMS alerts" description="Used for emergency requests and appointment reminders." checked={flags.smsAlerts} onChange={flag("smsAlerts", "SMS alerts")} />
          <Switch id="f-wa" label="WhatsApp alerts" description="Requires an approved WhatsApp Business template." checked={flags.whatsappAlerts} onChange={flag("whatsappAlerts", "WhatsApp alerts")} />
          <Switch id="f-maint" label="Maintenance mode" description="Pause new requests and bookings while you make changes." checked={flags.maintenance} onChange={flag("maintenance", "Maintenance mode")} />
        </CardBody>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader title="Starter data" description="Partner facilities, blood stock and cities used across the app. Only empty collections are filled; nothing is overwritten." />
        <CardBody className="space-y-4">
          {counts ? (
            <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 text-sm min-[420px]:grid-cols-3 lg:grid-cols-6">
              {([["hospitals", "Facilities"], ["inventory", "Stock rows"], ["locations", "Cities"], ["users", "Users"], ["donors", "Donors"], ["bloodRequests", "Requests"]] as const).map(([k, l]) => (
                <div key={k} className="min-w-0 rounded-md border border-line bg-paper px-3 py-2">
                  <dt className="truncate text-xs text-ink-500">{l}</dt>
                  <dd className="text-lg font-semibold tabular-nums text-ink-900">{counts[k]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-ink-500">Load the starter set if Hospitals, Inventory or Donate show nothing yet.</p>
          )}
          <Button variant="outline" icon={<Database className="h-4 w-4" aria-hidden />} loading={seeding} loadingText="Loading…" onClick={seed} className="w-full sm:w-auto">
            Load starter data
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={maintenanceConfirm}
        title="Turn on maintenance mode?"
        description="New blood requests and donation bookings will be paused for everyone until you turn it off."
        confirmLabel="Turn on"
        cancelLabel="Cancel"
        onConfirm={() => { setMaintenanceConfirm(false); void applyFlag("maintenance", true, "Maintenance mode"); }}
        onCancel={() => setMaintenanceConfirm(false)}
      />
    </div>
  );
}