from __future__ import annotations

import csv
import hashlib
import io
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.payments import (
    InfraNode,
    Payment,
    PaymentEvent,
    PaymentImport,
    PaymentImportRow,
)
from app.domain.payment_states import Evidence, EvidenceKind, PaymentState, apply_event
from app.security.audit import append_audit
from app.security.auth import Principal, Role, require_role
from app.security.tenancy import require_tenant_match


STATE_ALIASES = {
    "settled": "settled",
    "paid": "settled",
    "success": "settled",
    "successful": "settled",
    "completed": "settled",
    "succeeded": "succeeded",
    "pending": "pending",
    "processing": "pending",
    "unknown": "unknown",
    "timeout": "unknown",
    "failed": "failed",
    "failure": "failed",
    "reversed": "reversed",
    "refunded": "reversed",
}

HEADER_ALIASES = {
    "provider_event_id": ("provider_event_id", "event_id", "provider_event"),
    "provider_reference": ("provider_reference", "reference", "transaction_reference", "merchant_reference"),
    "amount_kobo": ("amount_kobo", "amount_minor"),
    "amount": ("amount", "amount_ngn"),
    "currency": ("currency",),
    "occurred_at": ("occurred_at", "event_timestamp", "timestamp", "created_at"),
    "settled_at": ("settled_at", "settlement_timestamp"),
    "raw_status": ("raw_status", "status"),
    "normalised_state": ("normalised_state", "state"),
    "channel": ("channel", "rail", "payment_channel"),
}


def _header_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _get(row: dict[str, str], canonical: str) -> str:
    for alias in HEADER_ALIASES[canonical]:
        key = _header_key(alias)
        for raw_key, value in row.items():
            if _header_key(raw_key) == key:
                return value.strip()
    return ""


def _parse_datetime(value: str, name: str) -> datetime:
    if not value:
        raise ValueError(f"{name} is required")
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{name} must be an ISO-8601 timezone-aware timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError(f"{name} must be timezone-aware")
    return parsed


def _parse_kobo(row: dict[str, str], currency: str) -> int:
    minor = _get(row, "amount_kobo")
    if minor:
        try:
            value = int(minor)
        except ValueError as exc:
            raise ValueError("amount_kobo must be an integer") from exc
        if value <= 0:
            raise ValueError("amount_kobo must be positive")
        return value

    major = _get(row, "amount")
    if not major:
        raise ValueError("amount_kobo or amount is required")
    try:
        amount = Decimal(major)
    except InvalidOperation as exc:
        raise ValueError("amount must be a decimal number") from exc
    if amount <= 0:
        raise ValueError("amount must be positive")

    kobo = amount * Decimal(100)
    if kobo != kobo.to_integral_value():
        raise ValueError("amount has more than two decimal places")
    return int(kobo)


def _normalise_state(raw_status: str, explicit: str) -> PaymentState:
    candidate = (explicit or raw_status).strip().lower()
    normalised = STATE_ALIASES.get(candidate)
    if normalised is None:
        raise ValueError("unsupported payment state")
    return PaymentState(normalised)


def import_payment_csv(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    provider_node_id: UUID,
    filename: str,
    csv_text: str,
    simulated: bool = False,
) -> dict[str, Any]:
    require_role(principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    require_tenant_match(principal.org_id, org_id)

    node = session.get(InfraNode, provider_node_id)
    if node is None or node.org_id != org_id:
        raise LookupError("provider node not found")

    raw_bytes = csv_text.encode("utf-8")
    file_hash = hashlib.sha256(raw_bytes).hexdigest()
    existing = session.execute(
        select(PaymentImport).where(
            PaymentImport.org_id == org_id,
            PaymentImport.provider_node_id == provider_node_id,
            PaymentImport.sha256 == file_hash,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return {
            "import_id": existing.id,
            "filename": existing.filename,
            "sha256": existing.sha256,
            "row_count": existing.row_count,
            "imported_count": existing.imported_count,
            "duplicate_count": existing.duplicate_count,
            "rejected_count": existing.rejected_count,
            "rows": [],
        }

    batch = PaymentImport(
        id=uuid4(),
        org_id=org_id,
        provider_node_id=provider_node_id,
        filename=filename,
        sha256=file_hash,
        raw_content=csv_text,
        row_count=0,
        imported_count=0,
        duplicate_count=0,
        rejected_count=0,
        status="completed",
        simulated=simulated,
    )
    session.add(batch)
    session.flush()

    try:
        reader = csv.DictReader(io.StringIO(csv_text))
        if reader.fieldnames is None:
            raise ValueError("CSV header row is required")
        rows = list(reader)
    except csv.Error as exc:
        raise ValueError("invalid CSV data") from exc

    row_results: list[dict[str, Any]] = []
    for row_number, row in enumerate(rows, start=2):
        try:
            provider_event_id = _get(row, "provider_event_id")
            provider_reference = _get(row, "provider_reference")
            currency = (_get(row, "currency") or "NGN").upper()
            occurred_at = _parse_datetime(_get(row, "occurred_at"), "occurred_at")
            raw_status = _get(row, "raw_status") or "unknown"
            state = _normalise_state(raw_status, _get(row, "normalised_state"))
            amount_kobo = _parse_kobo(row, currency)
            if not provider_event_id:
                raise ValueError("provider_event_id is required")
            if not provider_reference:
                raise ValueError("provider_reference is required")
            if len(currency) != 3:
                raise ValueError("currency must be a three-letter code")

            existing_event = session.execute(
                select(PaymentEvent).where(
                    PaymentEvent.org_id == org_id,
                    PaymentEvent.provider_node_id == provider_node_id,
                    PaymentEvent.provider_event_id == provider_event_id,
                )
            ).scalar_one_or_none()

            payment = session.execute(
                select(Payment).where(
                    Payment.org_id == org_id,
                    Payment.provider_node_id == provider_node_id,
                    Payment.provider_reference == provider_reference,
                )
            ).scalar_one_or_none()

            if existing_event is not None:
                outcome = "duplicate"
                reason = "duplicate provider event"
            else:
                if payment is None:
                    if state is PaymentState.UNKNOWN:
                        initial_state = "unknown"
                    elif state is PaymentState.REVERSED:
                        initial_state = "succeeded"
                    else:
                        initial_state = "pending"
                    payment = Payment(
                        id=uuid4(),
                        org_id=org_id,
                        provider_node_id=provider_node_id,
                        merchant_reference=provider_reference,
                        provider_reference=provider_reference,
                        idempotency_key=hashlib.sha256(
                            f"{org_id}:{provider_node_id}:{provider_reference}".encode()
                        ).hexdigest(),
                        amount_kobo=amount_kobo,
                        currency=currency,
                        channel=_get(row, "channel") or "unknown",
                        state=initial_state,
                        simulated=False,
                    )
                    session.add(payment)
                    session.flush()

                evidence_reference = hashlib.sha256(
                    "|".join(f"{key}={value}" for key, value in sorted(row.items())).encode()
                ).hexdigest()
                evidence = Evidence(
                    kind=EvidenceKind.MANUAL_REVIEW,
                    source=filename,
                    reference=evidence_reference,
                    observed_at=occurred_at,
                )

                states = [state]
                if state is PaymentState.SETTLED:
                    states = [PaymentState.SUCCEEDED, PaymentState.SETTLED]
                for index, incoming in enumerate(states):
                    event_id = provider_event_id if len(states) == 1 else f"{provider_event_id}:stage-{index + 1}"
                    existing_stage = session.execute(
                        select(PaymentEvent).where(
                            PaymentEvent.org_id == org_id,
                            PaymentEvent.provider_node_id == provider_node_id,
                            PaymentEvent.provider_event_id == event_id,
                        )
                    ).scalar_one_or_none()
                    if existing_stage is not None:
                        continue
                    result = apply_event(PaymentState(payment.state), incoming, evidence)
                    event = PaymentEvent(
                        org_id=org_id,
                        payment_id=payment.id,
                        provider_node_id=provider_node_id,
                        provider_event_id=event_id,
                        raw_status=raw_status,
                        normalised_state=incoming.value,
                        applied=result.applied,
                        apply_reason=result.reason if not result.applied else None,
                        evidence_kind="manual_review",
                        evidence_source=filename,
                        evidence_reference=evidence_reference,
                        occurred_at=occurred_at,
                        raw_payload=dict(row),
                        simulated=False,
                    )
                    session.add(event)
                    if result.applied:
                        payment.state = result.new_state.value
                        payment.state_updated_at = occurred_at
                        if result.new_state is PaymentState.SETTLED:
                            settled_at = _parse_datetime(
                                _get(row, "settled_at") or _get(row, "occurred_at"),
                                "settled_at",
                            )
                            payment.settled_at = settled_at
                    session.flush()
                outcome = "imported"
                reason = None

            raw_row_hash = hashlib.sha256(
                repr(row).encode("utf-8")
            ).hexdigest()
            import_row = PaymentImportRow(
                org_id=org_id,
                import_id=batch.id,
                row_number=row_number,
                sha256=raw_row_hash,
                raw_row=dict(row),
                outcome=outcome,
                reason=reason,
                payment_id=payment.id if payment is not None else None,
            )
            session.add(import_row)
            row_results.append({
                "row_number": row_number,
                "outcome": outcome,
                "reason": reason,
                "payment_id": payment.id if payment is not None else None,
            })
        except (ValueError, InvalidOperation) as exc:
            raw_row_hash = hashlib.sha256(repr(row).encode("utf-8")).hexdigest()
            session.add(PaymentImportRow(
                org_id=org_id,
                import_id=batch.id,
                row_number=row_number,
                sha256=raw_row_hash,
                raw_row=dict(row),
                outcome="rejected",
                reason=str(exc),
                payment_id=None,
            ))
            row_results.append({
                "row_number": row_number,
                "outcome": "rejected",
                "reason": str(exc),
                "payment_id": None,
            })

    batch.row_count = len(rows)
    batch.imported_count = sum(r["outcome"] == "imported" for r in row_results)
    batch.duplicate_count = sum(r["outcome"] == "duplicate" for r in row_results)
    batch.rejected_count = sum(r["outcome"] == "rejected" for r in row_results)
    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=org_id,
        actor=principal.user_id,
        action="import_payment_csv",
        entity_type="payment_import",
        entity_id=batch.id,
        payload={
            "filename": filename,
            "sha256": file_hash,
            "row_count": batch.row_count,
            "imported_count": batch.imported_count,
            "duplicate_count": batch.duplicate_count,
            "rejected_count": batch.rejected_count,
        },
        simulated=batch.simulated,
    )
    session.commit()
    return {
        "import_id": batch.id,
        "filename": batch.filename,
        "sha256": batch.sha256,
        "row_count": batch.row_count,
        "imported_count": batch.imported_count,
        "duplicate_count": batch.duplicate_count,
        "rejected_count": batch.rejected_count,
        "rows": row_results,
    }
