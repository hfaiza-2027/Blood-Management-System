import type { Metadata } from "next";
import { RegisterForm } from "@/components/forms/RegisterForm";
import { redirectIfSignedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage() {
  await redirectIfSignedIn();
  return <RegisterForm />;
}
