"use client";

import { type ReactNode } from "react";
import gsap from "gsap";
import { useGsapCleanup } from "@/hooks/use-gsap-cleanup";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { stagger, duration, easeLedgerSnap } from "@/lib/motion-tokens";

export interface KineticHeadlineProps {
  children: ReactNode;
  text?: string;
  as?: "h1" | "h2" | "h3";
  split?: "line" | "word";
  className?: string;
  lines?: ReactNode[];
}

export function KineticHeadline({
  children,
  text,
  as: Tag = "h2",
  split = "line",
  className,
  lines,
}: KineticHeadlineProps) {
  const reducedMotion = useReducedMotion();
  const containerRef = useGsapCleanup<HTMLDivElement>((ctx) => {
    if (reducedMotion) return;
    ctx.add(() => {
      gsap.fromTo(
        "[data-motion-piece]",
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: duration.slow,
          stagger: split === "word" ? stagger.fast : stagger.base,
          ease: easeLedgerSnap,
          overwrite: true,
        },
      );
    });
  }, [reducedMotion, split]);

  const pieces = lines
    ? lines.map((line, index) => <span key={index} data-motion-piece="" className="block">{line}</span>)
    : split === "word"
      ? (text ?? (typeof children === "string" ? children : "")).split(/\s+/).filter(Boolean).map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block overflow-hidden pr-[0.18em]">
            <span data-motion-piece="" className="inline-block">{word}</span>
          </span>
        ))
      : <span data-motion-piece="" className="block">{children}</span>;

  return (
    <div ref={containerRef} className={className}>
      <Tag className="font-heading">{pieces}</Tag>
    </div>
  );
}
