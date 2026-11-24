from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.adapters.provider import ProviderAdapter, ProviderError
from app.db.payments import Payment
from app.db.demo_models import ProviderRequest
from app.security.audit import append_audit
from app.security.auth import Principal, Role, require_role
from app.security.tenancy import require_tenant_match
from app.services.payments import ingest_payment_event


def verify_payment(
    session: Session,
    principal: Principal,
    *,
    payment_id: UUID,
    adapter: ProviderAdapter,
) -> dict[str, Any]:
    require_role(principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    payment = session.get(Payment, payment_id)
    if payment is None:
        raise LookupError("payment not found")
    require_tenant_match(principal.org_id, payment.org_id)
    if payment.provider_reference is None:
        raise ValueError("payment has no provider reference")
    if payment.state != "unknown":
        return {
            "payment_id": payment.id,
            "evidence_created": False,
            "applied": False,
            "new_state": payment.state,
            "message": "verification is only available for unknown payments",
        }

    checked_at = datetime.now(timezone.utc)
    try:
        result = adapter.check_payment_status(payment.provider_reference)
    except ProviderError as exc:
        session.add(ProviderRequest(
            id=uuid.uuid4(),
            org_id=payment.org_id,
            provider_node_id=payment.provider_node_id,
            kind="payment_status_check",
            provider_reference=payment.provider_reference,
            status="error",
            response_summary={"error": str(exc)},
            occurred_at=checked_at,
            simulated=payment.simulated,
        ))
        append_audit(
            session,
            principal_org_id=principal.org_id,
            org_id=payment.org_id,
            actor=principal.user_id,
            action="verify_payment_failed",
            entity_type="payment",
            entity_id=payment.id,
            payload={"error": str(exc), "provider_reference": payment.provider_reference},
            simulated=payment.simulated,
        )
        session.commit()
        return {
            "payment_id": payment.id,
            "evidence_created": False,
            "applied": False,
            "new_state": payment.state,
            "message": str(exc),
        }

    session.add(ProviderRequest(
        id=uuid.uuid4(),
        org_id=payment.org_id,
        provider_node_id=payment.provider_node_id,
        kind="payment_status_check",
        provider_reference=payment.provider_reference,
        status="success",
        response_summary=result.raw_response,
        occurred_at=checked_at,
        simulated=payment.simulated,
    ))
    ingestion = ingest_payment_event(
        session,
        principal,
        org_id=payment.org_id,
        provider_node_id=payment.provider_node_id,
        provider_event_id=result.provider_event_id or str(uuid.uuid4()),
        provider_reference=payment.provider_reference,
        occurred_at=checked_at,
        raw_status=result.status,
        normalised_state=result.status,
        evidence_kind="provider_status_check",
        evidence_source="provider",
        evidence_reference=result.provider_event_id,
        raw_payload=result.raw_response,
        simulated=payment.simulated,
    )
    return {
        "payment_id": payment.id,
        "evidence_created": True,
        "applied": ingestion["applied"],
        "new_state": ingestion["new_state"] or payment.state,
        "message": ingestion["reason"] or "provider status applied",
    }
