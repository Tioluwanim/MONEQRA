from datetime import datetime, timezone

import pytest

from app.domain.coverage import (
    ActionKind,
    CoverageObligation,
    CoverageStatus,
    compute_coverage,
    suggest_action,
)
from app.domain.money import Money


def ob(id, cat, kobo, day):
    return CoverageObligation(id, id, cat, Money(kobo), datetime(2026, 11, day, 17, tzinfo=timezone.utc))


def demo(bps):
    return compute_coverage(
        [ob("supplier", "supplier", 110_000_000, 19), ob("payroll", "payroll", 65_000_000, 20),
         ob("tax", "tax", 18_000_000, 21)],
        Money(99_000_000), Money(36_000_000), bps,
    )


def test_no_recovery_supplier_is_at_risk_and_money_stays_for_later_items():
    r = demo(0)
    s = {i.obligation.id: i for i in r.items}
    assert s["supplier"].status is CoverageStatus.AT_RISK
    assert s["supplier"].shortfall.minor == 11_000_000
    # the unpaid supplier consumes nothing, so payroll and tax are covered by confirmed money
    assert s["payroll"].status is CoverageStatus.COVERED
    assert s["tax"].status is CoverageStatus.COVERED
    assert r.at_risk_total.minor == 110_000_000


def test_sixty_percent_recovery_makes_supplier_depend_on_unconfirmed():
    r = demo(6000)
    s = {i.obligation.id: i for i in r.items}
    assert r.assumed_unconfirmed.minor == 21_600_000
    assert s["supplier"].status is CoverageStatus.DEPENDS
    assert s["supplier"].from_confirmed.minor == 99_000_000
    assert s["supplier"].from_unconfirmed.minor == 11_000_000
    assert s["supplier"].suggested_action is ActionKind.SPLIT_PAYMENT
    assert s["payroll"].status is CoverageStatus.AT_RISK
    assert s["payroll"].suggested_action is ActionKind.PAY_FROM_CONFIRMED_FIRST


def test_totals_add_up_and_no_double_spend():
    for bps in (0, 3000, 6000, 10000):
        r = demo(bps)
        assert r.covered_total.minor + r.depends_total.minor + r.at_risk_total.minor == r.total_due.minor
        used = sum(i.from_confirmed.minor + i.from_unconfirmed.minor for i in r.items)
        assert used <= r.confirmed_funds.minor + r.assumed_unconfirmed.minor


def test_ties_break_by_category_priority():
    same = datetime(2026, 11, 19, 17, tzinfo=timezone.utc)
    a = CoverageObligation("a", "a", "supplier", Money(60), same)
    b = CoverageObligation("b", "b", "tax", Money(60), same)
    r = compute_coverage([a, b], Money(60), Money(0), 0)
    assert [i.obligation.id for i in r.items] == ["b", "a"]
    assert r.items[0].status is CoverageStatus.COVERED
    assert r.items[1].status is CoverageStatus.AT_RISK


def test_floor_never_overstates_unconfirmed():
    r = compute_coverage([], Money(0), Money(999), 3333)
    assert r.assumed_unconfirmed.minor == 332


def test_validation():
    with pytest.raises(ValueError):
        compute_coverage([], Money(0), Money(0), 10_001)
    with pytest.raises(TypeError):
        compute_coverage([], Money(0), Money(0), 50.5)
    with pytest.raises(ValueError):
        compute_coverage([], Money(0), Money(0, "USD"), 0)


def test_suggested_actions():
    assert suggest_action("supplier", CoverageStatus.COVERED) is None
    assert suggest_action("supplier", CoverageStatus.AT_RISK) is ActionKind.REQUEST_EXTENSION
    assert suggest_action("tax", CoverageStatus.AT_RISK) is ActionKind.PAY_FROM_CONFIRMED_FIRST
