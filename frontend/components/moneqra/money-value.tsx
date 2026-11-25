"use client";

import { formatKobo, toIntegerKobo, type MoneyInput } from "@/lib/money";
import { moneyStateLabels } from "@/lib/labels";
import type { MoneyState } from "./types";
import { StatusPill } from "./status-pill";

/**
 * An amount with its plain-language status underneath. The number comes from
 * the backend as integer kobo and is only formatted here, never calculated.
 */
export function MoneyValue({
  kobo,
  state,
  size = "md",
  label,
}: {
  kobo: MoneyInput;
  state: MoneyState;
  /** Kept for compatibility with older call sites. Numbers no longer animate. */
  ticker?: boolean;
  size?: "md" | "lg";
  label?: string;
}) {
  const meta = moneyStateLabels[state];
  const negative = toIntegerKobo(kobo) < BigInt(0);
  const tone =
    negative ? "text-[var(--bad-ink)]"
    : state === "unknown" ? "text-[var(--unsure-ink)]"
    : state === "estimated" ? "text-[var(--brand-ink)]"
    : state === "pending" ? "text-[var(--wait-ink)]"
    : "text-[var(--text)]";
  return (
    <span
      data-state={state}
      tabIndex={0}
      aria-label={`${label ?? meta.label}: ${formatKobo(kobo)}`}
      className="inline-flex flex-col items-start gap-1.5"
    >
      <span className={`num font-heading font-bold tracking-tight ${size === "lg" ? "text-4xl sm:text-[2.75rem]" : "text-2xl"} ${tone}`}>
        {formatKobo(kobo)}
      </span>
      <StatusPill tone={negative ? "bad" : meta.tone} title={meta.hint}>{label ?? meta.label}</StatusPill>
    </span>
  );
}
