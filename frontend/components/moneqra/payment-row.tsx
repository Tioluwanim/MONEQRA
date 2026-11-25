import { Ban } from "lucide-react";
import { formatKobo, type MoneyInput } from "@/lib/money";
import { paymentStateLabels } from "@/lib/labels";
import type { PaymentState } from "./types";
import { StatusPill } from "./status-pill";

/** Shown on payments we cannot confirm. Retrying could charge the customer twice. */
export function RetryBlockedTag({ checkFailed = false }: { checkFailed?: boolean }) {
  return (
    <span className="pill pill-bad" title="Trying again could charge the customer twice, so retry is switched off until we know.">
      <Ban aria-hidden="true" className="size-3.5" />
      Don&apos;t retry yet
      {checkFailed && <span className="sr-only"> (the last check failed, still unknown)</span>}
    </span>
  );
}

export function PaymentRow({
  reference,
  amount,
  state,
  lastProviderCheck,
  checkFailed = false,
}: {
  reference: string;
  amount: MoneyInput;
  state: PaymentState;
  lastProviderCheck: string;
  checkFailed?: boolean;
}) {
  const meta = paymentStateLabels[state];
  return (
    <tr className={state === "unknown" ? "bg-[var(--unsure-soft)]/60" : undefined}>
      <td className="p-3 text-sm">{reference}</td>
      <td className="num p-3 font-semibold">{formatKobo(amount)}</td>
      <td className="p-3"><StatusPill tone={meta.tone} title={meta.hint}>{meta.label}</StatusPill></td>
      <td className="p-3 text-sm text-[var(--text-muted)]">{checkFailed ? "Last check failed, still not confirmed" : lastProviderCheck}</td>
      <td className="p-3">{state === "unknown" && <RetryBlockedTag checkFailed={checkFailed} />}</td>
    </tr>
  );
}
