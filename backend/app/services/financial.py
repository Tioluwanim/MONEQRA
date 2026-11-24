from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.demo_models import FinancialSnapshot, Recommendation
from app.db.models import Organisation
from app.db.payments import Payment
from app.domain.dependency import IndependenceVerdict
from app.domain.financial_engine import (
    Obligation,
    PaymentView,
    classify_payments,
    demo_scenarios,
)
from app.domain.money import Money
from app.domain.payment_states import PaymentState
from app.domain.recommendation import RecommendationContext, recommend
from app.security.auth import Principal, Role, require_role
from app.security.audit import append_audit
from app.security.tenancy import require_tenant_match
from app.db.demo_models import Obligation as ObligationRow


def _database_datetime(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def financial_impact(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    deadline: datetime,
    recovery_probability_bps: int,
):
    require_role(principal, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    require_tenant_match(principal.org_id, org_id)

    organisation = session.execute(
        select(Organisation).where(Organisation.id == org_id)
    ).scalar_one()
    opening = Money(
        organisation.opening_available_kobo,
        organisation.opening_currency,
    )

    payments = session.execute(
        select(Payment).where(Payment.org_id == org_id)
    ).scalars().all()
    payment_views = [
        PaymentView(
            id=str(payment.id),
            amount=Money(payment.amount_kobo, payment.currency),
            state=PaymentState(payment.state),
            settled_at=_database_datetime(payment.settled_at),
        )
        for payment in payments
    ]
    obligations = session.execute(
        select(ObligationRow).where(ObligationRow.org_id == org_id)
    ).scalars().all()
    obligation_views = [
        Obligation(
            id=str(obligation.id),
            label=obligation.label,
            amount=Money(obligation.amount_kobo, obligation.currency),
            due_at=_database_datetime(obligation.due_at),
        )
        for obligation in obligations
    ]

    buckets = classify_payments(payment_views, deadline)
    reports = demo_scenarios(
        buckets,
        opening,
        obligation_views,
        deadline,
        recovery_probability_bps,
    )
    session.add(FinancialSnapshot(
        org_id=org_id,
        opening_available_kobo=opening.minor,
        settled_kobo=buckets.settled_by_deadline.minor,
        unresolved_kobo=buckets.unresolved.minor,
        obligations_due_kobo=reports.assumed_recovery.obligations_due.minor,
        worst_case_position_kobo=reports.assumed_recovery.worst_case_position.minor,
        currency=opening.currency,
        deadline=deadline,
        simulated=bool(payments and all(payment.simulated for payment in payments)),
    ))
    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=org_id,
        actor=principal.user_id,
        action="calculate_financial_impact",
        entity_type="financial_report",
        entity_id=None,
        payload={
            "deadline": deadline.isoformat(),
            "recovery_probability_bps": recovery_probability_bps,
            "available_funds_kobo": reports.assumed_recovery.available_funds.minor,
            "worst_case_kobo": reports.assumed_recovery.worst_case_position.minor,
        },
        simulated=bool(payments and all(payment.simulated for payment in payments)),
    )
    session.commit()
    return reports


def independence_recommendation(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    incident_id: UUID,
    report,
    independence: IndependenceVerdict,
    evidence: tuple[str, ...] = (),
    limitations: tuple[str, ...] = (),
):
    require_role(principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    require_tenant_match(principal.org_id, org_id)

    result = recommend(
        report,
        independence,
        RecommendationContext(
            evidence=evidence,
            limitations=limitations,
        ),
    )
    row = Recommendation(
        org_id=org_id,
        incident_id=incident_id,
        action=result.action,
        tier=int(result.tier),
        reasons=list(result.reasons),
        evidence=list(result.evidence),
        limitations=list(result.limitations),
        approval_required=result.approval_required,
        simulated=True,
    )
    session.add(row)
    session.flush()
    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=org_id,
        actor=principal.user_id,
        action="create_recommendation",
        entity_type="recommendation",
        entity_id=row.id,
        payload={"action": result.action, "tier": int(result.tier)},
        simulated=True,
    )
    session.commit()
    return row
