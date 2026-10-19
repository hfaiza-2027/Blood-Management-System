import { Logo } from "@/components/layout/Logo";

/** Shown instead of the app when Firebase settings are missing, so a misconfigured deploy is obvious. */
export function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-xl rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink-900">Finish setting up BloodBridge</h1>
        <p className="mt-2 text-sm text-ink-600">
          The app needs a Firebase project to sign people in and store data. Add these environment variables, then restart the server
          (or redeploy).
        </p>
        <ul className="mt-5 space-y-1.5 rounded-md border border-line bg-paper p-4 font-mono text-[13px] text-ink-800">
          {missing.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-ink-600">
          <li>Copy <code className="font-mono text-ink-800">.env.example</code> to <code className="font-mono text-ink-800">.env.local</code>.</li>
          <li>Fill the <code className="font-mono text-ink-800">NEXT_PUBLIC_FIREBASE_*</code> values from Project settings → Your apps → Web app.</li>
          <li>Fill the <code className="font-mono text-ink-800">FIREBASE_*</code> values from a service account key (Project settings → Service accounts).</li>
        </ol>
        <p className="mt-5 text-[13px] text-ink-500">Step-by-step instructions are in FIREBASE_SETUP.md in the project folder.</p>
      </div>
    </main>
  );
}
