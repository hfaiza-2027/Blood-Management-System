import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { DonorRegistrationForm } from "@/modules/client/components/DonorRegistrationForm";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Register as a donor" };

export default async function RegisterDonorPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="Register as a donor"
        description="A few details help us match you with patients who need your blood group, close to where you are."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Register as a donor" }]}
      />
      <DonorRegistrationForm user={user} />
    </>
  );
}
