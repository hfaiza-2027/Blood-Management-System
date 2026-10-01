import Link from "next/link";
import { Logo } from "./Logo";

const cols = [
  { title: "Donors", links: [["Become a donor", "/auth/register"], ["Book a donation", "/dashboard/donate"], ["Eligibility", "/faq#eligibility"], ["Find a centre", "/dashboard/donate"]] },
  { title: "Patients and families", links: [["Request blood", "/dashboard/request"], ["Find donors", "/dashboard/donors"], ["Emergency requests", "/dashboard/blood-requests?tab=emergency"]] },
  { title: "Qatra", links: [["About", "/about"], ["FAQ", "/faq"], ["Contact", "/contact"], ["Hospital partners", "/contact#partners"]] },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-900 text-ink-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            A volunteer blood network connecting donors, patients and blood banks across Punjab and beyond.
          </p>
          <p className="mt-6 text-sm">
            Emergency line <a href="tel:+924235000000" className="font-semibold text-white hover:underline">042 3500 0000</a>
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-semibold text-white">{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[13px] sm:flex-row sm:justify-between sm:px-6">
          <p>© 2026 Qatra Blood Network. Demonstration build with fictional data.</p>
          <p>Eligibility guidance on this site is not medical advice.</p>
        </div>
      </div>
    </footer>
  );
}
