import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { getSessionUserOrNull } from "@/lib/session";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  // Signed-in visitors see a link to their own dashboard instead of "Log in".
  const user = await getSessionUserOrNull();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicNavbar account={user ? { name: user.fullName, role: user.role } : null} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
