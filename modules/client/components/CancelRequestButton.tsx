"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { bloodRequestService } from "@/services/bloodRequestService";

export function CancelRequestButton({ requestId, code }: { requestId: string; code: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      await bloodRequestService.cancel(requestId);
      setCancelled(true);
      setOpen(false);
      toast.success(`${code} cancelled`, "Donors who were contacted have been told they're no longer needed.");
      router.refresh();
    } catch (err) {
      toast.error("Unable to cancel this request", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (cancelled) return <Button variant="outline" disabled>Cancelled</Button>;

  return (
    <>
      <Button variant="outline" className="text-hemo-700" onClick={() => setOpen(true)} icon={<XCircle className="h-4 w-4" aria-hidden />}>
        Cancel request
      </Button>
      <ConfirmDialog
        open={open}
        title="Are you sure you want to cancel this blood request?"
        description="Donors who have already been contacted will be notified. You can post a new request at any time."
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        loading={loading}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
