import { Badge } from "@/components/ui/badge";
import { formatKobo, type MoneyInput } from "@/lib/money";
import type { PaymentState } from "./types";

export function RetryBlockedTag({ checkFailed = false }: { checkFailed?: boolean }) {
  return (
    <Badge variant="outline" className="border-dashed border-[var(--unknown)] text-[var(--ink)]">
      Retry blocked · unknown
      {checkFailed ? " · check failed" : ""}
    </Badge>
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
  return (
    <tr className={state === "unknown" ? "bg-[var(--unknown-hatch)]" : undefined}>
      <td className="p-3 font-mono text-xs">{reference}</td>
      <td className="p-3 tabular-nums">{formatKobo(amount)}</td>
      <td className="p-3"><span className="capitalize">{state}</span></td>
      <td className="p-3 text-sm">{lastProviderCheck}</td>
      <td className="p-3">{state === "unknown" && <RetryBlockedTag checkFailed={checkFailed} />}</td>
    </tr>
  );
}
