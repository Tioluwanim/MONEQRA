"use client";

import { useEffect, useRef } from "react";
import { useCappedDPR, usePerformanceTier } from "@/hooks/use-performance-tier";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useOffScreen } from "@/hooks/use-off-screen";

export function GrainOverlay({ night = false, className }: { night?: boolean; className?: string }) {
  if (!night) return null;
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-screen ${className ?? ""}`} style={{ backgroundImage: "repeating-radial-gradient(circle at 20% 30%, var(--paper) 0 1px, transparent 1px 4px)" }} />;
}

export function MeshGlow({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`mesh-glow absolute inset-0 ${className ?? ""}`} />;
}

export type PaymentState = "normal" | "degraded" | "incident";

export function PaymentStream({ state = "normal", className }: { state?: PaymentState; className?: string }) {
  const [ref, isVisible] = useOffScreen();
  const reducedMotion = useReducedMotion();
  const tier = usePerformanceTier();
  const dpr = useCappedDPR();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion || tier === "low" || !isVisible) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = tier === "high" ? 28 : 14;
    const particles = Array.from({ length: count }, (_, index) => ({
      x: (index / count) * rect.width,
      y: 18 + (index * 37 % Math.max(40, rect.height - 36)),
      speed: state === "degraded" ? 0.15 + (index % 3) * 0.08 : 0.35 + (index % 4) * 0.05,
    }));
    let raf = 0;
    const draw = () => {
      context.clearRect(0, 0, rect.width, rect.height);
      particles.forEach((particle, index) => {
        particle.x += state === "incident" && index % 5 === 0 ? 0 : particle.speed;
        if (particle.x > rect.width + 8) particle.x = -8;
        const degraded = state === "degraded" && index % 4 === 0;
        context.fillStyle = state === "incident" || degraded ? "#8b8f9a" : "#12203a";
        context.fillRect(particle.x, particle.y, 5, 5);
      });
      if (state === "incident") {
        context.strokeStyle = "#d9411e";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(rect.width * 0.58, 0);
        context.lineTo(rect.width * 0.54, rect.height);
        context.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [state, reducedMotion, tier, dpr, isVisible]);

  return (
    <div ref={ref} className={`relative min-h-32 overflow-hidden ${className ?? ""}`}>
      {reducedMotion || tier === "low" ? (
        <div className="absolute inset-0 flex items-center" aria-label={`Payment stream: ${state}`}>
          <div className={`h-px w-full ${state === "incident" ? "border-t border-[var(--vermilion)]" : "border-t border-[var(--ink)]"}`} />
        </div>
      ) : <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label={`Payment stream: ${state}`} />}
    </div>
  );
}

export function FaultLine({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 100" preserveAspectRatio="none" className={`h-24 w-full ${className ?? ""}`}>
      <path className="fault-line-path" d="M0 52 C120 52, 150 48, 270 52 S430 60, 600 42" fill="none" stroke="var(--vermilion)" strokeWidth="2" />
    </svg>
  );
}

export function DrawPath({ d, className, label }: { d: string; className?: string; label?: string }) {
  return (
    <svg aria-label={label} role={label ? "img" : undefined} viewBox="0 0 600 180" preserveAspectRatio="none" className={`h-44 w-full ${className ?? ""}`}>
      <path className="draw-path" d={d} fill="none" stroke="var(--ink)" strokeWidth="2" />
    </svg>
  );
}
