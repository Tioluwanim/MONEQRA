"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  BentoGrid,
  BentoCell,
  RevealOnScroll,
  TiltCard,
  SpotlightCard,
  MagneticButton,
  KineticHeadline,
  ScrambleNumber,
  KoboTicker,
  TypeLine,
  MarqueeRail,
  GrainOverlay,
  MeshGlow,
  FaultLine,
  DrawPath,
  AnimatedBeam,
  ApprovalMoment,
} from "@/components/motion";

const PaymentStream = dynamic(() => import("@/components/motion/graphics").then((module) => module.PaymentStream), { ssr: false });
const SharedFailureScene = dynamic(() => import("@/components/motion/story-scenes").then((module) => module.SharedFailureScene), { ssr: false });
const PinnedStepFlow = dynamic(() => import("@/components/motion/pinned-story").then((module) => module.PinnedStepFlow), { ssr: false });
const LiquidityScene = dynamic(() => import("@/components/motion/pinned-story").then((module) => module.LiquidityScene), { ssr: false });

function FpsMeter() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let raf = 0;
    const sample = (now: number) => {
      frame += 1;
      if (now - previous >= 1000) {
        setFps(Math.round((frame * 1000) / (now - previous)));
        frame = 0;
        previous = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <output className="font-mono text-xs" aria-label="Frames per second">{fps} FPS</output>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="grid gap-4 border-b border-[var(--ledger-rule)] py-8"><h2 className="font-heading text-2xl">{title}</h2>{children}</section>;
}

export default function MotionGalleryPage() {
  const [night, setNight] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tier, setTier] = useState<"high" | "medium" | "low">("high");
  const [paymentState, setPaymentState] = useState<"normal" | "degraded" | "incident">("normal");
  const [shared, setShared] = useState(true);
  const [playing, setPlaying] = useState(true);

  return (
    <main className={night ? "dark relative min-h-screen bg-[var(--paper)] text-[var(--ink)]" : "relative min-h-screen bg-[var(--paper)] text-[var(--ink)]"}>
      {night && <GrainOverlay night />}
      <div className="relative mx-auto max-w-6xl px-6 py-8">
        <header className="relative border-y border-[var(--ledger-rule)] py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="font-mono text-xs">MONEQRA / MOTION QA</p><KineticHeadline as="h1" split="word" className="text-4xl">Ledger motion library</KineticHeadline></div>
            <FpsMeter />
          </div>
        </header>
        <div className="sticky top-0 z-20 flex flex-wrap gap-2 border-b border-[var(--ledger-rule)] bg-[color-mix(in_srgb,var(--paper)_94%,transparent)] py-3 backdrop-blur-sm">
          <Button type="button" variant="outline" onClick={() => setNight((value) => !value)}>{night ? "Day theme" : "Night theme"}</Button>
          <Button type="button" variant="outline" onClick={() => setReduced((value) => !value)}>{reduced ? "Enable motion" : "Reduce motion"}</Button>
          <Button type="button" variant="outline" onClick={() => setTier((value) => value === "high" ? "medium" : value === "medium" ? "low" : "high")}>Tier: {tier}</Button>
        </div>
        <div className={reduced ? "motion-reduce" : ""}>
          <Section title="Text and numbers"><BentoGrid><BentoCell><KineticHeadline>Payment incident</KineticHeadline></BentoCell><BentoCell><ScrambleNumber kobo={84000000} /></BentoCell><BentoCell><KoboTicker kobo={-11000000} /></BentoCell><BentoCell><TypeLine text="Unknown payments stay outside confirmed cash." /></BentoCell></BentoGrid><MarqueeRail><span className="font-mono">ADE-001</span><span>Fictional Provider One</span><span className="font-mono">ADE-002</span></MarqueeRail></Section>
          <Section title="Interactions"><BentoGrid><BentoCell><MagneticButton>Approve rule</MagneticButton></BentoCell><BentoCell><SpotlightCard>Ledger rule revealed by cursor light.</SpotlightCard></BentoCell><BentoCell span={2}><TiltCard>Shared dependency tilt card</TiltCard></BentoCell></BentoGrid><RevealOnScroll><div className="border-l-4 border-[var(--cobalt)] pl-4">Revealed only when this wrapper enters the viewport.</div></RevealOnScroll></Section>
          <Section title="Graphics and paths"><div className="relative min-h-52"><MeshGlow /><div className="relative z-10 p-5"><p className="text-sm">Mesh glow · CSS first</p></div></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setPaymentState("normal")}>Normal</Button><Button type="button" variant="outline" onClick={() => setPaymentState("degraded")}>Degraded</Button><Button type="button" variant="outline" onClick={() => setPaymentState("incident")}>Incident</Button></div><PaymentStream state={paymentState} /><FaultLine /><DrawPath d="M0 140 C150 140, 150 35, 300 35 S450 155, 600 40" /></Section>
          <Section title="Pitch scenes"><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setShared((value) => !value)}>Switch: {shared ? "shared" : "independent"}</Button><Button type="button" variant="outline" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</Button></div><SharedFailureScene shared={shared} playing={playing} /><AnimatedBeam /><PinnedStepFlow /><LiquidityScene opening={84000000} settled={36000000} unknown={21600000} obligation={11000000} scenarios={[{ label: "No recovery", kobo: -11000000 }, { label: "Assumed", kobo: 10600000 }, { label: "Full recovery", kobo: 25000000 }]} /><ApprovalMoment /></Section>
        </div>
      </div>
    </main>
  );
}
