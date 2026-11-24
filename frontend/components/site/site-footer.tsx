import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050d1d] py-10 text-[#a9bbdb]">
      <div className="section-shell flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="font-heading text-2xl text-white">MONEQRA</p>
          <p className="mt-3 text-sm leading-6">
            Payment incident intelligence and financial decision support. An early-stage prototype built by Team SYNFORGE.
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--teal-bright)]">
            All data is simulated · MONEQRA never moves money
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-label="Footer navigation">
          <Link href="/" className="hover:text-white">Story</Link>
          <Link href="/demo" className="hover:text-white">Interactive demo</Link>
          <Link href="/overview" className="hover:text-white">Workspace</Link>
          <Link href="/dependency" className="hover:text-white">Dependency</Link>
          <Link href="/evidence" className="hover:text-white">Evidence</Link>
          <Link href="/decisions" className="hover:text-white">Decisions</Link>
          <a href="https://github.com/Tioluwanim/MONEQRA" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
            Repository <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
