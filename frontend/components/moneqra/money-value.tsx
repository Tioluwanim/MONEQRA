"use client";

import { formatKobo, type MoneyInput } from "@/lib/money";
import type { MoneyState } from "./types";

export function MoneyValue({
  kobo,
  state,
  ticker = false,
}: {
  kobo: MoneyInput;
  state: MoneyState;
  ticker?: boolean;
}) {
  const marker =
    state === "confirmed" ? "Confirmed" :
    state === "pending" ? "Pending" :
    state === "unknown" ? "Unknown" : "Assumption";
  return (
    <span
      data-state={state}
      aria-label={`${marker}: ${formatKobo(kobo)} kobo`}
      tabIndex={0}
      className={[
        "inline-flex min-h-8 items-baseline gap-2 rounded-[var(--radius-xs)] px-2 py-1 font-mono tabular-nums",
        state === "confirmed" && "border-l-4 border-[var(--emerald)] bg-[color-mix(in_srgb,var(--emerald)_10%,transparent)]",
        state === "pending" && "border border-[var(--amber)] bg-[color-mix(in_srgb,var(--amber)_12%,transparent)]",
        state === "unknown" && "border border-dashed border-[var(--unknown)] bg-[var(--unknown-hatch)]",
        state === "estimated" && "border border-dashed border-[var(--cobalt)] bg-transparent",
      ].filter(Boolean).join(" ")}
    >
      <span aria-hidden="true" className={
        state === "confirmed" ? "size-2 bg-[var(--emerald)]" :
        state === "pending" ? "size-2 rounded-full border-2 border-t-[var(--amber)]" :
        state === "unknown" ? "text-[var(--unknown)]" : "size-2 rounded-full border border-[var(--cobalt)]"
      } />
      {state === "unknown" && <span aria-hidden="true" className="sr-only">fog</span>}
      <span className={ticker ? "inline-flex tabular-nums" : "tabular-nums"}>{formatKobo(kobo)}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{marker}</span>
    </span>
  );
}
