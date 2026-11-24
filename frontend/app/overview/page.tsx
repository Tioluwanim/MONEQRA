"use client";

import { useIncidents, useIncident, usePayments, useFinancialImpact } from "@/lib/hooks";
import { ProductShell } from "@/components/product/shell";
import { IncidentCard, IncidentTimeline, LoadingSkeleton, EmptyState, ErrorState, ProviderHealthChip, MoneyValue } from "@/components/moneqra";
import { FaultLine } from "@/components/motion";

export default function OverviewPage() {
  const incidents = useIncidents();
  const active = incidents.data?.items.find((item) => item.state !== "resolved");
  const detail = useIncident(active?.id);
  const payments = usePayments();
  const impact = useFinancialImpact(6000);

  return (
    <ProductShell>
      <div className={active ? "border-t-2 border-[var(--vermilion)]" : "border-t-2 border-[var(--emerald)]"}>
        <header className="flex flex-wrap items-end justify-between gap-4 py-5">
          <div><p className="font-mono text-xs">OVERVIEW / SEEDED SIMULATION</p><h1 className="mt-2 text-4xl">Incident and cash position</h1></div>
          <span className="border border-[var(--vermilion)] px-2 py-1 font-mono text-xs text-[var(--vermilion)]">SIMULATION</span>
        </header>
        {active && <FaultLine />}
        <div className="grid gap-5 md:grid-cols-3">
          <section className="md:col-span-2">
            {incidents.isLoading ? <LoadingSkeleton rows={3} /> : incidents.isError ? <ErrorState title="Incident unavailable" detail={incidents.error.message} /> : !active ? <EmptyState title="No active incident" detail="The provider position is calm." /> : (
              <IncidentCard title="Active payment incident" severity={(["low", "medium", "high", "critical"].includes(active.severity) ? active.severity : "high") as "low" | "medium" | "high" | "critical"} state="confirmed" evidence={detail.data?.transitions.map((transition) => `${transition.to_state}: ${String(transition.evidence.description ?? "provider status evidence")}`) ?? ["Loading detection evidence"]} />
            )}
            {detail.data && <div className="mt-5"><IncidentTimeline state={detail.data.state} events={detail.data.transitions.map((transition) => ({ state: transition.to_state as "suspected" | "confirmed" | "monitoring" | "recovering" | "resolved", timestamp: transition.occurred_at, evidence: String(transition.evidence.description ?? "provider status check") }))} /></div>}
          </section>
          <aside className="grid content-start gap-4">
            <ProviderHealthChip name="Fictional Provider A" health={active ? "incident" : "healthy"} successRate={active ? 72 : 99} lastChecked={active?.opened_at ?? "No active incident"} />
            {impact.isLoading ? <LoadingSkeleton rows={3} /> : impact.isError ? <ErrorState title="Cash position unavailable" detail={impact.error.message} /> : impact.data ? (
              <>
                <MoneyValue kobo={impact.data.available_funds_kobo} state="confirmed" ticker />
                <MoneyValue kobo={impact.data.obligations_due_kobo} state="pending" ticker />
                <MoneyValue kobo={impact.data.worst_case_position_kobo} state="unknown" ticker />
              </>
            ) : null}
          </aside>
        </div>
        {payments.data && <p className="mt-6 font-mono text-xs">{payments.data.items.length} payments · unknown entries remain blocked from retry</p>}
      </div>
    </ProductShell>
  );
}
