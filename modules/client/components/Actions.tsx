"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HandHeart, MessageCircle } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { BloodGroupBadge } from "@/components/ui/BloodGroupBadge";
import { bloodRequestService } from "@/services/bloodRequestService";
import { donorService } from "@/services/donorService";
import type { BloodGroup } from "@/types";

interface RespondProps {
  requestId: string;
  patientName: string;
  hospitalName: string;
  bloodGroup: BloodGroup;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  defaultOpen?: boolean;
}

/** "I can donate" — confirms, notifies the requester, then locks the button. */
export function RespondButton({ requestId, patientName, hospitalName, bloodGroup, size = "sm", variant = "primary", className, defaultOpen = false }: RespondProps) {
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await bloodRequestService.respond(requestId);
      setDone(true);
      setOpen(false);
      toast.success("Response sent", `The family of ${patientName} has your details and will confirm a time.`);
      router.refresh();
    } catch (err) {
      toast.error("Unable to send your response", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return (
      <Button size={size} variant="outline" disabled className={className}>
        Response sent
      </Button>
    );

  return (
    <>
      <Button size={size} variant={variant} className={className} onClick={() => setOpen(true)} icon={<HandHeart className="h-4 w-4" aria-hidden />}>
        I can donate
      </Button>
      <ConfirmDialog
        open={open}
        tone="primary"
        title={`Donate ${bloodGroup} for ${patientName}?`}
        description={
          <>
            We&apos;ll share your name and phone number with the requester so they can arrange a time at <span className="font-medium text-ink-800">{hospitalName}</span>. Only donate if you feel well today.
          </>
        }
        confirmLabel="Send my response"
        cancelLabel="Not now"
        loading={loading}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

/** Ask a donor for help; the donor's number is never revealed to the requester. */
export function ContactDonorButton({ donorId, donorName, bloodGroup, disabled, className }: { donorId: string; donorName: string; bloodGroup: BloodGroup; disabled?: boolean; className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [reqCode, setReqCode] = useState("REQ-24122");
  const [message, setMessage] = useState("");

  async function send() {
    setLoading(true);
    try {
      await donorService.contactDonor(donorId, reqCode);
      setSent(true);
      setOpen(false);
      toast.success(`Request sent to ${donorName.split(" ")[0]}`, "You'll be notified when they respond.");
    } catch (err) {
      toast.error("Unable to contact this donor", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" className={className ?? "w-full"} disabled={disabled || sent} variant={sent ? "outline" : "primary"} onClick={() => setOpen(true)} icon={sent ? undefined : <MessageCircle className="h-4 w-4" aria-hidden />}>
        {sent ? "Request sent" : disabled ? "Not available" : "Request blood"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Ask ${donorName} to donate`}
        description="The donor gets an alert with your request details. Your contact details are shared only if they accept."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} loading={loading} loadingText="Sending…">Send request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded bg-paper p-3 text-sm">
            <BloodGroupBadge group={bloodGroup} />
            <span className="text-ink-700">{donorName} is {bloodGroup}. Compatibility is confirmed by the hospital before transfusion.</span>
          </div>
          <Select id="req-link" label="Link to one of your requests" value={reqCode} onChange={(e) => setReqCode(e.target.value)}>
            <option value="REQ-24122">REQ-24122 — O-, Ravi Valley General Hospital</option>
            <option value="REQ-24073">REQ-24073 — A-, Ravi Valley General Hospital</option>
            <option value="">Not linked to a request</option>
          </Select>
          <Textarea id="req-msg" label="Message" optional rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Surgery is tomorrow at 9 a.m. The blood bank is on the ground floor." />
        </div>
      </Modal>
    </>
  );
}

export function AvailabilityToggle({ initial }: { initial: "available" | "unavailable" | "temporarily_unavailable" }) {
  const toast = useToast();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const available = value === "available";
  return (
    <Button
      size="sm"
      variant={available ? "outline" : "secondary"}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const next = available ? "unavailable" : "available";
        try {
          await donorService.updateAvailability(next);
          setValue(next);
          toast.success(next === "available" ? "You're visible to people searching for donors" : "You're hidden from donor searches", "You can change this at any time.");
        } catch (err) {
          toast.error("Couldn't change your availability.", err instanceof Error ? err.message : "Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {available ? "Pause availability" : "Mark me available"}
    </Button>
  );
}
