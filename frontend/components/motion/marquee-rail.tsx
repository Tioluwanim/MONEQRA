"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export interface MarqueeRailProps {
  children: ReactNode;
  speedSeconds?: number;
  className?: string;
  label?: string;
}

export function MarqueeRail({
  children,
  speedSeconds = 24,
  className,
  label = "Payment stream",
}: MarqueeRailProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div
      className={`overflow-hidden border-y border-[var(--ledger-rule)] ${className ?? ""}`}
      role="region"
      aria-label={label}
    >
      <div
        className={reducedMotion ? "flex w-max" : "marquee-track flex w-max"}
        style={{ "--marquee-duration": `${speedSeconds}s` } as CSSProperties}
      >
        <div className="flex shrink-0 items-center gap-8 pr-8">{children}</div>
        {!reducedMotion && (
          <div aria-hidden="true" className="flex shrink-0 items-center gap-8 pr-8">{children}</div>
        )}
      </div>
    </div>
  );
}
