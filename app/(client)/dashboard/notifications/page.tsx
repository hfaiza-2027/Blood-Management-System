import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { NotificationCenter } from "@/modules/client/components/NotificationCenter";
import { notificationService } from "@/services/notificationService";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const items = await notificationService.list();
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Emergency alerts near you, updates on your requests, and reminders."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notifications" }]}
        actions={<ButtonLink href="/dashboard/settings#notifications" variant="outline">Notification settings</ButtonLink>}
      />
      <NotificationCenter initial={items} />
    </>
  );
}
