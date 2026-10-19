import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Public_Sans, Newsreader } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { NavigationProgress } from "@/components/system/NavigationProgress";
import { SetupRequired } from "@/components/system/SetupRequired";
import { missingConfig } from "@/lib/config";
import "./globals.css";
import "@/lib/firebase/server";

// Every page reads live data (and most read the session cookie), so render on request.
export const dynamic = "force-dynamic";

const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Newsreader({ subsets: ["latin"], variable: "--font-display", display: "swap", style: ["normal"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
  title: { default: "BloodBridge — Find blood donors and request blood", template: "%s | BloodBridge" },
  description: "Connect blood donors with patients who need them. Find available blood, request donations and respond to emergencies near you.",
  applicationName: "BloodBridge",
  keywords: ["blood donation", "blood bank", "Lahore", "donor", "emergency blood"],
  openGraph: { title: "BloodBridge", description: "Every drop can save a life.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#A51C30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const missing = missingConfig();
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        {missing.length > 0 ? (
          <SetupRequired missing={missing} />
        ) : (
          <ToastProvider>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            {children}
          </ToastProvider>
        )}
      </body>
    </html>
  );
}
