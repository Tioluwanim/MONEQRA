from datetime import datetime, timezone

import pytest

from app.domain.errors import DomainError
from app.domain.payment_states import (
    Evidence,
    EvidenceKind,
    EvidenceRequired,
    InvalidTransition,
    ALLOWED_TRANSITIONS,
    allowed_next_states,
    is_terminal,
    is_unresolved,
    PaymentState,
    TERMINAL_STATES,
    UNKNOWN_EXIT_EVIDENCE,
    transition,
)


def test_evidence_accepts_timezone_aware_datetime():
    evidence = Evidence(
        kind=EvidenceKind.PROVIDER_WEBHOOK,
        source="paystack",
        reference="evt_123",
        observed_at=datetime(2026, 11, 19, 14, 26, tzinfo=timezone.utc),
    )

    assert evidence.source == "paystack"


def test_evidence_rejects_naive_datetime():
    with pytest.raises(ValueError, match="timezone-aware"):
        Evidence(
            kind=EvidenceKind.PROVIDER_STATUS_CHECK,
            source="paystack",
            reference="txn_123",
            observed_at=datetime(2026, 11, 19, 14, 26),
        )


@pytest.mark.parametrize("field", ["source", "reference"])
def test_evidence_rejects_empty_source_or_reference(field):
    values = {
        "kind": EvidenceKind.MANUAL_REVIEW,
        "source": "operator",
        "reference": "review_123",
        "observed_at": datetime(2026, 11, 19, 14, 26, tzinfo=timezone.utc),
    }
    values[field] = "  "

    with pytest.raises(ValueError, match=f"{field} must not be empty"):
        Evidence(**values)


def test_domain_errors_share_a_base():
    assert issubclass(InvalidTransition, DomainError)
    assert issubclass(EvidenceRequired, InvalidTransition)


def test_invalid_transition_carries_details_and_readable_message():
    error = InvalidTransition(
        PaymentState.PENDING,
        PaymentState.SETTLED,
        "settlement has not been confirmed",
    )

    assert error.from_state is PaymentState.PENDING
    assert error.to_state is PaymentState.SETTLED
    assert error.reason == "settlement has not been confirmed"
    assert str(error) == (
        "Invalid payment transition pending -> settled: settlement has not been confirmed"
    )


def test_evidence_required_is_a_specific_invalid_transition():
    error = EvidenceRequired(
        PaymentState.PENDING,
        PaymentState.SUCCEEDED,
        "provider confirmation is missing",
        EvidenceKind.PROVIDER_STATUS_CHECK,
    )

    assert isinstance(error, InvalidTransition)
    assert error.required_evidence is EvidenceKind.PROVIDER_STATUS_CHECK
    assert error.evidence_needed is EvidenceKind.PROVIDER_STATUS_CHECK
    assert str(error) == (
        "Invalid payment transition pending -> succeeded: provider confirmation is missing. "
        "Required evidence: provider_status_check"
    )


def test_every_payment_state_is_a_transition_table_key():
    assert set(ALLOWED_TRANSITIONS) == set(PaymentState)


def test_transition_table_has_every_state_and_required_destinations():
    assert set(ALLOWED_TRANSITIONS) == set(PaymentState)
    assert ALLOWED_TRANSITIONS[PaymentState.CREATED] == {
        PaymentState.PENDING,
        PaymentState.FAILED,
        PaymentState.UNKNOWN,
    }
    assert ALLOWED_TRANSITIONS[PaymentState.PENDING] == {
        PaymentState.SUCCEEDED,
        PaymentState.FAILED,
        PaymentState.UNKNOWN,
    }
    assert ALLOWED_TRANSITIONS[PaymentState.UNKNOWN] == {
        PaymentState.SUCCEEDED,
        PaymentState.FAILED,
    }
    assert ALLOWED_TRANSITIONS[PaymentState.SUCCEEDED] == {
        PaymentState.SETTLED,
        PaymentState.REVERSED,
    }
    assert ALLOWED_TRANSITIONS[PaymentState.SETTLED] == {PaymentState.REVERSED}
    assert ALLOWED_TRANSITIONS[PaymentState.FAILED] == set()
    assert ALLOWED_TRANSITIONS[PaymentState.REVERSED] == set()


def test_payment_state_helper_functions():
    assert is_terminal(PaymentState.FAILED)
    assert is_terminal(PaymentState.REVERSED)
    assert not is_terminal(PaymentState.PENDING)

    assert is_unresolved(PaymentState.CREATED)
    assert is_unresolved(PaymentState.PENDING)
    assert is_unresolved(PaymentState.UNKNOWN)
    assert not is_unresolved(PaymentState.SUCCEEDED)
    assert not is_unresolved(PaymentState.SETTLED)

    next_states = allowed_next_states(PaymentState.PENDING)
    assert next_states == {
        PaymentState.SUCCEEDED,
        PaymentState.FAILED,
        PaymentState.UNKNOWN,
    }
    next_states.clear()
    assert allowed_next_states(PaymentState.PENDING)


def test_transition_rejects_disallowed_move_and_allows_normal_move():
    assert transition(PaymentState.CREATED, PaymentState.PENDING) is PaymentState.PENDING

    with pytest.raises(InvalidTransition, match="transition is not allowed"):
        transition(PaymentState.FAILED, PaymentState.PENDING)


def test_transition_from_unknown_requires_allowed_evidence():
    with pytest.raises(EvidenceRequired, match="Required evidence"):
        transition(PaymentState.UNKNOWN, PaymentState.FAILED)

    assert transition(
        PaymentState.UNKNOWN,
        PaymentState.FAILED,
        EvidenceKind.PROVIDER_STATUS_CHECK,
    ) is PaymentState.FAILED

    allowed_evidence = Evidence(
        kind=EvidenceKind.PROVIDER_WEBHOOK,
        source="paystack",
        reference="evt_456",
        observed_at=datetime(2026, 11, 19, 14, 26, tzinfo=timezone.utc),
    )
    assert transition(PaymentState.UNKNOWN, PaymentState.SUCCEEDED, allowed_evidence) is PaymentState.SUCCEEDED


def test_transition_from_unknown_rejects_unallowed_evidence():
    with pytest.raises(EvidenceRequired, match="evidence kind is not allowed"):
        transition(
            PaymentState.UNKNOWN,
            PaymentState.SUCCEEDED,
            EvidenceKind.TIMEOUT_SIGNAL,
        )


def test_unknown_exit_evidence_and_terminal_states():
    assert UNKNOWN_EXIT_EVIDENCE == {
        EvidenceKind.PROVIDER_STATUS_CHECK,
        EvidenceKind.PROVIDER_WEBHOOK,
        EvidenceKind.MANUAL_REVIEW,
    }
    assert TERMINAL_STATES == {PaymentState.FAILED, PaymentState.REVERSED}
