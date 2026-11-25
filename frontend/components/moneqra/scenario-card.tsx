import { formatKobo, toIntegerKobo, type MoneyInput } from "@/lib/money";
import { StatusPill } from "./status-pill";

export function ScenarioCard({
  label,
  probabilityBps,
  position,
  estimated = false,
  description,
}: {
  label: string;
  probabilityBps: number;
  position: MoneyInput;
  estimated?: boolean;
  /** Plain sentence about what this scenario means. */
  description?: string;
}) {
  const percentage = `${probabilityBps / 100}%`;
  const short = toIntegerKobo(position) < BigInt(0);
  return (
    <article
      tabIndex={0}
      className={`card card-pad min-w-0 ${estimated ? "border-dashed border-[#bfcff9] bg-[var(--estimate-soft)]/40" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
        {estimated && <StatusPill tone="estimate" title="This is our assumption. It is not money you have.">Estimate · {percentage}</StatusPill>}
      </div>
      <strong className={`num mt-3 block font-heading text-3xl font-bold tracking-tight ${short ? "text-[var(--bad-ink)]" : estimated ? "text-[var(--brand-ink)]" : "text-[var(--text)]"}`}>
        {formatKobo(position)}
      </strong>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {description ?? (short ? "Short after paying the supplier" : "Left after paying the supplier")}
      </p>
      {!estimated && probabilityBps > 0 && <p className="mt-2 text-xs text-[var(--text-faint)]">If {percentage} of waiting payments arrive</p>}
    </article>
  );
}

export function ScenarioStrip({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-3">{children}</div>;
}
