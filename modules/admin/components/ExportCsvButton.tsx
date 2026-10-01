"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** Builds a CSV in the browser from already-loaded report rows. */
export function ExportCsvButton({ filename, rows }: { filename: string; rows: (string | number)[][] }) {
  const toast = useToast();

  function download() {
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded.", filename);
  }

  return <Button variant="outline" icon={<Download className="h-4 w-4" aria-hidden />} onClick={download}>Export CSV</Button>;
}
