import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, HelpCircle, Info } from "lucide-react";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/labels";

const icons = {
  good: CheckCircle2,
  wait: Clock3,
  unsure: HelpCircle,
  bad: AlertTriangle,
  estimate: CircleDashed,
  brand: Info,
  neutral: Info,
} as const;

/**
 * A status is always a colour, an icon and a word. Colour alone is never the
 * only signal, so it stays readable for everyone.
 */
export function StatusPill({
  tone,
  children,
  title,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  const Icon = icons[tone];
  return (
    <span className={`pill pill-${tone} ${className}`} title={title}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}
