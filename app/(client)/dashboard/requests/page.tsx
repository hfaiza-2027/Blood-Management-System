import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RequestHistory } from "@/modules/client/components/RequestHistory";
import { requireUser } from "@/lib/session";
import { bloodRequestService } from "@/services/bloodRequestService";

export const metadata: Metadata = { title: "Request history" };

export default async function RequestHistoryPage() {
  const user = await requireUser();
  const requests = await bloodRequestService.listMine(user.id);
  return (
    <>
      <PageHeader
        title="Request history"
        description="Every blood request you've posted, with its current status."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Request history" }]}
        actions={<ButtonLink href="/dashboard/request">New request</ButtonLink>}
      />
      <Card className="overflow-hidden">
        <RequestHistory requests={requests} />
      </Card>
    </>
  );
}
