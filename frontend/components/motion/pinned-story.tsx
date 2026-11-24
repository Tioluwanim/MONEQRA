"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePerformanceTier } from "@/hooks/use-performance-tier";
import { formatKobo, type MoneyInput } from "@/lib/money";

const steps = ["Detect", "Locate", "Verify", "Quantify", "Recommend", "Approve"] as const;

export function PinnedStepFlow({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const tier = usePerformanceTier();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!ref.current || reducedMotion || tier === "low") return;
    gsap.registerPlugin(ScrollTrigger);
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top top",
      end: "+=900",
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => setActive(Math.min(steps.length - 1, Math.floor(self.progress * steps.length))),
    });
    return () => trigger.kill();
  }, [reducedMotion, tier]);

  return (
    <div ref={ref} className={`grid min-h-[28rem] gap-6 rounded-[var(--radius-md)] border border-[var(--ledger-rule)] p-6 ${className ?? ""}`}>
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-6" aria-label="Decision flow">
        {steps.map((step, index) => <li key={step} className={`border-t-2 py-2 text-xs ${index === active ? "border-[var(--vermilion)] font-semibold" : "border-[var(--ledger-rule)] text-[var(--ink-muted)]"}`}>{index + 1}. {step}</li>)}
      </ol>
      <div className="relative grid place-items-center border border-dashed border-[var(--ledger-rule)]" aria-live="polite">
        <div className="text-center"><p className="font-mono text-xs">CURRENT STEP</p><p className="font-heading text-4xl">{steps[active]}</p></div>
        <div className={`absolute bottom-6 h-2 rounded-full bg-[var(--cobalt)] transition-[width] duration-[var(--motion-base)]`} style={{ width: `${(active + 1) * (100 / steps.length)}%` }} />
      </div>
    </div>
  );
}

export interface LiquiditySceneProps {
  opening: MoneyInput;
  settled: MoneyInput;
  unknown: MoneyInput;
  obligation: MoneyInput;
  scenarios: Array<{ label: string; kobo: MoneyInput }>;
  className?: string;
}

export function LiquidityScene({ opening, settled, unknown, obligation, scenarios, className }: LiquiditySceneProps) {
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(reducedMotion ? 4 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setStage((value) => Math.min(4, value + 1)), 900);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);
  return (
    <div className={`grid gap-4 rounded-[var(--radius-md)] border border-[var(--ledger-rule)] p-5 ${className ?? ""}`}>
      <div className="grid gap-2">
        <p className="font-mono text-xs">OPENING FUNDS</p>
        <div className="border-b pb-2 font-mono text-2xl tabular-nums">{formatKobo(opening)}</div>
        {stage >= 1 && <div className="h-5 border-l-4 border-[var(--emerald)] bg-[color-mix(in_srgb,var(--emerald)_12%,transparent)] pl-2 text-sm">Settled: {formatKobo(settled)}</div>}
        {stage >= 2 && <div className="h-5 border border-dashed border-[var(--unknown)] bg-[var(--unknown-hatch)] pl-2 text-sm">Unknown: {formatKobo(unknown)} — excluded</div>}
        {stage >= 3 && <div className="border-t-2 border-[var(--vermilion)] pt-2 text-sm">Obligation: {formatKobo(obligation)}</div>}
      </div>
      {stage >= 4 && <div className="grid gap-2 md:grid-cols-3">{scenarios.map((scenario, index) => <div key={scenario.label} style={{ animationDelay: `${index * 80}ms` }} className="rounded-[var(--radius-xs)] border border-[var(--ledger-rule)] p-3"><p className="text-xs">{scenario.label}</p><p className="font-mono tabular-nums">{formatKobo(scenario.kobo)}</p></div>)}</div>}
    </div>
  );
}
