"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Returns [ref, isVisible].
 *
 * Pauses GSAP timelines, canvas loops, or Motion animations when the
 * element scrolls out of view. Components use `isVisible` to gate
 * their animation tick.
 *
 * @param rootMargin  Extra margin around the viewport (default "100px" —
 *                    start a beat before the element enters view).
 */
export function useOffScreen<T extends HTMLElement = HTMLDivElement>(
  rootMargin = "100px",
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(() =>
    typeof window !== "undefined" && typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, isVisible];
}
