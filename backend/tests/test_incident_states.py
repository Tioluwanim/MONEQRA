from datetime import datetime, timezone

import pytest

from app.domain.incident_states import (
    ALLOWED_INCIDENT_TRANSITIONS,
    IncidentEvidence,
    IncidentState,
    InvalidIncidentTransition,
    transition_incident,
)


NOW = datetime(2026, 11, 20, 14, 10, tzinfo=timezone.utc)


def evidence() -> IncidentEvidence:
    return IncidentEvidence(
        kind="provider_signals",
        description="Sustained error-rate increase and latency degradation",
        observed_at=NOW,
        source="provider-a",
    )


VALID_TRANSITIONS = [
    (IncidentState.SUSPECTED, IncidentState.CONFIRMED),
    (IncidentState.SUSPECTED, IncidentState.RESOLVED),
    (IncidentState.CONFIRMED, IncidentState.MONITORING),
    (IncidentState.MONITORING, IncidentState.RECOVERING),
    (IncidentState.RECOVERING, IncidentState.RESOLVED),
    (IncidentState.RECOVERING, IncidentState.CONFIRMED),
]


@pytest.mark.parametrize("from_state,to_state", VALID_TRANSITIONS)
def test_every_valid_incident_transition(from_state, to_state):
    transition = transition_incident(
        from_state,
        to_state,
        NOW,
        evidence(),
    )

    assert transition.from_state is from_state
    assert transition.to_state is to_state
    assert transition.occurred_at is NOW
    assert transition.evidence is evidence() or transition.evidence.kind == "provider_signals"


INVALID_TRANSITIONS = [
    (from_state, to_state)
    for from_state in IncidentState
    for to_state in IncidentState
    if (from_state, to_state) not in VALID_TRANSITIONS
]


@pytest.mark.parametrize("from_state,to_state", INVALID_TRANSITIONS)
def test_every_invalid_incident_transition_is_rejected(from_state, to_state):
    with pytest.raises(InvalidIncidentTransition, match="Invalid incident transition"):
        transition_incident(from_state, to_state, NOW, evidence())


def test_transition_table_covers_every_incident_state():
    assert set(ALLOWED_INCIDENT_TRANSITIONS) == set(IncidentState)


def test_transition_requires_timezone_aware_timestamp():
    with pytest.raises(ValueError, match="timezone-aware"):
        transition_incident(
            IncidentState.SUSPECTED,
            IncidentState.CONFIRMED,
            datetime(2026, 11, 20, 14, 10),
            evidence(),
        )


def test_evidence_requires_timezone_aware_timestamp():
    with pytest.raises(ValueError, match="timezone-aware"):
        IncidentEvidence(
            kind="latency",
            description="Latency crossed threshold",
            observed_at=datetime(2026, 11, 20, 14, 10),
        )


def test_evidence_cannot_postdate_transition():
    later_evidence = IncidentEvidence(
        kind="latency",
        description="Latency crossed threshold",
        observed_at=datetime(2026, 11, 20, 15, 10, tzinfo=timezone.utc),
    )

    with pytest.raises(InvalidIncidentTransition, match="evidence cannot"):
        transition_incident(
            IncidentState.SUSPECTED,
            IncidentState.CONFIRMED,
            NOW,
            later_evidence,
        )
