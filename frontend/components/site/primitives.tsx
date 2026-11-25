"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-[10px] bg-[var(--brand)] text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17V7l8 7 8-7v10" />
        </svg>
      </span>
      <span className="font-heading text-[1.2rem] font-extrabold tracking-tight text-[var(--text)]">MONEQRA</span>
    </span>
  );
}

type Variant = "primary" | "secondary" | "ghost";

export function ActionLink({
  href,
  children,
  variant = "primary",
  large = false,
  className = "",
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  large?: boolean;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">) {
  return (
    <Link href={href} className={`btn btn-${variant} ${large ? "btn-lg" : ""} ${className}`} {...rest}>
      {children}
    </Link>
  );
}

export function ActionButton({
  variant = "primary",
  large = false,
  className = "",
  children,
  ...rest
}: { variant?: Variant; large?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`btn btn-${variant} ${large ? "btn-lg" : ""} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function SectionHeading({
  kicker,
  title,
  lead,
  center = false,
  id,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  center?: boolean;
  id?: string;
}) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {kicker && <p className="mb-3 text-sm font-semibold text-[var(--brand)]">{kicker}</p>}
      <h2 id={id} className="text-[clamp(1.85rem,4vw,2.75rem)]">{title}</h2>
      {lead && <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">{lead}</p>}
    </div>
  );
}

/** Fades content up once as it scrolls into view. Skipped for reduced motion. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
