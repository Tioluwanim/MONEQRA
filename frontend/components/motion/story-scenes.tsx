"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type Verdict = "shared" | "independent";

export function AnimatedBeam({ path = "M20 50 C180 50, 220 50, 380 50", className }: { path?: string; className?: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <svg viewBox="0 0 400 100" className={`h-24 w-full ${className ?? ""}`} aria-label="Request or payment moving through provider">
      <path d={path} fill="none" stroke="var(--ledger-rule-strong)" strokeWidth="3" />
      {!reducedMotion && <circle r="5" fill="var(--cobalt)" className="beam-dot"><animateMotion dur="2.2s" repeatCount="indefinite" path={path} /></circle>}
      {reducedMotion && <circle cx="380" cy="50" r="5" fill="var(--cobalt)" />}
    </svg>
  );
}

export function SharedFailureScene({ shared = true, playing = true, className }: { shared?: boolean; playing?: boolean; className?: string }) {
  const reducedMotion = useReducedMotion();
  const [hasFailed, setHasFailed] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (reducedMotion || !playing) return;
    timerRef.current = window.setTimeout(() => setHasFailed(true), 900);
    return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); };
  }, [playing, shared, reducedMotion]);
  const failed = reducedMotion || hasFailed;
  const routeAFailed = failed;
  const routeBFailed = failed && shared;
  return (
    <div className={`grid gap-4 rounded-[var(--radius-md)] border border-[var(--ledger-rule)] p-5 ${className ?? ""}`}>
      <div className="grid grid-cols-3 items-center gap-3 text-center">
        <div className={routeAFailed ? "text-[var(--vermilion)]" : ""}>Route A</div>
        <div className={`border-y py-3 ${failed ? "border-[var(--vermilion)]" : "border-[var(--emerald)]"}`}>{shared ? "Shared switch" : "Independent switch"}</div>
        <div className={routeBFailed ? "text-[var(--vermilion)]" : ""}>Route B</div>
      </div>
      <div className="flex justify-center"><span className={`rounded-[var(--radius-xs)] border px-3 py-1 font-mono text-xs ${failed ? "border-[var(--vermilion)] text-[var(--vermilion)]" : "border-[var(--emerald)]"}`}>{shared ? "SHARED" : "INDEPENDENT"}</span></div>
      {reducedMotion && <span className="text-xs text-[var(--ink-muted)]">Static fallback: upstream relationship established</span>}
    </div>
  );
}
