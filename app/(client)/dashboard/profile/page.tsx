import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "@/modules/client/components/ProfileForm";
import { requireUser } from "@/lib/session";
import { donorService } from "@/services/donorService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const { setup } = await searchParams;
  const user = await requireUser();
  const donor = await safe(donorService.getById(user.id), undefined);
  return (
    <>
      <PageHeader
        title="My profile"
        description="Keep your details current so we can reach you when your blood is needed."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "My profile" }]}
      />
      <ProfileForm user={user} showDonorPrompt={setup === "donor"} availability={donor?.availability ?? null} />
    </>
  );
}
