from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Iterable

from app.domain.money import (
    Money,
    basis_points_to_fraction,
    floor_to_whole_kobo,
)
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


@dataclass(frozen=True)
class ScenarioReport:
    available_funds: Money
    obligations_due: Money
    worst_case_position: Money
    scenario_recovery: Money
    scenario_position: Money
    inputs: tuple[str, ...]
    assumptions: tuple[Assumption, ...]
    limitations: tuple[str, ...]


@dataclass(frozen=True)
class DemoScenarios:
    no_recovery: ScenarioReport
    assumed_recovery: ScenarioReport
    full_recovery: ScenarioReport


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


def scenario(
    buckets: Buckets,
    opening_funds: Money,
    obligations: Iterable[Obligation],
    deadline: datetime,
    recovery_probability_bps: int,
) -> ScenarioReport:
    """Calculate one deadline recovery scenario using integer basis points."""
    if isinstance(recovery_probability_bps, bool) or not isinstance(recovery_probability_bps, int):
        raise TypeError("recovery probability must be an integer in basis points")
    if not 0 <= recovery_probability_bps <= 10_000:
        raise ValueError("basis points must be between 0 and 10000")

    available = available_funds(opening_funds, buckets)
    due = obligations_due_by(obligations, deadline)
    worst = worst_case_position(available, due)
    probability = basis_points_to_fraction(recovery_probability_bps)
    recovery = floor_to_whole_kobo(
        buckets.unresolved.scaled(probability),
        buckets.unresolved.currency,
    )

    inputs = (
        f"opening_funds={opening_funds.minor} {opening_funds.currency}",
        f"settled_by_deadline={buckets.settled_by_deadline.minor} {buckets.settled_by_deadline.currency}",
        f"unresolved={buckets.unresolved.minor} {buckets.unresolved.currency}",
        f"obligations_due={due.minor} {due.currency}",
        f"deadline={deadline.isoformat()}",
    )
    assumptions = (
        Assumption(
            name="recovery_probability",
            description="assumption: probability that unresolved payments settle by the deadline",
            value=recovery_probability_bps,
        ),
    )
    limitations = (
        "Recovery is an assumption, not a guarantee.",
        "A succeeded payment is not counted until it is settled.",
        "Pending and unknown payments are not confirmed cash.",
        "Settlement after the deadline is not included in available funds.",
    )

    return ScenarioReport(
        available_funds=available,
        obligations_due=due,
        worst_case_position=worst,
        scenario_recovery=recovery,
        scenario_position=worst + recovery,
        inputs=inputs,
        assumptions=assumptions,
        limitations=limitations,
    )


def demo_scenarios(
    buckets: Buckets,
    opening_funds: Money,
    obligations: Iterable[Obligation],
    deadline: datetime,
    recovery_probability_bps: int,
) -> DemoScenarios:
    """Produce no-recovery, stated-probability and full-recovery scenarios."""
    obligations = tuple(obligations)
    return DemoScenarios(
        no_recovery=scenario(
            buckets,
            opening_funds,
            obligations,
            deadline,
            0,
        ),
        assumed_recovery=scenario(
            buckets,
            opening_funds,
            obligations,
            deadline,
            recovery_probability_bps,
        ),
        full_recovery=scenario(
            buckets,
            opening_funds,
            obligations,
            deadline,
            10_000,
        ),
    )
