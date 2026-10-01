import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { DonateFlow } from "@/modules/client/components/DonateFlow";
import { requireUser } from "@/lib/session";
import { donationService } from "@/services/donationService";
import { hospitalService } from "@/services/hospitalService";
import { checkEligibility } from "@/lib/eligibility";
import { ageFromDob, now } from "@/lib/utils";
import { Alert } from "@/components/ui/Alert";
import { donorService } from "@/services/donorService";
import { safe } from "@/services/client";

export const metadata: Metadata = { title: "Donate blood" };

export default async function DonatePage() {
  const user = await requireUser();
  const [sites, donations, donor] = await Promise.all([hospitalService.donationSites(user.location.point), donationService.listMine(), safe(donorService.getById(user.id), undefined)]);
  const last = donations.find((d) => d.status === "completed");
  const eligibility = checkEligibility({ age: ageFromDob(user.dateOfBirth), weightKg: donor?.weightKg || 74, lastDonationDate: last?.date ?? donor?.lastDonationDate ?? null });

  return (
    <>
      <PageHeader
        title="Donate blood"
        description="Book a slot at a hospital, blood bank or donation centre near you. It takes about 45 minutes from arrival to refreshments."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Donate blood" }]}
      />
      {sites.length === 0 && (
        <Alert tone="warn" title="No facilities are listed yet" className="mb-6">
          An administrator needs to add hospitals and donation centres (or load the starter data from Admin, System settings) before this works.
        </Alert>
      )}
      <DonateFlow sites={sites} eligibility={eligibility} today={now().toISOString()} />
    </>
  );
}
