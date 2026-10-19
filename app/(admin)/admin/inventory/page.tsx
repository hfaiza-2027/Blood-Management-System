import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { InventoryManager } from "@/modules/admin/components/InventoryManager";
import { inventoryService } from "@/services/inventoryService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "Blood inventory" };

export default async function InventoryPage() {
  const [rows, movements] = await Promise.all([inventoryService.list(), safe(inventoryService.movements(30), [])]);
  return (
    <>
      <PageHeader title="Blood inventory" description="Combined stock across partner blood banks." breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Blood inventory" }]} />
      <InventoryManager initial={rows} initialMovements={movements} />
    </>
  );
}
