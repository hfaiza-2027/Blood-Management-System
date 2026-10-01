import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequestBloodForm } from "@/modules/client/components/RequestBloodForm";
import { hospitalService } from "@/services/hospitalService";
import { requireUser } from "@/lib/session";
import type { Urgency } from "@/types";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Request blood" };

export default async function RequestBloodPage({ searchParams }: { searchParams: Promise<{ urgency?: string }> }) {
  const { urgency } = await searchParams;
  const [hospitals, user] = await Promise.all([hospitalService.list(), requireUser()]);
  const facilities = hospitals.filter((h) => h.type !== "donation_center");
  const initialUrgency: Urgency = urgency === "emergency" || urgency === "urgent" ? urgency : "normal";
  return (
    <>
      <PageHeader
        title="Request blood"
        description="Tell us what the patient needs. We alert compatible donors near the hospital and keep you updated at every step."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Request blood" }]}
      />
      {facilities.length === 0 && (
        <Alert tone="warn" title="No facilities are listed yet" className="mb-6">
          An administrator needs to add hospitals and donation centres (or load the starter data from Admin, System settings) before this works.
        </Alert>
      )}
      <RequestBloodForm hospitals={facilities} initialUrgency={initialUrgency} requester={{ id: user.id, name: user.fullName, phone: user.phone }} />
    </>
  );
}
