"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, RotateCcw } from "lucide-react";
import { formatKobo } from "@/lib/money";
import { adeStores, calculateLiquidity, deriveDemoRecommendation, type RouteRelationship } from "@/lib/demo-finance";
import { routeVerdictLabels, roleLabels } from "@/lib/labels";
import {
  AuditEntry, IncidentTimeline, MoneyValue, RecommendationCard, RouteChain, ScenarioCard, ScenarioStrip, StatusPill,
} from "@/components/moneqra";
import type { DemoRole } from "@/components/moneqra/types";
import { ActionButton, ActionLink } from "@/components/site/primitives";

const STEPS = [
  { key: "incident", label: "The problem", title: "A payment provider slows down", description: "Ade Stores notices that customer payments are not coming through. Here is what happened." },
  { key: "payments", label: "Payments", title: "Which payments are confirmed?", description: "Ask the provider. If it cannot answer, those payments stay “not confirmed” and are not counted." },
  { key: "route", label: "Switching", title: "Can you switch providers?", description: "Switching only helps if the other provider does not use the same failing system." },
  { key: "money", label: "Your money", title: "How much money do you really have?", description: "Only confirmed money counts. Move the slider to guess how many waiting payments arrive." },
  { key: "decision", label: "Decision", title: "What should you do?", description: "We suggest an action. Only an approver can say yes, and it is recorded." },
] as const;

type AuditRecord = { actor: string; action: string; entity: string; timestamp: string; hash: string; previousHash: string | null };

function demoHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  const base = (hash >>> 0).toString(16).padStart(8, "0");
  return `${base}${base.split("").reverse().join("")}`;
}

const INITIAL_AUDIT: AuditRecord[] = [
  { actor: "Provider feed", action: "Timeouts noticed", entity: "Provider A · 40 payment attempts", timestamp: "2026-11-19T14:10:00.000Z", hash: demoHash("incident-opened"), previousHash: null },
  { actor: "MONEQRA", action: "Opened a payment problem", entity: "Provider A", timestamp: "2026-11-19T14:25:00.000Z", hash: demoHash("incident-suspected"), previousHash: demoHash("incident-opened") },
];

const incidentEvents = [
  { state: "suspected" as const, timestamp: "14:10", evidence: "Provider A is timing out on many payments." },
  { state: "confirmed" as const, timestamp: "16:32", evidence: "The cause points to a network switch both providers use." },
  { state: "monitoring" as const, timestamp: "16:45", evidence: "28 payments are confirmed. 12 are still not confirmed." },
];

const routes: Record<RouteRelationship, { name: string; steps: { id: string; label: string; kind: string; failing?: boolean }[] }[]> = {
  shared: [
    { name: "Provider A", steps: [{ id: "s1", label: "Ade Stores", kind: "business" }, { id: "s2", label: "Provider A", kind: "provider" }, { id: "s3", label: "Network switch", kind: "switch", failing: true }] },
    { name: "Provider B", steps: [{ id: "s4", label: "Ade Stores", kind: "business" }, { id: "s5", label: "Provider B", kind: "provider" }, { id: "s3", label: "Network switch", kind: "switch", failing: true }] },
  ],
  independent: [
    { name: "Provider A", steps: [{ id: "i1", label: "Ade Stores", kind: "business" }, { id: "i2", label: "Provider A", kind: "provider" }, { id: "i3", label: "Network switch 1", kind: "switch", failing: true }] },
    { name: "Provider B", steps: [{ id: "i4", label: "Ade Stores", kind: "business" }, { id: "i5", label: "Provider B", kind: "provider" }, { id: "i6", label: "Network switch 2", kind: "switch" }] },
  ],
  unverifiable: [
    { name: "Provider A", steps: [{ id: "u1", label: "Ade Stores", kind: "business" }, { id: "u2", label: "Provider A", kind: "provider" }, { id: "u3", label: "Network switch", kind: "switch", failing: true }] },
    { name: "Provider B", steps: [{ id: "u4", label: "Ade Stores", kind: "business" }, { id: "u5", label: "Provider B", kind: "provider" }, { id: "u6", label: "Unknown link", kind: "switch" }] },
  ],
};

type CheckState = "idle" | "checking" | "done" | "error";

export function DemoExperience() {
  const [index, setIndex] = useState(0);
  const [relationship, setRelationship] = useState<RouteRelationship>("shared");
  const [recoveryBps, setRecoveryBps] = useState(6000);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [forceFailure, setForceFailure] = useState(false);
  const [role, setRole] = useState<DemoRole>("viewer");
  const [approval, setApproval] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [audit, setAudit] = useState<AuditRecord[]>(INITIAL_AUDIT);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const step = STEPS[index];
  const position = useMemo(() => calculateLiquidity(recoveryBps), [recoveryBps]);
  const recommendation = useMemo(() => deriveDemoRecommendation(relationship, position), [relationship, position]);
  const canApprove = role === "approver" || role === "admin";
  const verdict = routeVerdictLabels[relationship];

  const appendAudit = useCallback((actor: string, action: string, entity: string) => {
    setAudit((current) => {
      const previousHash = current[0]?.hash ?? null;
      const timestamp = new Date().toISOString();
      return [{ actor, action, entity, timestamp, hash: demoHash(`${actor}|${action}|${entity}|${timestamp}|${previousHash ?? "genesis"}`), previousHash }, ...current];
    });
  }, []);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    headingRef.current?.focus();
  }, [index]);

  const runCheck = () => {
    if (checkState === "checking") return;
    setCheckState("checking");
    timer.current = window.setTimeout(() => {
      if (forceFailure) {
        setCheckState("error");
        appendAudit("Provider feed", "Check was inconclusive", "12 payments · retry blocked");
      } else {
        setCheckState("done");
        appendAudit("Provider feed", "Payments confirmed", "28 payments · ₦840,000");
      }
    }, 800);
  };

  const decide = (kind: "approve" | "reject", why?: string) => {
    if (!canApprove) return;
    setApproval(kind);
    setCopied(false);
    if (kind === "reject") setReason(why ?? "");
    appendAudit(`User · ${role}`, kind === "approve" ? "Approved the recommendation" : "Declined the recommendation", kind === "approve" ? recommendation.action : `Reason: ${why ?? ""}`);
  };

  const restart = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setIndex(0); setRelationship("shared"); setRecoveryBps(6000); setCheckState("idle"); setForceFailure(false);
    setRole("viewer"); setApproval(null); setReason(""); setAudit(INITIAL_AUDIT); setCopied(false);
  };

  const reportText = [
    "MONEQRA · ADE STORES DECISION SUMMARY (SIMULATED)",
    `Provider A problem started at ${adeStores.incidentAt}`,
    `Can you switch? ${verdict.label}`,
    `In your account: ${formatKobo(position.availableKobo)}`,
    `Not confirmed yet (not counted): ${formatKobo(position.unresolvedKobo)}`,
    `Due at ${adeStores.deadline}: ${formatKobo(position.obligationKobo)}`,
    `Worst case: ${formatKobo(position.worstCaseKobo)}`,
    `Estimate with ${position.recoveryBps / 100}% arriving: ${formatKobo(position.scenarioKobo)} (assumption, not received)`,
    `Recommendation: ${recommendation.action}`,
    `Decision: ${approval ? (approval === "approve" ? "Approved" : `Declined (${reason})`) : "Not recorded"}`,
    "MONEQRA never moves money.",
  ].join("\n");

  const copyReport = async () => {
    try { await navigator.clipboard.writeText(reportText); setCopied(true); } catch { setCopied(false); }
  };

  const body = () => {
    switch (step.key) {
      case "incident":
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="card card-pad"><IncidentTimeline state="monitoring" events={incidentEvents} /></div>
            <div className="card card-pad content-start">
              <h2 className="text-lg">The situation</h2>
              <p className="mt-2 text-[var(--text-muted)]">{adeStores.name} owes its supplier {formatKobo(adeStores.obligationKobo)} at {adeStores.deadline} today. Some customer payments are stuck.</p>
            </div>
          </div>
        );
      case "payments":
        return (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card card-pad"><MoneyValue kobo={adeStores.settledKobo} state="confirmed" label="In your account" /><p className="mt-2 text-sm text-[var(--text-muted)]">{adeStores.settledCount} payments confirmed</p></div>
              <div className="card card-pad"><MoneyValue kobo={adeStores.unknownKobo} state="unknown" /><p className="mt-2 text-sm text-[var(--text-muted)]">{adeStores.unknownCount} payments. Retrying is blocked so nobody is charged twice.</p></div>
            </div>
            <div className="card card-pad">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={forceFailure} onChange={(e) => { setForceFailure(e.target.checked); setCheckState("idle"); }} className="size-4" /> Pretend the provider gives an inconclusive answer</label>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ActionButton onClick={runCheck} disabled={checkState === "checking"}>{checkState === "checking" ? "Checking…" : "Check with provider"}</ActionButton>
                <span role="status" className="text-[var(--text-muted)]">
                  {checkState === "done" && "The provider confirmed the settled payments. The 12 others are still not confirmed."}
                  {checkState === "error" && "The check failed. These payments are still not confirmed and are not counted."}
                </span>
              </div>
            </div>
          </div>
        );
      case "route":
        return (
          <div className="grid gap-5">
            <div className="segmented" role="group" aria-label="What do the providers depend on?">
              {(["shared", "independent", "unverifiable"] as RouteRelationship[]).map((r) => (
                <button key={r} type="button" aria-pressed={relationship === r} onClick={() => setRelationship(r)}>
                  {r === "shared" ? "Same failing system" : r === "independent" ? "Separate systems" : "Not sure"}
                </button>
              ))}
            </div>
            <div className="grid gap-3">{routes[relationship].map((r) => <RouteChain key={r.name} name={r.name} steps={r.steps} />)}</div>
            <div className={`callout ${relationship === "independent" ? "callout-good" : relationship === "shared" ? "callout-bad" : "callout-warn"}`}>
              <div><StatusPill tone={verdict.tone}>{verdict.label}</StatusPill><p className="mt-2 text-lg font-semibold">{verdict.headline}</p><p className="text-[var(--text-muted)]">{verdict.hint}</p></div>
            </div>
          </div>
        );
      case "money":
        return (
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card card-pad"><MoneyValue kobo={position.availableKobo} state="confirmed" /></div>
              <div className="card card-pad"><MoneyValue kobo={position.obligationKobo} state="pending" label="Due at the deadline" /></div>
              <div className="card card-pad"><MoneyValue kobo={position.unresolvedKobo} state="unknown" /></div>
            </div>
            <div className="card card-pad">
              <label htmlFor="recovery" className="font-semibold">How many of the waiting payments arrive? <span className="num text-[var(--brand)]">{position.recoveryBps / 100}%</span></label>
              <input id="recovery" type="range" aria-label="Assumed recovery rate" min={0} max={10000} step={500} value={recoveryBps} onChange={(e) => setRecoveryBps(Number(e.target.value))} className="mt-3 w-full accent-[var(--brand)]" />
              <p className="mt-2 text-sm text-[var(--text-muted)]">This is a guess. It is never counted as confirmed cash.</p>
            </div>
            <ScenarioStrip>
              <ScenarioCard label="Worst case" probabilityBps={0} position={position.worstCaseKobo} description="None arrive" />
              <ScenarioCard label="Your guess" probabilityBps={position.recoveryBps} position={position.scenarioKobo} estimated description="An estimate, not a promise" />
              <ScenarioCard label="Best case" probabilityBps={10000} position={calculateLiquidity(10000).scenarioKobo} description="All arrive" />
            </ScenarioStrip>
          </div>
        );
      case "decision":
        return (
          <div className="grid gap-5">
            <div className="card card-pad flex flex-wrap items-center gap-3">
              <label htmlFor="demo-role" className="font-semibold">Pretend you are</label>
              <select id="demo-role" aria-label="Demo role" value={role} onChange={(e) => setRole(e.target.value as DemoRole)} className="field h-10 w-auto">
                {(Object.keys(roleLabels) as DemoRole[]).map((r) => <option key={r} value={r}>{roleLabels[r].label}</option>)}
              </select>
              <span className="text-sm text-[var(--text-muted)]">{roleLabels[role].hint}</span>
            </div>
            <RecommendationCard
              action={recommendation.action}
              tier={recommendation.tier}
              reasons={recommendation.reasons}
              evidence={recommendation.evidence}
              limitations={recommendation.limitations}
              role={role}
              onApprove={() => decide("approve")}
              onReject={(why) => decide("reject", why)}
            />
            {approval && (
              <div role="status" className="callout callout-good">
                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-[var(--good)]" />
                <div><strong>{approval === "approve" ? "Approved and recorded." : "Declined and recorded."}</strong> <span className="text-[var(--text-muted)]">No money was moved.</span></div>
              </div>
            )}
            <section aria-labelledby="demo-history"><h2 id="demo-history" className="mb-3 text-lg">Decision history</h2>
              <ul className="grid gap-3">{audit.map((a) => <AuditEntry key={a.hash} actor={a.actor} action={a.action} entity={a.entity} timestamp={a.timestamp} hash={a.hash} previousHash={a.previousHash} />)}</ul>
            </section>
            <div className="card card-pad flex flex-wrap items-center gap-3">
              <ActionButton variant="secondary" onClick={() => void copyReport()}><Copy aria-hidden="true" className="size-4" /> Copy summary</ActionButton>
              {copied && <span role="status" className="text-sm text-[var(--good-ink)]">Copied</span>}
              <ActionLink href="/overview" className="ml-auto">Open the workspace <ArrowRight aria-hidden="true" className="size-4" /></ActionLink>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="page-width py-10">
      <div className="callout callout-info mb-8"><div>This is a guided demo with simulated data. Nothing here is real and no money moves.</div></div>
      <nav aria-label="Demo steps" className="mb-8">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button type="button" aria-label={`Step ${i + 1}: ${s.label}`} aria-current={i === index ? "step" : undefined} onClick={() => setIndex(i)} className="w-full text-left">
                <span className={`block h-1.5 rounded-full ${i <= index ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"}`} />
                <span className={`mt-2 hidden text-sm sm:block ${i === index ? "font-semibold text-[var(--text)]" : "text-[var(--text-muted)]"}`}>{i + 1}. {s.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-[var(--text-muted)] sm:hidden">Step {index + 1} of {STEPS.length}: {step.label}</p>
      </nav>
      <header className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold text-[var(--brand)]">Step {index + 1} of {STEPS.length}</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl outline-none sm:text-4xl">{step.title}</h1>
        <p className="mt-3 text-lg text-[var(--text-muted)]">{step.description}</p>
      </header>
      {body()}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <ActionButton variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}><ArrowLeft aria-hidden="true" className="size-4" /> Back</ActionButton>
          <ActionButton variant="ghost" onClick={restart}><RotateCcw aria-hidden="true" className="size-4" /> Start over</ActionButton>
        </div>
        {index < STEPS.length - 1 ? (
          <ActionButton large onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}>Next: {STEPS[index + 1].label} <ArrowRight aria-hidden="true" className="size-4" /></ActionButton>
        ) : (
          <Link href="/" className="btn btn-secondary">Back to the start</Link>
        )}
      </div>
    </div>
  );
}
