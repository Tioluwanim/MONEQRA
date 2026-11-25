import { FlaskConical } from "lucide-react";

export function SimulationBanner({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;
  return (
    <aside role="status" className="flex min-h-10 items-center gap-2.5 border-b border-[#f0d9a3] bg-[var(--wait-soft)] px-4 py-2 text-sm text-[var(--wait-ink)]">
      <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
      <span><strong>Demo mode.</strong> This is simulated data and no real money moves.</span>
    </aside>
  );
}
