import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/AuthForms";
import { redirectIfSignedIn } from "@/lib/session";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  await redirectIfSignedIn();
  return <LoginForm />;
}
