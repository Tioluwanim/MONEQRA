from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class EdgeStatus(str, Enum):
    KNOWN = "known"
    UNKNOWN = "unknown"


class IndependenceVerdict(str, Enum):
    SHARED = "SHARED"
    UNVERIFIABLE = "UNVERIFIABLE"
    INDEPENDENT = "INDEPENDENT"


@dataclass(frozen=True)
class DependencyEdge:
    from_node: str
    to_node: str
    status: EdgeStatus
    source_note: str

    def __post_init__(self) -> None:
        if not isinstance(self.from_node, str) or not self.from_node.strip():
            raise ValueError("from_node must not be empty")
        if not isinstance(self.to_node, str) or not self.to_node.strip():
            raise ValueError("to_node must not be empty")
        if self.from_node == self.to_node:
            raise ValueError("dependency edge cannot point at itself")
        if not isinstance(self.status, EdgeStatus):
            raise TypeError("status must be EdgeStatus.KNOWN or EdgeStatus.UNKNOWN")
        if not isinstance(self.source_note, str) or not self.source_note.strip():
            raise ValueError("source_note must not be empty")


@dataclass(frozen=True)
class UpstreamResult:
    reachable_nodes: frozenset[str]
    unknown_links: tuple[DependencyEdge, ...]


@dataclass(frozen=True)
class DependencyGraph:
    nodes: frozenset[str]
    edges: tuple[DependencyEdge, ...]

    def __post_init__(self) -> None:
        for edge in self.edges:
            if edge.from_node not in self.nodes or edge.to_node not in self.nodes:
                raise ValueError("edge endpoints must be nodes in the graph")

    def upstream(self, node: str) -> UpstreamResult:
        if node not in self.nodes:
            raise ValueError("node must exist in the graph")

        reachable = {node}
        unknown_links: list[DependencyEdge] = []
        pending = [node]

        while pending:
            current = pending.pop()
            outgoing = [
                edge for edge in self.edges
                if edge.from_node == current
            ]
            for edge in outgoing:
                if edge.status is EdgeStatus.UNKNOWN:
                    unknown_links.append(edge)
                    continue
                if edge.to_node not in reachable:
                    reachable.add(edge.to_node)
                    pending.append(edge.to_node)

        return UpstreamResult(
            reachable_nodes=frozenset(reachable),
            unknown_links=tuple(unknown_links),
        )

    def affected_nodes(self, failed_node: str) -> frozenset[str]:
        if failed_node not in self.nodes:
            raise ValueError("failed node must exist in the graph")

        affected = {failed_node}
        pending = [failed_node]
        while pending:
            current = pending.pop()
            for edge in self.edges:
                if edge.status is EdgeStatus.UNKNOWN:
                    continue
                if edge.to_node == current and edge.from_node not in affected:
                    affected.add(edge.from_node)
                    pending.append(edge.from_node)
        return frozenset(affected)


def independence_verdict(
    graph: DependencyGraph,
    affected_route: str,
    alternative_route: str,
) -> IndependenceVerdict:
    affected = graph.upstream(affected_route)
    alternative = graph.upstream(alternative_route)

    if affected.reachable_nodes & alternative.reachable_nodes:
        return IndependenceVerdict.SHARED
    if affected.unknown_links or alternative.unknown_links:
        return IndependenceVerdict.UNVERIFIABLE
    return IndependenceVerdict.INDEPENDENT