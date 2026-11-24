"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const storyLinks = [
  { hash: "#product", label: "Product" },
  { hash: "#how-it-works", label: "How it works" },
  { href: "/demo", label: "Demo" },
];

function resolveHref(link: (typeof storyLinks)[number], pathname: string): string {
  if (link.hash) return pathname === "/" ? link.hash : `/${link.hash}`;
  return link.href ?? "/demo";
}

function BrandMark() {
  return (
    <span aria-hidden="true" className="relative grid size-8 place-items-center overflow-hidden rounded-[0.65rem] bg-gradient-to-br from-[#5b86ff] via-[#2ad4b6] to-[#7c5cf6] shadow-[0_6px_18px_-8px_rgba(91,134,255,0.9)]">
      <span className="absolute inset-[1px] rounded-[0.55rem] bg-[#08152d]/80" />
      <svg viewBox="0 0 24 24" className="relative size-5" fill="none">
        <path d="M4 16.5 9 10l3.4 3.4L20 5.5" stroke="#7df0d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20h16" stroke="#8fb7ff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#product");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;
    const ids = ["product", "how-it-works", "decision"];
    const elements = ids.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
    if (elements.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(`#${visible.target.id}`);
      },
      { rootMargin: "-25% 0px -55% 0px", threshold: [0.05, 0.3, 0.6] },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? "border-b border-white/12 bg-[#07142c]/88 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
      <div className="section-shell flex h-[4.5rem] items-center justify-between gap-4">
        <Link href="/" onClick={closeMenu} className="group flex items-center gap-2.5" aria-label="MONEQRA home">
          <BrandMark />
          <span className="font-heading text-[1.35rem] leading-none tracking-[0.02em] text-white">MONEQRA</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {storyLinks.map((link) => {
            const href = resolveHref(link, pathname);
            const isCurrent = link.hash ? pathname === "/" && active === link.hash : pathname === link.href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isCurrent ? "text-white" : "text-[#b8c6e2] hover:text-white"}`}
              >
                {link.label}
                {isCurrent && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--teal-bright)]"
                    transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <span className="hidden border border-[var(--coral)]/50 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-[#ff9b7e] lg:inline">SIMULATION</span>
          <Link href="/overview" className="action-btn action-btn--teal nav-workspace-btn">
            Enter Workspace
            <ArrowUpRight aria-hidden="true" className="size-4 action-btn__arrow" />
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg border border-white/15 text-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduced ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/10 bg-[#08162f]/97 md:hidden"
          >
            <div className="section-shell flex flex-col gap-1 py-4">
              {storyLinks.map((link) => (
                <Link key={link.label} href={resolveHref(link, pathname)} onClick={closeMenu} className="rounded-lg px-3 py-3 text-base text-[#d7e2f7] hover:bg-white/8 hover:text-white">
                  {link.label}
                </Link>
              ))}
              <Link href="/overview" onClick={closeMenu} className="mt-2 rounded-lg bg-white/10 px-3 py-3 text-base font-semibold text-white">
                Enter Workspace
              </Link>
              <p className="px-3 pt-2 font-mono text-[10px] tracking-[0.12em] text-[#ff9b7e]">SIMULATION · NO MONEY MOVES</p>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
