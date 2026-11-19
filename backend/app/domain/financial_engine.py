from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Iterable

from app.domain.money import Money, floor_to_whole_kobo
from app.domain.payment_states import PaymentState


@dataclass(frozen=True)
class PaymentView:
    id: str
    amount: Money
    state: PaymentState
    settled_at: datetime | None = None


@dataclass(frozen=True)
class Obligation:
    id: str
    label: str
    amount: Money
    due_at: datetime


@dataclass(frozen=True)
class Assumption:
    name: str
    description: str
    value: Any


@dataclass(frozen=True)
class Buckets:
    settled_by_deadline: Money
    settled_by_deadline_count: int
    settled_after_deadline: Money
    settled_after_deadline_count: int
    succeeded_awaiting_settlement: Money
    succeeded_awaiting_settlement_count: int
    unresolved: Money
    unresolved_count: int


@dataclass(frozen=True)
class CalcStep:
    label: str
    formula: str
    result: Money | int | str


@dataclass(frozen=True)
class ScenarioResult:
    name: str
    assumed_recovery: int
    recovered_amount: Money
    final_position: Money


@dataclass(frozen=True)
class LiquidityReport:
    buckets: Buckets
    available_funds: Money
    obligations_due: Money
    worst_case: Money
    scenario_results: tuple[ScenarioResult, ...]
    assumptions: tuple[Assumption, ...]
    steps: tuple[CalcStep, ...]
    as_of: datetime
    deadline: datetime


def _aware(value: datetime, name: str) -> None:
    if not isinstance(value, datetime):
        raise TypeError(f"{name} must be a datetime")
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError(f"{name} must be timezone-aware")


def _ensure_same_currency(items: Iterable[Money]) -> str:
    currencies = {item.currency for item in items}
    if len(currencies) > 1:
        raise ValueError("mixed currencies are not allowed")
    return next(iter(currencies), "NGN")


def classify_payments(payments: Iterable[PaymentView], deadline: datetime) -> Buckets:
    """Classify payments without counting succeeded or unresolved cash as settled."""
    _aware(deadline, "deadline")

    payment_list = list(payments)
    currency = _ensure_same_currency(payment.amount for payment in payment_list)

    settled_by = Money.zero(currency)
    settled_by_count = 0
    settled_after = Money.zero(currency)
    settled_after_count = 0
    succeeded = Money.zero(currency)
    succeeded_count = 0
    unresolved = Money.zero(currency)
    unresolved_count = 0

    for payment in payment_list:
        if not isinstance(payment.amount, Money):
            raise TypeError("payment amount must be Money")
        if payment.amount.currency != currency:
            raise ValueError("mixed currencies are not allowed")

        if payment.state is PaymentState.SETTLED:
            if payment.settled_at is None:
                raise ValueError("settled payment must have settled_at")
            _aware(payment.settled_at, "settled_at")
            if payment.settled_at <= deadline:
                settled_by = settled_by + payment.amount
                settled_by_count += 1
            else:
                settled_after = settled_after + payment.amount
                settled_after_count += 1
        elif payment.state is PaymentState.SUCCEEDED:
            succeeded = succeeded + payment.amount
            succeeded_count += 1
        elif payment.state in {PaymentState.PENDING, PaymentState.UNKNOWN}:
            unresolved = unresolved + payment.amount
            unresolved_count += 1

    return Buckets(
        settled_by_deadline=settled_by,
        settled_by_deadline_count=settled_by_count,
        settled_after_deadline=settled_after,
        settled_after_deadline_count=settled_after_count,
        succeeded_awaiting_settlement=succeeded,
        succeeded_awaiting_settlement_count=succeeded_count,
        unresolved=unresolved,
        unresolved_count=unresolved_count,
    )


def available_funds(opening: Money, buckets: Buckets) -> Money:
    """Opening funds plus only cash settled on or before the deadline."""
    if opening.currency != buckets.settled_by_deadline.currency:
        raise ValueError("mixed currencies are not allowed")
    return opening + buckets.settled_by_deadline


def obligations_due_by(obligations: Iterable[Obligation], deadline: datetime) -> Money:
    """Sum obligations due on or before the deadline."""
    _aware(deadline, "deadline")
    obligation_list = list(obligations)
    currency = _ensure_same_currency(obligation.amount for obligation in obligation_list)

    total = Money.zero(currency)
    for obligation in obligation_list:
        _aware(obligation.due_at, "due_at")
        if obligation.amount.currency != currency:
            raise ValueError("mixed currencies are not allowed")
        if obligation.due_at <= deadline:
            total = total + obligation.amount
    return total


def worst_case_position(available: Money, obligations_due: Money) -> Money:
    """Return available funds less obligations due; it may be negative."""
    if available.currency != obligations_due.currency:
        raise ValueError("mixed currencies are not allowed")
    return available - obligations_due
