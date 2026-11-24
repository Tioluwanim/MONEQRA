"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Copy,
  FileCheck2,
  GitBranch,
  Landmark,
  LockKeyhole,
  Play,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatKobo } from "@/lib/money";
import { landingData } from "@/lib/landing-data";
import {
  adeStores,
  calculateLiquidity,
  deriveDemoRecommendation,
  type RouteRelationship,
} from "@/lib/demo-finance";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  AuditEntry,
  ErrorState,
  IncidentCard,
  IncidentTimeline,
  LoadingSkeleton,
  MoneyValue,
  PaymentsTable,
  RoleSwitcher,
  ScenarioCard,
  ScenarioStrip,
  SimulationBanner,
  VerdictBadge,
} from "@/components/moneqra";
import { ApprovalMoment } from "@/components/motion";
import type { DemoRole } from "@/components/moneqra/types";
import { ActionButton, ActionLink, Eyebrow, IconBubble } from "@/components/site/primitives";
import { DependencyVisual } from "@/components/site/dependency-visual";
import FinanceChart from "@/components/site/finance-chart";

type StageKey = "incident" | "transactions" | "dependency" | "financial" | "decision" | "approval" | "report";

type Stage = {
  key: StageKey;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const STAGES: Stage[] = [
  {
    key: "incident",
    label: "Incident",
    eyebrow: "01 / THE SIGNAL",
    title: "A provider degrades at 14:10.",
    description: "The clock starts. We know something is wrong, but we do not yet know which payments are affected or what is spendable.",
    icon: Activity,
  },
  {
    key: "transactions",
    label: "Transactions",
    eyebrow: "02 / THE EVIDENCE",
    title: "Verify payments before counting money.",
    description: "Provider checks turn some unknowns into evidence. An inconclusive check leaves the payment unknown and blocks a retry.",
    icon: ScanLine,
  },
  {
    key: "dependency",
    label: "Dependency",
    eyebrow: "03 / THE NETWORK",
    title: "Check the route before recommending a switch.",
    description: "Two providers can still fail together. Explore the known links, an unverifiable link and a verified independent route.",
    icon: GitBranch,
  },
  {
    key: "financial",
    label: "Financial",
    eyebrow: "04 / THE POSITION",
    title: "Separate cash from assumptions.",
    description: "Move the recovery assumption and watch the position change. The unknown inflow never becomes confirmed cash.",
    icon: Wallet,
  },
  {
    key: "decision",
    label: "Decision",
    eyebrow: "05 / THE RECOMMENDATION",
    title: "Turn evidence into a governed proposal.",
    description: "The recommendation changes with the dependency verdict and the cash position. Every claim carries its evidence and limits.",
    icon: Landmark,
  },
  {
    key: "approval",
    label: "Approval",
    eyebrow: "06 / THE HUMAN GATE",
    title: "Only an authorised role can decide.",
    description: "Approve or reject as a demo role. The decision is recorded with a reason and a linked audit hash.",
    icon: ShieldCheck,
  },
  {
    key: "report",
    label: "Report",
    eyebrow: "07 / THE RECORD",
    title: "Leave with an auditable decision trail.",
    description: "Review the final position, the recommendation and the audit entries. Then continue into the live workspace.",
    icon: FileCheck2,
  },
];

type AuditRecord = {
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
  hash: string;
  previousHash: string | null;
};

function demoHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  }
  const base = (hash >>> 0).toString(16).padStart(8, "0");
  return `${base}${base.split("").reverse().join("")}`;
}

const INITIAL_AUDIT: AuditRecord[] = [
  {
    actor: "Provider feed",
    action: "Timeout burst detected",
    entity: "Provider A · 40 payment attempts",
    timestamp: "2026-11-19T14:10:00.000Z",
    hash: demoHash("incident-opened"),
    previousHash: null,
  },
  {
    actor: "MONEQRA",
    action: "Incident opened",
    entity: "INC-ADE-01410 · suspected",
    timestamp: "2026-11-19T14:25:00.000Z",
    hash: demoHash("incident-suspected"),
    previousHash: demoHash("incident-opened"),
  },
];

const incidentEvents = [
  { state: "suspected" as const, timestamp: "14:10", evidence: "Provider A reports elevated timeouts across 40 payment attempts." },
  { state: "confirmed" as const, timestamp: "16:32", evidence: "Failure domain correlated with a shared upstream switch." },
  { state: "monitoring" as const, timestamp: "16:45", evidence: "28 payments verified settled; 12 remain unknown." },
];

const samplePayments = [
  { id: "ade-settled-1", reference: "ade-settled-001", amount: 3000000, state: "settled" as const, lastProviderCheck: "Verified · 16:41" },
  { id: "ade-settled-2", reference: "ade-settled-002", amount: 3000000, state: "settled" as const, lastProviderCheck: "Verified · 16:41" },
  { id: "ade-unknown-1", reference: "ade-unknown-001", amount: 3000000, state: "unknown" as const, lastProviderCheck: "Inconclusive · 16:42" },
  { id: "ade-unknown-2", reference: "ade-unknown-002", amount: 3000000, state: "unknown" as const, lastProviderCheck: "Inconclusive · 16:42" },
];

const relationshipVerdict: Record<RouteRelationship, { verdict: "shared" | "independent" | "unverifiable"; reason: string }> = {
  shared: { verdict: "shared", reason: "Both routes reach the same failing upstream switch." },
  independent: { verdict: "independent", reason: "All links are known and no upstream node is shared." },
  unverifiable: { verdict: "unverifiable", reason: "One upstream link could not be confirmed." },
};

type CheckState = "idle" | "checking" | "done" | "error";

function StageCard({ stage, children }: { stage: Stage; children: ReactNode }) {
  const Icon = stage.icon;
  return (
    <div id="demo-stage" className="scroll-mt-28">
      <div className="flex flex-wrap items-center gap-3">
        <IconBubble color="var(--cobalt)"><Icon aria-hidden="true" className="size-5" /></IconBubble>
        <Eyebrow className="text-[var(--cobalt)]">{stage.eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-4 max-w-3xl font-heading text-[clamp(1.9rem,4vw,3rem)] leading-[1.1] tracking-[-0.02em] text-[var(--ink)]">{stage.title}</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">{stage.description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function DemoExperience() {
  const reduced = useReducedMotion();
  const [stageIndex, setStageIndex] = useState(0);
  const [relationship, setRelationship] = useState<RouteRelationship>("shared");
  const [recoveryBps, setRecoveryBps] = useState(6000);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [forceCheckFailure, setForceCheckFailure] = useState(false);
  const [role, setRole] = useState<DemoRole>("viewer");
  const [rejectReason, setRejectReason] = useState("");
  const [approval, setApproval] = useState<"approve" | "reject" | null>(null);
  const [audit, setAudit] = useState<AuditRecord[]>(INITIAL_AUDIT);
  const [copied, setCopied] = useState(false);
  const checkTimer = useRef<number | null>(null);
  const previousStage = useRef(0);

  const stage = STAGES[stageIndex];
  const position = useMemo(() => calculateLiquidity(recoveryBps), [recoveryBps]);
  const recommendation = useMemo(
    () => deriveDemoRecommendation(relationship, position),
    [relationship, position],
  );
  const canApprove = role === "approver" || role === "admin";

  const appendAudit = useCallback((actor: string, action: string, entity: string) => {
    setAudit((current) => {
      const previousHash = current[0]?.hash ?? null;
      const timestamp = new Date().toISOString();
      const hash = demoHash(`${actor}|${action}|${entity}|${timestamp}|${previousHash ?? "genesis"}`);
      return [{ actor, action, entity, timestamp, hash, previousHash }, ...current];
    });
  }, []);

  useEffect(() => () => {
    if (checkTimer.current !== null) window.clearTimeout(checkTimer.current);
  }, []);

  useEffect(() => {
    if (previousStage.current === stageIndex) return;
    previousStage.current = stageIndex;
    const element = document.getElementById("demo-stage");
    if (element && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  }, [stageIndex, reduced]);

  const runProviderCheck = () => {
    if (checkState === "checking") return;
    setCheckState("checking");
    if (checkTimer.current !== null) window.clearTimeout(checkTimer.current);
    checkTimer.current = window.setTimeout(() => {
      if (forceCheckFailure) {
        setCheckState("error");
        appendAudit("Provider feed", "Status check inconclusive", "ADE-UNKNOWN-001–012 · retry blocked");
      } else {
        setCheckState("done");
        appendAudit("Provider feed", "Settlement evidence received", "28 settled payments · ₦840,000");
      }
    }, 850);
  };

  const recordDecision = (kind: "approve" | "reject") => {
    if (!canApprove) return;
    if (kind === "reject" && rejectReason.trim().length === 0) return;
    setApproval(kind);
    setCopied(false);
    appendAudit(
      `User · ${role}`,
      kind === "approve" ? "Approved tier 2 recommendation" : "Rejected tier 2 recommendation",
      kind === "approve" ? "Rule 12 · Withhold reroute" : `Reason: ${rejectReason.trim()}`,
    );
  };

  const restart = () => {
    if (checkTimer.current !== null) window.clearTimeout(checkTimer.current);
    setStageIndex(0);
    setRelationship("shared");
    setRecoveryBps(6000);
    setCheckState("idle");
    setForceCheckFailure(false);
    setRole("viewer");
    setRejectReason("");
    setApproval(null);
    setAudit(INITIAL_AUDIT);
    setCopied(false);
  };

  const reportText = useMemo(() => [
    "MONEQRA — ADE STORES DECISION REPORT (SIMULATED)",
    `Generated: ${new Date("2026-11-19T16:59:00+01:00").toISOString()}`,
    "",
    `Incident: Provider A timeouts at ${adeStores.incidentAt}`,
    `Dependency verdict: ${relationship.toUpperCase()}`,
    `Confirmed cash: ${formatKobo(position.availableKobo)} (opening + ${adeStores.settledCount} settled)`,
    `Unknown inflows: ${formatKobo(position.unresolvedKobo)} — excluded from cash`,
    `Obligation due ${adeStores.deadline}: ${formatKobo(position.obligationKobo)}`,
    `Worst-case position: ${formatKobo(position.worstCaseKobo)}`,
    `Assumed recovery: ${position.recoveryBps / 100}% → ${formatKobo(position.recoveryKobo)} (assumption, not received)`,
    `Scenario position: ${formatKobo(position.scenarioKobo)}`,
    "",
    `Recommendation: ${recommendation.action}`,
    `Tier: ${recommendation.tier} — human approval required`,
    `Decision: ${approval ? approval.toUpperCase() : "NOT RECORDED"}`,
    approval === "reject" ? `Rejection reason: ${rejectReason.trim()}` : "",
    "",
    "Constraints: MONEQRA never moves money. Unknown payments are never confirmed cash.",
  ].filter(Boolean).join("\n"), [relationship, position, recommendation, approval, rejectReason]);

  const copyReport = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = reportText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const goNext = () => setStageIndex((current) => Math.min(STAGES.length - 1, current + 1));
  const goBack = () => setStageIndex((current) => Math.max(0, current - 1));

  const renderStage = () => {
    switch (stage.key) {
      case "incident":
        return (
          <StageCard stage={stage}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <IncidentCard
                title="Provider A timeout burst"
                severity="high"
                state="confirmed"
                evidence={[
                  "40 payment attempts affected since 14:10",
                  "12 provider checks returned no conclusive outcome",
                  "One supplier obligation is due at 17:00",
                ]}
              />
              <div className="premium-card p-5 sm:p-6">
                <Eyebrow className="text-[var(--cobalt)]">Incident timeline</Eyebrow>
                <div className="mt-4"><IncidentTimeline state="monitoring" events={incidentEvents} /></div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Affected attempts", "40"],
                ["Opened", adeStores.incidentAt],
                ["Decision deadline", adeStores.deadline],
              ].map(([label, value]) => (
                <div key={label} className="premium-card p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{label}</p>
                  <p className="numeric mt-2 text-2xl font-bold text-[var(--ink)]">{value}</p>
                </div>
              ))}
            </div>
          </StageCard>
        );

      case "transactions":
        return (
          <StageCard stage={stage}>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="premium-card premium-card--teal p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#0a6f61]">Verified settled · counted</p>
                <div className="mt-2"><MoneyValue kobo={adeStores.settledKobo} state="confirmed" /></div>
                <p className="mt-3 text-sm text-[var(--ink-muted)]">{adeStores.settledCount} payments · provider evidence received</p>
              </article>
              <article className="premium-card premium-card--coral p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#a63a1c]">Unknown · excluded</p>
                <div className="mt-2"><MoneyValue kobo={adeStores.unknownKobo} state="unknown" /></div>
                <p className="mt-3 text-sm text-[var(--ink-muted)]">{adeStores.unknownCount} payments · retry blocked until evidence exists</p>
              </article>
            </div>

            <div className="premium-card mt-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Eyebrow className="text-[var(--cobalt)]">Provider check simulation</Eyebrow>
                  <h3 className="mt-2 font-heading text-2xl text-[var(--ink)]">Run the status check</h3>
                </div>
                <ActionButton tone="primary" onClick={runProviderCheck} disabled={checkState === "checking"}>
                  {checkState === "checking" ? "Checking…" : checkState === "idle" ? "Run check" : "Run again"}
                  {checkState !== "checking" && <Play aria-hidden="true" className="size-3.5" />}
                </ActionButton>
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--ledger-rule)] bg-white/60 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={forceCheckFailure}
                  onChange={(event) => {
                    setForceCheckFailure(event.target.checked);
                    setCheckState("idle");
                  }}
                  className="size-4 accent-[var(--coral)]"
                />
                <span>Simulate an inconclusive provider response</span>
                <AlertTriangle aria-hidden="true" className="size-4 text-[var(--coral)]" />
              </label>
              <div className="mt-4 min-h-24" aria-live="polite">
                {checkState === "idle" && (
                  <p className="rounded-xl border border-dashed border-[var(--ledger-rule-strong)] p-4 text-sm text-[var(--ink-muted)]">
                    No check has run in this session. The 12 payments remain unknown by default.
                  </p>
                )}
                {checkState === "checking" && <LoadingSkeleton rows={3} />}
                {checkState === "error" && (
                  <ErrorState
                    title="Provider check inconclusive"
                    detail="No verified outcome was returned. The payments remain unknown and retries stay blocked."
                  />
                )}
                {checkState === "done" && (
                  <div role="status" className="flex items-start gap-3 rounded-xl border border-[var(--teal)]/25 bg-[var(--teal-soft)] p-4">
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#0a6f61]" />
                    <div>
                      <strong className="text-sm text-[var(--ink)]">Settlement evidence received</strong>
                      <p className="mt-1 text-sm text-[#0a6f61]">28 payments are confirmed settled. The 12 unresolved payments are still excluded from cash.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="premium-card mt-5 overflow-hidden">
              <div className="border-b border-[var(--ledger-rule)] px-5 py-4">
                <Eyebrow className="text-[var(--cobalt)]">Payment ledger · sample</Eyebrow>
              </div>
              <div className="overflow-x-auto">
                <PaymentsTable
                  payments={samplePayments.map((payment) => ({
                    ...payment,
                    checkFailed: checkState === "error" && payment.state === "unknown",
                  }))}
                />
              </div>
            </div>
          </StageCard>
        );

      case "dependency":
        return (
          <StageCard stage={stage}>
            <DependencyVisual
              relationship={relationship}
              onRelationshipChange={setRelationship}
              dark={false}
              showControls
              className="!grid-cols-1"
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <VerdictBadge verdict={relationshipVerdict[relationship].verdict} reason={relationshipVerdict[relationship].reason} />
              <p className="text-sm text-[var(--ink-muted)]">
                {relationship === "independent"
                  ? "This route may help new inflows, but it does not create cash before the deadline."
                  : "The 12 unknown payments still require verification before any cash claim."}
              </p>
            </div>
          </StageCard>
        );

      case "financial":
        return (
          <StageCard stage={stage}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <article className="premium-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Eyebrow className="text-[var(--cobalt)]">Liquidity explorer</Eyebrow>
                    <h3 className="mt-2 font-heading text-2xl text-[var(--ink)]">What if some unknown funds recover?</h3>
                  </div>
                  <span className="pill">integer kobo</span>
                </div>
                <div className="mt-5"><FinanceChart position={position} compact /></div>
              </article>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Opening available", value: adeStores.openingAvailableKobo, state: "confirmed" as const },
                  { label: "Settled inflows", value: adeStores.settledKobo, state: "confirmed" as const },
                  { label: "Unknown inflows", value: adeStores.unknownKobo, state: "unknown" as const },
                  { label: "Obligation", value: adeStores.obligationKobo, state: "pending" as const },
                ].map((row) => (
                  <div key={row.label} className="premium-card flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{row.label}</p>
                      <div className="mt-1"><MoneyValue kobo={row.value} state={row.state} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-card mt-5 p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Eyebrow className="text-[var(--cobalt)]">Recovery assumption</Eyebrow>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-muted)]">
                    Recovery is calculated from the 12 unknown payments, rounded down in whole kobo. It is an assumption, not money received.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[var(--ink-muted)]">0%</span>
                  <input
                    type="range"
                    min={0}
                    max={10000}
                    step={500}
                    value={recoveryBps}
                    onChange={(event) => setRecoveryBps(Number(event.target.value))}
                    aria-label="Assumed recovery rate in basis points"
                    className="h-2 w-48 cursor-pointer accent-[var(--cobalt)] sm:w-64"
                  />
                  <span className="font-mono text-xs text-[var(--ink-muted)]">100%</span>
                  <output className="numeric min-w-14 text-right text-sm font-bold text-[var(--cobalt)]">{recoveryBps / 100}%</output>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {landingData.scenarios.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => setRecoveryBps(scenario.assumptionBps)}
                    aria-pressed={recoveryBps === scenario.assumptionBps}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                      recoveryBps === scenario.assumptionBps
                        ? "border-[var(--cobalt)] bg-[var(--cobalt-soft)] shadow-[var(--shadow-glow)]"
                        : "border-[var(--ledger-rule)] bg-white/60 hover:border-[var(--cobalt)]"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">{scenario.label}</span>
                    <span className="numeric mt-1 block text-lg font-bold text-[var(--ink)]">{formatKobo(scenario.positionKobo)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <ScenarioStrip>
                <ScenarioCard label="Worst case" probabilityBps={0} position={position.worstCaseKobo} />
                <ScenarioCard label="Assumed recovery" probabilityBps={position.recoveryBps} position={position.scenarioKobo} estimated />
                <ScenarioCard label="Fully recovered" probabilityBps={10000} position={calculateLiquidity(10000).scenarioKobo} estimated />
              </ScenarioStrip>
            </div>
            <p className="mt-4 rounded-xl border border-dashed border-[var(--coral)]/35 bg-[var(--coral-soft)] p-4 text-sm text-[#a63a1c]">
              {formatKobo(adeStores.unknownKobo)} of unknown inflows is never counted as confirmed cash, even in the full-recovery scenario.
            </p>
          </StageCard>
        );

      case "decision":
        return (
          <StageCard stage={stage}>
            <article className="premium-card premium-card--violet p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="pill"><ShieldCheck aria-hidden="true" className="size-3" /> tier {recommendation.tier} · human approval required</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{relationship} route · {recoveryBps / 100}% assumption</span>
              </div>
              <h3 className="mt-6 font-heading text-3xl leading-tight text-[var(--ink)] sm:text-4xl">{recommendation.action}</h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ink-muted)]">{recommendation.summary}</p>
              <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Reasons", recommendation.reasons],
                  ["Evidence", recommendation.evidence],
                  ["Risks", recommendation.risks],
                  ["Limitations", recommendation.limitations],
                ].map(([label, lines]) => (
                  <div key={String(label)} className="border-t border-[var(--violet)]/25 pt-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--violet)]">{String(label)}</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--ink-muted)]">
                      {(lines as string[]).map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-6 rounded-xl bg-white/65 px-4 py-3 text-sm text-[var(--ink-muted)]">
                <strong className="text-[var(--ink)]">Confidence:</strong> {recommendation.confidence}
              </p>
            </article>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <ActionButton tone="outline" onClick={() => setStageIndex(2)}>Change dependency branch</ActionButton>
              <ActionButton tone="outline" onClick={() => setStageIndex(3)}>Adjust recovery assumption</ActionButton>
              <Link href="/dependency" className="text-sm text-[var(--cobalt)] underline underline-offset-4">Compare with the workspace dependency screen</Link>
            </div>
          </StageCard>
        );

      case "approval":
        return (
          <StageCard stage={stage}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <article className="premium-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Eyebrow className="text-[var(--cobalt)]">Approval gate</Eyebrow>
                    <h3 className="mt-2 font-heading text-2xl text-[var(--ink)]">Record a human decision</h3>
                  </div>
                  <RoleSwitcher role={role} onChange={setRole} />
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
                  Current role: <strong className="text-[var(--ink)]">{role}</strong>. {canApprove ? "You are authorised to approve or reject." : "Inspect only — approval requires approver or admin."}
                </p>
                <label className="mt-5 block text-xs font-semibold text-[var(--ink-muted)]" htmlFor="demo-reject-reason">Reason for rejection</label>
                <input
                  id="demo-reject-reason"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  disabled={!canApprove}
                  placeholder="Required when rejecting"
                  className="mt-2 w-full rounded-lg border border-[var(--ledger-rule-strong)] bg-white/70 px-3 py-2.5 text-sm disabled:opacity-50"
                />
                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionButton tone="primary" disabled={!canApprove} onClick={() => recordDecision("approve")}>Approve</ActionButton>
                  <ActionButton tone="outline" disabled={!canApprove || rejectReason.trim().length === 0} onClick={() => recordDecision("reject")}>Reject</ActionButton>
                </div>
                {!canApprove && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-[var(--coral)]"><LockKeyhole aria-hidden="true" className="size-3.5" /> Viewer and operator roles cannot record decisions.</p>
                )}
                {approval && (
                  <div className="mt-5 border-t border-[var(--ledger-rule)] pt-5">
                    <ApprovalMoment
                      action={approval}
                      rule="Rule 12 · Withhold reroute"
                      hash={audit[0]?.hash ?? "a1b2c3d4e5f6"}
                    />
                  </div>
                )}
              </article>

              <article className="premium-card premium-card--dark p-5 sm:p-6">
                <Eyebrow className="text-[#7df0d0]">Decision preview</Eyebrow>
                <h3 className="mt-3 font-heading text-2xl text-white">{recommendation.action}</h3>
                <div className="mt-5 space-y-2 text-sm text-[#c3d1ea]">
                  <div className="flex justify-between gap-3"><span>Worst case</span><strong className="numeric text-white">{formatKobo(position.worstCaseKobo)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Assumption</span><strong className="numeric text-white">{formatKobo(position.recoveryKobo)}</strong></div>
                  <div className="flex justify-between gap-3"><span>Unknown cash</span><strong className="numeric text-[#ff9b7e]">₦0 counted</strong></div>
                </div>
                <p className="mt-5 border-t border-white/12 pt-4 text-xs leading-5 text-[#9fb4d9]">
                  {approval
                    ? `Decision ${approval} recorded by ${role}. MONEQRA still does not move money.`
                    : "No decision recorded yet. The report will mark this as not recorded."}
                </p>
              </article>
            </div>
          </StageCard>
        );

      case "report":
        return (
          <StageCard stage={stage}>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <article className="premium-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Eyebrow className="text-[var(--cobalt)]">Ade Stores · decision report</Eyebrow>
                    <h3 className="mt-2 font-heading text-2xl text-[var(--ink)]">Simulation summary</h3>
                  </div>
                  <span className="pill pill-coral"><Clock3 aria-hidden="true" className="size-3" /> 19 Nov · 17:00</span>
                </div>
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Confirmed cash", formatKobo(position.availableKobo)],
                    ["Obligation", formatKobo(position.obligationKobo)],
                    ["Worst-case gap", formatKobo(position.worstCaseKobo)],
                    ["Assumed recovery", `${formatKobo(position.recoveryKobo)} · ${position.recoveryBps / 100}%`],
                    ["Scenario position", formatKobo(position.scenarioKobo)],
                    ["Unknown excluded", formatKobo(adeStores.unknownKobo)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[var(--ledger-rule)] bg-white/60 p-3">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">{label}</dt>
                      <dd className="numeric mt-1 text-lg font-bold text-[var(--ink)]">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 rounded-xl border border-[var(--violet)]/20 bg-[var(--violet-soft)] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--violet)]">Recommendation</p>
                  <p className="mt-1 font-heading text-xl text-[var(--ink)]">{recommendation.action}</p>
                  <p className="mt-2 text-sm text-[var(--ink-muted)]">Verdict: {relationship}. Assumption: {position.recoveryBps / 100}% recovery (not received cash).</p>
                </div>
                <div className="mt-5 rounded-xl border border-[var(--ledger-rule)] bg-white/60 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">Recorded decision</p>
                  <p className="mt-1 font-heading text-xl text-[var(--ink)]">{approval ? approval.toUpperCase() : "NOT RECORDED"}</p>
                  {approval === "reject" && <p className="mt-1 text-sm text-[var(--ink-muted)]">Reason: {rejectReason.trim()}</p>}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <ActionButton tone="primary" onClick={copyReport}><Copy aria-hidden="true" className="size-4" /> {copied ? "Report copied" : "Copy report"}</ActionButton>
                  <ActionButton tone="outline" onClick={restart}><RotateCcw aria-hidden="true" className="size-4" /> Restart demo</ActionButton>
                  <ActionLink href="/overview" tone="teal">Enter Workspace</ActionLink>
                </div>
              </article>

              <article className="premium-card premium-card--dark p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <Eyebrow className="text-[#7df0d0]">Audit trail</Eyebrow>
                  <span className="pill pill-dark pill--xs">{audit.length} entries</span>
                </div>
                <div className="mt-4 max-h-[26rem] overflow-y-auto pr-1">
                  {audit.map((entry) => (
                    <div key={entry.hash} className="border-b border-white/10 py-3 text-white last:border-0 [&_span]:text-[#b6c6e6] [&_strong]:text-white [&_time]:text-[#b6c6e6]">
                      <AuditEntry {...entry} />
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-[#9fb4d9]">
                  Each hash links to the previous entry. This is a local demonstration ledger, not a backend submission.
                </p>
              </article>
            </div>
          </StageCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf1] text-[var(--ink)]">
      <SimulationBanner />
      <div className="hero-mesh border-b border-white/10 px-0 py-12 text-white">
        <div className="section-shell">
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9fb4d9] hover:text-white">
            <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to the story
          </Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
            <div>
              <Eyebrow className="text-[#7df0d0]">Guided interactive demo · 7 stages · about 4 minutes</Eyebrow>
              <h1 className="mt-3 font-heading text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05] tracking-[-0.02em]">Ade Stores: from timeout to decision</h1>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#9fb4d9]">Progress</p>
              <p className="numeric mt-1 text-2xl font-bold">{String(stageIndex + 1).padStart(2, "0")} <span className="text-base font-normal text-[#7f92b5]">/ 07</span></p>
            </div>
          </div>
          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/12">
            <div className="progress-fill h-full rounded-full bg-gradient-to-r from-[var(--teal-bright)] via-[var(--cobalt-bright)] to-[var(--violet-bright)]" style={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }} />
          </div>
          <ol className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7" aria-label="Demo stages">
            {STAGES.map((item, index) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => setStageIndex(index)}
                  aria-label={`Stage ${index + 1}: ${item.label}`}
                  aria-current={index === stageIndex ? "step" : undefined}
                  className={`w-full rounded-lg px-2 py-2 text-left text-[10px] font-semibold transition-colors ${
                    index === stageIndex
                      ? "bg-white/14 text-white"
                      : index < stageIndex
                        ? "text-[#7df0d0] hover:bg-white/8"
                        : "text-[#7f92b5] hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <span className="numeric mr-1">{String(index + 1).padStart(2, "0")}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="section-shell py-12 md:py-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.key}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderStage()}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex flex-col gap-4 border-t border-[var(--ledger-rule)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">Stage {stageIndex + 1} of {STAGES.length}</p>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{stage.label}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton tone="outline" onClick={goBack} disabled={stageIndex === 0}><ArrowLeft aria-hidden="true" className="size-4" /> Back</ActionButton>
            <ActionButton tone="primary" onClick={goNext} disabled={stageIndex === STAGES.length - 1}>
              {stageIndex === STAGES.length - 2 ? "Finish to report" : "Continue"}
              {stageIndex < STAGES.length - 1 && <ArrowRight aria-hidden="true" className="size-4 action-btn__arrow" />}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
