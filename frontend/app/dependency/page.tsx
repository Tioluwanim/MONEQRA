"use client";

import { useMemo } from "react";
import { useDependencyGraph, useIncidents } from "@/lib/hooks";
import { ProductShell, PageTitle } from "@/components/product/shell";
import { RouteChain, LoadingSkeleton, EmptyState, ErrorState, StatusPill, type RouteStep } from "@/components/moneqra";
import { routeVerdictLabels } from "@/lib/labels";

type GraphNode = { id: string; label: string; kind: string };

/** Walk the graph from every starting point to every end point: each path is one payment route. */
function buildRoutes(nodes: GraphNode[], edges: { from: string; to: string }[]): GraphNode[][] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Set(edges.map((e) => e.to));
  const starts = nodes.filter((n) => !incoming.has(n.id));
  const routes: GraphNode[][] = [];
  const walk = (node: GraphNode, path: GraphNode[], seen: Set<string>) => {
    const out = edges.filter((e) => e.from === node.id && !seen.has(e.to));
    if (out.length === 0) {
      if (path.length > 1) routes.push(path);
      return;
    }
    for (const edge of out) {
      const next = byId.get(edge.to);
      if (next) walk(next, [...path, next], new Set([...seen, next.id]));
    }
  };
  for (const start of starts) walk(start, [start], new Set([start.id]));
  return routes;
}

export default function DependencyPage() {
  const graph = useDependencyGraph();
  const incidents = useIncidents();
  const active = incidents.data?.items.find((item) => item.state !== "resolved");

  const { routes, sharedIds } = useMemo(() => {
    if (!graph.data) return { routes: [] as GraphNode[][], sharedIds: new Set<string>() };
    const nodes: GraphNode[] = graph.data.nodes.map((n) => ({
      id: String(n.id),
      label: String(n.display_name ?? n.key ?? "Unnamed"),
      kind: String(n.kind ?? "switch"),
    }));
    const found = buildRoutes(nodes, graph.data.edges.map((e) => ({ from: e.from_node_id, to: e.to_node_id })));
    const counts = new Map<string, number>();
    for (const route of found) for (const n of route.slice(1)) counts.set(n.id, (counts.get(n.id) ?? 0) + 1);
    return { routes: found, sharedIds: new Set([...counts].filter(([, c]) => c > 1).map(([id]) => id)) };
  }, [graph.data]);

  const hasUnknownEdge = graph.data?.edges.some((e) => e.status === "unknown") ?? false;
  // Two or more routes that meet at the same step share a failure point.
  const sharedFailing = routes.length > 1 && sharedIds.size > 0;
  const verdict = hasUnknownEdge ? routeVerdictLabels.unverifiable : sharedFailing ? routeVerdictLabels.shared : routeVerdictLabels.independent;
  const tone = hasUnknownEdge ? "callout-warn" : sharedFailing ? "callout-bad" : "callout-good";

  return (
    <ProductShell>
      <PageTitle title="Can you switch to another provider?" lead="Moving payments only helps if the other provider does not rely on the same system that is failing. This page checks that." />
      {graph.isLoading ? <LoadingSkeleton rows={4} /> : graph.isError ? <ErrorState title="Could not load your payment routes" detail={graph.error.message} onRetry={() => void graph.refetch()} /> : routes.length === 0 ? <EmptyState title="No routes to show" detail="We could not find any payment routes for this business." /> : (
        <>
          <section aria-labelledby="answer-heading" className={`callout ${tone} mb-8`}>
            <div>
              <StatusPill tone={verdict.tone}>{verdict.label}</StatusPill>
              <h2 id="answer-heading" className="mt-2 text-2xl">{verdict.headline}</h2>
              <p className="mt-1 text-[var(--text-muted)]">{verdict.hint}</p>
            </div>
          </section>
          <section aria-labelledby="routes-heading">
            <h2 id="routes-heading" className="mb-1 text-xl">Your payment routes</h2>
            <p className="mb-4 text-[var(--text-muted)]">Each row is one way a customer payment reaches you. Steps used by more than one route are highlighted.</p>
            <div className="grid gap-4">
              {routes.map((route, i) => {
                const steps: RouteStep[] = route.map((n, idx) => ({
                  id: n.id,
                  label: n.label,
                  kind: n.kind,
                  failing: n.id === active?.subject_node_id,
                  shared: idx > 0 && sharedIds.has(n.id),
                }));
                return <RouteChain key={i} name={`Route ${i + 1}`} steps={steps} />;
              })}
            </div>
          </section>
          <p className="mt-6 text-sm text-[var(--text-faint)]">Simulated routes for the demo. Switching providers is never done automatically.</p>
        </>
      )}
    </ProductShell>
  );
}
