import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminSettings, type StoredSettings } from "@/modules/admin/components/AdminSettings";
import { systemService } from "@/services/systemService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "System settings" };

export default async function AdminSettingsPage() {
  const [initial, status] = await Promise.all([safe(systemService.getSettings<StoredSettings>(), null), safe(systemService.status(), null)]);
  return (
    <>
      <PageHeader
        title="System settings"
        description="Network-wide rules for matching, alerts and verification."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
      />
      <AdminSettings initial={initial} status={status} />
    </>
  );
}
