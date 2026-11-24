"use client";

import { useMemo, useState } from "react";
import { usePayments, useFinancialImpact, type Payment } from "@/lib/hooks";
import { ProductShell } from "@/components/product/shell";
import { PaymentsTable, LoadingSkeleton, EmptyState, ErrorState, MoneyValue } from "@/components/moneqra";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { z } from "zod";

export default function EvidencePage() {
  const auth = useAuth();
  const payments = usePayments();
  const impact = useFinancialImpact(6000);
  const [state, setState] = useState("all");
  const [selected, setSelected] = useState<Payment | null>(null);
  const [verifyMessage, setVerifyMessage] = useState("");

  const filtered = useMemo(() => payments.data?.items.filter((payment) => state === "all" || payment.state === state) ?? [], [payments.data, state]);
  const verify = async (payment: Payment) => {
    try {
      const result = await apiRequest(`/v1/payments/${payment.id}/verify`, z.object({
        payment_id: z.string(), evidence_created: z.boolean(), applied: z.boolean(), new_state: z.string(), message: z.string(),
      }), auth.credential, undefined, { method: "POST" });
      setVerifyMessage(result.message);
    } catch {
      setVerifyMessage("check failed, still unknown");
    }
  };

  return (
    <ProductShell>
      <header className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-[var(--cobalt)] py-5">
        <div><p className="font-mono text-xs">EVIDENCE / IMPACT</p><h1 className="mt-2 text-4xl">Payments and liquidity</h1></div>
        <span className="border border-[var(--vermilion)] px-2 py-1 font-mono text-xs text-[var(--vermilion)]">SIMULATION</span>
      </header>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label htmlFor="payment-state" className="text-sm">State</label>
        <select id="payment-state" value={state} onChange={(event) => setState(event.target.value)} className="h-9 border border-[var(--ledger-rule-strong)] bg-[var(--paper-raised)] px-3">
          <option value="all">All</option>
          {["created", "pending", "unknown", "succeeded", "settled", "failed", "reversed"].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      {payments.isLoading ? <LoadingSkeleton /> : payments.isError ? <ErrorState title="Payments unavailable" detail={payments.error.message} /> : filtered.length === 0 ? <EmptyState title="No payments match" /> : (
        <PaymentsTable payments={filtered.map((payment) => ({
          id: payment.id,
          reference: payment.provider_reference,
          amount: payment.amount_kobo,
          state: payment.state,
          lastProviderCheck: payment.settled_at ?? "check failed, still unknown",
          checkFailed: payment.state === "unknown",
        }))} />
      )}
      {filtered.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.filter((payment) => payment.state === "unknown").slice(0, 12).map((payment) => (
            <article key={payment.id} className="border border-dashed border-[var(--unknown)] p-3">
              <button type="button" onClick={() => setSelected(payment)} className="font-mono text-sm underline">{payment.provider_reference}</button>
              {auth.role !== "viewer" && <button type="button" onClick={() => void verify(payment)} className="ml-3 border px-2 py-1 text-xs">Verify</button>}
              {selected?.id === payment.id && <p className="mt-2 text-xs">Event history is available through payment detail. {verifyMessage}</p>}
            </article>
          ))}
        </div>
      )}
      {impact.isLoading ? <LoadingSkeleton /> : impact.isError ? <ErrorState title="Liquidity unavailable" detail={impact.error.message} /> : impact.data ? (
        <section className="mt-8 grid gap-3 md:grid-cols-3">
          <MoneyValue kobo={impact.data.available_funds_kobo} state="confirmed" ticker />
          <MoneyValue kobo={impact.data.obligations_due_kobo} state="pending" ticker />
          <MoneyValue kobo={impact.data.worst_case_position_kobo} state="unknown" ticker />
        </section>
      ) : null}
    </ProductShell>
  );
}
