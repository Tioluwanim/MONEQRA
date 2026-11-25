import { moneyStateLabels } from "@/lib/labels";
import { StatusPill } from "./status-pill";

export function StateLegend() {
  const states = ["confirmed", "pending", "unknown", "estimated"] as const;
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {states.map((state) => (
        <div key={state} data-state={state} className="card-soft p-3.5">
          <dt><StatusPill tone={moneyStateLabels[state].tone}>{moneyStateLabels[state].label}</StatusPill></dt>
          <dd className="mt-2 text-sm text-[var(--text-muted)]">{moneyStateLabels[state].hint}</dd>
        </div>
      ))}
    </dl>
  );
}
