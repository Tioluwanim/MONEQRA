import type { IncidentState } from "./types";

export function IncidentCard({
  title,
  severity,
  state,
  evidence,
}: {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  state: IncidentState;
  evidence: string[];
}) {
  const active = state !== "resolved";
  return (
    <article className="relative border border-[var(--ledger-rule)] bg-[var(--paper-raised)] p-4 shadow-[var(--shadow-ledger)]">
      {active && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[var(--vermilion)]" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase text-[var(--vermilion)]">{severity} severity</p>
          <h3 className="mt-1 text-xl">{title}</h3>
        </div>
        <span className="border-b-2 border-[var(--ink)] text-sm capitalize">{state}</span>
      </div>
      <ul className="mt-4 space-y-2 border-t border-[var(--ledger-rule)] pt-3">
        {evidence.map((line) => <li key={line} className="text-sm">{line}</li>)}
      </ul>
    </article>
  );
}
