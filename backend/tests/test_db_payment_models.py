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
