import Link from "next/link";
import { LogoMark } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-12 w-12" />
      <p className="mt-8 font-display text-6xl font-semibold text-ink-900">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink-900">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500">The link may be old, or the page may have moved. If someone needs blood now, go straight to a request.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/dashboard/request">Request blood</ButtonLink>
        <ButtonLink href="/" variant="outline">Go to home page</ButtonLink>
      </div>
      <Link href="/contact" className="mt-6 text-sm text-ink-500 underline hover:text-ink-800">Report a broken link</Link>
    </main>
  );
}
