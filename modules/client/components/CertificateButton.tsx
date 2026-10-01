"use client";

import { useState } from "react";
import { Award, Printer } from "lucide-react";
import type { Donation } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";
import { formatDate } from "@/lib/utils";

export function CertificateButton({ donation }: { donation: Donation }) {
  const [open, setOpen] = useState(false);
  if (!donation.certificateId) return <span className="text-ink-400">Not issued</span>;
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-hemo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hemo-500">
        <Award className="h-3.5 w-3.5" aria-hidden /> {donation.certificateId}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Donation certificate"
        description="Keep this for your records or share it with your employer or university."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="h-4 w-4" aria-hidden />}>Print certificate</Button>
          </>
        }
      >
        <div className="rounded-card border-2 border-double border-hemo-200 bg-paper p-6 text-center">
          <div className="mx-auto mb-3 flex justify-center"><LogoMark /></div>
          <p className="font-display text-2xl text-ink-900">Certificate of Appreciation</p>
          <p className="mt-3 text-sm text-ink-600">This certifies that</p>
          <p className="mt-1 text-lg font-semibold text-ink-900">{donation.donorName}</p>
          <p className="mt-3 text-sm text-ink-600">
            voluntarily donated {donation.units} unit of {donation.bloodGroup} blood at {donation.centerName}, {donation.city} on {formatDate(donation.date)}.
          </p>
          <p className="mt-5 text-xs text-ink-400">Certificate {donation.certificateId}{donation.linkedRequestCode && ` — linked to ${donation.linkedRequestCode}`}</p>
        </div>
      </Modal>
    </>
  );
}
