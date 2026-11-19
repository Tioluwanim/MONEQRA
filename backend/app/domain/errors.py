from __future__ import annotations

from typing import Any



class DomainError(Exception):
    """Base class for domain rule violations."""


class InvalidTransition(DomainError, ValueError):
    """Raised when a payment state transition is invalid."""

    def __init__(self, from_state: Any, to_state: Any, reason: str) -> None:
        self.from_state = from_state
        self.to_state = to_state
        self.reason = reason
        from_value = getattr(from_state, "value", str(from_state))
        to_value = getattr(to_state, "value", str(to_state))
        super().__init__(
            f"Invalid payment transition {from_value} -> {to_value}: {reason}"
        )


class EvidenceRequired(InvalidTransition):
    """Raised when an invalid transition lacks the evidence needed to make it."""

    def __init__(
        self,
        from_state: Any,
        to_state: Any,
        reason: str,
        evidence_needed: Any,
    ) -> None:
        self.evidence_needed = evidence_needed
        self.needed_evidence = evidence_needed
        self.required_evidence = evidence_needed

        if hasattr(evidence_needed, "value"):
            evidence_name = evidence_needed.value
        elif isinstance(evidence_needed, (set, frozenset)):
            evidence_name = " or ".join(sorted(getattr(kind, "value", str(kind)) for kind in evidence_needed))
        else:
            evidence_name = str(evidence_needed)

        from_value = getattr(from_state, "value", str(from_state))
        to_value = getattr(to_state, "value", str(to_state))
        DomainError.__init__(
            self,
            f"Invalid payment transition {from_value} -> {to_value}: "
            f"{reason}. Required evidence: {evidence_name}",
        )
        self.from_state = from_state
        self.to_state = to_state
        self.reason = reason
