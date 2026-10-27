import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { UsersManager } from "@/modules/admin/components/UsersManager";
import { userService } from "@/services/userService";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [users, me] = await Promise.all([userService.list(), requireUser("admin")]);
  return (
    <>
      <PageHeader title="Users" description={`${users.length} accounts. Search, verify, edit or deactivate members.`} breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Users" }]} />
      <UsersManager initial={users} initialQuery={q ?? ""} currentUserId={me.id} />
    </>
  );
}
