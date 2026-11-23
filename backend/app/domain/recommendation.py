from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum

from app.domain.dependency import IndependenceVerdict
from app.domain.financial_engine import LiquidityReport, ScenarioReport


class ActionTier(IntEnum):
    READ_ONLY = 1
    RECOMMEND = 2
    NEVER = 3


@dataclass(frozen=True)
class RecommendationContext:
    evidence: tuple[str, ...] = ()
    limitations: tuple[str, ...] = ()


@dataclass(frozen=True)
class Recommendation:
    action: str
    tier: ActionTier
    reasons: tuple[str, ...]
    evidence: tuple[str, ...]
    limitations: tuple[str, ...]
    approval_required: bool


def _worst_case(report: LiquidityReport | ScenarioReport):
    if isinstance(report, LiquidityReport):
        return report.worst_case
    if isinstance(report, ScenarioReport):
        return report.worst_case_position
    raise TypeError("liquidity_report must be LiquidityReport or ScenarioReport")


def recommend(
    liquidity_report: LiquidityReport | ScenarioReport,
    independence: IndependenceVerdict,
    context: RecommendationContext | None = None,
) -> Recommendation:
    """Produce a README section 10 recommendation; it never executes an action."""
    if not isinstance(independence, IndependenceVerdict):
        raise TypeError("independence must be IndependenceVerdict")

    ctx = context or RecommendationContext()
    if not isinstance(ctx, RecommendationContext):
        raise TypeError("context must be RecommendationContext")

    evidence = tuple(ctx.evidence)
    limitations = tuple(ctx.limitations)

    if not _worst_case(liquidity_report).is_negative():
        return Recommendation(
            action="Wait and keep verifying",
            tier=ActionTier.READ_ONLY,
            reasons=("The worst-case position has no shortfall.",),
            evidence=evidence,
            limitations=limitations,
            approval_required=False,
        )

    if independence is IndependenceVerdict.INDEPENDENT:
        return Recommendation(
            action="Route new payments to the alternative and keep verifying unknown payments",
            tier=ActionTier.RECOMMEND,
            reasons=(
                "The worst-case position has a shortfall.",
                "The alternative route is independently verifiable.",
            ),
            evidence=evidence,
            limitations=limitations,
            approval_required=True,
        )

    if independence is IndependenceVerdict.SHARED:
        reasons = (
            "The worst-case position has a shortfall.",
            "Rerouting is withheld because the alternative shares the failing infrastructure.",
        )
    else:
        reasons = (
            "The worst-case position has a shortfall.",
            "Rerouting is withheld because route independence cannot be verified.",
        )

    return Recommendation(
        action="Withhold reroute; offer an extension request",
        tier=ActionTier.RECOMMEND,
        reasons=reasons,
        evidence=evidence,
        limitations=limitations,
        approval_required=True,
    )


def unsupported_action(tier: int | ActionTier) -> None:
    """Reject tier 3 actions, which MONEQRA never supports."""
    try:
        action_tier = ActionTier(tier)
    except (TypeError, ValueError) as exc:
        raise ValueError("unsupported action tier") from exc
    if action_tier is ActionTier.NEVER:
        raise ValueError("tier 3 actions are never supported")