import pytest

from app.domain.dependency import (
    DependencyEdge,
    DependencyGraph,
    EdgeStatus,
    IndependenceVerdict,
    independence_verdict,
)


def independent_graph() -> DependencyGraph:
    return DependencyGraph(
        nodes=frozenset({
            "merchant", "provider-a", "provider-b",
            "processor-a", "processor-b", "switch-a", "switch-b",
        }),
        edges=(
            DependencyEdge("merchant", "provider-a", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("merchant", "provider-b", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("provider-a", "processor-a", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("provider-b", "processor-b", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("processor-a", "switch-a", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("processor-b", "switch-b", EdgeStatus.KNOWN, "README demo"),
        ),
    )


def shared_graph() -> DependencyGraph:
    graph_nodes = frozenset({
        "merchant", "provider-a", "provider-b",
        "processor-a", "processor-b", "switch",
    })
    return DependencyGraph(
        nodes=graph_nodes,
        edges=(
            DependencyEdge("merchant", "provider-a", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("merchant", "provider-b", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("provider-a", "processor-a", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("provider-b", "processor-b", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("processor-a", "switch", EdgeStatus.KNOWN, "README demo"),
            DependencyEdge("processor-b", "switch", EdgeStatus.KNOWN, "README demo"),
        ),
    )


def test_independent_demo_branch():
    graph = independent_graph()

    assert independence_verdict(graph, "provider-a", "provider-b") is IndependenceVerdict.INDEPENDENT


def test_shared_demo_branch():
    graph = shared_graph()

    assert independence_verdict(graph, "provider-a", "provider-b") is IndependenceVerdict.SHARED


def test_unknown_link_is_unverifiable():
    graph = DependencyGraph(
        nodes=frozenset({"provider-a", "processor-a", "provider-b", "processor-b"}),
        edges=(
            DependencyEdge("provider-a", "processor-a", EdgeStatus.UNKNOWN, "vendor documentation missing"),
            DependencyEdge("provider-b", "processor-b", EdgeStatus.KNOWN, "verified integration"),
        ),
    )

    result = independence_verdict(graph, "provider-a", "provider-b")

    assert result is IndependenceVerdict.UNVERIFIABLE
    assert graph.upstream("provider-a").unknown_links


def test_shared_is_checked_before_unknown():
    graph = DependencyGraph(
        nodes=frozenset({"provider-a", "provider-b", "processor-a", "shared"}),
        edges=(
            DependencyEdge("provider-a", "shared", EdgeStatus.KNOWN, "verified"),
            DependencyEdge("provider-b", "shared", EdgeStatus.KNOWN, "verified"),
            DependencyEdge("provider-a", "processor-a", EdgeStatus.UNKNOWN, "unknown link"),
        ),
    )

    assert independence_verdict(graph, "provider-a", "provider-b") is IndependenceVerdict.SHARED


def test_node_with_no_edges():
    graph = DependencyGraph(
        nodes=frozenset({"isolated"}),
        edges=(),
    )

    upstream = graph.upstream("isolated")
    assert upstream.reachable_nodes == frozenset({"isolated"})
    assert upstream.unknown_links == ()
    assert graph.affected_nodes("isolated") == frozenset({"isolated"})


def test_self_edge_is_rejected():
    with pytest.raises(ValueError, match="point at itself"):
        DependencyEdge("provider", "provider", EdgeStatus.KNOWN, "invalid")


def test_affected_nodes_downstream_of_failed_node():
    graph = DependencyGraph(
        nodes=frozenset({"merchant-a", "merchant-b", "provider", "processor"}),
        edges=(
            DependencyEdge("merchant-a", "provider", EdgeStatus.KNOWN, "provider relationship"),
            DependencyEdge("merchant-b", "provider", EdgeStatus.KNOWN, "provider relationship"),
            DependencyEdge("provider", "processor", EdgeStatus.KNOWN, "processor relationship"),
        ),
    )

    assert graph.affected_nodes("processor") == frozenset({"processor", "provider", "merchant-a", "merchant-b"})
