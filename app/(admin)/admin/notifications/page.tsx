import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { BroadcastPanel } from "@/modules/admin/components/BroadcastPanel";
import { notificationService } from "@/services/notificationService";
import { safe, USE_MOCKS } from "@/services/client";

export const metadata: Metadata = { title: "Notifications" };

export default async function AdminNotificationsPage() {
  // Demo mode keeps the sample history; live mode shows what was actually sent.
  const history = USE_MOCKS ? undefined : await safe(notificationService.broadcastHistory(), []);
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Send announcements and targeted appeals to donors."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Notifications" }]}
      />
      <BroadcastPanel initialHistory={history} />
    </>
  );
}
