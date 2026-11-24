import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Organisation
from app.db.payments import InfraNode, Payment, PaymentEvent
from app.db.demo_models import Recommendation
from app.adapters.provider import FakeProviderAdapter, ProviderError
from app.domain.financial_engine import ScenarioReport
from app.domain.dependency import IndependenceVerdict
from app.domain.money import Money
from app.security.auth import Principal, Role
from app.services.payments import ingest_payment_event
from app.services.financial import independence_recommendation
from app.services.approvals import decide_recommendation
from app.services.verification import verify_payment


UTC = timezone.utc


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


def seed(session: Session):
    org_id = uuid.uuid4()
    org = Organisation(
        id=org_id,
        name="Ade Stores",
        slug=f"ade-{org_id}",
        is_demo=True,
        opening_available_kobo=15000000,
        opening_currency="NGN",
    )
    session.add(org)
    provider = InfraNode(
        id=uuid.uuid4(),
        org_id=org_id,
        kind="provider",
        key="provider-a",
        display_name="Provider A",
    )
    session.add(provider)
    payment = Payment(
        id=uuid.uuid4(),
        org_id=org_id,
        provider_node_id=provider.id,
        merchant_reference="ADE-ORD-000101",
        provider_reference="txn-unknown",
        idempotency_key="idem-unknown",
        amount_kobo=3000000,
        currency="NGN",
        channel="card",
        state="unknown",
        simulated=True,
    )
    session.add(payment)
    session.flush()
    principal = Principal("demo-operator", str(org_id), Role.OPERATOR)
    return org, provider, payment, principal


def test_ingest_duplicate_event_is_idempotent(session):
    org, provider, payment, principal = seed(session)
    occurred = datetime(2026, 11, 20, 14, 10, tzinfo=UTC)
    kwargs = dict(
        org_id=org.id,
        provider_node_id=provider.id,
        provider_event_id="evt-1",
        provider_reference="txn-unknown",
        occurred_at=occurred,
        raw_status="TIMEOUT",
        normalised_state="unknown",
        evidence_kind="provider_webhook",
        evidence_source="provider",
        evidence_reference="evt-1",
        raw_payload={"status": "TIMEOUT"},
        simulated=True,
    )

    first = ingest_payment_event(session, principal, **kwargs)
    second = ingest_payment_event(session, principal, **kwargs)

    assert first["applied"] is False
    assert first["reason"] == "duplicate event for the same payment state"
    assert second["duplicate"] is True
    assert session.query(PaymentEvent).filter(
        PaymentEvent.provider_event_id == "evt-1"
    ).count() == 1


def test_timeout_leaves_unknown_and_is_not_retry_eligible(session):
    org, provider, payment, principal = seed(session)
    result = ingest_payment_event(
        session,
        principal,
        org_id=org.id,
        provider_node_id=provider.id,
        provider_event_id="evt-timeout",
        provider_reference="txn-unknown",
        occurred_at=datetime(2026, 11, 20, 14, 10, tzinfo=UTC),
        raw_status="TIMEOUT",
        normalised_state="unknown",
        evidence_kind="timeout_signal",
        evidence_source="detector",
        evidence_reference="timeout-1",
        raw_payload={"status": "TIMEOUT"},
        simulated=True,
    )

    assert result["applied"] is False
    assert session.get(Payment, payment.id).state == "unknown"


def test_provider_verification_error_leaves_payment_unknown(session):
    org, provider, payment, principal = seed(session)
    result = verify_payment(
        session,
        principal,
        payment_id=payment.id,
        adapter=FakeProviderAdapter(),
    )
    assert result["evidence_created"] is False
    assert result["applied"] is False
    assert result["new_state"] == "unknown"


def test_fake_provider_enforces_allowlist_and_rate_limit():
    with pytest.raises(ValueError, match="allow-listed"):
        FakeProviderAdapter(host="https://untrusted.example")

    adapter = FakeProviderAdapter(min_interval_seconds=60)
    with pytest.raises(ProviderError, match="unavailable"):
        adapter.check_payment_status("unknown-reference")


def test_cross_tenant_ingest_is_denied(session):
    org, provider, payment, principal = seed(session)
    other_org = uuid.uuid4()

    with pytest.raises(PermissionError, match="cross-tenant"):
        ingest_payment_event(
            session,
            principal,
            org_id=other_org,
            provider_node_id=provider.id,
            provider_event_id="evt-cross",
            provider_reference="txn-unknown",
            occurred_at=datetime(2026, 11, 20, 14, 10, tzinfo=UTC),
            raw_status="SUCCESS",
            normalised_state="succeeded",
            evidence_kind="provider_webhook",
            evidence_source="provider",
            evidence_reference="evt-cross",
            raw_payload={},
            simulated=True,
        )


def test_independent_recommendation_and_non_approver_approval(session):
    org, provider, payment, principal = seed(session)
    incident_id = uuid.uuid4()
    report = ScenarioReport(
        available_funds=Money(99000000),
        obligations_due=Money(110000000),
        worst_case_position=Money(-11000000),
        scenario_recovery=Money(21600000),
        scenario_position=Money(10600000),
        inputs=("demo",),
        assumptions=(),
        limitations=("demo",),
    )

    recommendation = independence_recommendation(
        session,
        principal,
        org_id=org.id,
        incident_id=incident_id,
        report=report,
        independence=IndependenceVerdict.INDEPENDENT,
    )
    assert recommendation.action.startswith("Route new payments")

    with pytest.raises(PermissionError):
        decide_recommendation(
            session,
            principal,
            org_id=org.id,
            recommendation_id=recommendation.id,
            decision="approve",
        )

    approver = Principal("demo-approver", str(org.id), Role.APPROVER)
    approval = decide_recommendation(
        session,
        approver,
        org_id=org.id,
        recommendation_id=recommendation.id,
        decision="approve",
    )
    assert approval.decision == "approve"

    with pytest.raises(ValueError, match="already has"):
        decide_recommendation(
            session,
            approver,
            org_id=org.id,
            recommendation_id=recommendation.id,
            decision="reject",
            reason="duplicate decision",
        )
