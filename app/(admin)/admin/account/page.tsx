import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountDetailsCard, ChangePasswordCard, SessionsCard } from "@/components/account/AccountForms";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My account" };

export default async function AdminAccountPage() {
  const user = await requireUser("admin");
  return (
    <>
      <PageHeader
        title="My account"
        description="Your own details, password and sign-in sessions."
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "My account" }]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountDetailsCard account={{ id: user.id, name: user.fullName, email: user.email, phone: user.phone }} />
        <ChangePasswordCard />
        <div className="lg:col-span-2 lg:max-w-[calc(50%-12px)]">
          <SessionsCard />
        </div>
      </div>
    </>
  );
}
