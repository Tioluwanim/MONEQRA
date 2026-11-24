"use client";

import { useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { useDependencyGraph } from "@/lib/hooks";
import { ProductShell } from "@/components/product/shell";
import { DependencyFlow } from "@/components/moneqra";
import { VerdictBadge, EmptyState, ErrorState, LoadingSkeleton } from "@/components/moneqra";

export default function DependencyPage() {
  const graph = useDependencyGraph();
  const [branch, setBranch] = useState<"shared" | "independent">("shared");
  const nodes: Node[] = graph.data?.nodes.map((node, index) => {
    const kind = String(node.kind ?? "switch");
    return {
      id: String(node.id),
      position: { x: (index % 3) * 220, y: Math.floor(index / 3) * 150 },
      data: { label: String(node.display_name ?? node.key ?? "Unnamed node"), kind, failing: kind === "switch" && branch === "shared" },
      type: "dependency",
    };
  }) ?? [];
  const edges: Edge[] = graph.data?.edges.map((edge, index) => ({
    id: `edge-${index}`,
    source: edge.from_node_id,
    target: edge.to_node_id,
    dashed: edge.status === "unknown",
  })) ?? [];

  return (
    <ProductShell>
      <header className="flex flex-wrap items-end justify-between gap-4 border-t-2 border-[var(--vermilion)] py-5">
        <div><p className="font-mono text-xs">DEPENDENCY / ALTERNATIVE ROUTE</p><h1 className="mt-2 text-4xl">Where the failure belongs</h1></div>
        <span className="border border-[var(--vermilion)] px-2 py-1 font-mono text-xs text-[var(--vermilion)]">SIMULATION</span>
      </header>
      <div className="mb-5 flex gap-2">
        <button type="button" onClick={() => setBranch("shared")} className="border px-3 py-2 text-sm">Shared branch</button>
        <button type="button" onClick={() => setBranch("independent")} className="border px-3 py-2 text-sm">Independent branch</button>
      </div>
      {graph.isLoading ? <LoadingSkeleton /> : graph.isError ? <ErrorState title="Dependency graph unavailable" detail={graph.error.message} /> : nodes.length === 0 ? <EmptyState title="No dependency graph" /> : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <DependencyFlow nodes={nodes} edges={edges} />
          <aside>
            <VerdictBadge verdict={branch === "shared" ? "shared" : "independent"} reason={branch === "shared" ? "Both routes rely on the failing upstream switch." : "Only one route depends on the failing upstream switch."} />
            <h2 className="mt-6 text-sm font-semibold">Keyboard graph list</h2>
            <ul className="mt-2 space-y-2">{nodes.map((node) => <li key={node.id} tabIndex={0} className="border-l-2 border-[var(--ledger-rule-strong)] pl-3 text-sm">{String(node.data.label)}</li>)}</ul>
          </aside>
        </div>
      )}
    </ProductShell>
  );
}
