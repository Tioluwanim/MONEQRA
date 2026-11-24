"use client";

import { useState } from "react";
import {
  AuditEntry,
  IncidentCard,
  IncidentTimeline,
  LoadingSkeleton,
  MoneyValue,
  PaymentRow,
  ProviderHealthChip,
  RecommendationCard,
  RoleSwitcher,
  ScenarioCard,
  ScenarioStrip,
  SimulationBanner,
  StateLegend,
  VerdictBadge,
} from "@/components/moneqra";
import { Button } from "@/components/ui/button";

export default function ComponentGalleryPage() {
  const [night, setNight] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [role, setRole] = useState<"viewer" | "operator" | "approver" | "admin">("approver");
  return (
    <main className={night ? "dark min-h-screen" : "min-h-screen"}>
      <div className="mx-auto max-w-6xl bg-[var(--paper)] px-6 py-8 text-[var(--ink)]">
        <SimulationBanner />
        <header className="relative my-6 border-y border-[var(--ledger-rule)] py-4">
          {night && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[var(--vermilion)]" />}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs">INTERNAL / VISUAL QA</p>
              <h1 className="text-4xl">MONEQRA ledger components</h1>
            </div>
            <RoleSwitcher role={role} onChange={setRole} />
          </div>
        </header>
        <div className="mb-8 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setNight((value) => !value)}>
            {night ? "Day theme" : "Night theme"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setReducedMotion((value) => !value)}>
            {reducedMotion ? "Enable motion" : "Reduce motion"}
          </Button>
        </div>
        <div className={reducedMotion ? "motion-reduce:transition-none" : ""}>
          <section className="grid gap-6 border-b border-[var(--ledger-rule)] pb-8">
            <h2 className="text-2xl">Money states</h2>
            <div className="flex flex-wrap gap-3">
              <MoneyValue kobo={84000000} state="confirmed" ticker />
              <MoneyValue kobo={36000000} state="unknown" />
              <MoneyValue kobo={21600000} state="estimated" ticker />
              <MoneyValue kobo={15000000} state="pending" />
            </div>
            <StateLegend />
          </section>
          <section className="grid gap-6 py-8">
            <h2 className="text-2xl">Incident and provider</h2>
            <ProviderHealthChip name="Fictional Provider One" health="incident" successRate={72} lastChecked="16:32 UTC" />
            <IncidentCard
              title="Shared upstream failure"
              severity="critical"
              state="confirmed"
              evidence={["12 unknown payments", "Provider status checks remain inconclusive"]}
            />
            <IncidentTimeline
              state="confirmed"
              events={[
                { state: "suspected", timestamp: "2026-11-19T16:20:00+01:00", evidence: "Timeout threshold exceeded" },
                { state: "confirmed", timestamp: "2026-11-19T16:25:00+01:00", evidence: "Shared upstream corroborated" },
              ]}
            />
          </section>
          <section className="grid gap-6 py-8">
            <h2 className="text-2xl">Payment and verdict</h2>
            <table className="w-full"><tbody>
              <PaymentRow reference="ade-unknown-1" amount={3000000} state="unknown" lastProviderCheck="Failed · 16:30 UTC" checkFailed />
            </tbody></table>
            <VerdictBadge verdict="shared" reason="Both routes share the failing upstream switch." />
          </section>
          <section className="py-8">
            <h2 className="mb-4 text-2xl">Scenarios</h2>
            <ScenarioStrip>
              <ScenarioCard label="No recovery" probabilityBps={0} position={-11000000} />
              <ScenarioCard label="Assumed recovery" probabilityBps={6000} position={10600000} estimated />
              <ScenarioCard label="Full recovery" probabilityBps={10000} position={25000000} />
            </ScenarioStrip>
          </section>
          <section className="py-8">
            <RecommendationCard
              action="Withhold reroute; offer an extension request"
              tier={2}
              reasons={["The worst-case position is short."]}
              evidence={["Shared dependency", "12 unknown payments"]}
              limitations={["Recovery probability is an assumption."]}
              role={role}
            />
          </section>
          <section className="py-8">
            <h2 className="mb-4 text-2xl">Audit</h2>
            <AuditEntry actor="demo-approver" action="seed_ade_stores" entity="organisation" timestamp="2026-11-19T16:30:00+01:00" hash="a1b2c3d4e5f6" previousHash={null} />
          </section>
          <section className="py-8">
            <h2 className="mb-4 text-2xl">Loading</h2>
            <LoadingSkeleton rows={3} />
          </section>
        </div>
      </div>
    </main>
  );
}
