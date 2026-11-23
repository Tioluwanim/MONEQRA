import pytest
from dataclasses import FrozenInstanceError

from app.domain.dependency import IndependenceVerdict
from app.domain.financial_engine import ScenarioReport
from app.domain.money import Money
from app.domain.recommendation import (
    ActionTier,
    RecommendationContext,
    recommend,
    unsupported_action,
)


def report(worst_minor: int) -> ScenarioReport:
    return ScenarioReport(
        available_funds=Money(max(worst_minor, 0)),
        obligations_due=Money(100),
        worst_case_position=Money(worst_minor),
        scenario_recovery=Money(0),
        scenario_position=Money(worst_minor),
        inputs=("opening=100",),
        assumptions=(),
        limitations=("illustrative",),
    )


def test_no_shortfall_recommends_wait_and_is_tier_one():
    result = recommend(
        report(500),
        IndependenceVerdict.SHARED,
        RecommendationContext(
            evidence=("provider status check",),
            limitations=("demo data",),
        ),
    )

    assert result.action == "Wait and keep verifying"
    assert result.tier is ActionTier.READ_ONLY
    assert not result.approval_required
    assert result.evidence == ("provider status check",)
    assert result.limitations == ("demo data",)


def test_shortfall_with_independent_route_is_tier_two():
    result = recommend(report(-100), IndependenceVerdict.INDEPENDENT)

    assert "Route new payments" in result.action
    assert result.tier is ActionTier.RECOMMEND
    assert result.approval_required


def test_shortfall_with_shared_route_withholds_reroute():
    result = recommend(report(-100), IndependenceVerdict.SHARED)

    assert result.action == "Withhold reroute; offer an extension request"
    assert "shares" in result.reasons[1]
    assert result.approval_required


def test_shortfall_with_unverifiable_route_withholds_reroute():
    result = recommend(report(-100), IndependenceVerdict.UNVERIFIABLE)

    assert result.action == "Withhold reroute; offer an extension request"
    assert "cannot be verified" in result.reasons[1]
    assert result.approval_required


def test_recommendation_is_frozen():
    result = recommend(report(-100), IndependenceVerdict.INDEPENDENT)

    with pytest.raises(FrozenInstanceError):
        result.action = "changed"


def test_tier_three_never_action_is_rejected():
    with pytest.raises(ValueError, match="never supported"):
        unsupported_action(ActionTier.NEVER)
