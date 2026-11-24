from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.adapters.provider import FakeProviderAdapter
from app.domain.dependency import IndependenceVerdict
from app.domain.recommendation import RecommendationContext, recommend
from app.db.demo_models import (
    Approval,
    AuditEvent,
    DependencyEdge,
    Incident,
    IncidentTransition,
    Obligation,
    ProviderRequest,
    ProviderSignal,
    Recommendation,
    ScenarioRun,
    FinancialSnapshot,
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
from app.security.audit import append_audit
from app.security.simulation import require_simulation_mode
from app.security.tenancy import org_scoped_query
from app.services.approvals import decide_recommendation
from app.services.financial import financial_impact
from app.services.payments import ingest_payment_event
from app.services.verification import verify_payment as verify_payment_service


router = APIRouter()
bearer = HTTPBearer(auto_error=False)
demo_auth = DemoAuth(settings.token_secret or "demo-development-secret")
fake_provider = FakeProviderAdapter()


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
    org_id = uuid.UUID(current.org_id)
    payment = session.execute(
        select(Payment).where(
            Payment.org_id == org_id,
            Payment.provider_reference == body.provider_reference,
        )
    ).scalar_one_or_none()
    provider_node_id = body.provider_node_id
    if payment is not None:
        provider_node_id = payment.provider_node_id
    result = ingest_payment_event(
        session,
        current,
        org_id=org_id,
        provider_node_id=provider_node_id,
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
    session: Annotated[Session, Depends(db_session)],
) -> EventIngestionResult:
    require_role(current, {Role.VIEWER, Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    org_id = uuid.UUID(current.org_id)
    if body.provider_node_id is not None:
        provider_node_id = body.provider_node_id
    else:
        provider_node = session.execute(
            select(InfraNode).where(
                InfraNode.org_id == org_id,
                InfraNode.key == (body.provider_key or "provider-a"),
            )
        ).scalar_one_or_none()
        if provider_node is None:
            raise HTTPException(status_code=404, detail="provider node not found")
        provider_node_id = provider_node.id
    duplicate = session.execute(
        select(ProviderSignal).where(
            ProviderSignal.org_id == org_id,
            ProviderSignal.provider_node_id == provider_node_id,
            ProviderSignal.provider_event_id == body.provider_event_id,
        )
    ).scalar_one_or_none()
    if duplicate is not None:
        return EventIngestionResult(
            event_id=duplicate.id,
            duplicate=True,
            applied=False,
            reason="duplicate provider event",
        )
    signal = ProviderSignal(
        id=uuid.uuid4(),
        org_id=org_id,
        provider_node_id=provider_node_id,
        provider_event_id=body.provider_event_id,
        occurred_at=body.occurred_at,
        status=body.status,
        latency_ms=body.latency_ms,
        raw_payload=body.raw_payload,
        simulated=body.simulated,
    )
    session.add(signal)
    session.flush()
    append_audit(
        session,
        principal_org_id=current.org_id,
        org_id=org_id,
        actor=current.user_id,
        action="ingest_provider_signal",
        entity_type="provider_signal",
        entity_id=signal.id,
        payload={"provider_event_id": body.provider_event_id, "status": body.status},
        simulated=body.simulated,
    )
    session.commit()
    return EventIngestionResult(
        event_id=signal.id,
        duplicate=False,
        applied=True,
        reason=None,
        new_state="unknown",
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
    session: Annotated[Session, Depends(db_session)],
) -> PaymentVerificationResult:
    try:
        result = verify_payment_service(
            session,
            current,
            payment_id=payment_id,
            adapter=fake_provider,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return PaymentVerificationResult(**result)


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
    require_role(current, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    org_id = uuid.UUID(current.org_id)
    reports = financial_impact(
        session,
        current,
        org_id=org_id,
        deadline=body.deadline,
        recovery_probability_bps=body.recovery_probability_bps,
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

    row = ScenarioRun(
        id=uuid.uuid4(),
        org_id=org_id,
        deadline=body.deadline,
        recovery_probability_bps=body.recovery_probability_bps,
        inputs={"deadline": body.deadline.isoformat()},
        result={
            "no_recovery": serialize(reports.no_recovery),
            "assumed_recovery": serialize(reports.assumed_recovery),
            "full_recovery": serialize(reports.full_recovery),
        },
        simulated=True,
    )
    session.add(row)
    session.flush()
    append_audit(
        session,
        principal_org_id=current.org_id,
        org_id=org_id,
        actor=current.user_id,
        action="run_scenario",
        entity_type="scenario_run",
        entity_id=row.id,
        payload={"recovery_probability_bps": body.recovery_probability_bps},
        simulated=True,
    )
    session.commit()
    return {
        "no_recovery": serialize(reports.no_recovery),
        "assumed_recovery": serialize(reports.assumed_recovery),
        "full_recovery": serialize(reports.full_recovery),
    }


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
            id=uuid.uuid4(),
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
            id=uuid.uuid4(),
            org_id=org_id,
            kind="provider",
            key="provider-b",
            display_name="Provider B",
        )
        session.add(provider_b)
    session.flush()

    def get_or_create_node(key: str, display_name: str) -> InfraNode:
        node = session.execute(
            select(InfraNode).where(
                InfraNode.org_id == org_id,
                InfraNode.key == key,
            )
        ).scalar_one_or_none()
        if node is None:
            node = InfraNode(
                id=uuid.uuid4(),
                org_id=org_id,
                kind="switch" if key.startswith("switch-") else "processor",
                key=key,
                display_name=display_name,
            )
            session.add(node)
            session.flush()
        return node

    processor_a = get_or_create_node("processor-a", "Processor A")
    processor_b = get_or_create_node("processor-b", "Processor B")
    switch_a = get_or_create_node("switch-a", "Switch A")
    switch_b = get_or_create_node("switch-b", "Switch B")
    shared_switch = get_or_create_node("switch-shared", "Shared upstream switch")

    if seed_request.reset:
        session.query(PaymentEvent).filter(PaymentEvent.org_id == org_id).delete()
        session.query(Payment).filter(Payment.org_id == org_id).delete()
        session.query(Obligation).filter(Obligation.org_id == org_id).delete()
        session.query(DependencyEdge).filter(DependencyEdge.org_id == org_id).delete()
        session.query(IncidentTransition).filter(IncidentTransition.org_id == org_id).delete()
        session.query(Incident).filter(Incident.org_id == org_id).delete()
        session.query(Recommendation).filter(Recommendation.org_id == org_id).delete()
        session.flush()

    for index in range(28):
        session.add(
            Payment(
                id=uuid.uuid4(),
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
                id=uuid.uuid4(),
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
            id=uuid.uuid4(),
            org_id=org_id,
            label="Ade Stores supplier obligation",
            amount_kobo=110000000,
            currency="NGN",
            due_at=datetime(2026, 11, 19, 17, 0, tzinfo=timezone.utc),
            status="open",
            simulated=True,
        )
    )
    branch_edges = [
        (provider_a, processor_a),
        (provider_b, processor_b),
    ]
    if seed_request.branch == "shared":
        branch_edges.extend([
            (processor_a, shared_switch),
            (processor_b, shared_switch),
        ])
    else:
        branch_edges.extend([
            (processor_a, switch_a),
            (processor_b, switch_b),
        ])
    for from_node, to_node in branch_edges:
        session.add(
            DependencyEdge(
                id=uuid.uuid4(),
                org_id=org_id,
                from_node_id=from_node.id,
                to_node_id=to_node.id,
                relation="depends_on",
                status="known",
                source_note=(
                    "Simulated Ade Stores branch topology; "
                    f"{seed_request.branch} failure domain"
                ),
                simulated=True,
            )
        )
    occurred_at = datetime(2026, 11, 19, 16, 30, tzinfo=timezone.utc)
    incident = Incident(
        id=uuid.uuid4(),
        org_id=org_id,
        subject_node_id=provider_a.id,
        state="confirmed",
        severity="high",
        opened_at=occurred_at,
        resolved_at=None,
        simulated=True,
    )
    session.add(incident)
    session.flush()
    session.add(IncidentTransition(
        id=uuid.uuid4(),
        org_id=org_id,
        incident_id=incident.id,
        from_state="suspected",
        to_state="confirmed",
        occurred_at=occurred_at,
        evidence={
            "kind": "provider_status_check",
            "description": "Ade Stores simulated incident corroboration",
            "source": "simulator",
        },
        simulated=True,
    ))
    verdict = (
        IndependenceVerdict.INDEPENDENT
        if seed_request.branch == "independent"
        else IndependenceVerdict.SHARED
    )
    financial = financial_impact(
        session,
        current,
        org_id=org_id,
        deadline=datetime(2026, 11, 19, 17, 0, tzinfo=timezone.utc),
        recovery_probability_bps=6000,
    ).assumed_recovery
    recommendation_result = recommend(
        financial,
        verdict,
        RecommendationContext(
            evidence=("Ade Stores dependency verdict", "Simulated incident evidence"),
            limitations=("Recovery probability is an assumption",),
        ),
    )
    session.add(Recommendation(
        id=uuid.uuid4(),
        org_id=org_id,
        incident_id=incident.id,
        action=recommendation_result.action,
        tier=int(recommendation_result.tier),
        reasons=list(recommendation_result.reasons),
        evidence=list(recommendation_result.evidence),
        limitations=list(recommendation_result.limitations),
        approval_required=recommendation_result.approval_required,
        simulated=True,
    ))
    append_audit(
        session,
        principal_org_id=current.org_id,
        org_id=org_id,
        actor=current.user_id,
        action="seed_ade_stores",
        entity_type="organisation",
        entity_id=org_id,
        payload={"branch": seed_request.branch, "simulated": True},
        simulated=True,
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
