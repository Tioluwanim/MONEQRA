from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.demo_models import CoordinationAction, Obligation as ObligationRow
from app.db.models import Organisation
from app.db.payments import Payment
from app.domain.coverage import CoverageObligation, CoverageReport, compute_coverage
from app.domain.financial_engine import PaymentView, classify_payments
from app.domain.money import Money
from app.domain.payment_states import PaymentState
from app.security.audit import append_audit
from app.security.auth import Principal, Role, require_role
from app.security.tenancy import require_tenant_match

READ_ROLES = {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN}
REQUEST_ROLES = {Role.OPERATOR, Role.APPROVER, Role.ADMIN}


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def coverage_report(
    session: Session, principal: Principal, *, org_id: UUID, recovery_probability_bps: int
) -> CoverageReport:
    require_role(principal, READ_ROLES)
    require_tenant_match(principal.org_id, org_id)
    org = session.execute(select(Organisation).where(Organisation.id == org_id)).scalar_one()
    rows = session.execute(
        select(ObligationRow).where(ObligationRow.org_id == org_id, ObligationRow.status == "open")
    ).scalars().all()
    payments = session.execute(select(Payment).where(Payment.org_id == org_id)).scalars().all()
    # Confirmed money = opening balance + payments settled by the last open due date.
    horizon = max((_aware(r.due_at) for r in rows), default=datetime.now(timezone.utc))
    buckets = classify_payments(
        [
            PaymentView(str(p.id), Money(p.amount_kobo, p.currency), PaymentState(p.state),
                        _aware(p.settled_at) if p.settled_at else None)
            for p in payments
        ],
        horizon,
    )
    opening = Money(org.opening_available_kobo, org.opening_currency)
    return compute_coverage(
        [
            CoverageObligation(str(r.id), r.label, r.category, Money(r.amount_kobo, r.currency), _aware(r.due_at))
            for r in rows
        ],
        opening + buckets.settled_by_deadline,
        buckets.unresolved,
        recovery_probability_bps,
    )


def create_action(
    session: Session, principal: Principal, *, org_id: UUID, obligation_id: UUID,
    kind: str, note: str, proposed_amount_kobo: int | None,
) -> CoordinationAction:
    require_role(principal, REQUEST_ROLES)
    require_tenant_match(principal.org_id, org_id)
    obligation = session.get(ObligationRow, obligation_id)
    if obligation is None or obligation.org_id != org_id:
        raise LookupError("obligation not found")
    if obligation.status != "open":
        raise ValueError("obligation is not open")
    if kind == "split_payment":
        if proposed_amount_kobo is None or proposed_amount_kobo >= obligation.amount_kobo:
            raise ValueError("a split needs an amount smaller than the obligation")
    elif proposed_amount_kobo is not None:
        raise ValueError("proposed amount only applies to a split")
    duplicate = session.execute(
        select(CoordinationAction).where(
            CoordinationAction.obligation_id == obligation_id,
            CoordinationAction.kind == kind,
            CoordinationAction.status.in_(("pending", "approved")),
        )
    ).first()
    if duplicate is not None:
        raise ValueError("this obligation already has an open request of that kind")
    row = CoordinationAction(
        org_id=org_id, obligation_id=obligation_id, kind=kind, note=note.strip(),
        proposed_amount_kobo=proposed_amount_kobo, status="pending",
        requested_by=principal.user_id, simulated=obligation.simulated,
    )
    session.add(row)
    session.flush()
    append_audit(
        session, principal_org_id=principal.org_id, org_id=org_id, actor=principal.user_id,
        action="request_coordination_action", entity_type="coordination_action", entity_id=row.id,
        payload={"kind": kind, "obligation_id": str(obligation_id), "proposed_amount_kobo": proposed_amount_kobo},
        simulated=row.simulated,
    )
    session.commit()
    return row


def _load(session: Session, principal: Principal, org_id: UUID, action_id: UUID) -> CoordinationAction:
    require_tenant_match(principal.org_id, org_id)
    row = session.get(CoordinationAction, action_id)
    if row is None or row.org_id != org_id:
        raise LookupError("coordination action not found")
    return row


def decide_action(
    session: Session, principal: Principal, *, org_id: UUID, action_id: UUID,
    decision: str, reason: str = "",
) -> CoordinationAction:
    require_role(principal, {Role.APPROVER})
    row = _load(session, principal, org_id, action_id)
    if row.status != "pending":
        raise ValueError("this request has already been decided")
    if row.requested_by == principal.user_id:
        raise PermissionError("the person who made the request cannot approve it")
    if decision == "reject" and not reason.strip():
        raise ValueError("reject decision requires a reason")
    row.status = "approved" if decision == "approve" else "rejected"
    row.decided_by = principal.user_id
    row.decision_reason = reason.strip() or None
    row.decided_at = datetime.now(timezone.utc)
    append_audit(
        session, principal_org_id=principal.org_id, org_id=org_id, actor=principal.user_id,
        action=f"{decision}_coordination_action", entity_type="coordination_action", entity_id=row.id,
        payload={"decision": decision, "reason": reason}, simulated=row.simulated,
    )
    session.commit()
    return row


def complete_action(
    session: Session, principal: Principal, *, org_id: UUID, action_id: UUID, outcome_note: str,
) -> CoordinationAction:
    require_role(principal, REQUEST_ROLES)
    row = _load(session, principal, org_id, action_id)
    if row.status != "approved":
        raise ValueError("only an approved request can be marked as done")
    row.status = "completed"
    row.outcome_note = outcome_note.strip()
    append_audit(
        session, principal_org_id=principal.org_id, org_id=org_id, actor=principal.user_id,
        action="complete_coordination_action", entity_type="coordination_action", entity_id=row.id,
        payload={"outcome_note": row.outcome_note}, simulated=row.simulated,
    )
    session.commit()
    return row
