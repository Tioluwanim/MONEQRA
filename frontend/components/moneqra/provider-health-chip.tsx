import { StatusPill } from "./status-pill";

export type ProviderHealth = "healthy" | "degraded" | "incident";

const healthCopy = {
  healthy: { label: "Working normally", tone: "good" as const },
  degraded: { label: "Running slowly", tone: "wait" as const },
  incident: { label: "Having problems", tone: "bad" as const },
};

export function ProviderHealthChip({
  name,
  health,
  successRate,
  lastChecked,
}: {
  name: string;
  health: ProviderHealth;
  successRate: number;
  lastChecked: string;
}) {
  const copy = healthCopy[health];
  return (
    <div tabIndex={0} className="card card-pad" aria-label={`${name}: ${copy.label}, ${successRate}% of payments going through, last checked ${lastChecked}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-base">{name}</strong>
        <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
      </div>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        <span className="num text-2xl font-bold text-[var(--text)]">{successRate}%</span>{" "}
        of payments are going through
      </p>
      {lastChecked && <p className="mt-1 text-xs text-[var(--text-faint)]">Last checked {lastChecked}</p>}
    </div>
  );
}
