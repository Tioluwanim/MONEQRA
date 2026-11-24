"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      <header className="border-b border-[var(--ledger-rule)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/" className="font-heading text-xl">MONEQRA</Link>
          <nav className="flex flex-wrap gap-1" aria-label="Product screens">
            {links.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}
                className={`rounded-[var(--radius-xs)] px-3 py-2 text-sm ${pathname === link.href ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--ledger-rule)]"}`}>{link.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="role-switch">Demo role</label>
            <select id="role-switch" value={auth.role} onChange={(event) => void auth.login(event.target.value as DemoRole)} className="h-8 border border-[var(--ledger-rule-strong)] bg-[var(--paper-raised)] px-2 text-xs">
              <option value="viewer">Viewer</option>
              <option value="operator">Operator</option>
              <option value="approver">Approver</option>
              <option value="admin">Admin</option>
            </select>
            <span className="border border-[var(--vermilion)] px-2 py-1 font-mono text-[10px] font-bold text-[var(--vermilion)]">SIMULATION</span>
          </div>
        </div>
      </header>
      {(offline || fetching > 0) && (
        <div role="status" className="border-b border-[var(--ledger-rule)] px-5 py-2 text-xs">
          {offline ? "Network unavailable. Showing only already loaded data." : "Refreshing seeded data…"}
        </div>
      )}
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
