"use client";

import { useState } from "react";
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type DependencyKind = "business" | "provider" | "processor" | "switch";

function DependencyNodeView({ data }: NodeProps) {
  const payload = data as { label: string; kind: DependencyKind; failing?: boolean };
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div
        tabIndex={0}
        className={`min-w-36 border px-3 py-2 text-sm ${
          payload.failing
            ? "border-2 border-[var(--vermilion)] bg-[color-mix(in_srgb,var(--vermilion)_12%,var(--paper))]"
            : "border-[var(--ledger-rule-strong)] bg-[var(--paper-raised)]"
        }`}
      >
        <span className="block font-mono text-[10px] uppercase text-[var(--ink-muted)]">{payload.kind}</span>
        <strong>{payload.label}</strong>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export const dependencyNodeTypes = { dependency: DependencyNodeView };

export function DependencyFlow({
  nodes,
  edges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const activeEdges = edges.map((edge) => ({
    ...edge,
    style: {
      stroke:
        hovered && (edge.source === hovered || edge.target === hovered)
          ? "var(--cobalt)"
          : "var(--ink)",
      strokeWidth: hovered && (edge.source === hovered || edge.target === hovered) ? 3 : 1.5,
    },
  }));
  return (
    <div
      className="h-80 border-y border-[var(--ledger-rule)]"
      role="region"
      aria-label="Dependency graph"
    >
      <ReactFlow
        nodes={nodes}
        edges={activeEdges}
        nodeTypes={dependencyNodeTypes}
        fitView
        onNodeMouseEnter={(_, node) => setHovered(node.id)}
        onNodeMouseLeave={() => setHovered(null)}
        nodesFocusable
      >
        <Background gap={24} size={1} color="var(--ledger-rule)" />
      </ReactFlow>
    </div>
  );
}

export function DependencyEdgeFallback({
  status,
}: {
  status: "known" | "unknown";
}) {
  return (
    <span className={`block h-px w-full ${status === "known" ? "bg-[var(--ink)]" : "border-t border-dashed border-[var(--unknown)]"}`}>
      {status} dependency
    </span>
  );
}
