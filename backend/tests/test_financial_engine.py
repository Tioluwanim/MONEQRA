from datetime import datetime, timedelta, timezone

import pytest

from app.domain.financial_engine import (
    Obligation,
    PaymentView,
    available_funds,
    classify_payments,
    demo_scenarios,
    obligations_due_by,
    scenario,
    worst_case_position,
)
from app.domain.money import Money
from app.domain.payment_states import PaymentState


UTC = timezone.utc
DEADLINE = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)


def test_classify_payments_three_figures_and_unknown_not_counted():
    payments = [
        PaymentView("1", Money(5000), PaymentState.SETTLED, DEADLINE - timedelta(hours=1)),
        PaymentView("2", Money(2000), PaymentState.SUCCEEDED),
        PaymentView("3", Money(3000), PaymentState.UNKNOWN),
        PaymentView("4", Money(1000), PaymentState.PENDING),
    ]

    buckets = classify_payments(payments, DEADLINE)

    assert buckets.settled_by_deadline == Money(5000)
    assert buckets.succeeded_awaiting_settlement == Money(2000)
    assert buckets.unresolved == Money(4000)


def test_settlement_after_deadline_excluded_from_available_bucket():
    buckets = classify_payments([
        PaymentView("1", Money(5000), PaymentState.SETTLED, DEADLINE + timedelta(seconds=1)),
    ], DEADLINE)

    assert buckets.settled_by_deadline == Money(0)
    assert buckets.settled_after_deadline == Money(5000)


def test_mixed_currencies_rejected():
    with pytest.raises(ValueError, match="mixed currencies"):
        classify_payments([
            PaymentView("1", Money(5000, "NGN"), PaymentState.UNKNOWN),
            PaymentView("2", Money(5000, "USD"), PaymentState.UNKNOWN),
        ], DEADLINE)


def test_available_funds_obligations_and_worst_case():
    buckets = classify_payments([
        PaymentView("1", Money(5000), PaymentState.SETTLED, DEADLINE),
    ], DEADLINE)
    opening = Money(10000)
    obligations = [
        Obligation("a", "Rent", Money(3000), DEADLINE - timedelta(hours=1)),
        Obligation("b", "Payroll", Money(4000), DEADLINE),
        Obligation("c", "Later", Money(9000), DEADLINE + timedelta(days=1)),
    ]

    available = available_funds(opening, buckets)
    obligations_due = obligations_due_by(obligations, DEADLINE)

    assert available == Money(15000)
    assert obligations_due == Money(7000)
    assert worst_case_position(available, obligations_due) == Money(8000)


ADE_DEADLINE = datetime(2026, 11, 20, 17, 0, tzinfo=UTC)


def test_ade_stores_three_demo_scenarios_in_naira():
    payments = [
        *(PaymentView(str(i), Money(3000000), PaymentState.SETTLED, ADE_DEADLINE)
          for i in range(28)),
        *(PaymentView(str(i), Money(3000000), PaymentState.UNKNOWN)
          for i in range(28, 40)),
    ]
    buckets = classify_payments(payments, ADE_DEADLINE)
    obligations = [
        Obligation("supplier", "Supplier obligation", Money(110000000), ADE_DEADLINE),
    ]

    reports = demo_scenarios(
        buckets,
        Money(15000000),
        obligations,
        ADE_DEADLINE,
        6000,
    )

    assert buckets.settled_by_deadline == Money(84000000)
    assert buckets.unresolved == Money(36000000)
    assert reports.no_recovery.scenario_position == Money(-11000000)
    assert reports.assumed_recovery.scenario_recovery == Money(21600000)
    assert reports.assumed_recovery.scenario_position == Money(10600000)
    assert reports.full_recovery.scenario_recovery == Money(36000000)
    assert reports.full_recovery.scenario_position == Money(25000000)


def test_scenario_labels_recovery_probability_as_assumption():
    buckets = classify_payments(
        [PaymentView("unknown", Money(12345), PaymentState.UNKNOWN)],
        DEADLINE,
    )
    report = scenario(
        buckets,
        Money(10000),
        [],
        DEADLINE,
        6000,
    )

    assert report.scenario_recovery == Money(7407)
    assert report.assumptions[0].name == "recovery_probability"
    assert "assumption" in report.assumptions[0].description
    assert report.limitations


def test_scenario_rejects_mixed_currencies():
    buckets = classify_payments(
        [PaymentView("unknown", Money(10000, "NGN"), PaymentState.UNKNOWN)],
        DEADLINE,
    )

    with pytest.raises(ValueError, match="mixed currencies"):
        scenario(
            buckets,
            Money(10000, "USD"),
            [],
            DEADLINE,
            5000,
        )


@pytest.mark.parametrize("probability", [-1, 10001, True, 6000.0])
def test_scenario_rejects_invalid_probability(probability):
    buckets = classify_payments([], DEADLINE)

    with pytest.raises((TypeError, ValueError)):
        scenario(
            buckets,
            Money(10000),
            [],
            DEADLINE,
            probability,
        )
