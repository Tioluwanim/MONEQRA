"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { KineticHeadline } from "@/components/motion";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroComposition } from "@/components/site/hero-composition";
import { ActionButton, ActionLink, Eyebrow } from "@/components/site/primitives";
import {
  DecisionSection,
  DependencySection,
  FinancialSection,
  FinalCtaSection,
  GovernanceSection,
  ProblemSection,
  SignalRail,
  TeamSection,
  TransactionSection,
} from "@/components/site/story-sections";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div className="fixed right-0 top-[4.5rem] z-40 hidden h-[calc(100vh-4.5rem)] w-1 bg-white/8 md:block" aria-hidden="true">
      <div className="progress-fill h-full bg-gradient-to-b from-[var(--teal-bright)] via-[var(--cobalt-bright)] to-[var(--violet-bright)]" style={{ height: `${progress * 100}%` }} />
    </div>
  );
}

function Hero() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const hazeY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const compositionY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);

  const scrollToStory = () => {
    document.getElementById("product")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <section className="hero-mesh relative flex min-h-[100svh] items-center overflow-hidden px-0 pb-20 pt-28 md:pt-32" aria-labelledby="hero-title">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-20 size-[34rem] rounded-full bg-[radial-gradient(circle,rgba(42,212,182,0.18),transparent_65%)] blur-3xl"
        style={reduced ? undefined : { y: hazeY }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-52 top-0 size-[40rem] rounded-full bg-[radial-gradient(circle,rgba(91,134,255,0.20),transparent_68%)] blur-3xl"
        style={reduced ? undefined : { y: hazeY }}
      />
      <div aria-hidden="true" className="grid-lines-dark pointer-events-none absolute inset-0 opacity-40" />
      <div aria-hidden="true" className="noise-layer pointer-events-none absolute inset-0" />

      <div className="section-shell relative grid items-center gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="max-w-3xl">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-3"
          >
            <span className="pill pill-dark"><span className="status-dot status-dot--live text-[#ff9b7e]" /> incident / 16:32 UTC</span>
            <span className="border border-[var(--coral)]/50 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[#ff9b7e]">SIMULATION</span>
          </motion.div>

          <div className="mt-7">
            <KineticHeadline
              id="hero-title"
              as="h1"
              text="From payment incident to business impact."
              split="word"
              className="max-w-4xl text-[clamp(2.85rem,7vw,6.3rem)] leading-[0.95] text-white"
            >
              From payment incident to business impact.
            </KineticHeadline>
          </div>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 max-w-2xl text-lg leading-8 text-[#cbd8f0] md:text-xl"
          >
            When a payment provider fails, MONEQRA shows a business what happened, what it can safely count, and what decision to put in front of a human.
          </motion.p>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={reduced ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <ActionLink href="/overview" tone="teal" className="min-w-48">Enter Workspace</ActionLink>
            <ActionLink href="/demo" tone="glass" className="min-w-48">Open Interactive Demo</ActionLink>
            <ActionButton tone="ghost" arrow onClick={scrollToStory} className="order-3 w-full sm:order-none sm:w-auto">
              Explore the story
            </ActionButton>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            animate={reduced ? undefined : { opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/12 pt-6"
          >
            <span className="flex items-center gap-2 text-xs text-[#a9bbdb]"><ShieldCheck aria-hidden="true" className="size-4 text-[#5ee0bc]" /> Evidence before action</span>
            <span className="flex items-center gap-2 text-xs text-[#a9bbdb]"><ArrowRight aria-hidden="true" className="size-4 text-[#8fb7ff]" /> Story → demo → workspace</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#7f92b5]">No money moves</span>
          </motion.div>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 30, scale: 0.97 }}
          animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={reduced ? undefined : { y: compositionY }}
          className="relative mx-auto w-full max-w-[36rem] lg:max-w-none"
        >
          <HeroComposition />
        </motion.div>
      </div>

      <div className="section-shell absolute inset-x-0 bottom-7 z-10 hidden items-center justify-between md:flex">
        <Eyebrow className="text-[#7f92b5]">Scroll to follow the incident</Eyebrow>
        <ArrowDown aria-hidden="true" className="float-soft size-5 text-[#5ee0bc]" />
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fffaf1] text-[var(--ink)]">
      <SiteHeader />
      <ScrollProgress />
      <Hero />
      <SignalRail />
      <ProblemSection />
      <TransactionSection />
      <DependencySection />
      <FinancialSection />
      <DecisionSection />
      <GovernanceSection />
      <FinalCtaSection />
      <TeamSection />
      <SiteFooter />
    </main>
  );
}
