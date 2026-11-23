from datetime import datetime, timezone
from dataclasses import FrozenInstanceError

import pytest

from app.domain.errors import DomainError
from app.domain.payment_states import (
    Evidence,
    EvidenceKind,
    EvidenceRequired,
    InvalidTransition,
    ALLOWED_TRANSITIONS,
    allowed_next_states,
    apply_event,
    is_terminal,
    is_unresolved,
    is_retry_eligible,
    PaymentState,
    PaymentEventResult,
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


VALID_PAYMENT_TRANSITIONS = [
    (PaymentState.CREATED, PaymentState.PENDING),
    (PaymentState.CREATED, PaymentState.FAILED),
    (PaymentState.CREATED, PaymentState.UNKNOWN),
    (PaymentState.PENDING, PaymentState.SUCCEEDED),
    (PaymentState.PENDING, PaymentState.FAILED),
    (PaymentState.PENDING, PaymentState.UNKNOWN),
    (PaymentState.UNKNOWN, PaymentState.SUCCEEDED),
    (PaymentState.UNKNOWN, PaymentState.FAILED),
    (PaymentState.SUCCEEDED, PaymentState.SETTLED),
    (PaymentState.SUCCEEDED, PaymentState.REVERSED),
    (PaymentState.SETTLED, PaymentState.REVERSED),
]


@pytest.mark.parametrize("from_state,to_state", VALID_PAYMENT_TRANSITIONS)
def test_apply_event_accepts_every_valid_transition(from_state, to_state):
    evidence = None
    if from_state is PaymentState.UNKNOWN:
        evidence = EvidenceKind.PROVIDER_STATUS_CHECK

    result = apply_event(from_state, to_state, evidence)

    assert result.applied
    assert result.new_state is to_state
    assert result.reason == "event applied"


INVALID_PAYMENT_TRANSITIONS = [
    (from_state, to_state)
    for from_state in PaymentState
    for to_state in PaymentState
    if (from_state, to_state) not in VALID_PAYMENT_TRANSITIONS
    and from_state is not to_state
]


@pytest.mark.parametrize("from_state,to_state", INVALID_PAYMENT_TRANSITIONS)
def test_apply_event_returns_reason_for_every_invalid_transition(from_state, to_state):
    result = apply_event(from_state, to_state)

    assert not result.applied
    assert result.new_state is from_state
    assert "transition" in result.reason
    assert "not allowed" in result.reason


@pytest.mark.parametrize("state", list(PaymentState))
def test_apply_event_duplicate_state_is_harmless_no_op(state):
    result = apply_event(state, state)

    assert not result.applied
    assert result.new_state is state
    assert "duplicate" in result.reason


@pytest.mark.parametrize(
    "evidence_kind",
    [
        EvidenceKind.PROVIDER_STATUS_CHECK,
        EvidenceKind.PROVIDER_WEBHOOK,
        EvidenceKind.MANUAL_REVIEW,
    ],
)
@pytest.mark.parametrize("destination", [PaymentState.SUCCEEDED, PaymentState.FAILED])
def test_apply_event_unknown_exit_accepts_each_valid_evidence_kind(
    evidence_kind,
    destination,
):
    evidence = Evidence(
        kind=evidence_kind,
        source="provider" if evidence_kind is not EvidenceKind.MANUAL_REVIEW else "operator",
        reference="evidence-123",
        observed_at=datetime(2026, 11, 20, 14, 0, tzinfo=timezone.utc),
    )

    result = apply_event(PaymentState.UNKNOWN, destination, evidence)

    assert result.applied
    assert result.new_state is destination


@pytest.mark.parametrize("destination", [PaymentState.SUCCEEDED, PaymentState.FAILED])
def test_apply_event_unknown_exit_requires_evidence(destination):
    result = apply_event(PaymentState.UNKNOWN, destination)

    assert not result.applied
    assert result.new_state is PaymentState.UNKNOWN
    assert "requires valid evidence" in result.reason


@pytest.mark.parametrize("destination", [PaymentState.SUCCEEDED, PaymentState.FAILED])
def test_apply_event_timeout_is_explicitly_rejected_as_evidence(destination):
    result = apply_event(
        PaymentState.UNKNOWN,
        destination,
        EvidenceKind.TIMEOUT_SIGNAL,
    )

    assert not result.applied
    assert result.new_state is PaymentState.UNKNOWN
    assert "not evidence" in result.reason


@pytest.mark.parametrize("state", list(PaymentState))
def test_retry_eligibility_is_true_only_for_verified_failed(state):
    if state is PaymentState.FAILED:
        assert is_retry_eligible(state, verified_failed=True)
        assert not is_retry_eligible(state, verified_failed=False)
    else:
        assert not is_retry_eligible(state, verified_failed=True)


def test_payment_event_result_is_frozen():
    result = PaymentEventResult(
        applied=True,
        new_state=PaymentState.PENDING,
        reason="event applied",
    )

    with pytest.raises(FrozenInstanceError):
        result.reason = "changed"
