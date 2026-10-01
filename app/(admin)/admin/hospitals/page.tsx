import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { HospitalsManager } from "@/modules/admin/components/HospitalsManager";
import { hospitalService } from "@/services/hospitalService";

export const metadata: Metadata = { title: "Hospitals & blood banks" };

export default async function HospitalsPage() {
  const rows = await hospitalService.list();
  return (
    <>
      <PageHeader
        title="Hospitals & blood banks"
        description="Partner facilities that receive requests, hold stock or collect donations."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Hospitals & blood banks" }]}
      />
      <HospitalsManager initial={rows} />
    </>
  );
}
