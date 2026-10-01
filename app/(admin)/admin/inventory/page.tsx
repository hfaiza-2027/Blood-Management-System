import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { InventoryManager } from "@/modules/admin/components/InventoryManager";
import { inventoryService } from "@/services/inventoryService";

export const metadata: Metadata = { title: "Blood inventory" };

export default async function InventoryPage() {
  const rows = await inventoryService.list();
  return (
    <>
      <PageHeader title="Blood inventory" description="Combined stock across partner blood banks in Lahore." breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Blood inventory" }]} />
      <InventoryManager initial={rows} />
    </>
  );
}
