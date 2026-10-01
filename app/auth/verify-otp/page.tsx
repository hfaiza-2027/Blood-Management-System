import type { Metadata } from "next";
import { VerifyOtpForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Enter verification code" };

export default async function VerifyOtpPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  return <VerifyOtpForm phone={phone ?? "0321 ••• ••23"} />;
}
