from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.demo_models import Recommendation
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
from app.security.tenancy import org_scoped_query, require_tenant_match
from app.db.demo_models import Obligation as ObligationRow


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
        org_scoped_query(session, Organisation, org_id)
    ).scalar_one()
    opening = Money(
        organisation.opening_available_kobo,
        organisation.opening_currency,
    )

    payments = session.execute(
        org_scoped_query(session, Payment, org_id)
    ).scalars().all()
    payment_views = [
        PaymentView(
            id=str(payment.id),
            amount=Money(payment.amount_kobo, payment.currency),
            state=PaymentState(payment.state),
            settled_at=payment.settled_at,
        )
        for payment in payments
    ]
    obligations = session.execute(
        org_scoped_query(session, ObligationRow, org_id)
    ).scalars().all()
    obligation_views = [
        Obligation(
            id=str(obligation.id),
            label=obligation.label,
            amount=Money(obligation.amount_kobo, obligation.currency),
            due_at=obligation.due_at,
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
