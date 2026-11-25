"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { usePayments, useFinancialImpact, type Payment } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api-client";
import { ProductShell, PageTitle } from "@/components/product/shell";
import { LoadingSkeleton, EmptyState, ErrorState, StatusPill, MoneyValue } from "@/components/moneqra";
import { paymentStateLabels } from "@/lib/labels";
import { formatDayTime } from "@/lib/datetime";
import { formatKobo } from "@/lib/money";

const filters = [
  { id: "all", label: "All" },
  { id: "unknown", label: "Not confirmed" },
  { id: "pending", label: "Waiting" },
  { id: "settled", label: "In your account" },
  { id: "failed", label: "Failed" },
] as const;

export default function EvidencePage() {
  const auth = useAuth();
  const payments = usePayments();
  const impact = useFinancialImpact(6000);
  const [filter, setFilter] = useState<string>("unknown");
  const [notice, setNotice] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const items = useMemo(() => payments.data?.items ?? [], [payments.data]);
  const unknownCount = items.filter((p) => p.state === "unknown").length;
  const shown = useMemo(() => items.filter((p) => filter === "all" || p.state === filter), [items, filter]);
  const canCheck = auth.role !== "viewer";

  const check = async (payment: Payment) => {
    setBusy(payment.id);
    try {
      const result = await apiRequest(`/v1/payments/${payment.id}/verify`, z.object({
        payment_id: z.string(), evidence_created: z.boolean(), applied: z.boolean(), new_state: z.string(), message: z.string(),
      }), auth.credential, undefined, { method: "POST" });
      setNotice(`Payment ${payment.provider_reference}: ${result.message}`);
      void payments.refetch();
    } catch {
      setNotice(`Payment ${payment.provider_reference}: the provider check failed, so it is still not confirmed.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ProductShell>
      <PageTitle title="Which payments can you count on?" lead="Only money that has reached your account is counted. Everything else waits until the provider confirms it." />

      {unknownCount > 0 && (
        <div className="callout callout-warn mb-6" role="note">
          <div>
            <strong>{unknownCount} payments are not confirmed yet.</strong>
            <p className="text-[var(--text-muted)]">We cannot tell if these customers were charged. We will not retry them yet, so nobody is charged twice.</p>
          </div>
        </div>
      )}

      {notice && <div role="status" className="callout callout-info mb-4"><div>{notice}</div></div>}

      <div className="segmented mb-4" role="group" aria-label="Filter payments">
        {filters.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {payments.isLoading ? <LoadingSkeleton rows={5} /> : payments.isError ? <ErrorState title="Could not load payments" detail={payments.error.message} onRetry={() => void payments.refetch()} /> : shown.length === 0 ? <EmptyState title="Nothing here" detail="No payments in this group. Try All." /> : (
        <ul className="grid gap-3">
          {shown.map((payment) => {
            const meta = paymentStateLabels[payment.state];
            const unknown = payment.state === "unknown";
            return (
              <li key={payment.id} className="card card-pad flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="num text-lg font-semibold">{formatKobo(payment.amount_kobo)}</p>
                  <p className="truncate text-sm text-[var(--text-muted)]">Reference {payment.provider_reference}{payment.settled_at ? ` · reached you ${formatDayTime(payment.settled_at)}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={meta.tone} title={meta.hint}>{meta.label}</StatusPill>
                  {unknown && <StatusPill tone="neutral" title="Retrying is blocked until we know whether the customer was charged.">Don&apos;t retry yet</StatusPill>}
                  {unknown && (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={!canCheck || busy === payment.id} onClick={() => void check(payment)} title={canCheck ? undefined : "Viewers cannot run checks. Switch to Operator."}>
                      {busy === payment.id ? "Checking…" : "Check with provider"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!canCheck && unknownCount > 0 && <p className="mt-3 text-sm text-[var(--text-muted)]">You are viewing as a Viewer. Switch to Operator at the top to check payments with the provider.</p>}

      <section className="mt-10" aria-labelledby="liq-heading">
        <h2 id="liq-heading" className="mb-3 text-xl">What this means for your money</h2>
        {impact.isLoading ? <LoadingSkeleton rows={2} /> : impact.isError ? <ErrorState title="Could not load your money position" detail={impact.error.message} onRetry={() => void impact.refetch()} /> : impact.data ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card card-pad"><MoneyValue kobo={impact.data.available_funds_kobo} state="confirmed" /></div>
            <div className="card card-pad"><MoneyValue kobo={impact.data.obligations_due_kobo} state="pending" label="Due at the deadline" /></div>
            <div className="card card-pad"><MoneyValue kobo={impact.data.worst_case_position_kobo} state="unknown" label="Gap if waiting payments never arrive" /></div>
          </div>
        ) : null}
      </section>
    </ProductShell>
  );
}
