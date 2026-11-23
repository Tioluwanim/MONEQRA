from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class IncidentState(str, Enum):
    SUSPECTED = "suspected"
    CONFIRMED = "confirmed"
    MONITORING = "monitoring"
    RECOVERING = "recovering"
    RESOLVED = "resolved"


@dataclass(frozen=True)
class IncidentEvidence:
    kind: str
    description: str
    observed_at: datetime
    source: str = ""

    def __post_init__(self) -> None:
        if not isinstance(self.observed_at, datetime):
            raise TypeError("observed_at must be a datetime")
        if self.observed_at.tzinfo is None or self.observed_at.utcoffset() is None:
            raise ValueError("observed_at must be timezone-aware")
        if not isinstance(self.kind, str) or not self.kind.strip():
            raise ValueError("kind must not be empty")
        if not isinstance(self.description, str) or not self.description.strip():
            raise ValueError("description must not be empty")


@dataclass(frozen=True)
class IncidentTransition:
    from_state: IncidentState
    to_state: IncidentState
    occurred_at: datetime
    evidence: IncidentEvidence

    def __post_init__(self) -> None:
        if not isinstance(self.from_state, IncidentState):
            raise TypeError("from_state must be IncidentState")
        if not isinstance(self.to_state, IncidentState):
            raise TypeError("to_state must be IncidentState")
        if not isinstance(self.occurred_at, datetime):
            raise TypeError("occurred_at must be a datetime")
        if self.occurred_at.tzinfo is None or self.occurred_at.utcoffset() is None:
            raise ValueError("occurred_at must be timezone-aware")
        if not isinstance(self.evidence, IncidentEvidence):
            raise TypeError("evidence must be IncidentEvidence")


ALLOWED_INCIDENT_TRANSITIONS: dict[IncidentState, frozenset[IncidentState]] = {
    IncidentState.SUSPECTED: frozenset({
        IncidentState.CONFIRMED,
        IncidentState.RESOLVED,
    }),
    IncidentState.CONFIRMED: frozenset({
        IncidentState.MONITORING,
    }),
    IncidentState.MONITORING: frozenset({
        IncidentState.RECOVERING,
    }),
    IncidentState.RECOVERING: frozenset({
        IncidentState.RESOLVED,
        IncidentState.CONFIRMED,
    }),
    IncidentState.RESOLVED: frozenset(),
}


def transition_incident(
    from_state: IncidentState,
    to_state: IncidentState,
    occurred_at: datetime,
    evidence: IncidentEvidence,
) -> IncidentTransition:
    if not isinstance(from_state, IncidentState):
        raise TypeError("from_state must be IncidentState")
    if not isinstance(to_state, IncidentState):
        raise TypeError("to_state must be IncidentState")
    if not isinstance(occurred_at, datetime):
        raise TypeError("occurred_at must be a datetime")
    if occurred_at.tzinfo is None or occurred_at.utcoffset() is None:
        raise ValueError("occurred_at must be timezone-aware")
    if not isinstance(evidence, IncidentEvidence):
        raise TypeError("evidence must be IncidentEvidence")
    if to_state not in ALLOWED_INCIDENT_TRANSITIONS[from_state]:
        raise InvalidIncidentTransition(
            from_state,
            to_state,
            "transition is not allowed",
        )
    if evidence.observed_at > occurred_at:
        raise InvalidIncidentTransition(
            from_state,
            to_state,
            "evidence cannot be observed after the transition",
        )
    return IncidentTransition(
        from_state=from_state,
        to_state=to_state,
        occurred_at=occurred_at,
        evidence=evidence,
    )


class InvalidIncidentTransition(ValueError):
    def __init__(
        self,
        from_state: IncidentState,
        to_state: IncidentState,
        reason: str,
    ) -> None:
        self.from_state = from_state
        self.to_state = to_state
        self.reason = reason
        super().__init__(
            f"Invalid incident transition {from_state.value} -> {to_state.value}: {reason}"
        )