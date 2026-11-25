import { ArrowRight, Ban, ShieldCheck } from "lucide-react";
import { nodeKindLabels } from "@/lib/labels";

export type RouteStep = { id: string; label: string; kind: string; failing?: boolean; shared?: boolean };

/**
 * One payment route drawn as a chain: your business, then the providers and
 * systems it depends on. A step used by more than one route is marked so the
 * shared dependency is easy to see.
 */
export function RouteChain({ name, steps }: { name: string; steps: RouteStep[] }) {
  return (
    <div className="card card-pad">
      <p className="text-sm font-semibold text-[var(--text)]">{name}</p>
      <ol className="mt-3 flex flex-wrap items-stretch gap-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center gap-2">
            <div
              data-failing={step.failing ? "true" : undefined}
              data-shared={step.shared ? "true" : undefined}
              className={`min-w-28 rounded-xl border px-3.5 py-2.5 ${
                step.failing
                  ? "border-[#f1c4bb] bg-[var(--bad-soft)]"
                  : step.shared
                    ? "border-[#f0d9a3] bg-[var(--wait-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-soft)]"
              }`}
            >
              <span className="block text-xs text-[var(--text-faint)]">{nodeKindLabels[step.kind] ?? step.kind}</span>
              <strong className="block text-[0.95rem] leading-tight">{step.label}</strong>
              {step.failing && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--bad-ink)]"><Ban aria-hidden="true" className="size-3" /> Problem here</span>
              )}
              {!step.failing && step.shared && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--wait-ink)]"><ShieldCheck aria-hidden="true" className="size-3" /> Used by both</span>
              )}
            </div>
            {index < steps.length - 1 && <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-[var(--text-faint)]" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
