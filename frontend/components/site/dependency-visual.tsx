"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, HelpCircle, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Eyebrow } from "./primitives";

export type RouteRelationship = "shared" | "independent" | "unverifiable";

type GraphNode = {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
  failing?: boolean;
  detail: string;
};

type GraphEdge = {
  from: string;
  to: string;
  status: "known" | "unknown";
  d: string;
};

const BASE_NODES: GraphNode[] = [
  { id: "ade", label: "Ade Stores", kind: "business", x: 18, y: 150, detail: "The affected business. 40 payments moved through Provider A when the incident began." },
  { id: "provider-a", label: "Provider A", kind: "provider", x: 196, y: 62, failing: true, detail: "The provider whose timeouts opened the incident. 28 payments were verified settled; 12 remain unknown." },
  { id: "provider-b", label: "Provider B", kind: "provider", x: 196, y: 238, detail: "The proposed alternative route. It is only helpful if it is genuinely independent of the failing infrastructure." },
  { id: "processor-1", label: "Processor P1", kind: "processor", x: 388, y: 62, detail: "Known upstream processor for Provider A. Its dependency link is documented." },
  { id: "processor-2", label: "Processor P2", kind: "processor", x: 388, y: 238, detail: "Known upstream processor for Provider B. Its relationship to the switches depends on the branch." },
  { id: "switch-s", label: "Switch S", kind: "switch", x: 578, y: 150, failing: true, detail: "The failing upstream switch. In the shared branch both routes reach this same node." },
];

const INDEPENDENT_NODE: GraphNode = { id: "switch-t", label: "Switch T", kind: "switch", x: 578, y: 252, detail: "An independent downstream switch used only by Provider B in the independent branch." };

const BASE_EDGES: GraphEdge[] = [
  { from: "ade", to: "provider-a", status: "known", d: "M148 177 C172 177, 172 89, 196 89" },
  { from: "ade", to: "provider-b", status: "known", d: "M148 183 C172 183, 172 265, 196 265" },
  { from: "provider-a", to: "processor-1", status: "known", d: "M326 89 C352 89, 362 89, 388 89" },
  { from: "provider-b", to: "processor-2", status: "known", d: "M326 265 C352 265, 362 265, 388 265" },
  { from: "processor-1", to: "switch-s", status: "known", d: "M518 89 C548 89, 548 177, 578 177" },
];

const SHARED_EDGE: GraphEdge = { from: "processor-2", to: "switch-s", status: "known", d: "M518 265 C548 265, 548 183, 578 183" };
const UNKNOWN_EDGE: GraphEdge = { from: "processor-2", to: "switch-s", status: "unknown", d: "M518 265 C548 265, 548 183, 578 183" };
const INDEPENDENT_EDGE: GraphEdge = { from: "processor-2", to: "switch-t", status: "known", d: "M518 265 C548 265, 548 279, 578 279" };

const relationshipCopy: Record<RouteRelationship, { label: string; headline: string; body: string; tone: "coral" | "teal" | "muted" }> = {
  shared: {
    label: "SHARED",
    headline: "Both routes end at the same failing switch.",
    body: "A proven overlap decides the verdict even if other links are unknown. Switching checkouts to Provider B would not avoid the failure.",
    tone: "coral",
  },
  independent: {
    label: "INDEPENDENT",
    headline: "Every link on both routes is known, with no overlap.",
    body: "Routing new checkouts to Provider B may help. It does not create cash for today's obligation — the 12 unknown payments still need verifying.",
    tone: "teal",
  },
  unverifiable: {
    label: "UNVERIFIABLE",
    headline: "One upstream link cannot be confirmed.",
    body: "MONEQRA will not recommend a switch it cannot verify. Keep the current route and surface the missing dependency for review.",
    tone: "muted",
  },
};

export function DependencyVisual({
  relationship = "shared",
  onRelationshipChange,
  showControls = true,
  dark = true,
  className = "",
}: {
  relationship?: RouteRelationship;
  onRelationshipChange?: (value: RouteRelationship) => void;
  showControls?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState<string | null>("switch-s");

  const nodes = useMemo(
    () => (relationship === "independent" ? [...BASE_NODES, INDEPENDENT_NODE] : BASE_NODES),
    [relationship],
  );
  const edges = useMemo(() => {
    const tail = relationship === "shared" ? SHARED_EDGE : relationship === "unverifiable" ? UNKNOWN_EDGE : INDEPENDENT_EDGE;
    return [...BASE_EDGES, tail];
  }, [relationship]);

  const activeNode = nodes.find((node) => node.id === selected) ?? nodes[0];
  const copy = relationshipCopy[relationship];
  const connected = (id: string) => edges.some((edge) => edge.from === id || edge.to === id);
  const isConnected = (edge: GraphEdge) => !selected || selected === edge.from || selected === edge.to;

  return (
    <div className={`grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.85fr)] ${className}`}>
      <div className={`relative overflow-hidden rounded-2xl border p-3 ${dark ? "border-white/10 bg-[#08162f]/80" : "border-[var(--ledger-rule)] bg-white/70"}`}>
        <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${dark ? "grid-lines-dark" : "grid-lines"} opacity-70`} />
        <svg viewBox="0 0 730 320" className="relative w-full" role="img" aria-label={`Dependency graph for Ade Stores: ${relationship} upstream relationship`}>
          <g key={relationship}>
            {edges.map((edge, index) => {
              const failing = edge.to === "switch-s" || edge.from === "provider-a";
              const stroke = edge.status === "unknown" ? "#8b8f9a" : failing ? "#f06a45" : isConnected(edge) ? "#5b86ff" : "#3d5580";
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <motion.path
                    d={edge.d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={edge.status === "unknown" ? 1.7 : 2.2}
                    strokeDasharray={edge.status === "unknown" ? "5 6" : undefined}
                    initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: isConnected(edge) ? 1 : 0.45 }}
                    transition={{ duration: 0.85, delay: reduced ? 0 : index * 0.13, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {!reduced && failing && (
                    <path d={edge.d} fill="none" stroke="#ffb499" strokeWidth="1.6" className="edge-flow slow-flow" opacity={isConnected(edge) ? 0.9 : 0.25} />
                  )}
                </g>
              );
            })}
            {nodes.map((node) => {
              const isSelected = selected === node.id;
              const failing = Boolean(node.failing);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x} ${node.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, ${node.kind}${failing ? ", failing" : ""}. ${node.detail}`}
                  onClick={() => setSelected(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(node.id);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  {failing && <rect x="-4" y="-4" width="142" height="62" rx="14" fill="none" stroke="#f06a45" strokeOpacity="0.4" className={reduced ? "" : "node-pulse"} />}
                  <rect
                    width="134"
                    height="54"
                    rx="11"
                    fill={failing ? "rgba(240,106,69,0.16)" : isSelected ? "rgba(91,134,255,0.22)" : dark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.95)"}
                    stroke={failing ? "#f06a45" : isSelected ? "#5b86ff" : dark ? "rgba(190,210,255,0.22)" : "rgba(18,32,58,0.16)"}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />
                  <text x="12" y="21" fontSize="9" letterSpacing="1.4" fill={failing ? "#ff9b7e" : dark ? "#9fb4d9" : "#5e6677"} className="numeric">
                    {node.kind.toUpperCase()}
                  </text>
                  <text x="12" y="40" fontSize="13" fontWeight="600" fill={dark ? "#f3f7ff" : "#12203a"}>
                    {node.label}
                  </text>
                  {failing && <circle cx="122" cy="17" r="4" fill="#f06a45" />}
                </g>
              );
            })}
          </g>
        </svg>
        <p className={`relative px-2 pb-1 text-[10px] ${dark ? "text-[#9fb4d9]" : "text-[var(--ink-muted)]"}`}>
          Select a node to inspect its role. Solid links are known; dashed links are unverified.
        </p>
      </div>

      <div className={`rounded-2xl border p-5 ${dark ? "border-white/10 bg-white/5 text-white" : "border-[var(--ledger-rule)] bg-white/70 text-[var(--ink)]"}`}>
        <Eyebrow className={dark ? "text-[#7df0d0]" : "text-[var(--cobalt)]"}>Independence verdict</Eyebrow>
        <div className="mt-3 flex items-center gap-2">
          {copy.tone === "coral" ? <AlertTriangle className="size-5 text-[#ff9b7e]" /> : copy.tone === "teal" ? <CheckCircle2 className="size-5 text-[#5ee0bc]" /> : <HelpCircle className="size-5 text-[#b9bdc8]" />}
          <strong className="numeric text-lg tracking-[0.08em]">{copy.label}</strong>
        </div>
        <p className={`mt-3 text-sm font-semibold leading-6 ${dark ? "text-white" : "text-[var(--ink)]"}`}>{copy.headline}</p>
        <p className={`mt-2 text-sm leading-6 ${dark ? "text-[#c3d1ea]" : "text-[var(--ink-muted)]"}`}>{copy.body}</p>

        <div className={`mt-5 border-t pt-4 ${dark ? "border-white/12" : "border-[var(--ledger-rule)]"}`}>
          <p className="flex items-center gap-2 text-xs font-semibold"><Network aria-hidden="true" className="size-3.5" /> Selected node</p>
          <p className="mt-2 text-sm font-semibold">{activeNode.label} <span className="font-normal opacity-60">· {activeNode.kind}</span></p>
          <p className={`mt-1 text-xs leading-5 ${dark ? "text-[#b6c6e6]" : "text-[var(--ink-muted)]"}`}>{activeNode.detail}</p>
        </div>

        {showControls && onRelationshipChange && (
          <div className={`mt-5 border-t pt-4 ${dark ? "border-white/12" : "border-[var(--ledger-rule)]"}`}>
            <p className="mb-2 text-xs font-semibold">Compare relationship</p>
            <div className={`grid grid-cols-3 gap-1 rounded-lg p-1 ${dark ? "bg-white/8" : "bg-[var(--ledger-rule)]"}`}>
              {(["shared", "independent", "unverifiable"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onRelationshipChange(value)}
                  aria-pressed={relationship === value}
                  className={`rounded-md px-1.5 py-2 text-[10px] font-semibold transition-all sm:text-xs ${
                    relationship === value
                      ? dark ? "bg-white text-[var(--navy-900)]" : "bg-white text-[var(--cobalt)] shadow-sm"
                      : dark ? "text-[#b6c6e6] hover:bg-white/10" : "text-[var(--ink-muted)] hover:bg-white/60"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`mt-5 flex flex-wrap gap-3 text-[10px] ${dark ? "text-[#9fb4d9]" : "text-[var(--ink-muted)]"}`}>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#5b86ff]" /> known link</span>
          <span className="flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-[#8b8f9a]" /> unknown link</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#f06a45]" /> failing node</span>
        </div>
        <p className="sr-only" aria-live="polite">{connected(activeNode.id) ? "Selected node has dependency links" : "Selected node has no dependency links"}</p>
      </div>
    </div>
  );
}
