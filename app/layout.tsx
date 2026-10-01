import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Public_Sans, Newsreader } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";
import "@/lib/firebase/server";

// Every page reads live data (and most read the session cookie), so render on request.
export const dynamic = "force-dynamic";

const sans = Public_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Newsreader({ subsets: ["latin"], variable: "--font-display", display: "swap", style: ["normal"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://qatra.example"),
  title: { default: "Qatra — Find blood donors and request blood", template: "%s | Qatra" },
  description: "Connect blood donors with patients who need them. Find available blood, request donations and respond to emergencies near you.",
  applicationName: "Qatra",
  keywords: ["blood donation", "blood bank", "Lahore", "donor", "emergency blood"],
  openGraph: { title: "Qatra Blood Network", description: "Every drop can save a life.", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#A51C30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
