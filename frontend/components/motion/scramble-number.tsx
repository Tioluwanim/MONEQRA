"use client";

import { useEffect, useRef, useState } from "react";
import { formatKobo, type MoneyInput } from "@/lib/money";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useOffScreen } from "@/hooks/use-off-screen";
import { duration } from "@/lib/motion-tokens";

function toDisplayBigInt(kobo: MoneyInput): bigint {
  if (typeof kobo === "bigint") return kobo;
  if (typeof kobo === "number") return Number.isSafeInteger(kobo) ? BigInt(kobo) : BigInt(0);
  if (/^-?\d+$/.test(kobo)) return BigInt(kobo);
  return BigInt(0);
}

export interface CounterProps {
  kobo: MoneyInput;
  durationMs?: number;
  className?: string;
  dip?: boolean;
}

export function ScrambleNumber({ kobo, durationMs = duration.slow * 1000, className, dip = false }: CounterProps) {
  const target = toDisplayBigInt(kobo);
  const reducedMotion = useReducedMotion();
  const [ref, isVisible] = useOffScreen();
  const [display, setDisplay] = useState<bigint>(reducedMotion ? target : BigInt(0));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || !isVisible) {
      return;
    }

    const start = performance.now();
    const startValue = BigInt(0);
    const signedTarget = target;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = startValue + ((signedTarget - startValue) * BigInt(Math.round(eased * 1000))) / BigInt(1000);
      setDisplay(next);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, reducedMotion, isVisible, durationMs]);

  const negativeDip = dip || target < 0;
  const renderedDisplay = reducedMotion || !isVisible ? target : display;
  return (
    <span
      ref={ref}
      className={`${negativeDip ? "text-[var(--vermilion)]" : ""} tabular-nums ${className ?? ""}`}
      style={negativeDip ? { animation: reducedMotion ? "none" : "ledger-dip var(--motion-slow) var(--ease-settle)" } : undefined}
      aria-label={formatKobo(kobo)}
    >
      <span aria-hidden="true">{formatKobo(renderedDisplay)}</span>
    </span>
  );
}

export function KoboTicker(props: CounterProps) {
  return <ScrambleNumber {...props} />;
}
