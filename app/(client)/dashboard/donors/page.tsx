import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { DonorSearch, type DonorSearchInitial } from "@/modules/client/components/DonorSearch";
import { requireUser } from "@/lib/session";
import { BLOOD_GROUPS, CITY_NAMES } from "@/lib/constants";
import type { BloodGroup } from "@/types";

export const metadata: Metadata = { title: "Find donors" };

type Params = { group?: string; city?: string; compatible?: string; q?: string };

export default async function FindDonorsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const group = sp.group ? decodeURIComponent(sp.group).replace(" ", "+") : "";
  const initial: DonorSearchInitial = {
    group: BLOOD_GROUPS.includes(group as BloodGroup) ? (group as BloodGroup) : "any",
    city: sp.city && CITY_NAMES.includes(sp.city) ? sp.city : "",
    compatible: sp.compatible === "1",
  };

  return (
    <>
      <PageHeader
        title="Find donors"
        description="Search registered donors by blood group and approximate location. Distances are measured from your area, not your exact address."
        breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Find donors" }]}
        actions={<ButtonLink href="/dashboard/request" variant="outline">Post a request instead</ButtonLink>}
      />
      <DonorSearch origin={user.location.point} originLabel={`${user.location.area}, ${user.location.city}`} initial={initial} />
    </>
  );
}
