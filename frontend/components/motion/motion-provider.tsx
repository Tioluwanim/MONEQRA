"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { usePerformanceTier, type PerformanceTier } from "@/hooks/use-performance-tier";

// Register GSAP plugins once at module scope
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * MotionProvider
 * ──────────────
 * Sets up Lenis smooth scroll synced to GSAP ScrollTrigger.
 *
 * Automatically disables smooth scroll when:
 *  - The user prefers reduced motion
 *  - The device is classified as "low" tier
 *
 * Place this in the layout, wrapping the page content.
 * It does NOT render any wrapper <div> — it's a side-effect-only provider.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const tier = usePerformanceTier();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Skip smooth scroll for reduced motion or low-end devices
    if (reducedMotion || tier === "low") {
      // Ensure ScrollTrigger still works without Lenis
      ScrollTrigger.defaults({ scroller: undefined });
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      lerp: tier === "medium" ? 0.15 : 0.1,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Sync Lenis scroll position with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Use GSAP ticker to drive Lenis
    const tickHandler = (time: number) => {
      lenis.raf(time * 1000);
    };
    const visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        lenis.stop();
      } else {
        lenis.start();
      }
    };
    gsap.ticker.add(tickHandler);

    // Prevent GSAP from using its own requestAnimationFrame for scroll
    gsap.ticker.lagSmoothing(0);
    document.addEventListener("visibilitychange", visibilityHandler);
    visibilityHandler();

    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
      gsap.ticker.remove(tickHandler);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion, tier]);

  return <>{children}</>;
}

/**
 * Returns whether motion should be fully active.
 * Convenience combining reduced-motion and performance tier.
 */
export function useMotionAllowed(): { allowed: boolean; tier: PerformanceTier } {
  const reducedMotion = useReducedMotion();
  const tier = usePerformanceTier();
  return { allowed: !reducedMotion && tier !== "low", tier };
}
