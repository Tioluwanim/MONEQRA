from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.demo_models import AuditEvent
from app.security.tenancy import require_tenant_match


def _canonical(value: Any) -> str:
    def default(item: Any) -> str:
        if isinstance(item, datetime):
            return item.astimezone(timezone.utc).isoformat()
        if isinstance(item, UUID):
            return str(item)
        raise TypeError(f"{type(item).__name__} is not canonical JSON")

    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=default,
    )


def _record_hash(
    *,
    org_id: UUID,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: UUID | None,
    occurred_at: datetime,
    previous_hash: str | None,
    sequence_number: int,
    payload: dict[str, Any],
) -> str:
    canonical = {
        "org_id": str(org_id),
        "actor": actor,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id is not None else None,
        "occurred_at": occurred_at,
        "previous_hash": previous_hash,
        "sequence_number": sequence_number,
        "payload": payload,
    }
    return hashlib.sha256(_canonical(canonical).encode("utf-8")).hexdigest()


def append_audit(
    session: Session,
    *,
    principal_org_id: UUID | str,
    org_id: UUID,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: UUID | None,
    payload: dict[str, Any],
    occurred_at: datetime | None = None,
    simulated: bool = False,
) -> AuditEvent:
    require_tenant_match(principal_org_id, org_id)
    timestamp = occurred_at or datetime.now(timezone.utc)
    if timestamp.tzinfo is None or timestamp.utcoffset() is None:
        raise ValueError("occurred_at must be timezone-aware")

    prior = session.execute(
        select(AuditEvent)
        .where(AuditEvent.org_id == org_id)
        .order_by(AuditEvent.sequence_number.desc())
        .limit(1)
    ).scalar_one_or_none()
    previous_hash = prior.hash if prior is not None else None
    sequence_number = (prior.sequence_number + 1) if prior is not None else 1

    record_hash = _record_hash(
        org_id=org_id,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        occurred_at=timestamp,
        previous_hash=previous_hash,
        sequence_number=sequence_number,
        payload=payload,
    )
    record = AuditEvent(
        id=uuid4(),
        org_id=org_id,
        actor_reference=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_hash=previous_hash,
        sequence_number=sequence_number,
        hash=record_hash,
        payload=payload,
        occurred_at=timestamp,
        simulated=simulated,
    )
    session.add(record)
    session.flush()
    return record


def verify_audit_chain(
    session: Session,
    *,
    org_id: UUID,
    principal_org_id: UUID | str,
    expected_head_hash: str | None = None,
) -> bool:
    require_tenant_match(principal_org_id, org_id)
    records = session.execute(
        select(AuditEvent)
        .where(AuditEvent.org_id == org_id)
        .order_by(AuditEvent.sequence_number.asc())
    ).scalars().all()

    previous_hash: str | None = None
    expected_sequence = 1
    for record in records:
        if record.sequence_number != expected_sequence:
            return False
        if record.previous_hash != previous_hash:
            return False

        calculated = _record_hash(
            org_id=record.org_id,
            actor=record.actor_reference,
            action=record.action,
            entity_type=record.entity_type,
            entity_id=record.entity_id,
            occurred_at=record.occurred_at,
            previous_hash=record.previous_hash,
            sequence_number=record.sequence_number,
            payload=record.payload,
        )
        if not hmac.compare_digest(calculated, record.hash):
            return False
        previous_hash = record.hash
        expected_sequence += 1

    if expected_head_hash is not None:
        if previous_hash != expected_head_hash:
            return False
    return True
