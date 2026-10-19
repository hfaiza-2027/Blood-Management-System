import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminInbox } from "@/modules/admin/components/AdminInbox";
import { contactService } from "@/services/contactService";
import { notificationService } from "@/services/notificationService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "Inbox" };

export default async function AdminInboxPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const [messages, notifications] = await Promise.all([safe(contactService.list(), []), safe(notificationService.list(), [])]);
  return (
    <>
      <PageHeader
        title="Inbox"
        description="Messages from the contact page and notifications sent to your account."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Inbox" }]}
      />
      <AdminInbox messages={messages} notifications={notifications} initialTab={tab === "notifications" ? "notifications" : "messages"} />
    </>
  );
}
