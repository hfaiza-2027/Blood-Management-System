import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forms/AuthForms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
