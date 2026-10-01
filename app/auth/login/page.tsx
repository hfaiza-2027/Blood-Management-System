import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <LoginForm />;
}
