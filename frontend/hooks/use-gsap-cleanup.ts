"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Provides a GSAP context scoped to a container ref.
 *
 * All GSAP tweens / timelines created inside the `setup` callback
 * are automatically reverted (killed + styles restored) when the
 * component unmounts. This prevents leaked listeners and zombie
 * timelines.
 *
 * Usage:
 * ```tsx
 * const containerRef = useGsapCleanup((ctx) => {
 *   ctx.add(() => {
 *     gsap.to(".box", { x: 100 });
 *   });
 * }, [dep]);
 * ```
 *
 * @param setup   Receives a gsap.Context — call `ctx.add(fn)` inside.
 * @param deps    Dependency array (re-runs setup when deps change).
 * @returns       A ref to attach to the container element.
 */
export function useGsapCleanup<T extends HTMLElement = HTMLDivElement>(
  setup: (ctx: gsap.Context) => void,
  deps: React.DependencyList = [],
): React.RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Kill previous context if deps changed
    ctxRef.current?.revert();

    const ctx = gsap.context((createdContext) => {
      setup(createdContext);
    }, el);

    ctxRef.current = ctx;

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
