"use client";

import { motion } from "motion/react";
import { Activity, ArrowDownRight, GitBranch, LockKeyhole, ShieldCheck, Wallet } from "lucide-react";
import { formatKobo } from "@/lib/money";
import { landingData } from "@/lib/landing-data";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { IconBubble } from "./primitives";

const layerMotion = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } },
};

function FlowConnector({ color = "#5b86ff", delay = "0s" }: { color?: string; delay?: string }) {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 8 44" preserveAspectRatio="none" className="mx-auto h-11 w-2" aria-hidden="true">
      <path d="M4 0V44" stroke="rgb(190 210 255 / 18%)" strokeWidth="1.5" />
      <path d="M4 0V44" stroke={color} strokeWidth="1.5" className={reduced ? "" : "edge-flow"} style={{ animationDelay: delay }} />
      {!reduced && (
        <circle r="2.4" fill={color}>
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M4 0V44" />
        </circle>
      )}
    </svg>
  );
}

export function HeroComposition() {
  const reduced = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-[36rem]" aria-label="Animated MONEQRA intelligence pipeline: payment events, dependencies, financial impact and decision">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(91,134,255,0.22),transparent_62%)] blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 size-56 rounded-full border border-[var(--teal-bright)]/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-12 bottom-0 size-40 rounded-full border border-[var(--violet-bright)]/15" />

      <motion.div
        initial={reduced ? false : "hidden"}
        animate="visible"
        transition={reduced ? undefined : { staggerChildren: 0.16, delayChildren: 0.25 }}
        className="relative grid gap-0"
      >
        {/* 1 — payment events */}
        <motion.div variants={reduced ? undefined : layerMotion} className="premium-card premium-card--glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBubble color="#7df0d0" className="icon-bubble--sm"><Activity className="size-4" /></IconBubble>
              <div>
                <p className="text-sm font-semibold text-white">Payment events</p>
                <p className="font-mono text-[10px] tracking-[0.12em] text-[#9fb4d9]">40 AFFECTED · 14:10 UTC</p>
              </div>
            </div>
            <span className="pill pill-dark pill--xs"><span className="status-dot status-dot--live text-[#ff9b7e]" /> incident</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
            {["30,000", "30,000", "30,000", "30,000", "30,000"].map((amount, index) => (
              <div
                key={index}
                className={`rounded-lg border px-2 py-2 ${index === 4 ? "hatch-unknown border-dashed border-[#ff9b7e]/50 bg-[#f06a45]/10" : "border-white/10 bg-white/6"}`}
                style={reduced ? undefined : { animation: `float-soft ${5 + index * 0.4}s ease-in-out ${index * 0.15}s infinite alternate` }}
              >
                <p className={`numeric text-[10px] ${index === 4 ? "text-[#ffb499]" : "text-[#c9d8f2]"}`}>₦{amount}</p>
                <p className={`mt-1 text-[9px] ${index === 4 ? "text-[#ff9b7e]" : "text-[#5ee0bc]"}`}>{index === 4 ? "unknown" : "settled"}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <FlowConnector color="#2ad4b6" />

        {/* 2 — dependencies */}
        <motion.div variants={reduced ? undefined : layerMotion} className="premium-card premium-card--dark rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <IconBubble color="#a78bfa" className="icon-bubble--sm"><GitBranch className="size-4" /></IconBubble>
            <div>
              <p className="text-sm font-semibold text-white">Infrastructure dependencies</p>
              <p className="font-mono text-[10px] tracking-[0.12em] text-[#9fb4d9]">KNOWN LINKS ONLY</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            {[
              { label: "Provider A", state: "failing" },
              { label: "Processor P1", state: "pass" },
              { label: "Switch S", state: "failing" },
            ].map((node, index) => (
              <div key={node.label} className="flex flex-1 items-center gap-1.5">
                <div className={`relative min-w-0 flex-1 rounded-lg border px-2 py-2.5 text-center ${node.state === "failing" ? "border-[#f06a45]/60 bg-[#f06a45]/12" : "border-white/12 bg-white/5"}`}>
                  {node.state === "failing" && <span aria-hidden="true" className="node-pulse absolute inset-0 rounded-lg border border-[#f06a45]/50" />}
                  <p className="relative truncate text-[10px] font-semibold text-white sm:text-xs">{node.label}</p>
                </div>
                {index < 2 && (
                  <svg viewBox="0 0 22 8" className="h-2 w-4 shrink-0" aria-hidden="true">
                    <path d="M0 4h22" stroke="#5b86ff" strokeWidth="1.5" className={reduced ? "" : "edge-flow"} />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[10px] text-[#ff9b7e]">
            <span className="status-dot text-[#f06a45]" /> SHARED FAILURE DOMAIN CONFIRMED
          </p>
        </motion.div>

        <FlowConnector color="#7c5cf6" />

        {/* 3 — financial consequence */}
        <motion.div variants={reduced ? undefined : layerMotion} className="premium-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <IconBubble color="#0f9d8a"><Wallet className="size-4" /></IconBubble>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Financial consequence</p>
              <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--ink-muted)]">AT THE 17:00 DEADLINE</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--teal)]/20 bg-[var(--teal-soft)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0a6f61]">Confirmed available</p>
              <p className="numeric mt-1 text-lg font-bold text-[var(--ink)] sm:text-xl">{formatKobo(landingData.openingAvailableKobo + landingData.settledKobo)}</p>
              <p className="mt-1 text-[10px] text-[#0a6f61]">₦150,000 opening + ₦840,000 settled</p>
            </div>
            <div className="rounded-xl border border-dashed border-[var(--unknown)] bg-[var(--unknown-hatch)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Unknown, excluded</p>
              <p className="numeric mt-1 text-lg font-bold text-[var(--ink)] sm:text-xl">{formatKobo(landingData.unknownKobo)}</p>
              <p className="mt-1 text-[10px] text-[var(--ink-muted)]">never counted as cash</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--coral-soft)] px-3 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a63a1c]"><ArrowDownRight aria-hidden="true" className="size-3.5" /> Worst-case gap</span>
            <strong className="numeric text-sm text-[#a63a1c]">{formatKobo(landingData.scenarios[0].positionKobo)}</strong>
          </div>
        </motion.div>

        <FlowConnector color="#5b86ff" />

        {/* 4 — decision */}
        <motion.div variants={reduced ? undefined : layerMotion} className="premium-card premium-card--violet rounded-2xl p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBubble color="#7c5cf6"><ShieldCheck className="size-4" /></IconBubble>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Decision intelligence</p>
                <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--ink-muted)]">TIER 2 · HUMAN APPROVAL</p>
              </div>
            </div>
            <span className="pill pill-teal pill--xs"><LockKeyhole aria-hidden="true" className="size-3" /> governed</span>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-[var(--ink)]">Withhold reroute; request an extension.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["28 settled", "12 unknown", "shared switch", "assumption labelled"].map((chip) => (
              <span key={chip} className="rounded-md border border-[var(--ledger-rule)] bg-white/60 px-2 py-1 font-mono text-[9px] text-[var(--ink-muted)]">{chip}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
