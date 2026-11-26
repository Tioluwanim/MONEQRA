"""Cash-certainty coverage: which obligations confirmed money covers, which depend on
money that is not confirmed yet, and which are at risk.

Pure integer arithmetic (kobo). No I/O. MONEQRA never moves money; this only reports.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Iterable

from app.domain.money import Money

# Lower rank = protect first. Used only to break ties between obligations due at the
# same moment, and to decide whether an at-risk obligation is realistically negotiable.
CATEGORY_RANK = {
    "tax": 1,
    "payroll": 2,
    "loan": 3,
    "rent_utilities": 4,
    "supplier": 5,
    "other": 6,
}
NEGOTIABLE_CATEGORIES = frozenset({"supplier", "other", "rent_utilities"})
CATEGORIES = tuple(CATEGORY_RANK)
PRIORITY_RANK = {
    "critical": 1,
    "high": 2,
    "normal": 3,
    "low": 4,
}
PRIORITIES = tuple(PRIORITY_RANK)


class CoverageStatus(str, Enum):
    COVERED = "covered"  # confirmed money covers it
    DEPENDS = "depends_on_unconfirmed"  # covered only if unconfirmed money arrives
    AT_RISK = "at_risk"  # not covered even if the assumed recovery arrives


class ActionKind(str, Enum):
    REQUEST_EXTENSION = "request_extension"
    SPLIT_PAYMENT = "split_payment"
    PAY_FROM_CONFIRMED_FIRST = "pay_from_confirmed_first"


@dataclass(frozen=True)
class CoverageObligation:
    id: str
    label: str
    category: str
    amount: Money
    due_at: datetime
    priority: str = "normal"
    responsible_person: str | None = None


@dataclass(frozen=True)
class CoverageItem:
    obligation: CoverageObligation
    status: CoverageStatus
    from_confirmed: Money
    from_unconfirmed: Money
    shortfall: Money
    suggested_action: ActionKind | None


@dataclass(frozen=True)
class CoverageReport:
    items: tuple[CoverageItem, ...]
    confirmed_funds: Money
    assumed_unconfirmed: Money
    assumed_recovery_bps: int
    total_due: Money
    covered_total: Money
    depends_total: Money
    at_risk_total: Money


def suggest_action(category: str, status: CoverageStatus) -> ActionKind | None:
    if status is CoverageStatus.COVERED:
        return None
    if category in NEGOTIABLE_CATEGORIES:
        return (
            ActionKind.REQUEST_EXTENSION
            if status is CoverageStatus.AT_RISK
            else ActionKind.SPLIT_PAYMENT
        )
    # tax, payroll, loan: not realistically deferrable, so use confirmed money on them first
    return ActionKind.PAY_FROM_CONFIRMED_FIRST


def compute_coverage(
    obligations: Iterable[CoverageObligation],
    confirmed_funds: Money,
    unresolved_funds: Money,
    recovery_probability_bps: int,
) -> CoverageReport:
    if isinstance(recovery_probability_bps, bool) or not isinstance(recovery_probability_bps, int):
        raise TypeError("recovery probability must be an integer in basis points")
    if not 0 <= recovery_probability_bps <= 10_000:
        raise ValueError("basis points must be between 0 and 10000")
    currency = confirmed_funds.currency
    if unresolved_funds.currency != currency:
        raise ValueError("mixed currencies are not allowed")

    ordered = sorted(
        obligations,
        key=lambda o: (
            o.due_at,
            PRIORITY_RANK.get(o.priority, PRIORITY_RANK["normal"]),
            CATEGORY_RANK.get(o.category, CATEGORY_RANK["other"]),
            o.id,
        ),
    )
    for o in ordered:
        if o.amount.currency != currency:
            raise ValueError("mixed currencies are not allowed")
        if o.due_at.tzinfo is None:
            raise ValueError("due_at must be timezone-aware")

    # integer floor: never overstate unconfirmed money
    estimated = unresolved_funds.minor * recovery_probability_bps // 10_000
    confirmed_left = confirmed_funds.minor
    estimated_left = estimated

    items: list[CoverageItem] = []
    covered = depends = risk = total = 0
    for o in ordered:
        amt = o.amount.minor
        total += amt
        if confirmed_left >= amt:
            confirmed_left -= amt
            covered += amt
            items.append(CoverageItem(o, CoverageStatus.COVERED, Money(amt, currency),
                                      Money(0, currency), Money(0, currency), None))
        elif confirmed_left + estimated_left >= amt:
            use_c = confirmed_left
            use_e = amt - use_c
            confirmed_left = 0
            estimated_left -= use_e
            depends += amt
            items.append(CoverageItem(o, CoverageStatus.DEPENDS, Money(use_c, currency),
                                      Money(use_e, currency), Money(0, currency),
                                      suggest_action(o.category, CoverageStatus.DEPENDS)))
        else:
            # Assumed unpaid, so it consumes no funds and later items may still be covered.
            short = amt - (confirmed_left + estimated_left)
            risk += amt
            items.append(CoverageItem(o, CoverageStatus.AT_RISK, Money(0, currency),
                                      Money(0, currency), Money(short, currency),
                                      suggest_action(o.category, CoverageStatus.AT_RISK)))
    return CoverageReport(
        items=tuple(items),
        confirmed_funds=confirmed_funds,
        assumed_unconfirmed=Money(estimated, currency),
        assumed_recovery_bps=recovery_probability_bps,
        total_due=Money(total, currency),
        covered_total=Money(covered, currency),
        depends_total=Money(depends, currency),
        at_risk_total=Money(risk, currency),
    )
