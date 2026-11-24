"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownRight,
  CircleDollarSign,
  Clock3,
  GitBranch,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { formatKobo } from "@/lib/money";
import { landingData } from "@/lib/landing-data";
import { calculateLiquidity, deriveDemoRecommendation } from "@/lib/demo-finance";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ApprovalMoment } from "@/components/motion";
import { synforgeTeam } from "@/lib/team";
import type { DemoRole } from "@/components/moneqra/types";
import FinanceChart from "./finance-chart";
import { DependencyVisual, type RouteRelationship } from "./dependency-visual";
import { ActionButton, ActionLink, Eyebrow, IconBubble, Reveal, SectionHeading, StaggerGroup, StaggerItem } from "./primitives";

export function SignalRail() {
  const events = [
    ["14:10", "PROVIDER A TIMEOUTS"],
    ["14:25", "INCIDENT SUSPECTED"],
    ["16:32", "INCIDENT CONFIRMED"],
    ["17:00", "SUPPLIER DEADLINE"],
  ];
  return (
    <div className="relative z-10 border-y border-white/10 bg-[#08162f]/70 backdrop-blur-md">
      <div className="marquee-track flex w-max py-3" style={{ "--marquee-duration": "28s" } as CSSProperties}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={copy === 1}>
            {events.map(([time, label]) => (
              <span key={`${copy}-${time}`} className="flex items-center gap-2 whitespace-nowrap font-mono text-[10px] tracking-[0.12em] text-[#b8c6e2]">
                <span className="size-1.5 rounded-full bg-[var(--teal-bright)]" />
                <strong className="text-white">{time}</strong> {label}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const problemCards = [
  {
    title: "Is the customer charged?",
    copy: "A timeout carries no verified outcome. Twelve payments sit in the fog while the customer may already have paid.",
    icon: <ReceiptText className="size-5" />,
    color: "#f06a45",
    span: "md:col-span-3",
    accent: "premium-card--coral",
    visual: "fog",
  },
  {
    title: "How much is really available?",
    copy: "Opening funds plus verified settlements are spendable. Unresolved inflows are not, however likely they look.",
    icon: <Wallet className="size-5" />,
    color: "#0f9d8a",
    span: "md:col-span-3",
    accent: "premium-card--teal",
    visual: "cash",
  },
  {
    title: "Which receipts are affected?",
    copy: "Payments, providers and processors have to be connected before impact can be located.",
    icon: <GitBranch className="size-5" />,
    color: "#7c5cf6",
    span: "md:col-span-2",
    accent: "premium-card--violet",
    visual: "links",
  },
  {
    title: "What must be paid at 5pm?",
    copy: "A single supplier obligation of ₦1,100,000 is due while the payment route is degraded.",
    icon: <Clock3 className="size-5" />,
    color: "#2250e6",
    span: "md:col-span-2",
    accent: "",
    visual: "deadline",
  },
  {
    title: "What is the exposure?",
    copy: "Confirmed cash is ₦990,000. The worst-case position is −₦110,000 before any assumed recovery.",
    icon: <ArrowDownRight className="size-5" />,
    color: "#f06a45",
    span: "md:col-span-2",
    accent: "premium-card--coral",
    visual: "exposure",
  },
] as const;

function ProblemVisual({ kind }: { kind: string }) {
  if (kind === "fog") {
    return (
      <div className="mt-6 grid grid-cols-6 gap-1.5" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="hatch-unknown flex h-8 items-center justify-center rounded-md border border-dashed border-[var(--unknown)] bg-white/50 font-mono text-[8px] text-[var(--ink-muted)]">
            ?
          </div>
        ))}
      </div>
    );
  }
  if (kind === "cash") {
    return (
      <div className="mt-6 space-y-2" aria-hidden="true">
        <div className="flex items-center justify-between text-xs"><span className="text-[var(--ink-muted)]">Counted as cash</span><strong className="numeric">{formatKobo(landingData.openingAvailableKobo + landingData.settledKobo)}</strong></div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/80"><div className="h-full w-[82%] rounded-full bg-gradient-to-r from-[var(--emerald)] to-[var(--teal-bright)]" /></div>
        <div className="flex items-center justify-between text-xs"><span className="text-[var(--ink-muted)]">Excluded from cash</span><strong className="numeric text-[var(--coral)]">{formatKobo(landingData.unknownKobo)}</strong></div>
        <div className="h-2.5 overflow-hidden rounded-full border border-dashed border-[var(--unknown)] bg-[var(--unknown-hatch)]" />
      </div>
    );
  }
  if (kind === "links") {
    return (
      <svg viewBox="0 0 220 52" className="mt-6 w-full" aria-hidden="true">
        {[30, 110, 190].map((x, index) => (
          <g key={x}>
            {index < 2 && <path d={`M${x + 16} 26H${x + 64}`} stroke={index === 1 ? "#8b8f9a" : "#7c5cf6"} strokeWidth="1.5" strokeDasharray={index === 1 ? "4 4" : undefined} />}
            <circle cx={x} cy="26" r="11" fill={index === 2 ? "#f06a45" : "#eee9ff"} stroke={index === 2 ? "#f06a45" : "#7c5cf6"} />
          </g>
        ))}
      </svg>
    );
  }
  if (kind === "deadline") {
    return <p className="numeric mt-6 text-2xl font-bold">{formatKobo(landingData.obligationKobo)}<span className="ml-2 font-sans text-xs font-medium text-[var(--ink-muted)]">due 17:00</span></p>;
  }
  return <p className="numeric mt-6 text-2xl font-bold text-[var(--coral)]">{formatKobo(landingData.scenarios[0].positionKobo)}</p>;
}

export function ProblemSection() {
  return (
    <section id="product" className="ivory-mesh scroll-mt-20 py-24 md:py-32" aria-labelledby="problem-heading">
      <div className="section-shell">
        <Reveal>
          <SectionHeading
            id="problem-heading"
            eyebrow="01 / THE PROBLEM"
            title={<>One payment incident. <span className="gradient-text-warm">Five unanswered questions.</span></>}
            description="A provider slowdown does not just delay payments. It removes the business's ability to say what happened, what is affected and what can safely be spent."
          />
        </Reveal>
        <StaggerGroup className="mt-12 grid gap-4 md:grid-cols-6">
          {problemCards.map((card) => (
            <StaggerItem key={card.title} className={card.span}>
              <article className={`premium-card h-full p-6 ${card.accent}`}>
                <div className="flex items-start justify-between gap-3">
                  <IconBubble color={card.color}>{card.icon}</IconBubble>
                  <span className="numeric text-[10px] text-[var(--ink-muted)]">{card.visual.toUpperCase()}</span>
                </div>
                <h3 className="mt-5 font-heading text-xl leading-tight text-[var(--ink)]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{card.copy}</p>
                <ProblemVisual kind={card.visual} />
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

const stateLegend = [
  { label: "settled", copy: "Cash received. Counted.", color: "#0f9d8a" },
  { label: "succeeded", copy: "Confirmed, not yet cash.", color: "#5b86ff" },
  { label: "unknown", copy: "No verified outcome. Never retried.", color: "#8b8f9a" },
  { label: "failed", copy: "Verified failure. Retry is safe.", color: "#f06a45" },
];

export function TransactionSection() {
  const reduced = useReducedMotion();
  return (
    <section id="how-it-works" className="sky-mesh scroll-mt-20 py-24 md:py-32" aria-labelledby="transaction-heading">
      <div className="section-shell">
        <Reveal>
          <SectionHeading
            id="transaction-heading"
            eyebrow="02 / TRANSACTION INTELLIGENCE"
            title={<>Evidence first. <span className="gradient-text-cobalt">Never guess the money.</span></>}
            description="MONEQRA checks each affected payment with the provider. Verified outcomes change state; an inconclusive check changes nothing."
          />
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-5 lg:grid-cols-2">
          <StaggerItem>
            <article className="premium-card premium-card--teal h-full p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow className="text-[#0a6f61]">Verified and settled</Eyebrow>
                  <h3 className="mt-2 font-heading text-3xl text-[var(--ink)]">Money in the account</h3>
                </div>
                <span className="pill pill-teal"><span className="status-dot text-[#0f9d8a]" /> cash</span>
              </div>
              <p className="numeric mt-8 text-4xl font-bold sm:text-5xl">{formatKobo(landingData.settledKobo)}</p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{landingData.settledCount} payments · included in confirmed available cash</p>
              <div className="mt-8 flex h-20 items-end gap-1" aria-hidden="true">
                {Array.from({ length: 28 }, (_, index) => (
                  <motion.div
                    key={index}
                    initial={reduced ? false : { height: 6 }}
                    whileInView={reduced ? undefined : { height: `${34 + ((index * 17) % 60)}%` }}
                    viewport={reduced ? undefined : { once: true }}
                    transition={{ duration: 0.5, delay: index * 0.02, ease: [0.16, 1, 0.3, 1] }}
                    style={reduced ? { height: `${34 + ((index * 17) % 60)}%` } : undefined}
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-[#0f9d8a] to-[#5ee0bc]"
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[var(--teal)]/15 pt-4 text-xs text-[#0a6f61]">
                <span>Opening {formatKobo(landingData.openingAvailableKobo)}</span>
                <strong className="numeric">{formatKobo(landingData.openingAvailableKobo + landingData.settledKobo)} available</strong>
              </div>
            </article>
          </StaggerItem>
          <StaggerItem>
            <article className="premium-card premium-card--coral h-full p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow className="text-[#a63a1c]">Unknown outcome</Eyebrow>
                  <h3 className="mt-2 font-heading text-3xl text-[var(--ink)]">Money in limbo</h3>
                </div>
                <span className="pill pill-coral"><LockKeyhole aria-hidden="true" className="size-3" /> retry blocked</span>
              </div>
              <p className="numeric mt-8 text-4xl font-bold sm:text-5xl">{formatKobo(landingData.unknownKobo)}</p>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{landingData.unknownCount} payments · excluded from confirmed cash</p>
              <div className="mt-8 grid grid-cols-6 gap-1.5" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <div key={index} className="hatch-unknown flex h-12 items-center justify-center rounded-md border border-dashed border-[var(--coral)]/40 bg-white/60 font-mono text-[9px] text-[#a63a1c]">?</div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-[var(--coral)]/20 pt-4 text-xs text-[#a63a1c]">
                <AlertTriangle aria-hidden="true" className="size-3.5" />
                A timeout is not evidence of failure. These payments stay unknown until a provider check answers.
              </div>
            </article>
          </StaggerItem>
        </StaggerGroup>

        <Reveal className="mt-6">
          <div className="grid gap-3 rounded-2xl border border-[var(--ledger-rule)] bg-white/60 p-4 sm:grid-cols-4 sm:p-5">
            {stateLegend.map((state, index) => (
              <div key={state.label} className={`flex items-start gap-3 px-2 py-2 ${index > 0 ? "sm:border-l sm:border-[var(--ledger-rule)] sm:pl-5" : ""}`}>
                <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: state.color }} />
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">{state.label}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{state.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function DependencySection() {
  const [relationship, setRelationship] = useState<RouteRelationship>("shared");
  return (
    <section id="dependency" className="deep-mesh relative scroll-mt-20 overflow-hidden py-24 text-white md:py-32" aria-labelledby="dependency-heading">
      <div aria-hidden="true" className="noise-layer pointer-events-none absolute inset-0" />
      <div className="section-shell relative">
        <Reveal>
          <SectionHeading
            id="dependency-heading"
            tone="dark"
            eyebrow="03 / DEPENDENCY INTELLIGENCE"
            title={<>Two providers. <span className="gradient-text-cobalt">One shared failure domain.</span></>}
            description="Before recommending a switch, MONEQRA walks the known upstream links. A shared node, an unknown link or verified independence produce three different verdicts."
          />
        </Reveal>
        <Reveal className="mt-12" delay={0.1}>
          <DependencyVisual relationship={relationship} onRelationshipChange={setRelationship} dark />
        </Reveal>
        <Reveal className="mt-6" delay={0.15}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill pill-dark"><Sparkles aria-hidden="true" className="size-3" /> interactive</span>
            <p className="text-sm text-[#c3d1ea]">Choose a relationship above, then select any node to see why it matters.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FinancialSection() {
  const [bps, setBps] = useState(6000);
  const position = useMemo(() => calculateLiquidity(bps), [bps]);
  const scenarioCards = [
    {
      label: "Confirmed cash",
      value: formatKobo(position.availableKobo),
      note: "Opening ₦150,000 + 28 settled ₦840,000",
      tone: "teal" as const,
    },
    {
      label: "Obligation at 17:00",
      value: formatKobo(position.obligationKobo),
      note: "A single supplier payment due today",
      tone: "coral" as const,
    },
    {
      label: "Worst case",
      value: formatKobo(position.worstCaseKobo),
      note: "Confirmed cash − obligation · no recovery",
      tone: "muted" as const,
    },
    {
      label: "Scenario position",
      value: formatKobo(position.scenarioKobo),
      note: `Assumes ${position.recoveryBps / 100}% of unknown funds recover`,
      tone: "blue" as const,
    },
  ];

  return (
    <section id="financial" className="ivory-mesh scroll-mt-20 py-24 md:py-32" aria-labelledby="financial-heading">
      <div className="section-shell">
        <Reveal>
          <SectionHeading
            id="financial-heading"
            eyebrow="04 / FINANCIAL INTELLIGENCE"
            title={<>Move from receipts to <span className="gradient-text-warm">a defensible cash position.</span></>}
            description="MONEQRA separates confirmed cash from unknown inflows, then shows how assumptions change the position without ever treating them as received money."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Reveal>
            <article className="premium-card h-full p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow className="text-[#0a6f61]">Liquidity model · Ade Stores</Eyebrow>
                  <h3 className="mt-2 font-heading text-2xl text-[var(--ink)]">What the assumption changes</h3>
                </div>
                <span className="pill pill-teal">integer kobo</span>
              </div>
              <div className="mt-6">
                <FinanceChart position={position} compact />
              </div>
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Recovery assumption presets">
                {landingData.scenarios.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => setBps(scenario.assumptionBps)}
                    aria-pressed={bps === scenario.assumptionBps}
                    className={`rounded-lg border px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.05em] transition-all ${
                      bps === scenario.assumptionBps
                        ? "border-[var(--cobalt)] bg-[var(--cobalt)] text-white shadow-[0_10px_24px_-12px_rgba(34,80,230,0.9)]"
                        : "border-[var(--ledger-rule-strong)] bg-white/70 text-[var(--ink-muted)] hover:border-[var(--cobalt)] hover:text-[var(--cobalt)]"
                    }`}
                  >
                    {scenario.label} · {scenario.assumptionBps / 100}%
                  </button>
                ))}
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col gap-3">
              {scenarioCards.map((card) => (
                <article key={card.label} className={`premium-card flex items-center justify-between gap-4 p-4 ${
                  card.tone === "teal" ? "premium-card--teal" : card.tone === "coral" ? "premium-card--coral" : ""
                }`}>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{card.label}</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{card.note}</p>
                  </div>
                  <strong className={`numeric shrink-0 text-xl sm:text-2xl ${
                    card.tone === "coral" || (card.tone === "muted" && position.worstCaseKobo < BigInt(0))
                      ? "text-[var(--coral)]"
                      : card.tone === "teal"
                        ? "text-[#0a6f61]"
                        : "text-[var(--cobalt)]"
                  }`}>
                    {card.value}
                  </strong>
                </article>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-5" delay={0.15}>
          <div className="rounded-2xl border border-dashed border-[var(--cobalt)]/30 bg-[var(--sky-soft)]/70 p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow className="text-[var(--cobalt)]">Assumption control</Eyebrow>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  Recovery is an assumption only. It is rounded down and never added to confirmed cash.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[var(--ink-muted)]">0%</span>
                <input
                  id="landing-recovery"
                  type="range"
                  min={0}
                  max={10000}
                  step={500}
                  value={bps}
                  onChange={(event) => setBps(Number(event.target.value))}
                  className="h-2 w-48 cursor-pointer accent-[var(--cobalt)] sm:w-64"
                  aria-label="Assumed recovery rate"
                  aria-valuetext={`${bps / 100}% assumed recovery`}
                />
                <span className="font-mono text-xs text-[var(--ink-muted)]">100%</span>
                <output htmlFor="landing-recovery" className="numeric min-w-14 text-right text-sm font-bold text-[var(--cobalt)]">{bps / 100}%</output>
              </div>
            </div>
            <p className="mt-4 border-t border-[var(--cobalt)]/15 pt-3 font-mono text-[10px] text-[var(--ink-muted)]">
              Unknown funds {formatKobo(position.unresolvedKobo)} · assumed recovery {formatKobo(position.recoveryKobo)} · not received
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function DecisionSection() {
  const recommendation = useMemo(
    () => deriveDemoRecommendation("shared", calculateLiquidity(6000)),
    [],
  );

  return (
    <section id="decision" className="violet-mesh scroll-mt-20 py-24 md:py-32" aria-labelledby="decision-heading">
      <div className="section-shell">
        <Reveal>
          <SectionHeading
            id="decision-heading"
            eyebrow="05 / DECISION INTELLIGENCE"
            title={<>The numbers propose. <span className="gradient-text-warm">A human decides.</span></>}
            description="Every recommendation carries its reasons, evidence, risks and limitations. Tier 2 decisions require an authorised approver before anything is recorded."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <Reveal>
            <article className="premium-card premium-card--violet h-full p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="pill"><ShieldCheck aria-hidden="true" className="size-3" /> tier 2 · approval required</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">rule 12 · withhold reroute</span>
              </div>
              <h3 className="mt-6 font-heading text-3xl leading-tight text-[var(--ink)] sm:text-4xl">{recommendation.action}</h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">{recommendation.summary}</p>
              <div className="mt-7 grid gap-5 sm:grid-cols-3">
                {[
                  ["Reasons", recommendation.reasons],
                  ["Evidence", recommendation.evidence],
                  ["Limitations", recommendation.limitations],
                ].map(([label, lines]) => (
                  <div key={String(label)} className="border-t border-[var(--violet)]/20 pt-3">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--violet)]">{String(label)}</p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--ink-muted)]">
                      {(lines as string[]).map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-6 rounded-xl bg-white/60 px-4 py-3 text-xs leading-5 text-[var(--ink-muted)]">
                <strong className="text-[var(--ink)]">Confidence:</strong> {recommendation.confidence}
              </p>
            </article>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col gap-4">
              <article className="premium-card h-full p-6">
                <IconBubble color="#2250e6"><Sparkles className="size-5" /></IconBubble>
                <h3 className="mt-4 font-heading text-2xl text-[var(--ink)]">Math first, AI explains</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  The position comes from deterministic arithmetic. The explanation is generated from the evidence attached to that position.
                </p>
              </article>
              <article className="premium-card premium-card--teal h-full p-6">
                <IconBubble color="#0f9d8a"><CircleDollarSign className="size-5" /></IconBubble>
                <h3 className="mt-4 font-heading text-2xl text-[var(--ink)]">No money moves here</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  MONEQRA surfaces a recommendation and records a human decision. It never initiates a payment, retry or transfer.
                </p>
              </article>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-6" delay={0.15}>
          <ActionLink href="/demo" tone="outline" className="w-full sm:w-auto">See this decision in the interactive demo</ActionLink>
        </Reveal>
      </div>
    </section>
  );
}

const governanceRules = [
  { title: "Unknown stays unknown", copy: "A failed or timed-out status check is not evidence of failure or success.", icon: <AlertTriangle className="size-5" />, color: "#f06a45" },
  { title: "Unsafe retries are blocked", copy: "MONEQRA will not retry a payment when a double charge cannot be ruled out.", icon: <LockKeyhole className="size-5" />, color: "#f06a45" },
  { title: "Exact integer kobo", copy: "Arithmetic uses whole kobo. Recovery assumptions round down, never up.", icon: <CircleDollarSign className="size-5" />, color: "#2ad4b6" },
  { title: "Role-gated approval", copy: "Only an approver or admin can record a decision. Viewer and operator roles cannot.", icon: <ShieldCheck className="size-5" />, color: "#7c5cf6" },
  { title: "Tamper-evident audit", copy: "Each decision links to a prior record with a visible hash chain.", icon: <ReceiptText className="size-5" />, color: "#5b86ff" },
  { title: "No money movement", copy: "The product recommends and records. It never executes a payment.", icon: <Wallet className="size-5" />, color: "#0f9d8a" },
] as const;

export function GovernanceSection() {
  const [role, setRole] = useState<DemoRole>("viewer");
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const allowed = role === "approver" || role === "admin";

  return (
    <section id="governance" className="deep-mesh relative scroll-mt-20 overflow-hidden py-24 text-white md:py-32" aria-labelledby="governance-heading">
      <div aria-hidden="true" className="noise-layer pointer-events-none absolute inset-0" />
      <div className="section-shell relative">
        <Reveal>
          <SectionHeading
            id="governance-heading"
            tone="dark"
            eyebrow="06 / APPROVAL & GOVERNANCE"
            title={<>Every consequential step is <span className="gradient-text-cobalt">recorded and reviewable.</span></>}
            description="A governed decision separates what the system knows, what it assumes and who authorised the outcome."
          />
        </Reveal>

        <StaggerGroup className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {governanceRules.map((rule) => (
            <StaggerItem key={rule.title}>
              <article className="premium-card premium-card--glass h-full p-5">
                <IconBubble color={rule.color}>{rule.icon}</IconBubble>
                <h3 className="mt-4 font-heading text-xl text-white">{rule.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#c3d1ea]">{rule.copy}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <Reveal className="mt-8" delay={0.1}>
          <div className="grid gap-5 rounded-2xl border border-white/12 bg-white/5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:p-7">
            <div>
              <Eyebrow className="text-[#7df0d0]">Try the approval gate</Eyebrow>
              <h3 className="mt-2 font-heading text-2xl text-white">Who is authorised to decide?</h3>
              <p className="mt-2 text-sm leading-6 text-[#c3d1ea]">
                Switch roles. Viewer and operator can inspect the case; only approver and admin can record an outcome.
              </p>
              <label className="mt-5 block text-xs font-semibold text-[#b6c6e6]" htmlFor="landing-role">Demo role</label>
              <select
                id="landing-role"
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as DemoRole);
                  setDecision(null);
                }}
                className="mt-2 w-full rounded-lg border border-white/16 bg-[#0d1e3b] px-3 py-2.5 text-sm text-white"
              >
                <option value="viewer">Viewer</option>
                <option value="operator">Operator</option>
                <option value="approver">Approver</option>
                <option value="admin">Admin</option>
              </select>
              <label className="mt-4 block text-xs font-semibold text-[#b6c6e6]" htmlFor="landing-reason">Reason for rejection</label>
              <input
                id="landing-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Required only when rejecting"
                disabled={!allowed}
                className="mt-2 w-full rounded-lg border border-white/16 bg-[#0d1e3b] px-3 py-2.5 text-sm text-white placeholder:text-[#7f92b5] disabled:opacity-50"
              />
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionButton tone="teal" disabled={!allowed} onClick={() => setDecision("approve")}>Approve decision</ActionButton>
                <ActionButton tone="glass" disabled={!allowed || reason.trim().length === 0} onClick={() => setDecision("reject")}>Reject decision</ActionButton>
              </div>
              {!allowed && <p className="mt-3 text-xs text-[#ff9b7e]">Approval requires the approver or admin role.</p>}
            </div>
            <div className="rounded-xl border border-white/12 bg-[#08162f]/70 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7df0d0]">Decision record</p>
              {decision ? (
                <>
                  <p className="mt-4 font-heading text-3xl text-white">{decision === "approve" ? "Approved" : "Rejected"}</p>
                  <p className="mt-2 text-sm text-[#c3d1ea]">
                    {decision === "approve"
                      ? "Recorded by an authorised approver. MONEQRA still does not move money."
                      : `Recorded with reason: “${reason.trim()}”.`}
                  </p>
                  <div className="mt-4">
                    <ApprovalMoment action={decision} rule="Rule 12 · Withhold reroute" hash="a1b2c3d4e5f6" />
                  </div>
                </>
              ) : (
                <div className="mt-4 flex min-h-40 flex-col items-start justify-center gap-3">
                  <span className="grid size-12 place-items-center rounded-full border border-dashed border-white/20 text-[#7f92b5]"><Clock3 className="size-5" /></span>
                  <p className="text-sm text-[#9fb4d9]">No decision recorded yet. Choose a role, then approve or reject to see the audit moment.</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="final-mesh relative overflow-hidden py-24 text-white md:py-32" aria-labelledby="final-cta-heading">
      <div aria-hidden="true" className="noise-layer pointer-events-none absolute inset-0" />
      <div className="section-shell relative text-center">
        <Reveal>
          <span className="pill pill-dark"><span className="status-dot status-dot--live text-[#5ee0bc]" /> prototype ready</span>
          <h2 id="final-cta-heading" className="mx-auto mt-6 max-w-4xl font-heading text-[clamp(2.6rem,6vw,5rem)] leading-[1.02] tracking-[-0.02em]">
            Simulated incident. <span className="text-[#bdf6e6]">Real decision logic.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/85">
            Walk the seven-stage story, change the assumptions, approve a governed decision, then continue into the real workspace.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ActionLink href="/overview" tone="teal" className="min-w-48">Enter Workspace</ActionLink>
            <ActionLink href="/demo" tone="glass" className="min-w-48">Take the interactive demo</ActionLink>
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">All data is simulated · MONEQRA never moves money</p>
        </Reveal>
      </div>
    </section>
  );
}

export function TeamSection() {
  return (
    <section className="bg-[#fffaf1] py-20" aria-labelledby="team-heading">
      <div className="section-shell">
        <Reveal>
          <Eyebrow className="text-[var(--cobalt)]">Built by</Eyebrow>
          <h2 id="team-heading" className="mt-2 font-heading text-3xl text-[var(--ink)]">Team SYNFORGE</h2>
        </Reveal>
        <StaggerGroup className="mt-8 grid gap-4 sm:grid-cols-3">
          {synforgeTeam.map((member) => (
            <StaggerItem key={member.name}>
              <article className="premium-card h-full p-5">
                <div className="grid size-14 place-items-center rounded-full border border-[var(--ledger-rule-strong)] bg-white font-mono text-sm text-[var(--ink-muted)]">{member.initials}</div>
                <h3 className="mt-4 font-heading text-xl text-[var(--ink)]">{member.name}</h3>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">{member.role}</p>
              </article>
            </StaggerItem>
          ))}
        </StaggerGroup>
        <div className="mt-8 flex flex-wrap gap-5 text-sm">
          <a href="https://github.com/Tioluwanim/MONEQRA" target="_blank" rel="noreferrer" className="text-[var(--cobalt)] underline underline-offset-4 hover:text-[var(--ink)]">Repository</a>
          <Link href="/overview" className="text-[var(--cobalt)] underline underline-offset-4 hover:text-[var(--ink)]">Open the workspace</Link>
        </div>
      </div>
    </section>
  );
}
