import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./primitives";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-12">
      <div className="page-width flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
            Helps a business understand what a payment problem means for its money, and what to do about it. An early-stage prototype built by Team SYNFORGE.
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--text)]">All data is simulated. MONEQRA never moves money.</p>
        </div>
        <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm sm:grid-cols-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text)]">Home</Link>
          <Link href="/demo" className="text-[var(--text-muted)] hover:text-[var(--text)]">Guided demo</Link>
          <Link href="/overview" className="text-[var(--text-muted)] hover:text-[var(--text)]">Workspace</Link>
          <Link href="/dependency" className="text-[var(--text-muted)] hover:text-[var(--text)]">Your routes</Link>
          <Link href="/evidence" className="text-[var(--text-muted)] hover:text-[var(--text)]">Payments</Link>
          <a href="https://github.com/Tioluwanim/MONEQRA" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text)]">
            Code <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
