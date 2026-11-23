from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.db.demo_models import Approval, Recommendation
from app.security.auth import Principal, require_approval_role
from app.security.audit import append_audit
from app.security.tenancy import require_tenant_match


def decide_recommendation(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    recommendation_id: UUID,
    decision: str,
    reason: str = "",
) -> Approval:
    require_approval_role(principal)
    require_tenant_match(principal.org_id, org_id)

    if decision not in {"approve", "reject"}:
        raise ValueError("decision must be approve or reject")
    if decision == "reject" and not reason.strip():
        raise ValueError("reject decision requires a reason")

    recommendation = session.get(Recommendation, recommendation_id)
    if recommendation is None:
        raise LookupError("recommendation not found")
    require_tenant_match(principal.org_id, recommendation.org_id)
    if recommendation.org_id != org_id:
        raise PermissionError("cross-tenant access denied")

    existing = session.query(Approval).filter(
        Approval.recommendation_id == recommendation_id
    ).first()
    if existing is not None:
        raise ValueError("recommendation already has an approval decision")

    row = Approval(
        org_id=org_id,
        recommendation_id=recommendation_id,
        approver_reference=principal.user_id,
        decision=decision,
        reason=reason or None,
        simulated=recommendation.simulated,
    )
    session.add(row)
    session.flush()
    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=org_id,
        actor=principal.user_id,
        action=f"{decision}_recommendation",
        entity_type="recommendation",
        entity_id=recommendation_id,
        payload={"decision": decision, "reason": reason},
        simulated=recommendation.simulated,
    )
    session.commit()
    return row
