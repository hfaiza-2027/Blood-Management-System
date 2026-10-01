import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { LocationsManager } from "@/modules/admin/components/LocationsManager";
import { hospitalService } from "@/services/hospitalService";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  const rows = await hospitalService.locations();
  return (
    <>
      <PageHeader
        title="Locations"
        description="Cities and areas used for donor matching and request routing."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Locations" }]}
      />
      <LocationsManager initial={rows} />
    </>
  );
}
