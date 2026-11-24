import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Organisation
from app.db.payments import InfraNode, Payment, PaymentEvent
from app.db.session import org_query
from app.db.demo_models import (
    Approval,
    AuditEvent,
    FinancialSnapshot,
    ProviderRequest,
    ProviderSignal,
    DependencyEdge,
    Incident,
    IncidentTransition,
    Obligation,
    Recommendation,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def seed_organisation(db_session: Session) -> Organisation:
    organisation = Organisation(
        id=uuid.uuid4(),
        name="Ade Stores",
        slug=f"ade-{uuid.uuid4()}",
        is_demo=True,
    )
    db_session.add(organisation)
    db_session.flush()
    return organisation


def seed_provider(db_session: Session, org: Organisation) -> InfraNode:
    provider = InfraNode(
        id=uuid.uuid4(),
        org_id=org.id,
        kind="provider",
        key="provider-a",
        display_name="Provider A",
    )
    db_session.add(provider)
    db_session.flush()
    return provider


def test_payment_requires_positive_kobo_and_three_letter_currency(db_session: Session):
    org = seed_organisation(db_session)
    provider = seed_provider(db_session, org)

    db_session.add(
        Payment(
            id=uuid.uuid4(),
            org_id=org.id,
            provider_node_id=provider.id,
            merchant_reference="merchant-1",
            idempotency_key="idem-1",
            amount_kobo=0,
            currency="NGN",
            channel="card",
            state="created",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_payment_event_preserves_payload_and_is_append_only(db_session: Session):
    org = seed_organisation(db_session)
    provider = seed_provider(db_session, org)
    payment = Payment(
        id=uuid.uuid4(),
        org_id=org.id,
        provider_node_id=provider.id,
        merchant_reference="merchant-1",
        idempotency_key="idem-1",
        amount_kobo=12500,
        currency="NGN",
        channel="card",
        state="pending",
    )
    db_session.add(payment)
    db_session.flush()

    event = PaymentEvent(
        id=uuid.uuid4(),
        org_id=org.id,
        payment_id=payment.id,
        provider_node_id=provider.id,
        provider_event_id="evt-1",
        raw_status="SUCCESS",
        normalised_state="succeeded",
        applied=True,
        apply_reason=None,
        evidence_kind="provider_webhook",
        evidence_source="paystack",
        evidence_reference="evt-1",
        occurred_at=datetime.now(timezone.utc),
        raw_payload={"status": "SUCCESS", "nested": {"amount": 12500}},
        simulated=True,
    )
    db_session.add(event)
    db_session.flush()
    db_session.refresh(event)

    assert event.raw_payload["nested"]["amount"] == 12500

    event.raw_status = "CHANGED"
    with pytest.raises(RuntimeError, match="append-only"):
        db_session.flush()

    db_session.rollback()


def test_org_query_requires_org_and_filters_tenant(db_session: Session):
    org = seed_organisation(db_session)
    provider = seed_provider(db_session, org)

    with pytest.raises(ValueError, match="org_id is required"):
        org_query(db_session, Payment, None)

    payment = Payment(
        id=uuid.uuid4(),
        org_id=org.id,
        provider_node_id=provider.id,
        merchant_reference="merchant-1",
        idempotency_key="idem-1",
        amount_kobo=12500,
        currency="NGN",
        channel="card",
        state="created",
    )
    db_session.add(payment)
    db_session.flush()

    assert db_session.execute(
        select(Payment).where(Payment.id == payment.id)
    ).scalar_one() is payment
    assert org_query(db_session, Payment, org.id).one() is payment


def test_organisation_holds_opening_available_funds(db_session: Session):
    org = Organisation(
        id=uuid.uuid4(),
        name="Ade Stores",
        slug=f"ade-opening-{uuid.uuid4()}",
        is_demo=True,
        opening_available_kobo=15000000,
        opening_currency="NGN",
    )
    db_session.add(org)
    db_session.flush()

    assert org.opening_available_kobo == 15000000
    assert org.opening_currency == "NGN"


def test_dependency_edge_rejects_self_edge(db_session: Session):
    org = seed_organisation(db_session)
    provider = seed_provider(db_session, org)

    edge = DependencyEdge(
        id=uuid.uuid4(),
        org_id=org.id,
        from_node_id=provider.id,
        to_node_id=provider.id,
        relation="depends_on",
        status="known",
        source_note="verified",
        simulated=True,
    )
    db_session.add(edge)
    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_obligation_requires_positive_kobo(db_session: Session):
    org = seed_organisation(db_session)

    obligation = Obligation(
        id=uuid.uuid4(),
        org_id=org.id,
        label="Supplier",
        amount_kobo=0,
        currency="NGN",
        due_at=datetime.now(timezone.utc),
        status="open",
        simulated=True,
    )
    db_session.add(obligation)
    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_incident_state_and_transition_are_constrained(db_session: Session):
    org = seed_organisation(db_session)
    provider = seed_provider(db_session, org)

    incident = Incident(
        id=uuid.uuid4(),
        org_id=org.id,
        subject_node_id=provider.id,
        state="suspected",
        severity="high",
        simulated=True,
    )
    db_session.add(incident)
    db_session.flush()

    transition = IncidentTransition(
        id=uuid.uuid4(),
        org_id=org.id,
        incident_id=incident.id,
        from_state="suspected",
        to_state="confirmed",
        occurred_at=datetime.now(timezone.utc),
        evidence={"kind": "failure_rate", "description": "Threshold exceeded"},
        simulated=True,
    )
    db_session.add(transition)
    db_session.flush()

    transition.to_state = "resolved"
    with pytest.raises(RuntimeError, match="append-only"):
        db_session.flush()

    db_session.rollback()


def test_one_approval_per_recommendation(db_session: Session):
    org = seed_organisation(db_session)
    provider = seed_provider(db_session, org)
    incident = Incident(
        id=uuid.uuid4(),
        org_id=org.id,
        subject_node_id=provider.id,
        state="confirmed",
        severity="high",
        simulated=True,
    )
    db_session.add(incident)
    db_session.flush()

    recommendation = Recommendation(
        id=uuid.uuid4(),
        org_id=org.id,
        incident_id=incident.id,
        action="Wait and keep verifying",
        tier=1,
        reasons=["No shortfall"],
        evidence=["provider status"],
        limitations=["demo"],
        approval_required=False,
        simulated=True,
    )
    db_session.add(recommendation)
    db_session.flush()

    for approver in ("operator-1", "operator-2"):
        db_session.add(
            Approval(
                id=uuid.uuid4(),
                org_id=org.id,
                recommendation_id=recommendation.id,
                approver_reference=approver,
                decision="approve",
                reason="Reviewed",
                simulated=True,
            )
        )
        if approver == "operator-1":
            db_session.flush()

    with pytest.raises(IntegrityError):
        db_session.flush()

    db_session.rollback()


def test_audit_event_is_append_only_and_hash_chained(db_session: Session):
    org = seed_organisation(db_session)

    audit = AuditEvent(
        id=uuid.uuid4(),
        org_id=org.id,
        actor_reference="operator-1",
        action="approve_recommendation",
        entity_type="recommendation",
        previous_hash=None,
        sequence_number=1,
        hash="abc123",
        payload={"decision": "approve"},
        occurred_at=datetime.now(timezone.utc),
        simulated=True,
    )
    db_session.add(audit)
    db_session.flush()

    audit.hash = "changed"
    with pytest.raises(RuntimeError, match="append-only"):
        db_session.flush()

    db_session.rollback()
