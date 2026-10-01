import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getSessionUserOrNull } from "@/lib/session";
import { notificationService } from "@/services/notificationService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Qatra" } };

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // redirect() works by throwing, so it must stay outside any try/catch.
  const user = await getSessionUserOrNull("user");
  if (!user) redirect("/auth/login?next=/dashboard");
  if (user.status === "suspended" || user.status === "inactive") redirect("/auth/login?suspended=1");
  const unread = await safe(notificationService.unreadCount(), 0);
  return (
    <AppShell variant="user" unread={unread} badges={{ "/dashboard/notifications": unread }} user={{ name: user.fullName, email: user.email, bloodGroup: user.bloodGroup, role: user.role }}>
      {children}
    </AppShell>
  );
}
