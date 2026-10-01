import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequestsManager } from "@/modules/admin/components/RequestsManager";
import { bloodRequestService } from "@/services/bloodRequestService";

export const metadata: Metadata = { title: "Blood requests" };

export default async function AdminRequestsPage() {
  const requests = await bloodRequestService.list();
  return (
    <>
      <PageHeader title="Blood requests" description="Review new requests, assign donors and keep every request moving until it's fulfilled." breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Blood requests" }]} />
      <RequestsManager initial={requests} />
    </>
  );
}
