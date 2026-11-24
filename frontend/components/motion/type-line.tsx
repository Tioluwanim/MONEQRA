"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useOffScreen } from "@/hooks/use-off-screen";

export interface TypeLineProps {
  text: string;
  mode?: "character" | "word";
  className?: string;
  intervalMs?: number;
}

export function TypeLine({ text, mode = "word", className, intervalMs = 55 }: TypeLineProps) {
  const reducedMotion = useReducedMotion();
  const [ref, isVisible] = useOffScreen();
  const units = mode === "word" ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);
  const [count, setCount] = useState(reducedMotion ? units.length : 0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || !isVisible) {
      return;
    }
    timerRef.current = window.setInterval(() => {
      setCount((current) => {
        if (current >= units.length) {
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          return units.length;
        }
        return current + 1;
      });
    }, intervalMs);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [text, mode, intervalMs, reducedMotion, isVisible, units.length]);

  return (
    <span ref={ref} className={className}>
      <span>{units.slice(0, reducedMotion || !isVisible ? units.length : count).join("")}</span>
      {(reducedMotion || !isVisible ? units.length : count) < units.length && <span aria-hidden="true" className="ml-px inline-block h-[1em] w-px animate-pulse bg-current" />}
      <span className="sr-only">{text}</span>
    </span>
  );
}
