import type { Metadata } from "next";
import { Droplet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { RequestsBoard, type RequestTab } from "@/modules/client/components/RequestsBoard";
import { requireUser } from "@/lib/session";
import { bloodRequestService } from "@/services/bloodRequestService";

export const metadata: Metadata = { title: "Blood requests" };

const TABS: RequestTab[] = ["all", "nearby", "emergency", "mine", "fulfilled"];

export default async function BloodRequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string; respond?: string }> }) {
  const { tab, respond } = await searchParams;
  const user = await requireUser();
  const requests = await bloodRequestService.list(user.location.point);
  const initialTab = TABS.includes(tab as RequestTab) ? (tab as RequestTab) : "all";

  return (
    <>
      <PageHeader
        title="Blood requests"
        description="Patients across the network who need blood. Requests you can help with show an “I can donate” button."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Blood requests" }]}
        actions={<ButtonLink href="/dashboard/request" icon={<Droplet className="h-4 w-4" aria-hidden />}>Request blood</ButtonLink>}
      />
      <RequestsBoard requests={requests} userId={user.id} userGroup={user.bloodGroup} initialTab={initialTab} respondId={respond} />
    </>
  );
}
