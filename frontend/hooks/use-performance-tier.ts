"use client";

import { useEffect, useState } from "react";

/**
 * Performance tiers:
 *
 *  "high"   – desktop / flagship phone, full effects
 *  "medium" – mid-range phone, reduced particle counts, simpler shaders
 *  "low"    – low-end device, save-data, or battery saver; CSS-only, no canvas
 */
export type PerformanceTier = "high" | "medium" | "low";

/** Signals that contribute to tier detection. */
export interface PerformanceSignals {
  coreCount: number;
  deviceMemoryGB: number | null;
  saveData: boolean;
  reducedMotion: boolean;
  devicePixelRatio: number;
  batterySaver?: boolean;
}

function detectSignals(): PerformanceSignals {
  if (typeof window === "undefined") {
    return { coreCount: 4, deviceMemoryGB: null, saveData: false, reducedMotion: false, devicePixelRatio: 1 };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  return {
    coreCount: navigator.hardwareConcurrency ?? 4,
    deviceMemoryGB: nav.deviceMemory ?? null,
    saveData: nav.connection?.saveData ?? false,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    devicePixelRatio: window.devicePixelRatio ?? 1,
  };
}

function classifyTier(signals: PerformanceSignals): PerformanceTier {
  // Immediate low-tier signals
  if (signals.saveData || signals.reducedMotion || signals.batterySaver) return "low";

  // Low core count or very low memory
  if (signals.coreCount <= 2) return "low";
  if (signals.deviceMemoryGB !== null && signals.deviceMemoryGB <= 2) return "low";

  // Mid-range detection
  if (signals.coreCount <= 4) return "medium";
  if (signals.deviceMemoryGB !== null && signals.deviceMemoryGB <= 4) return "medium";

  return "high";
}

/**
 * Returns the detected performance tier.
 *
 * SSR-safe: defaults to "high" on the server (the heaviest components
 * are lazy-loaded anyway, so the server never renders them).
 *
 * Re-evaluates on mount only — hardware doesn't change mid-session.
 */
export function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>("high");

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ charging: boolean }>;
    };

    const updateTier = (batterySaver = false) => {
      if (!cancelled) {
        setTier(classifyTier({ ...detectSignals(), batterySaver }));
      }
    };

    updateTier();
    void nav.getBattery?.().then((battery) => {
      updateTier(!battery.charging);
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return tier;
}

/**
 * Returns the recommended canvas DPR cap for the current tier.
 * Prevents GPU overload on high-DPR low-end screens.
 */
export function useCappedDPR(): number {
  const tier = usePerformanceTier();
  const raw = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  switch (tier) {
    case "low":
      return 1;
    case "medium":
      return Math.min(raw, 1.5);
    case "high":
      return Math.min(raw, 2);
  }
}

/** Pure function export for use outside React (e.g. GSAP callbacks). */
export { detectSignals, classifyTier };
