import type { Metadata } from "next";
import { Mail, MapPin, Phone, Siren } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { Alert } from "@/components/ui/Alert";

export const metadata: Metadata = { title: "Contact", description: "Contact Qatra coordinators or become a partner hospital." };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-ink-900">Contact us</h1>
      <p className="mt-4 max-w-xl text-lg text-ink-600">Questions, partnerships and blood drives. Coordinators reply within one working day.</p>
      <Alert tone="danger" title="Need blood right now?" className="mt-8 max-w-3xl">
        Don&apos;t use this form. Post an emergency request or call the 24-hour line on <a href="tel:+924235000000" className="font-semibold underline">042 3500 0000</a>.
      </Alert>
      <div className="mt-12 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
          <ContactForm />
        </div>
        <div id="partners" className="scroll-mt-24 space-y-8">
          <ul className="space-y-5 text-sm">
            <li className="flex gap-3"><Siren className="mt-0.5 h-4 w-4 text-hemo-600" aria-hidden /><span><span className="block font-semibold text-ink-900">24-hour emergency line</span>042 3500 0000</span></li>
            <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 text-ink-500" aria-hidden /><span><span className="block font-semibold text-ink-900">Coordinators</span>042 3500 1234, 9:00 – 18:00 Mon – Sat</span></li>
            <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 text-ink-500" aria-hidden /><span><span className="block font-semibold text-ink-900">Email</span>help@qatra.pk</span></li>
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-ink-500" aria-hidden /><span><span className="block font-semibold text-ink-900">Office</span>2nd floor, 91-E Johar Town, Lahore</span></li>
          </ul>
          <div className="border-t border-line pt-8">
            <h2 className="font-semibold text-ink-900">Partner with Qatra</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">Hospitals, blood banks and donation centres get a free coordinator console: live stock, request management and direct alerts to verified donors nearby. Choose &ldquo;Hospital or blood bank partnership&rdquo; in the form.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
