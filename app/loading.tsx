import { LogoMark } from "@/components/layout/Logo";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
      <LogoMark className="h-10 w-10 animate-pulse" />
    </div>
  );
}
