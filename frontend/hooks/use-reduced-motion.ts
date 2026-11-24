"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to the `prefers-reduced-motion: reduce` media query.
 *
 * Returns `true` when the user (or the OS) prefers reduced motion.
 * SSR-safe: returns `false` on the server (content is always readable
 * without JS, so the first paint is static — no motion to suppress).
 */
export function useReducedMotion(): boolean {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    }
    mql.addListener(callback);
    return () => mql.removeListener(callback);
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
