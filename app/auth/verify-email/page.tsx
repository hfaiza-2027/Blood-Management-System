import type { Metadata } from "next";
import { VerifyEmail } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <VerifyEmail email={email ?? "your email"} />;
}
