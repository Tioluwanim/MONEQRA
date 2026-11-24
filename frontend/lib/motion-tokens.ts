/**
 * MONEQRA Motion Tokens — JS export
 * -----------------------------------
 * Mirror of styles/motion-tokens.css for use with GSAP and Motion (Framer Motion).
 * Import these instead of hardcoding durations / easings in components.
 */

/* ── Durations (seconds, for GSAP) ─────────────────────────────── */
export const duration = {
  snap: 0.1,
  fast: 0.12,
  base: 0.18,
  instrument: 0.24,
  slow: 0.5,
  scene: 0.8,
} as const;

/* ── Easing curves ─────────────────────────────────────────────── */

/** Sharp in, dead stop — the click of a stamp on paper. */
export const easeLedgerSnap = "cubic-bezier(0.2, 0, 0, 1)";
/** As GSAP CustomEase-compatible values (power curve approximation). */
export const easeLedgerSnapGSAP = "power3.out";

/** Slow deceleration, confident landing — money arriving. */
export const easeSettle = "cubic-bezier(0.16, 1, 0.3, 1)";
export const easeSettleGSAP = "expo.out";

/** General-purpose. */
export const easeDefault = "cubic-bezier(0.25, 0.1, 0.25, 1)";
export const easeDefaultGSAP = "power1.inOut";

export const easeIn = "cubic-bezier(0.4, 0, 1, 1)";
export const easeInGSAP = "power2.in";

export const easeOut = "cubic-bezier(0, 0, 0.2, 1)";
export const easeOutGSAP = "power2.out";

/** Playful overshoot for magnetic buttons. */
export const easeSpring = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/* ── Stagger (seconds, for GSAP) ───────────────────────────────── */
export const stagger = {
  fast: 0.04,
  base: 0.08,
  slow: 0.14,
} as const;

/* ── Spring configs for Motion (Framer Motion) ─────────────────── */
export const springSnap = { stiffness: 500, damping: 30, mass: 1 } as const;
export const springSettle = { stiffness: 120, damping: 20, mass: 1 } as const;
export const springBounce = { stiffness: 300, damping: 15, mass: 1 } as const;

/* ── Motion (Framer Motion) transition presets ─────────────────── */
export const transitionSnap = {
  type: "spring" as const,
  ...springSnap,
};

export const transitionSettle = {
  type: "spring" as const,
  ...springSettle,
};

export const transitionTween = (
  dur: keyof typeof duration = "base",
) => ({
  type: "tween" as const,
  duration: duration[dur],
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
});
