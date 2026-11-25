"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ActionLink, Logo } from "./primitives";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#financial", label: "Example" },
  { href: "/#governance", label: "Safety" },
  { href: "/demo", label: "Guided demo" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
      <div className="page-width flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="MONEQRA home"><Logo /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3.5 py-2 text-[0.95rem] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="pill pill-neutral hidden xl:inline-flex">Simulation · demo data</span>
          <ActionLink href="/overview" className="btn-sm hidden sm:inline-flex">Open the workspace</ActionLink>
          <button
            type="button"
            className="btn btn-secondary btn-sm lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="size-4" /> : <Menu aria-hidden="true" className="size-4" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile navigation" className="border-t border-[var(--border)] bg-[var(--surface)] lg:hidden">
          <div className="page-width flex flex-col gap-1 py-3">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-medium hover:bg-[var(--surface-soft)]">
                {link.label}
              </Link>
            ))}
            <ActionLink href="/overview" className="mt-2" onClick={() => setOpen(false)}>Open the workspace</ActionLink>
          </div>
        </nav>
      )}
    </header>
  );
}
