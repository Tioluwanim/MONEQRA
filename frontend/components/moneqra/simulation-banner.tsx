import { Badge } from "@/components/ui/badge";

export function SimulationBanner({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <aside
      role="status"
      className="flex min-h-9 items-center gap-3 border-b border-[var(--amber)] bg-[color-mix(in_srgb,var(--amber)_10%,var(--paper))] px-4 text-sm"
    >
      <span aria-hidden="true" className="size-2 border border-[var(--ink)] bg-[var(--amber)]" />
      <strong>Seeded simulation data</strong>
      <span className="text-[var(--ink-muted)]">No real money is moved.</span>
      <Badge variant="outline" className="ml-auto font-mono">SIMULATED</Badge>
    </aside>
  );
}
