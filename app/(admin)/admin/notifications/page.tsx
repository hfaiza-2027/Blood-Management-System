import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { BroadcastPanel } from "@/modules/admin/components/BroadcastPanel";
import { notificationService } from "@/services/notificationService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "Broadcasts" };

export default async function AdminBroadcastsPage() {
  const history = await safe(notificationService.broadcastHistory(), []);
  return (
    <>
      <PageHeader
        title="Broadcasts"
        description="Send announcements and targeted appeals to members and donors."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Broadcasts" }]}
      />
      <BroadcastPanel initialHistory={history} />
    </>
  );
}
