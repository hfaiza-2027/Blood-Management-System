import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicNavbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
