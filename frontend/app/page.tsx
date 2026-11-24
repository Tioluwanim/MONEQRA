"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { landingData } from "@/lib/landing-data";
import { synforgeTeam } from "@/lib/team";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  MagneticButton,
  KineticHeadline,
  KoboTicker,
  MarqueeRail,
  BentoGrid,
  BentoCell,
  SpotlightCard,
  FaultLine,
  GrainOverlay,
  ApprovalMoment,
  RevealOnScroll,
} from "@/components/motion";
import { RecommendationCard, ScenarioCard } from "@/components/moneqra";

const PaymentStream = dynamic(() => import("@/components/motion/graphics").then((module) => module.PaymentStream), { ssr: false });
const SharedFailureScene = dynamic(() => import("@/components/motion/story-scenes").then((module) => module.SharedFailureScene), { ssr: false });
const PinnedStepFlow = dynamic(() => import("@/components/motion/pinned-story").then((module) => module.PinnedStepFlow), { ssr: false });
const LiquidityScene = dynamic(() => import("@/components/motion/pinned-story").then((module) => module.LiquidityScene), { ssr: false });

function LandingNav({ progress, night }: { progress: number; night: boolean }) {
  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md ${night ? "border-white/10 bg-[#0d1930]/88 text-[#f6efe3]" : "border-[var(--ledger-rule)] bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]"}`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="font-heading text-xl" aria-label="MONEQRA home">MONEQRA</Link>
        <nav className="flex items-center gap-5 text-sm" aria-label="Primary navigation">
          <a href="#story" className="hidden sm:inline">Story</a>
          <Link href="/demo">Demo</Link>
          <span className="border border-[var(--vermilion)] px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--vermilion)]">SIMULATION</span>
        </nav>
      </div>
      <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-1 bg-[rgb(139_143_154/20%)]" aria-hidden="true">
        <div className="w-full bg-[var(--vermilion)]" style={{ height: `${progress * 100}%` }} />
      </div>
    </header>
  );
}

export default function Home() {
  const reducedMotion = useReducedMotion();
  const [night, setNight] = useState(true);
  const [progress, setProgress] = useState(0);
  const [paymentState, setPaymentState] = useState<"normal" | "degraded" | "incident">("normal");
  const [approval, setApproval] = useState(false);
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setTimeout(() => setIntro(false), 1500);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      const solution = document.getElementById("solution");
      setNight(!solution || window.scrollY + window.innerHeight * 0.38 < solution.offsetTop);
      if (window.scrollY > 120) setPaymentState("degraded");
      if (window.scrollY > 420) setPaymentState("incident");
      if (window.scrollY < 420) setPaymentState("normal");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollToStory = () => document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className={night ? "dark min-h-screen bg-[#0d1930] text-[#f6efe3]" : "min-h-screen bg-[var(--paper)] text-[var(--ink)]"} data-theme={night ? "night" : "day"}>
      {intro && !reducedMotion && (
        <div aria-label="MONEQRA loading incident ledger" className="fixed inset-0 z-[100] grid place-items-center bg-[#0d1930] text-[#f6efe3]">
          <div className="text-center">
            <div className="mx-auto h-px w-48 overflow-hidden border-t border-[#8b8f9a]"><span className="block h-px w-1/2 bg-[#d9411e] animate-pulse" /></div>
            <p className="mt-4 font-heading text-3xl">MONEQRA</p>
            <p className="mt-2 font-mono text-[10px] tracking-[0.14em] text-[#b9bdc8]">RESOLVING PAYMENT STREAM</p>
          </div>
        </div>
      )}
      <LandingNav progress={progress} night={night} />

      <section className="relative flex min-h-[100svh] items-end overflow-hidden px-5 pb-16 pt-24 md:items-center md:pb-0" aria-labelledby="hero-title">
        <GrainOverlay night className="fixed" />
        <div className="absolute inset-x-0 top-20 h-64 opacity-80"><PaymentStream state={paymentState} /></div>
        <FaultLine className="absolute inset-x-0 top-[48%] -translate-y-1/2" />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.16em] text-[#d9411e]">INCIDENT  /  16:32 UTC</p>
          <KineticHeadline as="h1" text="From payment incident to business impact." split="word" className="max-w-5xl text-[clamp(3.2rem,8vw,7.5rem)] leading-[0.92]">From payment incident to business impact.</KineticHeadline>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#d9dde6] md:text-xl">
            When a payment provider fails, MONEQRA shows a business what it means for its money, and what to do next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo"><MagneticButton>Open the demo</MagneticButton></Link>
            <button type="button" onClick={scrollToStory} className="h-9 border-b border-[#f6efe3] px-2 text-sm font-semibold">Watch the story ↓</button>
          </div>
          <p className="mt-6 font-mono text-xs text-[#b9bdc8]">Prototype · simulated data.</p>
        </div>
      </section>

      <section id="problem" className="relative min-h-[100svh] px-5 py-24" aria-labelledby="problem-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs text-[#d9411e]">01 / BLIND SPOTS</p>
          <h2 id="problem-title" className="mt-3 max-w-3xl text-5xl">A timeout creates three unanswered questions.</h2>
          <div className="mt-12 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
            {[
              ["Payments you can't classify", "A timeout doesn't say whether the customer was charged."],
              ["Impact you can't locate", "Which receipts and obligations are affected?"],
              ["Cash you can't count", "How much is really available before 5pm?"],
            ].map(([title, copy], index) => (
              <RevealOnScroll key={title}>
                <article className="min-h-64 bg-[#0d1930] p-6">
                  <div className="mb-10 flex h-10 items-center gap-2 font-mono text-xs text-[#d9411e]">
                    <span className="size-2 border border-current" style={{ transform: `rotate(${index * 18}deg)` }} />
                    BLIND SPOT {index + 1}
                  </div>
                  <h3 className="text-2xl">{title}</h3>
                  <p className="mt-4 text-base leading-7 text-[#b9bdc8]">{copy}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
          <div className="mt-10">
            <MarqueeRail speedSeconds={18}><span className="border border-dashed border-[#8b8f9a] px-3 py-2 font-mono text-xs">ADE-UNKNOWN-001</span><span className="border border-dashed border-[#8b8f9a] px-3 py-2 font-mono text-xs">ADE-UNKNOWN-002</span><span className="px-3 py-2 font-mono text-xs text-[#8b8f9a]">PROVIDER-PAYMENT-003</span></MarqueeRail>
          </div>
        </div>
      </section>

      <section id="story" className="relative min-h-[100svh] px-5 py-24" aria-labelledby="twist-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs text-[var(--vermilion)]">02 / THE TWIST</p>
          <h2 id="twist-title" className="mt-3 max-w-3xl text-5xl">Switching provider isn&apos;t always an escape.</h2>
          <div className="mt-10"><SharedFailureScene shared /></div>
          <p className="mt-6 max-w-2xl text-lg">Two providers can fail together when they rely on the same upstream switch.</p>
          <div className="mt-14"><SharedFailureScene shared={false} /></div>
          <p className="mt-6 max-w-2xl text-lg">MONEQRA checks the dependency before it recommends a switch.</p>
        </div>
      </section>

      <section id="solution" className="min-h-[100svh] px-5 py-24" aria-labelledby="solution-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs text-[var(--cobalt)]">03 / THE SOLUTION</p>
          <h2 id="solution-title" className="mt-3 text-5xl">Six moves from signal to decision.</h2>
          <div className="mt-10"><PinnedStepFlow /></div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <p className="border-l-4 border-[var(--cobalt)] pl-4">A timeout is not proof of failure.</p>
            <p className="border-l-4 border-[var(--unknown)] pl-4">Unknown payments are never counted as cash.</p>
          </div>
        </div>
      </section>

      <section className="min-h-[100svh] px-5 py-24" aria-labelledby="numbers-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs">04 / THE NUMBERS</p>
          <h2 id="numbers-title" className="mt-3 text-5xl">Ade Stores · the liquidity position</h2>
          <p className="mt-5 font-mono text-xs">Opening available: <KoboTicker kobo={landingData.openingAvailableKobo} /></p>
          <div className="mt-10">
            <LiquidityScene
              opening={landingData.openingAvailableKobo}
              settled={landingData.settledKobo}
              unknown={landingData.unknownKobo}
              obligation={landingData.obligationKobo}
              scenarios={landingData.scenarios.map((scenario) => ({ label: scenario.label, kobo: scenario.positionKobo }))}
            />
          </div>
          <div className="mt-6 grid gap-px border-y border-[var(--ledger-rule)] bg-[var(--ledger-rule)] md:grid-cols-3">
            {landingData.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.label}
                label={scenario.label}
                probabilityBps={scenario.assumptionBps}
                position={scenario.positionKobo}
                estimated={scenario.assumptionBps === 6000}
              />
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-[var(--ink-muted)]">All figures are illustrative.</p>
        </div>
      </section>

      <section className="min-h-[80svh] px-5 py-24" aria-labelledby="decision-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs">05 / THE DECISION</p>
          <h2 id="decision-title" className="mt-3 text-5xl">Math first. AI explains. Humans approve.</h2>
          <div className="mt-10">
            <RecommendationCard
              action="Withhold reroute; offer an extension request"
              tier={2}
              reasons={["The worst-case position is short.", "The shared switch is unverified."]}
              evidence={["28 settled payments", "12 unknown payments", "A single supplier obligation"]}
              limitations={["Recovery probability is an assumption.", "The prototype uses simulated data."]}
              role="approver"
            />
          </div>
          <button type="button" onClick={() => setApproval(true)} className="mt-6 h-10 rounded-[var(--radius-sm)] bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--paper)]">Approve</button>
          {approval && <div className="mt-4"><ApprovalMoment action="approve" rule="Rule 12 · Withhold reroute" hash="a1b2c3d4e5f6" /></div>}
          <p className="mt-6 text-lg font-semibold">We never move money.</p>
        </div>
      </section>

      <section className="px-5 py-24" aria-labelledby="safe-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs">06 / SAFE BY DESIGN</p>
          <h2 id="safe-title" className="mt-3 text-5xl">Evidence before action.</h2>
          <BentoGrid className="mt-10">
            {[
              "Unknown never becomes failed without evidence",
              "Exact whole-kobo maths, no rounding up",
              "Tamper-evident audit log",
              "Only an approver can approve",
            ].map((copy) => (
              <BentoCell key={copy} span={2}>
                <SpotlightCard><p className="text-xl">{copy}</p></SpotlightCard>
              </BentoCell>
            ))}
          </BentoGrid>
        </div>
      </section>

      <section className="px-5 py-28 text-center" aria-labelledby="cta-title">
        <div className="mx-auto max-w-3xl">
          <h2 id="cta-title" className="text-5xl">Simulated incident. Real decision logic.</h2>
          <div className="mt-8 flex justify-center">
            <Link href="/demo"><MagneticButton>Open the demo</MagneticButton></Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-24" aria-labelledby="team-title">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs">SYNFORGE / TEAM</p>
          <h2 id="team-title" className="mt-3 text-5xl">The team</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {synforgeTeam.map((member) => (
              <article key={member.initials + member.name} className="border-t-2 border-[var(--ink)] py-5">
                <div className="grid size-16 place-items-center rounded-full border border-[var(--ledger-rule-strong)] font-mono">{member.initials}</div>
                <h3 className="mt-4 text-2xl">{member.name}</h3>
                <p className="text-sm text-[var(--ink-muted)]">{member.role}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-5 text-sm">
            <a href="mailto:contact@example.com" className="underline underline-offset-4">contact@example.com</a>
            <a href="https://github.com/Tioluwanim/MONEQRA" className="underline underline-offset-4">Repository</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--ledger-rule)] px-5 py-8">
        <p className="mx-auto max-w-6xl text-sm">MONEQRA is an early-stage prototype. All data is simulated. It never moves money.</p>
      </footer>
    </main>
  );
}
