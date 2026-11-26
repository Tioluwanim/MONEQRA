"use client";

import { useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { useFinancialImpact, useRecommendations, useAudit, useDecisionMutation, useAgentReview } from "@/lib/hooks";
import { useAuth, type DemoRole } from "@/lib/auth";
import { apiRequest } from "@/lib/api-client";
import { ProductShell, PageTitle } from "@/components/product/shell";
import { RecommendationCard, AuditEntry, LoadingSkeleton, EmptyState, ErrorState, ScenarioCard, ScenarioStrip } from "@/components/moneqra";

const options = [
  { bps: 0, label: "None arrive" },
  { bps: 6000, label: "60% arrive" },
  { bps: 10000, label: "All arrive" },
];

export default function DecisionsPage() {
  const auth = useAuth();
  const [probability, setProbability] = useState(6000);
  const impact = useFinancialImpact(probability);
  const recommendations = useRecommendations();
  const audit = useAudit();
  const decision = useDecisionMutation();
  const agentReview = useAgentReview();
  const [done, setDone] = useState<"approve" | "reject" | null>(null);
  const [simulationMessage, setSimulationMessage] = useState("");

  const recommendation = recommendations.data?.items[0];

  const runSimulator = async (branch: "shared" | "independent") => {
    try {
      await apiRequest("/v1/simulator/seed", z.object({
        scenario: z.string(), branch: z.enum(["shared", "independent"]), simulated: z.boolean(),
        opening_available_kobo: z.number(), settled_kobo: z.number(), unknown_kobo: z.number(), obligation_kobo: z.number(),
      }), auth.credential, undefined, { method: "POST", body: JSON.stringify({ branch, reset: true }) });
      setSimulationMessage(`Loaded the demo with ${branch === "shared" ? "both providers on the same failing system" : "independent providers"}. Refresh the other pages to see it.`);
    } catch (error) {
      setSimulationMessage(error instanceof Error ? error.message : "Could not load the demo scenario.");
    }
  };

  return (
    <ProductShell next={false}>
      <PageTitle title="What should you do?" lead="We suggest an action. Nothing happens until a person approves it, and MONEQRA never moves money." />

      <section aria-labelledby="rec-heading" className="mb-10">
        <h2 id="rec-heading" className="mb-3 text-xl">Our recommendation</h2>
        {recommendations.isLoading ? <LoadingSkeleton /> : recommendations.isError ? <ErrorState title="Could not load the recommendation" detail={recommendations.error.message} onRetry={() => void recommendations.refetch()} /> : !recommendation ? <EmptyState title="No recommendation right now" detail="There is nothing to decide." /> : (
          <>
            <RecommendationCard
              action={recommendation.action}
              tier={recommendation.tier}
              reasons={recommendation.reasons}
              evidence={recommendation.evidence}
              limitations={recommendation.limitations}
              role={auth.role as DemoRole}
              pending={decision.isPending}
              onApprove={() => decision.mutate({ id: recommendation.id, decision: "approve" }, { onSuccess: () => setDone("approve") })}
              onReject={(reason) => decision.mutate({ id: recommendation.id, decision: "reject", reason }, { onSuccess: () => setDone("reject") })}
            />
            {decision.isError && <div className="mt-3"><ErrorState title="Your decision was not saved" detail={decision.error.message} /></div>}
            {done && decision.isSuccess && (
              <div role="status" className="callout callout-good mt-4">
                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-[var(--good)]" />
                <div><strong>{done === "approve" ? "Approved and recorded." : "Declined and recorded."}</strong> <span className="text-[var(--text-muted)]">It now appears in the decision history below. No money was moved.</span></div>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="agent-heading" className="mb-10">
        <h2 id="agent-heading" className="mb-3 text-xl">Run a financial review</h2>
        <div className="card card-pad">
          <p className="text-sm text-[var(--text-muted)]">
            The bounded agent reads the cash position, unresolved payments and obligation coverage. It may draft coordination requests, but cannot approve or execute them.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-4"
            disabled={agentReview.isPending || auth.role === "viewer"}
            onClick={() => agentReview.mutate({
              deadline: "2026-11-19T17:00:00+01:00",
              recoveryProbabilityBps: probability,
            })}
          >
            {agentReview.isPending ? "Running review..." : "Run review"}
          </button>
          {auth.role === "viewer" && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Switch to operator or approver access to run the review.</p>
          )}
          {agentReview.isError && (
            <ErrorState title="The review could not run" detail={agentReview.error.message} />
          )}
          {agentReview.data && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <strong>{agentReview.data.findings.length}</strong> obligation finding(s)
              </div>
              <div>
                <strong>{agentReview.data.proposals.length}</strong> draft proposal(s) awaiting approval
              </div>
              <p className="text-sm text-[var(--text-muted)] md:col-span-2">
                {agentReview.data.limitations.join(" ")}
              </p>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="sc-heading" className="mb-10">
        <h2 id="sc-heading" className="text-xl">What could happen to your money</h2>
        <p className="mb-4 mt-1 text-[var(--text-muted)]">After paying the supplier, here is what is left. How many of the waiting payments arrive is unknown, so choose a guess.</p>
        <div className="segmented mb-4" role="group" aria-label="How many waiting payments arrive">
          {options.map((o) => (
            <button key={o.bps} type="button" aria-pressed={probability === o.bps} onClick={() => setProbability(o.bps)}>{o.label}</button>
          ))}
        </div>
        {impact.isLoading ? <LoadingSkeleton rows={2} /> : impact.isError ? <ErrorState title="Could not load the scenarios" detail={impact.error.message} onRetry={() => void impact.refetch()} /> : impact.data ? (
          <ScenarioStrip>
            <ScenarioCard label="Worst case" probabilityBps={0} position={impact.data.no_recovery.scenario_position_kobo} description="None of the waiting payments arrive" />
            <ScenarioCard label="Your guess" probabilityBps={probability} position={impact.data.scenario_position_kobo} estimated description="An estimate, not a promise" />
            <ScenarioCard label="Best case" probabilityBps={10000} position={impact.data.full_recovery.scenario_position_kobo} description="All of the waiting payments arrive" />
          </ScenarioStrip>
        ) : null}
      </section>

      <section aria-labelledby="hist-heading">
        <h2 id="hist-heading" className="mb-3 text-xl">Decision history</h2>
        {audit.isLoading ? <LoadingSkeleton /> : audit.isError ? <ErrorState title="Could not load the history" detail={audit.error.message} onRetry={() => void audit.refetch()} /> : audit.data?.items.length === 0 ? <EmptyState title="No decisions yet" detail="Approvals and declines will show up here." /> : (
          <ul className="grid gap-3">
            {audit.data?.items.map((entry) => <AuditEntry key={entry.id} actor={entry.actor} action={entry.action} entity={entry.entity.type} timestamp={entry.occurred_at} hash={entry.hash} previousHash={entry.previous_hash} />)}
          </ul>
        )}
      </section>

      {auth.role === "admin" && (
        <details className="card card-pad mt-10">
          <summary className="cursor-pointer font-semibold">Demo controls (admin)</summary>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Reload the demo data with a different setup.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void runSimulator("independent")}>Providers are independent</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void runSimulator("shared")}>Providers share a failing system</button>
          </div>
          {simulationMessage && <p role="status" className="mt-3 text-sm">{simulationMessage}</p>}
        </details>
      )}
    </ProductShell>
  );
}
