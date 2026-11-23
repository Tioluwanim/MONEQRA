from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import enum

from app.domain.errors import DomainError, EvidenceRequired, InvalidTransition


class PaymentState(enum.Enum):
    """The lifecycle state of a payment."""

    CREATED = "created"       # A payment record exists, but processing has not started.
    REVERSED = "reversed"     # A previously successful payment was reversed.
    PENDING = "pending"       # Processing is ongoing; no final outcome is verified.
    SUCCEEDED = "succeeded"   # Provider confirmed the payment; cash may not yet have reached the business.
    FAILED = "failed"         # Provider confirmed that the payment did not succeed.
    UNKNOWN = "unknown"       # Outcome is not verified and is never counted as cash.
    SETTLED = "settled"       # Money reached the business and can be counted as cash.


class EvidenceKind(enum.Enum):
    PROVIDER_STATUS_CHECK = "provider_status_check"  # A status check with the payment provider.
    PROVIDER_WEBHOOK = "provider_webhook"          # A webhook from the payment provider.
    TIMEOUT_SIGNAL = "timeout_signal"              # A timeout signal from the system.
    MANUAL_REVIEW = "manual_review"                # A manual review by a human operator.


ALLOWED_TRANSITIONS: dict[PaymentState, set[PaymentState]] = {
    PaymentState.CREATED: {PaymentState.PENDING, PaymentState.FAILED, PaymentState.UNKNOWN},
    PaymentState.PENDING: {PaymentState.SUCCEEDED, PaymentState.FAILED, PaymentState.UNKNOWN},
    PaymentState.SUCCEEDED: {PaymentState.SETTLED, PaymentState.REVERSED},
    PaymentState.FAILED: set(),
    PaymentState.UNKNOWN: {PaymentState.SUCCEEDED, PaymentState.FAILED},
    PaymentState.SETTLED: {PaymentState.REVERSED},
    PaymentState.REVERSED: set(),
}

UNKNOWN_EXIT_EVIDENCE = {
    EvidenceKind.PROVIDER_STATUS_CHECK,
    EvidenceKind.PROVIDER_WEBHOOK,
    EvidenceKind.MANUAL_REVIEW,
}
TERMINAL_STATES = {PaymentState.FAILED, PaymentState.REVERSED}


def is_terminal(state: PaymentState) -> bool:
    """Return whether state is final and cannot move to another state."""
    return state in TERMINAL_STATES


def is_unresolved(state: PaymentState) -> bool:
    """Return whether the payment outcome is not yet resolved or final."""
    return state in {PaymentState.CREATED, PaymentState.PENDING, PaymentState.UNKNOWN}


def allowed_next_states(state: PaymentState) -> set[PaymentState]:
    """Return the states this payment state may move to."""
    if not isinstance(state, PaymentState):
        raise TypeError("state must be a PaymentState")
    return set(ALLOWED_TRANSITIONS[state])


@dataclass(frozen=True)
class Evidence:
    """Evidence that a payment is in a particular state."""

    kind: EvidenceKind
    source: str
    reference: str
    observed_at: datetime

    def __post_init__(self) -> None:
        if not isinstance(self.observed_at, datetime):
            raise TypeError("observed_at must be a datetime")
        if self.observed_at.tzinfo is None or self.observed_at.utcoffset() is None:
            raise ValueError("observed_at must be timezone-aware")
        if not isinstance(self.source, str) or not self.source.strip():
            raise ValueError("source must not be empty")
        if not isinstance(self.reference, str) or not self.reference.strip():
            raise ValueError("reference must not be empty")


@dataclass(frozen=True)
class PaymentEventResult:
    """Result of attempting to apply one normalised payment event."""

    applied: bool
    new_state: PaymentState
    reason: str


def apply_event(
    current_state: PaymentState,
    incoming_state: PaymentState,
    evidence: Evidence | EvidenceKind | None = None,
) -> PaymentEventResult:
    """Apply an event when possible, otherwise return a retained rejection result."""
    if not isinstance(current_state, PaymentState):
        raise TypeError("current_state must be a PaymentState")
    if not isinstance(incoming_state, PaymentState):
        raise TypeError("incoming_state must be a PaymentState")

    if current_state is incoming_state:
        return PaymentEventResult(
            applied=False,
            new_state=current_state,
            reason="duplicate event for the same payment state",
        )

    if incoming_state not in allowed_next_states(current_state):
        return PaymentEventResult(
            applied=False,
            new_state=current_state,
            reason=f"transition {current_state.value} -> {incoming_state.value} is not allowed",
        )

    if current_state is PaymentState.UNKNOWN:
        if evidence is None:
            return PaymentEventResult(
                applied=False,
                new_state=current_state,
                reason="unknown payment outcome requires valid evidence",
            )

        evidence_kind = evidence.kind if isinstance(evidence, Evidence) else evidence
        if not isinstance(evidence_kind, EvidenceKind):
            return PaymentEventResult(
                applied=False,
                new_state=current_state,
                reason="evidence must be provider status check, provider webhook, or manual review",
            )
        if evidence_kind not in UNKNOWN_EXIT_EVIDENCE:
            return PaymentEventResult(
                applied=False,
                new_state=current_state,
                reason=f"{evidence_kind.value} is not evidence of an unknown payment outcome",
            )

    return PaymentEventResult(
        applied=True,
        new_state=incoming_state,
        reason="event applied",
    )


def is_retry_eligible(
    state: PaymentState,
    *,
    verified_failed: bool = False,
) -> bool:
    """Return whether a payment is safely retry-eligible."""
    if not isinstance(state, PaymentState):
        raise TypeError("state must be a PaymentState")
    return state is PaymentState.FAILED and verified_failed


def transition(
    from_state: PaymentState,
    to_state: PaymentState,
    evidence: Evidence | EvidenceKind | None = None,
) -> PaymentState:
    """Validate a payment state transition and return the destination state."""
    if not isinstance(from_state, PaymentState):
        raise TypeError("from_state must be a PaymentState")
    if not isinstance(to_state, PaymentState):
        raise TypeError("to_state must be a PaymentState")

    if to_state not in allowed_next_states(from_state):
        raise InvalidTransition(from_state, to_state, "transition is not allowed")

    if from_state is PaymentState.UNKNOWN:
        if evidence is None:
            raise EvidenceRequired(
                from_state,
                to_state,
                "unknown payment outcome needs verification",
                UNKNOWN_EXIT_EVIDENCE,
            )

        evidence_kind = evidence.kind if isinstance(evidence, Evidence) else evidence
        if not isinstance(evidence_kind, EvidenceKind):
            raise TypeError("evidence must be Evidence or EvidenceKind")
        if evidence_kind not in UNKNOWN_EXIT_EVIDENCE:
            raise EvidenceRequired(
                from_state,
                to_state,
                "evidence kind is not allowed to resolve an unknown payment",
                UNKNOWN_EXIT_EVIDENCE,
            )

    return to_state
