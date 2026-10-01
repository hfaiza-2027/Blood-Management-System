import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { UsersManager } from "@/modules/admin/components/UsersManager";
import { userService } from "@/services/userService";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await userService.list();
  return (
    <>
      <PageHeader title="Users" description={`${users.length} accounts. Search, verify, edit or deactivate members.`} breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <UsersManager initial={users} initialQuery={q ?? ""} />
    </>
  );
}
