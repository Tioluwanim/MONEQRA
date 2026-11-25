import { CheckCircle2 } from "lucide-react";
import { incidentStateLabels, severityLabels } from "@/lib/labels";
import type { IncidentState } from "./types";
import { StatusPill } from "./status-pill";

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
  const meta = incidentStateLabels[state];
  return (
    <article className="card card-pad">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusPill tone={meta.tone} title={meta.hint}>{meta.label}</StatusPill>
        <span className="text-sm font-medium text-[var(--text-muted)]">{severityLabels[severity] ?? severity}</span>
      </div>
      <h3 className="mt-3 text-xl">{title}</h3>
      {evidence.length > 0 && (
        <>
          <p className="mt-4 text-sm font-semibold text-[var(--text)]">What we found</p>
          <ul className="mt-2 space-y-2">
            {evidence.map((line) => (
              <li key={line} className="flex gap-2.5 text-[0.95rem] text-[var(--text-muted)]">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
                {line}
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
