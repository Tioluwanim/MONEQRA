from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.payments import Payment, PaymentEvent
from app.domain.payment_states import (
    Evidence,
    EvidenceKind,
    PaymentState,
    apply_event,
    is_retry_eligible,
)
from app.security.auth import Principal, Role, require_role
from app.security.audit import append_audit
from app.security.tenancy import org_scoped_query, require_tenant_match
from app.security.webhooks import verify_webhook


def get_payment(
    session: Session,
    principal: Principal,
    payment_id: UUID,
) -> Payment:
    require_role(
        principal,
        {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN},
    )
    payment = session.get(Payment, payment_id)
    if payment is None:
        raise LookupError("payment not found")
    require_tenant_match(principal.org_id, payment.org_id)
    return payment


def _evidence_kind(value: str) -> EvidenceKind:
    try:
        return EvidenceKind(value)
    except ValueError as exc:
        raise ValueError("invalid evidence kind") from exc


def ingest_payment_event(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    provider_node_id: UUID,
    provider_event_id: str,
    provider_reference: str,
    occurred_at: datetime,
    raw_status: str,
    normalised_state: str,
    evidence_kind: str,
    evidence_source: str,
    evidence_reference: str,
    raw_payload: dict[str, Any],
    simulated: bool,
    raw_body: bytes | None = None,
    signature: str | None = None,
    timestamp: str | None = None,
    webhook_secret: str = "",
) -> dict[str, Any]:
    require_role(
        principal,
        {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN},
    )
    require_tenant_match(principal.org_id, org_id)

    if raw_body is not None:
        verification = verify_webhook(
            raw_body=raw_body,
            signature=signature,
            timestamp=timestamp,
            provider=str(provider_node_id),
            secret=webhook_secret,
            event_id=provider_event_id,
        )
        if not verification.valid:
            raise PermissionError(verification.reason)

    duplicate = session.execute(
        select(PaymentEvent).where(
            PaymentEvent.org_id == org_id,
            PaymentEvent.provider_node_id == provider_node_id,
            PaymentEvent.provider_event_id == provider_event_id,
        )
    ).scalar_one_or_none()
    if duplicate is not None:
        return {
            "event_id": duplicate.id,
            "duplicate": True,
            "applied": False,
            "reason": "duplicate provider event",
            "new_state": duplicate.normalised_state,
        }

    payment = session.execute(
        select(Payment).where(
            Payment.org_id == org_id,
            Payment.provider_node_id == provider_node_id,
            Payment.provider_reference == provider_reference,
        )
    ).scalar_one_or_none()

    if not occurred_at.tzinfo:
        raise ValueError("occurred_at must be timezone-aware")

    incoming_state = PaymentState(normalised_state)
    evidence: Evidence | EvidenceKind | None = None
    kind = _evidence_kind(evidence_kind)
    if kind is EvidenceKind.TIMEOUT_SIGNAL:
        evidence = kind
    elif evidence_source and evidence_reference:
        evidence = Evidence(
            kind=kind,
            source=evidence_source,
            reference=evidence_reference,
            observed_at=occurred_at,
        )

    if payment is None:
        stored = PaymentEvent(
            org_id=org_id,
            payment_id=None,
            provider_node_id=provider_node_id,
            provider_event_id=provider_event_id,
            raw_status=raw_status,
            normalised_state=normalised_state,
            applied=False,
            apply_reason="payment not found",
            evidence_kind=evidence_kind,
            evidence_source=evidence_source,
            evidence_reference=evidence_reference,
            occurred_at=occurred_at,
            received_at=datetime.now(timezone.utc),
            raw_payload=raw_payload,
            simulated=simulated,
        )
        session.add(stored)
        session.flush()
        append_audit(
            session,
            principal_org_id=principal.org_id,
            org_id=org_id,
            actor=principal.user_id,
            action="ingest_payment_event",
            entity_type="payment_event",
            entity_id=stored.id,
            payload={
                "provider_event_id": provider_event_id,
                "applied": False,
                "reason": "payment not found",
            },
            simulated=simulated,
        )
        session.commit()
        return {
            "event_id": stored.id,
            "duplicate": False,
            "applied": False,
            "reason": "payment not found",
            "new_state": None,
        }

    current_state = PaymentState(payment.state)
    result = apply_event(current_state, incoming_state, evidence)
    stored = PaymentEvent(
        org_id=org_id,
        payment_id=payment.id,
        provider_node_id=provider_node_id,
        provider_event_id=provider_event_id,
        raw_status=raw_status,
        normalised_state=normalised_state,
        applied=result.applied,
        apply_reason=result.reason if not result.applied else None,
        evidence_kind=evidence_kind,
        evidence_source=evidence_source,
        evidence_reference=evidence_reference,
        occurred_at=occurred_at,
        received_at=datetime.now(timezone.utc),
        raw_payload=raw_payload,
        simulated=simulated,
    )
    session.add(stored)
    if result.applied:
        payment.state = result.new_state.value
        payment.state_updated_at = occurred_at
        if result.new_state is PaymentState.SETTLED:
            payment.settled_at = occurred_at
    session.flush()

    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=org_id,
        actor=principal.user_id,
        action="ingest_payment_event",
        entity_type="payment_event",
        entity_id=stored.id,
        payload={
            "provider_event_id": provider_event_id,
            "applied": result.applied,
            "reason": result.reason,
            "new_state": result.new_state.value,
        },
        simulated=simulated,
    )
    session.commit()
    return {
        "event_id": stored.id,
        "duplicate": False,
        "applied": result.applied,
        "reason": result.reason,
        "new_state": result.new_state.value,
    }
