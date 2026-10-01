import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActivityLog } from "@/modules/admin/components/ActivityLog";
import { dashboardService } from "@/services/dashboardService";

export const metadata: Metadata = { title: "Activity log" };

export default async function ActivityPage() {
  const items = await dashboardService.activityLog();
  return (
    <>
      <PageHeader
        title="Activity log"
        description="Every change made by users, coordinators and the system."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Activity log" }]}
      />
      <ActivityLog items={items} />
    </>
  );
}
