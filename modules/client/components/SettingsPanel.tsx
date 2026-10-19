"use client";

import { useState } from "react";
import type { UserPreferences } from "@/types";
import { DEFAULT_PREFERENCES } from "@/types/user";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { AccountDetailsCard, ChangePasswordCard, SessionsCard, type AccountSummary } from "@/components/account/AccountForms";
import { userService } from "@/services/userService";

interface Props {
  account: AccountSummary;
  preferences?: Partial<UserPreferences>;
}

export function SettingsPanel({ account, preferences }: Props) {
  const toast = useToast();
  const [privacy, setPrivacy] = useState({ ...DEFAULT_PREFERENCES.privacy, ...(preferences?.privacy ?? {}) });
  const [notify, setNotify] = useState({ ...DEFAULT_PREFERENCES.notify, ...(preferences?.notify ?? {}) });

  /** Save one preference right away; put it back if the save fails. */
  function pref<K extends "privacy" | "notify">(group: K, key: string, label: string) {
    return async (v: boolean) => {
      const current = group === "privacy" ? privacy : notify;
      const next = { ...current, [key]: v };
      if (group === "privacy") setPrivacy(next as typeof privacy);
      else setNotify(next as typeof notify);
      try {
        await userService.updateSelf({ id: account.id, preferences: { privacy, notify, [group]: next } as UserPreferences });
        toast.info(`${label} ${v ? "turned on" : "turned off"}.`);
      } catch (err) {
        if (group === "privacy") setPrivacy(current as typeof privacy);
        else setNotify(current as typeof notify);
        toast.error(`Couldn't change ${label.toLowerCase()}.`, err instanceof Error ? err.message : "Please try again.");
      }
    };
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AccountDetailsCard account={account} />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Privacy" description="Control what other members can see." />
          <CardBody className="divide-y divide-line py-1">
            <Switch id="p-donor" label="Show me in donor search" description="Patients' families can find you by blood group and area." checked={privacy.donorVisible} onChange={pref("privacy", "donorVisible", "Donor visibility")} />
            <Switch id="p-contact" label="Share my phone after I accept a request" description="Otherwise coordinators relay messages for you." checked={privacy.contactVisible} onChange={pref("privacy", "contactVisible", "Contact sharing")} />
            <Switch id="p-loc" label="Show my area and distance" description="We never show your street address." checked={privacy.locationVisible} onChange={pref("privacy", "locationVisible", "Location visibility")} />
          </CardBody>
        </Card>
        <Card id="notifications">
          <CardHeader title="Notifications" description="Choose how we reach you." />
          <CardBody className="divide-y divide-line py-1">
            <Switch id="n-email" label="Email notifications" checked={notify.email} onChange={pref("notify", "email", "Email notifications")} />
            <Switch id="n-sms" label="SMS notifications" checked={notify.sms} onChange={pref("notify", "sms", "SMS notifications")} />
            <Switch id="n-emg" label="Emergency alerts" description="Urgent requests for compatible blood within 15 km." checked={notify.emergency} onChange={pref("notify", "emergency", "Emergency alerts")} />
            <Switch id="n-rem" label="Donation reminders" description="When you become eligible and before appointments." checked={notify.reminders} onChange={pref("notify", "reminders", "Donation reminders")} />
          </CardBody>
        </Card>
      </div>

      <ChangePasswordCard />
      <SessionsCard />
    </div>
  );
}
