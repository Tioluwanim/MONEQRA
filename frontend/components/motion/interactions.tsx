"use client";

import { useEffect, useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useOffScreen } from "@/hooks/use-off-screen";
import gsap from "gsap";
import { duration } from "@/lib/motion-tokens";

export function MagneticButton({ children, className, onClick, type = "button", disabled }: {
  children: ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (reducedMotion || event.pointerType === "touch" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * 0.18;
    const y = (event.clientY - rect.top - rect.height / 2) * 0.18;
    gsap.to(ref.current, { x, y, duration: duration.fast, ease: "power2.out", overwrite: true });
  };
  const reset = () => gsap.to(ref.current, { x: 0, y: 0, duration: duration.base, ease: "expo.out", overwrite: true });
  return (
    <button ref={ref} type={type} disabled={disabled} onClick={onClick} onPointerMove={move} onPointerLeave={reset} onBlur={reset}
      className={`inline-flex h-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-semibold text-[var(--paper)] outline-none focus-visible:ring-3 focus-visible:ring-[var(--cobalt)] ${className ?? ""}`}>
      {children}
      <span className="ml-2" aria-hidden="true">↗</span>
    </button>
  );
}

export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType === "touch" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    ref.current.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };
  return (
    <div ref={ref} onPointerMove={move}
      className={`spotlight-card relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--ledger-rule)] bg-[var(--paper-raised)] p-5 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType === "touch" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -5;
    gsap.to(ref.current, { rotateY: x, rotateX: y, transformPerspective: 800, duration: duration.fast, overwrite: true });
  };
  const reset = () => gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: duration.base, overwrite: true });
  return <div ref={ref} onPointerMove={move} onPointerLeave={reset} className={`rounded-[var(--radius-md)] border border-[var(--ledger-rule)] bg-[var(--paper-raised)] p-5 ${className ?? ""}`}>{children}</div>;
}

export function RevealOnScroll({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();
  const [ref, isVisible] = useOffScreen();
  return <div ref={ref} className={`${className ?? ""} ${isVisible || reducedMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"} transition-[opacity,transform] duration-[var(--motion-slow)]`}>{children}</div>;
}

export function ParallaxLayer({ children, speed = 0.08, className }: { children: ReactNode; speed?: number; className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reducedMotion) return;
    const update = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const center = window.innerHeight / 2;
      ref.current.style.transform = `translateY(${(rect.top - center) * speed}px)`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [reducedMotion, speed]);
  return <div ref={ref} className={className}>{children}</div>;
}

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-3 md:grid-cols-4 ${className ?? ""}`}>{children}</div>;
}

export function BentoCell({ children, span = 1, className }: { children: ReactNode; span?: 1 | 2 | 3 | 4; className?: string }) {
  const reducedMotion = useReducedMotion();
  const [ref, isVisible] = useOffScreen();
  const spanClass = span === 1 ? "md:col-span-1" : span === 2 ? "md:col-span-2" : span === 3 ? "md:col-span-3" : "md:col-span-4";
  return <div ref={ref} className={`${spanClass} rounded-[var(--radius-md)] border border-[var(--ledger-rule)] bg-[var(--paper-raised)] p-5 ${isVisible || reducedMotion ? "opacity-100" : "opacity-0"} transition-opacity duration-[var(--motion-slow)] ${className ?? ""}`}>{children}</div>;
}
