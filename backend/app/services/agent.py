from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.demo_models import Obligation
from app.db.payments import Payment
from app.domain.coverage import CoverageStatus
from app.services.coordination import coverage_report, create_action
from app.services.financial import financial_impact
from app.security.audit import append_audit
from app.security.auth import Principal, Role, require_role
from app.security.tenancy import require_tenant_match


class AgentToolbox:
    """Permission-controlled read-only and proposal tools for one orchestrating agent."""

    def __init__(self, session: Session, principal: Principal) -> None:
        self.session = session
        self.principal = principal

    def get_cash_position(
        self,
        org_id: UUID,
        deadline: datetime,
        recovery_probability_bps: int,
    ) -> dict[str, Any]:
        report = financial_impact(
            self.session,
            self.principal,
            org_id=org_id,
            deadline=deadline,
            recovery_probability_bps=recovery_probability_bps,
        )
        assumed = report.assumed_recovery
        return {
            "available_funds_kobo": assumed.available_funds.minor,
            "obligations_due_kobo": assumed.obligations_due.minor,
            "worst_case_position_kobo": assumed.worst_case_position.minor,
            "assumed_recovery_kobo": assumed.scenario_recovery.minor,
            "assumed_position_kobo": assumed.scenario_position.minor,
        }

    def get_obligation_coverage(
        self,
        org_id: UUID,
        recovery_probability_bps: int,
    ) -> dict[str, Any]:
        report = coverage_report(
            self.session,
            self.principal,
            org_id=org_id,
            recovery_probability_bps=recovery_probability_bps,
        )
        return {
            "confirmed_funds_kobo": report.confirmed_funds.minor,
            "assumed_unconfirmed_kobo": report.assumed_unconfirmed.minor,
            "items": [
                {
                    "obligation_id": item.obligation.id,
                    "label": item.obligation.label,
                    "category": item.obligation.category,
                    "priority": item.obligation.priority,
                    "responsible_person": item.obligation.responsible_person,
                    "status": item.status.value,
                    "suggested_action": item.suggested_action.value if item.suggested_action else None,
                    "amount_kobo": item.obligation.amount.minor,
                    "from_confirmed_kobo": item.from_confirmed.minor,
                    "from_unconfirmed_kobo": item.from_unconfirmed.minor,
                }
                for item in report.items
            ],
        }

    def get_unresolved_transactions(self, org_id: UUID) -> dict[str, Any]:
        require_role(self.principal, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
        require_tenant_match(self.principal.org_id, org_id)
        rows = self.session.execute(
            select(Payment).where(
                Payment.org_id == org_id,
                Payment.state.in_(("created", "pending", "unknown", "succeeded")),
            )
        ).scalars().all()
        return {
            "transactions": [
                {
                    "payment_id": str(row.id),
                    "provider_reference": row.provider_reference or "",
                    "amount_kobo": row.amount_kobo,
                    "currency": row.currency,
                    "state": row.state,
                }
                for row in rows
            ]
        }

    def create_action_proposal(
        self,
        org_id: UUID,
        obligation_id: UUID,
        kind: str,
        note: str,
        proposed_amount_kobo: int | None = None,
    ) -> dict[str, Any]:
        require_role(self.principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
        try:
            row = create_action(
                self.session,
                self.principal,
                org_id=org_id,
                obligation_id=obligation_id,
                kind=kind,
                note=note,
                proposed_amount_kobo=proposed_amount_kobo,
            )
        except (LookupError, ValueError):
            raise
        return {
            "action_id": str(row.id),
            "status": row.status,
            "kind": row.kind,
            "approval_required": True,
        }


def run_financial_review(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    deadline: datetime,
    recovery_probability_bps: int,
) -> dict[str, Any]:
    require_role(principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    require_tenant_match(principal.org_id, org_id)

    tools = AgentToolbox(session, principal)
    cash = tools.get_cash_position(org_id, deadline, recovery_probability_bps)
    coverage = tools.get_obligation_coverage(org_id, recovery_probability_bps)
    unresolved = tools.get_unresolved_transactions(org_id)

    findings: list[dict[str, Any]] = []
    proposals: list[dict[str, Any]] = []
    for item in coverage["items"]:
        status = item["status"]
        if status not in {CoverageStatus.DEPENDS.value, CoverageStatus.AT_RISK.value}:
            continue
        is_at_risk = status == CoverageStatus.AT_RISK.value
        findings.append({
            "obligation_id": item["obligation_id"],
            "label": item["label"],
            "status": status,
            "priority": item["priority"],
            "responsible_person": item["responsible_person"],
            "evidence": (
                "The obligation is not fully covered by confirmed funds."
                if is_at_risk
                else "The obligation depends on estimated incoming funds."
            ),
        })
        kind = item["suggested_action"]
        if kind not in {"request_extension", "split_payment", "pay_from_confirmed_first"}:
            continue
        obligation = session.get(Obligation, UUID(item["obligation_id"]))
        if obligation is None:
            continue
        proposed_amount = None
        note = (
            "Agent-drafted proposal: request an extension for an at-risk obligation."
            if is_at_risk
            else "Agent-drafted proposal: split payment to preserve confirmed cash."
        )
        if kind == "split_payment":
            confirmed_part = item["from_confirmed_kobo"]
            if confirmed_part <= 0 or confirmed_part >= obligation.amount_kobo:
                continue
            proposed_amount = confirmed_part
        try:
            proposals.append(
                tools.create_action_proposal(
                    org_id,
                    obligation.id,
                    kind,
                    note,
                    proposed_amount,
                )
            )
        except ValueError:
            continue

    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=org_id,
        actor=principal.user_id,
        action="run_agent_financial_review",
        entity_type="agent_review",
        entity_id=None,
        payload={
            "deadline": deadline.isoformat(),
            "recovery_probability_bps": recovery_probability_bps,
            "cash": cash,
            "finding_count": len(findings),
            "proposal_count": len(proposals),
            "unresolved_transaction_count": len(unresolved["transactions"]),
        },
        simulated=True,
    )
    session.commit()
    return {
        "review_status": "completed",
        "cash_position": cash,
        "unresolved_transactions": unresolved["transactions"],
        "findings": findings,
        "proposals": proposals,
        "limitations": (
            "Predicted or assumed incoming funds are not confirmed cash.",
            "The agent only proposes coordination actions and cannot move money.",
            "Every consequential proposal requires separate human approval.",
        ),
    }
