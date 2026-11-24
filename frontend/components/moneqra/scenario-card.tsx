import { formatKobo, type MoneyInput } from "@/lib/money";

export function ScenarioCard({
  label,
  probabilityBps,
  position,
  estimated = false,
}: {
  label: string;
  probabilityBps: number;
  position: MoneyInput;
  estimated?: boolean;
}) {
  const percentage = `${probabilityBps / 100}%`;
  return (
    <article
      tabIndex={0}
      className={`min-w-0 border-t-2 p-4 ${estimated ? "border-dashed border-[var(--cobalt)]" : "border-[var(--ink)]"}`}
    >
      <p className="text-xs uppercase tracking-[0.12em]">{label}</p>
      {estimated && <p className="mt-1 text-xs font-semibold text-[var(--cobalt)]">Assumption · {percentage}</p>}
      {!estimated && probabilityBps > 0 && <p className="mt-1 text-xs text-[var(--ink-muted)]">{percentage}</p>}
      <strong className={`mt-3 block font-mono text-xl tabular-nums ${estimated ? "text-[var(--cobalt)]" : ""}`}>
        {formatKobo(position)}
      </strong>
    </article>
  );
}

export function ScenarioStrip({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-px border-y border-[var(--ledger-rule)] bg-[var(--ledger-rule)] md:grid-cols-3 [&>*]:bg-[var(--paper-raised)]">{children}</div>;
}
