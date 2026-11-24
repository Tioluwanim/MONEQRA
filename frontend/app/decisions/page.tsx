"use client";

import { useState } from "react";
import { useFinancialImpact, useRecommendations, useAudit, useDecisionMutation } from "@/lib/hooks";
import { useAuth, type DemoRole } from "@/lib/auth";
import { apiRequest } from "@/lib/api-client";
import { ProductShell } from "@/components/product/shell";
import { RecommendationCard, AuditEntry, LoadingSkeleton, EmptyState, ErrorState, ScenarioCard, ScenarioStrip } from "@/components/moneqra";
import { ApprovalMoment } from "@/components/motion";
import { z } from "zod";

export default function DecisionsPage() {
  const auth = useAuth();
  const [probability, setProbability] = useState(6000);
  const impact = useFinancialImpact(probability);
  const recommendations = useRecommendations();
  const audit = useAudit();
  const decision = useDecisionMutation();
  const [rejectReason, setRejectReason] = useState("");
  const [approval, setApproval] = useState<"approve" | "reject" | null>(null);
  const [auditMessage, setAuditMessage] = useState("");
  const [simulationMessage, setSimulationMessage] = useState("");

  const recommendation = recommendations.data?.items[0];
  const canDecide = auth.role === "approver" || auth.role === "admin";

  const verifyAudit = async () => {
    setAuditMessage("Audit-chain verification endpoint is not exposed by the backend contract.");
  };

  const runSimulator = async (branch: "shared" | "independent") => {
    try {
      await apiRequest("/v1/simulator/seed", z.object({
        scenario: z.string(),
        branch: z.enum(["shared", "independent"]),
        simulated: z.boolean(),
        opening_available_kobo: z.number(),
        settled_kobo: z.number(),
        unknown_kobo: z.number(),
        obligation_kobo: z.number(),
      }), auth.credential, undefined, { method: "POST", body: JSON.stringify({ branch, reset: true }) });
      setSimulationMessage(`Ade Stores ${branch} branch loaded.`);
    } catch (error) {
      setSimulationMessage(error instanceof Error ? error.message : "Simulation control failed.");
    }
  };

  return (
    <ProductShell>
      <header className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-[var(--emerald)] py-5">
        <div><p className="font-mono text-xs">DECISIONS / APPROVAL / AUDIT</p><h1 className="mt-2 text-4xl">Three positions. One human decision.</h1></div>
        <span className="border border-[var(--vermilion)] px-2 py-1 font-mono text-xs text-[var(--vermilion)]">SIMULATION</span>
      </header>
      {impact.isLoading ? <LoadingSkeleton /> : impact.isError ? <ErrorState title="Scenario unavailable" detail={impact.error.message} /> : impact.data ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label htmlFor="probability" className="text-sm">Recovery probability</label>
            <select id="probability" value={probability} onChange={(event) => setProbability(Number(event.target.value))} className="h-9 border px-3">
              {[0, 6000, 10000].map((value) => <option key={value} value={value}>{value / 100}%</option>)}
            </select>
            <span className="text-xs text-[var(--ink-muted)]">Sent to the backend; not recomputed here.</span>
          </div>
          <ScenarioStrip>
            <ScenarioCard label="No recovery" probabilityBps={0} position={impact.data.no_recovery.scenario_position_kobo} />
            <ScenarioCard label="Assumed recovery" probabilityBps={probability} position={impact.data.scenario_position_kobo} estimated={probability === 6000} />
            <ScenarioCard label="Full recovery" probabilityBps={10000} position={impact.data.full_recovery.scenario_position_kobo} />
          </ScenarioStrip>
        </>
      ) : null}
      <section className="mt-8">
        {recommendations.isLoading ? <LoadingSkeleton /> : recommendations.isError ? <ErrorState title="Recommendation unavailable" detail={recommendations.error.message} /> : !recommendation ? <EmptyState title="No recommendation" /> : (
          <>
            <RecommendationCard action={recommendation.action} tier={recommendation.tier} reasons={recommendation.reasons} evidence={recommendation.evidence} limitations={recommendation.limitations} role={auth.role as DemoRole} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={!canDecide || decision.isPending} onClick={() => { setApproval("approve"); decision.mutate({ id: recommendation.id, decision: "approve" }); }} className="h-9 bg-[var(--ink)] px-4 text-sm text-[var(--paper)] disabled:opacity-50">Approve</button>
              <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Rejection reason" className="h-9 border px-3" aria-label="Rejection reason" disabled={!canDecide} />
              <button type="button" disabled={!canDecide || decision.isPending || !rejectReason.trim()} onClick={() => { setApproval("reject"); decision.mutate({ id: recommendation.id, decision: "reject", reason: rejectReason }); }} className="h-9 border px-4 text-sm disabled:opacity-50">Reject</button>
            </div>
            {!canDecide && <p className="mt-2 text-xs text-[var(--ink-muted)]">Approval and rejection require the approver role. The server also enforces this permission.</p>}
            {decision.isError && <ErrorState title="Decision not recorded" detail={decision.error.message} />}
            {approval && decision.isSuccess && <ApprovalMoment action={approval} rule={recommendation.action} />}
          </>
        )}
      </section>
      <section className="mt-10">
        <div className="flex items-center justify-between gap-3"><h2 className="text-2xl">Audit log</h2><button type="button" onClick={() => void verifyAudit()} className="border px-3 py-2 text-sm">Verify audit chain</button></div>
        {auditMessage && <p role="status" className="mt-3 text-sm text-[var(--ink-muted)]">{auditMessage}</p>}
        {audit.isLoading ? <LoadingSkeleton /> : audit.isError ? <ErrorState title="Audit unavailable" detail={audit.error.message} /> : audit.data?.items.length === 0 ? <EmptyState title="No audit records" /> : <div className="mt-4 grid gap-3">{audit.data?.items.map((entry) => <AuditEntry key={entry.id} actor={entry.actor} action={entry.action} entity={entry.entity.type} timestamp={entry.occurred_at} hash={entry.hash} previousHash={entry.previous_hash} />)}</div>}
      </section>
      {auth.role === "admin" && (
        <section className="mt-10 border-t border-[var(--ledger-rule)] pt-6">
          <h2 className="text-2xl">Simulation controls</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void runSimulator("independent")} className="border px-3 py-2 text-sm">Load independent branch</button>
            <button type="button" onClick={() => void runSimulator("shared")} className="border px-3 py-2 text-sm">Load shared-failure branch</button>
          </div>
          {simulationMessage && <p role="status" className="mt-3 text-sm">{simulationMessage}</p>}
        </section>
      )}
    </ProductShell>
  );
}
