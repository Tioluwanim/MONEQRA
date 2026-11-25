"use client";

import { useIncidents, useIncident, usePayments, useFinancialImpact } from "@/lib/hooks";
import { ProductShell, PageTitle } from "@/components/product/shell";
import { LoadingSkeleton, EmptyState, ErrorState, MoneyValue, IncidentTimeline, StatusPill } from "@/components/moneqra";
import type { IncidentState } from "@/components/moneqra";
import { incidentStateLabels, severityLabels } from "@/lib/labels";
import { formatDayTime } from "@/lib/datetime";
import { formatKobo } from "@/lib/money";

export default function OverviewPage() {
  const incidents = useIncidents();
  const active = incidents.data?.items.find((item) => item.state !== "resolved");
  const detail = useIncident(active?.id);
  const payments = usePayments();
  const impact = useFinancialImpact(6000);
  const unknownCount = payments.data?.items.filter((p) => p.state === "unknown").length ?? 0;

  return (
    <ProductShell>
      <PageTitle
        title={active ? "A payment provider is having a problem" : "Everything looks calm"}
        lead={
          active
            ? "Some customer payments cannot be confirmed right now. Here is what that means for the money you expect today."
            : "No payment problems are open. Nothing needs your attention."
        }
      />

      <section aria-labelledby="money-heading" className="mb-8 min-h-[16rem] md:min-h-[12rem]">
        <h2 id="money-heading" className="mb-3 text-xl">Your money right now</h2>
        {impact.isLoading ? <LoadingSkeleton rows={2} /> : impact.isError ? <ErrorState title="Could not load your money position" detail={impact.error.message} onRetry={() => void impact.refetch()} /> : impact.data ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card card-pad"><MoneyValue kobo={impact.data.available_funds_kobo} state="confirmed" label="In your account" /><p className="mt-2 text-sm text-[var(--text-muted)]">Confirmed money you can spend.</p></div>
              <div className="card card-pad"><MoneyValue kobo={impact.data.obligations_due_kobo} state="pending" label="Due at the deadline" /><p className="mt-2 text-sm text-[var(--text-muted)]">What you have to pay by the deadline.</p></div>
              <div className="card card-pad"><MoneyValue kobo={impact.data.worst_case_position_kobo} state="unknown" label="Gap if waiting payments never arrive" /><p className="mt-2 text-sm text-[var(--text-muted)]">Shown as short when below zero. Worst case.</p></div>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Payments we cannot confirm are never counted as money you have. Worst case you would be {impact.data.worst_case_position_kobo < 0 ? `${formatKobo(Math.abs(impact.data.worst_case_position_kobo))} short` : `${formatKobo(impact.data.worst_case_position_kobo)} ahead`}.
            </p>
          </>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="happened-heading" className="card card-pad min-h-[26rem]">
          <h2 id="happened-heading" className="text-xl">What happened</h2>
          {incidents.isLoading ? <div className="mt-4"><LoadingSkeleton rows={3} /></div> : incidents.isError ? <ErrorState title="Could not load the problem" detail={incidents.error.message} onRetry={() => void incidents.refetch()} /> : !active ? <EmptyState title="No open problems" detail="Your payment providers look healthy." /> : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone={incidentStateLabels[active.state].tone}>{incidentStateLabels[active.state].label}</StatusPill>
                <StatusPill tone="neutral">{severityLabels[active.severity] ?? "Problem"}</StatusPill>
                <span className="text-sm text-[var(--text-muted)]">Started {formatDayTime(active.opened_at)}</span>
              </div>
              {detail.data && (
                <div className="mt-6">
                  <IncidentTimeline
                    state={detail.data.state}
                    events={detail.data.transitions.map((t) => ({
                      state: t.to_state as IncidentState,
                      timestamp: formatDayTime(t.occurred_at),
                      evidence: String(t.evidence.description ?? incidentStateLabels[t.to_state as IncidentState]?.hint ?? "Provider status check"),
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </section>
        <aside className="card card-pad content-start">
          <h2 className="text-xl">Payments</h2>
          {payments.isLoading ? <LoadingSkeleton rows={2} /> : payments.data ? (
            <>
              <p className="mt-3 text-[var(--text-muted)]"><strong className="num text-3xl text-[var(--text)]">{unknownCount}</strong> of {payments.data.items.length} payments are not confirmed yet.</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">We will not retry them until we know whether the customer was charged, so nobody is charged twice.</p>
            </>
          ) : null}
        </aside>
      </div>
    </ProductShell>
  );
}
