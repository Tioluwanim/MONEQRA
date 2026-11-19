from datetime import datetime, timedelta, timezone

import pytest

from app.domain.financial_engine import (
    Obligation,
    PaymentView,
    available_funds,
    classify_payments,
    obligations_due_by,
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
