from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.demo_models import (
    Approval,
    AuditEvent,
    DependencyEdge,
    Incident,
    IncidentTransition,
    Obligation,
    Recommendation,
)
from app.db.models import Organisation
from app.db.payments import InfraNode, Payment, PaymentEvent
from app.db.session import get_db
from app.schemas import (
    AuditListResponse,
    AuditRecordResponse,
    DependencyEdgeResponse,
    DependencyGraphResponse,
    DependencyNode,
    EventIngestionResult,
    HealthResponse,
    IncidentDetailResponse,
    IncidentListResponse,
    IncidentResponse,
    IncidentTransitionResponse,
    ObligationListResponse,
    ObligationResponse,
    PaymentDetailResponse,
    PaymentEventInput,
    PaymentListResponse,
    PaymentResponse,
    PaymentVerificationResult,
    ProviderSignalInput,
    RecommendationDecision,
    RecommendationListResponse,
    RecommendationResponse,
    ScenarioRequest,
    SimulatorSeedRequest,
    SimulatorSeedResult,
)
from app.security.auth import DemoAuth, Principal, Role, require_role
from app.security.simulation import require_simulation_mode
from app.security.tenancy import org_scoped_query
from app.services.approvals import decide_recommendation
from app.services.financial import financial_impact
from app.services.payments import ingest_payment_event


router = APIRouter()
bearer = HTTPBearer(auto_error=False)
demo_auth = DemoAuth(settings.token_secret or "demo-development-secret")


def principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=401, detail="missing authentication credential")
    try:
        return demo_auth.authenticate(credentials.credentials)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def db_session():
    yield from get_db()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        simulation_mode=settings.simulation_mode,
    )


@router.post("/v1/events/payments", response_model=EventIngestionResult)
def ingest_payment(
    body: PaymentEventInput,
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> EventIngestionResult:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    result = ingest_payment_event(
        session,
        current,
        org_id=uuid.UUID(current.org_id),
        provider_node_id=body.provider_node_id,
        provider_event_id=body.provider_event_id,
        provider_reference=body.provider_reference,
        occurred_at=body.occurred_at,
        raw_status=body.raw_status,
        normalised_state=body.normalised_state,
        evidence_kind=body.evidence_kind,
        evidence_source=body.evidence_source,
        evidence_reference=body.evidence_reference,
        raw_payload=body.raw_payload,
        simulated=body.simulated,
    )
    return EventIngestionResult(**result)


@router.post("/v1/events/signals", response_model=EventIngestionResult)
def ingest_signal(
    body: ProviderSignalInput,
    current: Annotated[Principal, Depends(principal)],
) -> EventIngestionResult:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    return EventIngestionResult(
        event_id=uuid.uuid5(uuid.NAMESPACE_URL, body.provider_event_id),
        duplicate=False,
        applied=False,
        reason="provider_signals table is not implemented in the current MVP",
        new_state=None,
    )


@router.get("/v1/payments", response_model=PaymentListResponse)
def list_payments(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = None,
) -> PaymentListResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    payments = session.execute(
        select(Payment)
        .where(Payment.org_id == uuid.UUID(current.org_id))
        .limit(limit)
    ).scalars().all()
    items = [
        PaymentResponse(
            id=p.id,
            org_id=p.org_id,
            provider_node_id=p.provider_node_id,
            provider_reference=p.provider_reference or "",
            amount_kobo=p.amount_kobo,
            currency=p.currency,
            state=p.state,
            settled_at=p.settled_at,
            retry_eligible=p.state == "failed",
            simulated=p.simulated,
        )
        for p in payments
    ]
    return PaymentListResponse(items=items, next_cursor=None)


@router.get("/v1/payments/{payment_id}", response_model=PaymentDetailResponse)
def payment_detail(
    payment_id: uuid.UUID,
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> PaymentDetailResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    payment = session.get(Payment, payment_id)
    if payment is None or str(payment.org_id) != current.org_id:
        raise HTTPException(status_code=404, detail="payment not found")
    events = session.execute(
        select(PaymentEvent).where(
            PaymentEvent.org_id == payment.org_id,
            PaymentEvent.payment_id == payment.id,
        )
    ).scalars().all()
    event_models = [
        PaymentEventInput(
            provider_event_id=e.provider_event_id,
            provider_node_id=e.provider_node_id,
            provider_reference=payment.provider_reference or "",
            occurred_at=e.occurred_at,
            received_at=e.received_at,
            raw_status=e.raw_status,
            normalised_state=e.normalised_state,
            evidence_kind=e.evidence_kind,
            evidence_source=e.evidence_source,
            evidence_reference=e.evidence_reference,
            raw_payload=e.raw_payload,
            simulated=e.simulated,
        )
        for e in events
    ]
    return PaymentDetailResponse(
        id=payment.id,
        org_id=payment.org_id,
        provider_node_id=payment.provider_node_id,
        provider_reference=payment.provider_reference or "",
        amount_kobo=payment.amount_kobo,
        currency=payment.currency,
        state=payment.state,
        settled_at=payment.settled_at,
        retry_eligible=payment.state == "failed",
        simulated=payment.simulated,
        events=event_models,
    )


@router.post("/v1/payments/{payment_id}/verify", response_model=PaymentVerificationResult)
def verify_payment(
    payment_id: uuid.UUID,
    current: Annotated[Principal, Depends(principal)],
) -> PaymentVerificationResult:
    require_role(current, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    raise HTTPException(
        status_code=501,
        detail="provider adapter verification is implemented in Stage 8",
    )


@router.get("/v1/incidents", response_model=IncidentListResponse)
def list_incidents(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> IncidentListResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    rows = session.execute(
        select(Incident).where(Incident.org_id == uuid.UUID(current.org_id))
    ).scalars().all()
    return IncidentListResponse(
        items=[
            IncidentResponse(
                id=r.id,
                org_id=r.org_id,
                subject_node_id=r.subject_node_id,
                state=r.state,
                severity=r.severity,
                opened_at=r.opened_at,
                resolved_at=r.resolved_at,
                simulated=r.simulated,
            )
            for r in rows
        ]
    )


@router.get("/v1/incidents/{incident_id}", response_model=IncidentDetailResponse)
def incident_detail(
    incident_id: uuid.UUID,
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> IncidentDetailResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    incident = session.get(Incident, incident_id)
    if incident is None or str(incident.org_id) != current.org_id:
        raise HTTPException(status_code=404, detail="incident not found")
    rows = session.execute(
        select(IncidentTransition).where(
            IncidentTransition.org_id == incident.org_id,
            IncidentTransition.incident_id == incident.id,
        )
    ).scalars().all()
    return IncidentDetailResponse(
        id=incident.id,
        org_id=incident.org_id,
        subject_node_id=incident.subject_node_id,
        state=incident.state,
        severity=incident.severity,
        opened_at=incident.opened_at,
        resolved_at=incident.resolved_at,
        simulated=incident.simulated,
        transitions=[
            IncidentTransitionResponse(
                from_state=r.from_state,
                to_state=r.to_state,
                occurred_at=r.occurred_at,
                evidence=r.evidence,
            )
            for r in rows
        ],
    )


@router.get("/v1/dependency-graph", response_model=DependencyGraphResponse)
def dependency_graph(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> DependencyGraphResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    org_id = uuid.UUID(current.org_id)
    nodes = session.execute(
        select(InfraNode).where(InfraNode.org_id == org_id)
    ).scalars().all()
    edges = session.execute(
        select(DependencyEdge).where(DependencyEdge.org_id == org_id)
    ).scalars().all()
    return DependencyGraphResponse(
        nodes=[
            DependencyNode(
                id=n.id,
                org_id=n.org_id,
                kind=n.kind,
                key=n.key,
                display_name=n.display_name,
            )
            for n in nodes
        ],
        edges=[
            DependencyEdgeResponse(
                from_node_id=e.from_node_id,
                to_node_id=e.to_node_id,
                status=e.status,
                source_note=e.source_note,
            )
            for e in edges
        ],
    )


@router.get("/v1/obligations", response_model=ObligationListResponse)
def list_obligations(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> ObligationListResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    rows = session.execute(
        select(Obligation).where(Obligation.org_id == uuid.UUID(current.org_id))
    ).scalars().all()
    return ObligationListResponse(
        items=[
            ObligationResponse(
                id=r.id,
                org_id=r.org_id,
                label=r.label,
                amount_kobo=r.amount_kobo,
                currency=r.currency,
                due_at=r.due_at,
                status=r.status,
                simulated=r.simulated,
            )
            for r in rows
        ]
    )


@router.get("/v1/financial-impact")
def financial_impact_route(
    deadline: datetime,
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
    recovery_probability_bps: int = Query(default=6000, ge=0, le=10000),
):
    reports = financial_impact(
        session,
        current,
        org_id=uuid.UUID(current.org_id),
        deadline=deadline,
        recovery_probability_bps=recovery_probability_bps,
    )
    def serialize(report):
        return {
            "available_funds_kobo": report.available_funds.minor,
            "obligations_due_kobo": report.obligations_due.minor,
            "worst_case_position_kobo": report.worst_case_position.minor,
            "scenario_recovery_kobo": report.scenario_recovery.minor,
            "scenario_position_kobo": report.scenario_position.minor,
            "inputs": list(report.inputs),
            "assumptions": [
                {"name": a.name, "description": a.description, "value": a.value}
                for a in report.assumptions
            ],
            "limitations": list(report.limitations),
        }
    return {
        **serialize(reports.assumed_recovery),
        "recovery_probability_bps": recovery_probability_bps,
        "simulated": True,
        "no_recovery": serialize(reports.no_recovery),
        "full_recovery": serialize(reports.full_recovery),
    }


@router.post("/v1/scenarios")
def run_scenario(
    body: ScenarioRequest,
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
):
    raise HTTPException(status_code=501, detail="scenario route available after seed integration")


@router.get("/v1/recommendations", response_model=RecommendationListResponse)
def list_recommendations(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> RecommendationListResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    rows = session.execute(
        select(Recommendation).where(
            Recommendation.org_id == uuid.UUID(current.org_id)
        )
    ).scalars().all()
    return RecommendationListResponse(
        items=[
            RecommendationResponse(
                id=r.id,
                org_id=r.org_id,
                incident_id=r.incident_id,
                action=r.action,
                tier=r.tier,
                reasons=r.reasons,
                evidence=r.evidence,
                limitations=r.limitations,
                approval_required=r.approval_required,
                simulated=r.simulated,
            )
            for r in rows
        ]
    )


@router.post("/v1/recommendations/{recommendation_id}/decision")
def recommendation_decision(
    recommendation_id: uuid.UUID,
    body: RecommendationDecision,
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
):
    try:
        approval = decide_recommendation(
            session,
            current,
            org_id=uuid.UUID(current.org_id),
            recommendation_id=recommendation_id,
            decision=body.decision,
            reason=body.reason,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "id": approval.id,
        "org_id": approval.org_id,
        "recommendation_id": approval.recommendation_id,
        "approver_reference": approval.approver_reference,
        "decision": approval.decision,
        "reason": approval.reason,
        "decided_at": approval.decided_at,
        "simulated": approval.simulated,
    }


@router.get("/v1/audit", response_model=AuditListResponse)
def list_audit(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
) -> AuditListResponse:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    rows = session.execute(
        select(AuditEvent).where(
            AuditEvent.org_id == uuid.UUID(current.org_id)
        ).order_by(AuditEvent.sequence_number)
    ).scalars().all()
    return AuditListResponse(
        items=[
            AuditRecordResponse(
                id=r.id,
                org_id=r.org_id,
                actor=r.actor_reference,
                action=r.action,
                entity={
                    "type": r.entity_type,
                    "id": str(r.entity_id) if r.entity_id else None,
                },
                occurred_at=r.occurred_at,
                previous_hash=r.previous_hash,
                hash=r.hash,
                simulated=r.simulated,
            )
            for r in rows
        ]
    )


@router.post("/v1/simulator/seed", response_model=SimulatorSeedResult)
def seed_simulator(
    current: Annotated[Principal, Depends(principal)],
    session: Annotated[Session, Depends(db_session)],
    body: SimulatorSeedRequest | None = None,
) -> SimulatorSeedResult:
    require_role(current, {Role.OPERATOR, Role.ADMIN})
    require_simulation_mode(settings.simulation_mode)
    seed_request = body or SimulatorSeedRequest()
    org_id = uuid.UUID(current.org_id)
    organisation = session.get(Organisation, org_id)
    if organisation is None:
        organisation = Organisation(
            id=org_id,
            name="Ade Stores",
            slug="ade-stores",
            is_demo=True,
            opening_available_kobo=15000000,
            opening_currency="NGN",
        )
        session.add(organisation)
    else:
        organisation.opening_available_kobo = 15000000
        organisation.opening_currency = "NGN"

    provider_a = session.execute(
        select(InfraNode).where(
            InfraNode.org_id == org_id,
            InfraNode.key == "provider-a",
        )
    ).scalar_one_or_none()
    if provider_a is None:
        provider_a = InfraNode(
            org_id=org_id,
            kind="provider",
            key="provider-a",
            display_name="Provider A",
        )
        session.add(provider_a)
    provider_b = session.execute(
        select(InfraNode).where(
            InfraNode.org_id == org_id,
            InfraNode.key == "provider-b",
        )
    ).scalar_one_or_none()
    if provider_b is None:
        provider_b = InfraNode(
            org_id=org_id,
            kind="provider",
            key="provider-b",
            display_name="Provider B",
        )
        session.add(provider_b)
    session.flush()

    if seed_request.reset:
        session.query(PaymentEvent).filter(PaymentEvent.org_id == org_id).delete()
        session.query(Payment).filter(Payment.org_id == org_id).delete()
        session.query(Obligation).filter(Obligation.org_id == org_id).delete()
        session.query(DependencyEdge).filter(DependencyEdge.org_id == org_id).delete()
        session.flush()

    for index in range(28):
        session.add(
            Payment(
                org_id=org_id,
                provider_node_id=provider_a.id,
                merchant_reference=f"ADE-ORD-{100102 + index}",
                provider_reference=f"ade-settled-{index + 1}",
                idempotency_key=f"ade-settled-{index + 1}",
                amount_kobo=3000000,
                currency="NGN",
                channel="card",
                state="settled",
                settled_at=datetime(2026, 11, 19, 16, 0, tzinfo=timezone.utc),
                simulated=True,
            )
        )
    for index in range(12):
        session.add(
            Payment(
                org_id=org_id,
                provider_node_id=provider_a.id,
                merchant_reference=f"ADE-ORD-{200101 + index}",
                provider_reference=f"ade-unknown-{index + 1}",
                idempotency_key=f"ade-unknown-{index + 1}",
                amount_kobo=3000000,
                currency="NGN",
                channel="card",
                state="unknown",
                simulated=True,
            )
        )
    session.add(
        Obligation(
            org_id=org_id,
            label="Ade Stores supplier obligation",
            amount_kobo=110000000,
            currency="NGN",
            due_at=datetime(2026, 11, 19, 17, 0, tzinfo=timezone.utc),
            status="open",
            simulated=True,
        )
    )
    if seed_request.branch == "shared":
        session.add(
            DependencyEdge(
                org_id=org_id,
                from_node_id=provider_a.id,
                to_node_id=provider_b.id,
                relation="depends_on",
                status="known",
                source_note="Both routes share the failing upstream switch",
                simulated=True,
            )
        )
    else:
        session.add(
            DependencyEdge(
                org_id=org_id,
                from_node_id=provider_a.id,
                to_node_id=provider_b.id,
                relation="independent_of",
                status="unknown",
                source_note="Provider B independence verified",
                simulated=True,
            )
        )
    session.commit()
    return SimulatorSeedResult(
        branch=seed_request.branch,
        simulated=True,
    )


@router.get("/v1/demo/users")
def demo_users(
    current: Annotated[Principal, Depends(principal)],
):
    return {
        "users": [
            {"credential": "demo-viewer-key", "role": "viewer"},
            {"credential": "demo-operator-key", "role": "operator"},
            {"credential": "demo-approver-key", "role": "approver"},
            {"credential": "demo-admin-key", "role": "admin"},
        ],
    }
