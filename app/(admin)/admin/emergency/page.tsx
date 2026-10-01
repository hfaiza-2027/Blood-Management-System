import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { EmergencyBoard } from "@/modules/admin/components/EmergencyBoard";
import { bloodRequestService, isOpen } from "@/services/bloodRequestService";

export const metadata: Metadata = { title: "Emergency requests" };

export default async function EmergencyPage() {
  const rows = (await bloodRequestService.list())
    .filter((r) => isOpen(r) && r.urgency === "emergency")
    .sort((a, b) => +new Date(a.requiredBy) - +new Date(b.requiredBy));
  return (
    <>
      <PageHeader title="Emergency requests" description="Sorted by deadline. Alert donors early, and call the hospital blood bank if nothing moves within 30 minutes." breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Emergency requests" }]} />
      {rows.length > 0 && <Alert tone="danger" title={`${rows.length} emergencies open`} className="mb-6">Requests with under 3 hours remaining are highlighted in a darker red.</Alert>}
      <EmergencyBoard initial={rows} />
    </>
  );
}
