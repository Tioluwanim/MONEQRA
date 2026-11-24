"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGsapCleanup } from "@/hooks/use-gsap-cleanup";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function ApprovalMoment({ action = "approve", hash = "a1b2c3d4e5f6", rule = "Rule 12 · Withhold reroute", onComplete }: {
  action?: "approve" | "reject"; hash?: string; rule?: string; onComplete?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [stamp, setStamp] = useState(reducedMotion);
  const timerRef = useRef<number | null>(null);
  const containerRef = useGsapCleanup<HTMLDivElement>((ctx) => {
    if (reducedMotion) return;
    ctx.add(() => {
      gsap.fromTo("[data-rule-signature]", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.24 });
      const stampTimer = window.setTimeout(() => setStamp(true), 260);
      timerRef.current = stampTimer;
    });
  }, [reducedMotion, action, rule]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (stamp) onComplete?.();
  }, [stamp, onComplete]);

  return (
    <div ref={containerRef} className={`grid gap-3 rounded-[var(--radius-md)] border p-5 ${action === "approve" ? "border-[var(--emerald)]" : "border-[var(--ledger-rule-strong)]"}`}>
      <p data-rule-signature="" className="font-mono text-sm">{rule}</p>
      <div className={`flex min-h-12 items-center justify-between rounded-[var(--radius-xs)] border px-3 ${stamp ? "opacity-100" : "opacity-40"} ${action === "approve" ? "border-[var(--emerald)]" : "border-[var(--ink-muted)]"}`}>
        <span className="text-sm">{stamp ? (action === "approve" ? "SIGNED" : "REJECTED") : "PENDING"}</span>
        {stamp && <span className="font-mono text-xs">HASH {hash}</span>}
      </div>
    </div>
  );
}
