import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsPanel } from "@/modules/client/components/SettingsPanel";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Account, privacy, notifications and security."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <SettingsPanel account={{ id: user.id, name: user.fullName, email: user.email, phone: user.phone }} preferences={user.preferences} />
    </>
  );
}
