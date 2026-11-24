import { Badge } from "@/components/ui/badge";

export type IndependenceVerdict = "independent" | "shared" | "unverifiable";

export function VerdictBadge({
  verdict,
  reason,
}: {
  verdict: IndependenceVerdict;
  reason: string;
}) {
  return (
    <div
      tabIndex={0}
      className={`inline-flex max-w-xl items-center gap-3 border-b px-1 py-2 ${
        verdict === "shared"
          ? "border-[3px] border-[var(--vermilion)] bg-[color-mix(in_srgb,var(--vermilion)_10%,var(--paper))]"
          : verdict === "unverifiable"
            ? "border-dashed border-[var(--unknown)]"
            : "border-[var(--emerald)]"
      }`}
      aria-label={`${verdict}: ${reason}`}
    >
      <Badge
        className={
          verdict === "shared"
            ? "bg-[var(--vermilion)] text-white"
            : verdict === "unverifiable"
              ? "border-dashed border-[var(--unknown)]"
              : "bg-[var(--emerald)] text-white"
        }
      >
        {verdict}
      </Badge>
      <span className="text-sm">{reason}</span>
    </div>
  );
}
