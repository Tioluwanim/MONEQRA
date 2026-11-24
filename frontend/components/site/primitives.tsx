"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

type Tone = "primary" | "teal" | "glass" | "outline" | "ghost";

const buttonTone: Record<Tone, string> = {
  primary: "action-btn--primary",
  teal: "action-btn--teal",
  glass: "action-btn--glass",
  outline: "action-btn--outline",
  ghost: "action-btn--ghost",
};

export function ActionLink({
  href,
  children,
  tone = "primary",
  arrow = true,
  className = "",
  external = false,
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
  arrow?: boolean;
  className?: string;
  external?: boolean;
}) {
  const classes = `action-btn ${buttonTone[tone]} ${className}`.trim();
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
        {arrow && <ArrowUpRight aria-hidden="true" className="size-4 action-btn__arrow" />}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
      {arrow && <ArrowRight aria-hidden="true" className="size-4 action-btn__arrow" />}
    </Link>
  );
}

export function ActionButton({
  children,
  onClick,
  tone = "primary",
  arrow = false,
  className = "",
  disabled = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  arrow?: boolean;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`action-btn ${buttonTone[tone]} ${className}`.trim()}>
      {children}
      {arrow && <ArrowRight aria-hidden="true" className="size-4 action-btn__arrow" />}
    </button>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`.trim()}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "dark",
  align = "left",
  className = "",
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  tone?: "dark" | "light";
  align?: "left" | "center";
  className?: string;
  id?: string;
}) {
  return (
    <div className={`${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} ${className}`.trim()}>
      <div className={`mb-4 flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
        <span className={`h-px w-8 ${tone === "dark" ? "bg-[var(--teal-bright)]" : "bg-[var(--cobalt)]"}`} aria-hidden="true" />
        <Eyebrow className={tone === "dark" ? "text-[var(--teal-bright)]" : "text-[var(--cobalt)]"}>{eyebrow}</Eyebrow>
      </div>
      <h2 id={id} className={`font-heading text-[clamp(2.1rem,4.4vw,3.7rem)] leading-[1.07] tracking-[-0.02em] ${tone === "dark" ? "text-white" : "text-[var(--ink)]"}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-5 max-w-2xl text-base leading-7 md:text-lg ${tone === "dark" ? "text-[#cbd8f0]" : "text-[var(--ink-muted)]"} ${align === "center" ? "mx-auto" : ""}`}>
          {description}
        </p>
      )}
    </div>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 26,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0, transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] } }}
      viewport={reduced ? undefined : { once, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

const staggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export function StaggerGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : "hidden"}
      whileInView={reduced ? undefined : "visible"}
      viewport={reduced ? undefined : { once: true, amount: 0.1 }}
      variants={reduced ? undefined : staggerVariants}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduced ? undefined : { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
    >
      {children}
    </motion.div>
  );
}

export function IconBubble({ children, color = "var(--cobalt)", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={`icon-bubble ${className}`.trim()} style={{ "--bubble-color": color } as CSSProperties} aria-hidden="true">
      {children}
    </span>
  );
}

export function StatLine({ label, value, tone = "dark" }: { label: string; value: string; tone?: "dark" | "light" }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b py-2 ${tone === "dark" ? "border-white/12 text-white" : "border-[var(--ledger-rule)] text-[var(--ink)]"}`}>
      <span className={`text-xs ${tone === "dark" ? "text-[#b6c6e6]" : "text-[var(--ink-muted)]"}`}>{label}</span>
      <strong className="numeric text-sm font-semibold">{value}</strong>
    </div>
  );
}
