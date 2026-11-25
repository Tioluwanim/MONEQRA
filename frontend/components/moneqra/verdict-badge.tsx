import { routeVerdictLabels } from "@/lib/labels";
import { StatusPill } from "./status-pill";

export type IndependenceVerdict = "independent" | "shared" | "unverifiable";

export function VerdictBadge({
  verdict,
  reason,
}: {
  verdict: IndependenceVerdict;
  reason: string;
}) {
  const meta = routeVerdictLabels[verdict];
  const frame =
    verdict === "shared" ? "callout-bad"
    : verdict === "independent" ? "callout-good"
    : "";
  return (
    <div tabIndex={0} data-verdict={verdict} className={`callout ${frame} flex-col`} aria-label={`${meta.label}: ${reason}`}>
      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      <strong className="font-heading text-lg leading-snug">{meta.headline}</strong>
      <span className="text-[0.95rem] text-[var(--text-muted)]">{reason}</span>
    </div>
  );
}
