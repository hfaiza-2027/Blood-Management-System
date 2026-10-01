import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionUserOrNull } from "@/lib/session";
import { notificationService } from "@/services/notificationService";
import { bloodRequestService } from "@/services/bloodRequestService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Qatra Admin" } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // redirect() works by throwing, so it must stay outside any try/catch.
  const user = await getSessionUserOrNull("admin");
  if (!user) redirect("/auth/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");
  const [unread, emergencies] = await Promise.all([safe(notificationService.unreadCount(), 0), safe(bloodRequestService.openEmergencyCount(), 0)]);
  return (
    <AppShell variant="admin" unread={unread} badges={{ "/admin/emergency": emergencies }} user={{ name: user.fullName, email: user.email, role: user.role }}>
      {children}
    </AppShell>
  );
}
