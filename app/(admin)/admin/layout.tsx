import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionUserOrNull } from "@/lib/session";
import { notificationService } from "@/services/notificationService";
import { bloodRequestService } from "@/services/bloodRequestService";
import { contactService } from "@/services/contactService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | BloodBridge Admin" } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // redirect() works by throwing, so it must stay outside any try/catch.
  const user = await getSessionUserOrNull();
  if (!user) redirect("/auth/login?next=/admin");
  if (user.status === "suspended" || user.status === "inactive") redirect("/auth/login?suspended=1");
  if (user.role !== "admin") redirect("/dashboard");
  const [unread, emergencies, newMessages] = await Promise.all([
    safe(notificationService.unreadCount(), 0),
    safe(bloodRequestService.openEmergencyCount(), 0),
    safe(contactService.newCount(), 0),
  ]);
  return (
    <AppShell
      variant="admin"
      unread={unread + newMessages}
      badges={{ "/admin/emergency": emergencies, "/admin/inbox": unread + newMessages }}
      user={{ name: user.fullName, email: user.email, role: user.role }}
    >
      {children}
    </AppShell>
  );
}
