import { Badge } from "@/components/ui/badge";

export type ProviderHealth = "healthy" | "degraded" | "incident";

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
  return (
    <span
      tabIndex={0}
      className="inline-flex items-center gap-2 border-b border-[var(--ledger-rule)] py-1 text-sm"
      aria-label={`${name}, ${health}, ${successRate}% success, last checked ${lastChecked}`}
    >
      <span aria-hidden="true" className={
        health === "healthy" ? "size-2 bg-[var(--emerald)]" :
        health === "degraded" ? "size-2 bg-[var(--amber)]" :
        "size-2 border border-[var(--vermilion)] bg-[var(--vermilion)]"
      } />
      <strong>{name}</strong>
      <span className="font-mono text-xs">{successRate}%</span>
      <Badge variant="outline" className="capitalize">{health}</Badge>
      <time className="text-xs text-[var(--ink-muted)]">{lastChecked}</time>
    </span>
  );
}
