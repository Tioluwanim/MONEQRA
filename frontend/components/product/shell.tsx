"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CircleDot } from "lucide-react";
import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth, type DemoRole } from "@/lib/auth";
import { roleLabels } from "@/lib/labels";
import { Logo } from "@/components/site/primitives";

const steps = [
  { href: "/overview", label: "Overview", question: "What happened?" },
  { href: "/dependency", label: "Your routes", question: "Can we switch?" },
  { href: "/evidence", label: "Payments", question: "What is confirmed?" },
  { href: "/decisions", label: "Decision", question: "What should we do?" },
];

export function ProductShell({ children, next }: { children: ReactNode; next?: boolean }) {
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

  const index = steps.findIndex((step) => step.href === pathname);
  const following = index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="page-width flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
          <Link href="/" aria-label="MONEQRA home"><Logo /></Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill pill-estimate">Simulation · demo data</span>
            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-[var(--text-muted)]" htmlFor="role-switch">
              Viewing as
              <select
                id="role-switch"
                aria-label="Demo role"
                value={auth.role}
                onChange={(event) => void auth.login(event.target.value as DemoRole)}
                className="field h-9 rounded-lg px-2 py-0 text-sm"
              >
                {(Object.keys(roleLabels) as DemoRole[]).map((role) => (
                  <option key={role} value={role}>{roleLabels[role].label}</option>
                ))}
              </select>
            </label>
            <Link href="/demo" className="btn btn-secondary btn-sm">Guided demo</Link>
          </div>
        </div>
        <nav className="page-width pb-3" aria-label="Product screens">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((step, i) => {
              const current = pathname === step.href;
              return (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                      current ? "border-[var(--brand)] bg-[var(--brand-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
                    }`}
                  >
                    <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${current ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"}`}>{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{step.label}</span>
                      <span className="hidden text-xs leading-tight text-[var(--text-muted)] sm:block">{step.question}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </header>
      {(offline || fetching > 0) && (
        <div role="status" className="border-b border-[var(--border)] bg-[var(--brand-soft)] px-5 py-1.5 text-sm text-[var(--brand-ink)]">
          <span className="page-width flex items-center gap-2"><CircleDot aria-hidden="true" className="size-3" />
            {offline ? "You are offline. Showing what was already loaded." : "Updating…"}
          </span>
        </div>
      )}
      <main id="main" className="page-width py-8 sm:py-10">
        {children}
        {next !== false && following && (
          <div className="mt-10 flex justify-end">
            <Link href={following.href} className="btn btn-primary btn-lg">
              Next: {following.question} <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <header className="mb-8 max-w-3xl">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {lead && <p className="mt-3 text-lg text-[var(--text-muted)]">{lead}</p>}
    </header>
  );
}
