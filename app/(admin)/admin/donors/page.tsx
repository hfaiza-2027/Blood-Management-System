import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { DonorsManager } from "@/modules/admin/components/DonorsManager";
import { donorService } from "@/services/donorService";

export const metadata: Metadata = { title: "Donors" };

export default async function AdminDonorsPage() {
  const donors = await donorService.list();
  return (
    <>
      <PageHeader title="Donors" description="Verify donor details, manage availability and contact donors on behalf of patients." breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Donors" }]} />
      <DonorsManager initial={donors} />
    </>
  );
}
