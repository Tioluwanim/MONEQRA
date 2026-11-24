"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, CircleDot } from "lucide-react";
import { useAuth, type DemoRole } from "@/lib/auth";
import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const links = [
  { href: "/overview", label: "Overview" },
  { href: "/dependency", label: "Dependency" },
  { href: "/evidence", label: "Evidence" },
  { href: "/decisions", label: "Decisions" },
];

export function ProductShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();
  const fetching = useIsFetching();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <header className="hero-mesh border-b border-white/10 text-white">
        <div className="h-0.5 bg-gradient-to-r from-[var(--teal-bright)] via-[var(--cobalt-bright)] to-[var(--violet-bright)]" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5" aria-label="MONEQRA home">
              <span aria-hidden="true" className="relative grid size-7 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[#5b86ff] via-[#2ad4b6] to-[#7c5cf6]">
                <span className="absolute inset-[1px] rounded-[0.4rem] bg-[#08152d]/80" />
                <svg viewBox="0 0 24 24" className="relative size-4" fill="none">
                  <path d="M4 16.5 9 10l3.4 3.4L20 5.5" stroke="#7df0d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-heading text-xl leading-none">MONEQRA</span>
              <span className="hidden border-l border-white/20 pl-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9fb4d9] sm:inline">Workspace</span>
            </Link>

            <nav className="order-3 flex w-full flex-wrap gap-1 md:order-none md:w-auto" aria-label="Product screens">
              {links.map((link) => {
                const current = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      current ? "bg-white/14 text-white" : "text-[#b8c6e2] hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {link.label}
                    {current && <span aria-hidden="true" className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--teal-bright)]" />}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="hidden rounded-lg border border-white/16 px-2.5 py-1.5 text-xs text-[#b8c6e2] transition-colors hover:border-white/40 hover:text-white sm:inline">Story</Link>
              <Link href="/demo" className="hidden rounded-lg border border-white/16 px-2.5 py-1.5 text-xs text-[#b8c6e2] transition-colors hover:border-white/40 hover:text-white sm:inline-flex sm:items-center sm:gap-1">
                Guided demo <ArrowUpRight aria-hidden="true" className="size-3" />
              </Link>
              <label className="sr-only" htmlFor="role-switch">Demo role</label>
              <select id="role-switch" value={auth.role} onChange={(event) => void auth.login(event.target.value as DemoRole)} className="h-8 rounded-lg border border-white/18 bg-[#0d1e3b] px-2 text-xs text-white">
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
                <option value="approver">Approver</option>
                <option value="admin">Admin</option>
              </select>
              <span className="border border-[var(--coral)]/60 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[#ff9b7e]">SIMULATION</span>
            </div>
          </div>
        </div>
      </header>
      {(offline || fetching > 0) && (
        <div role="status" className="flex items-center gap-2 border-b border-[var(--ledger-rule)] bg-[var(--sky-soft)] px-5 py-2 text-xs">
          <CircleDot aria-hidden="true" className="size-3 text-[var(--cobalt)]" />
          {offline ? "Network unavailable. Showing only already loaded data." : "Refreshing seeded data…"}
        </div>
      )}
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
