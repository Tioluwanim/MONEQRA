from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    JSON,
    String,
    text,
    Text,
    UniqueConstraint,
    event,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models import utcnow, uuid_pk


PAYMENT_STATES = (
    "created",
    "pending",
    "unknown",
    "succeeded",
    "settled",
    "failed",
    "reversed",
)

PAYMENT_STATE_CHECK = (
    "state IN ('created', 'pending', 'unknown', 'succeeded', "
    "'settled', 'failed', 'reversed')"
)

EVIDENCE_KINDS = (
    "provider_status_check",
    "provider_webhook",
    "timeout_signal",
    "manual_review",
)


class InfraNode(Base):
    __tablename__ = "infra_nodes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String, nullable=False)
    key: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("org_id", "key", name="uq_infra_nodes_org_key"),
        CheckConstraint(
            "kind IN ('merchant', 'provider', 'processor', 'bank', 'switch', 'rail')",
            name="ck_infra_nodes_kind",
        ),
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    provider_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("infra_nodes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    merchant_reference: Mapped[str] = mapped_column(String, nullable=False)
    provider_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    channel: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False, default="created")
    state_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    settled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expected_settlement_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    affected_by_incident_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint("amount_kobo > 0", name="ck_payments_amount_positive"),
        CheckConstraint("length(currency) = 3", name="ck_payments_currency_code"),
        CheckConstraint(PAYMENT_STATE_CHECK, name="ck_payments_state"),
        UniqueConstraint(
            "org_id",
            "idempotency_key",
            name="uq_payments_org_idempotency",
        ),
        Index(
            "uq_payments_org_provider_provider_reference",
            "org_id",
            "provider_node_id",
            "provider_reference",
            unique=True,
            postgresql_where=text("provider_reference IS NOT NULL"),
        ),
        Index("ix_payments_org_state", "org_id", "state"),
        Index(
            "ix_payments_org_provider_created",
            "org_id",
            "provider_node_id",
            "created_at",
        ),
    )

class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    payment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=True,
    )
    provider_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("infra_nodes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    provider_event_id: Mapped[str] = mapped_column(String, nullable=False)
    raw_status: Mapped[str] = mapped_column(String, nullable=False)
    normalised_state: Mapped[str] = mapped_column(String, nullable=False)
    applied: Mapped[bool] = mapped_column(Boolean, nullable=False)
    apply_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_kind: Mapped[str] = mapped_column(String, nullable=False)
    evidence_source: Mapped[str] = mapped_column(String, nullable=False)
    evidence_reference: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    raw_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint(
            "org_id",
            "provider_node_id",
            "provider_event_id",
            name="uq_payment_events_org_provider_event",
        ),
        CheckConstraint(PAYMENT_STATE_CHECK.replace("state", "normalised_state"), name="ck_payment_events_normalised_state"),
        CheckConstraint(
            "evidence_kind IN ('provider_status_check', 'provider_webhook', "
            "'timeout_signal', 'manual_review')",
            name="ck_payment_events_evidence_kind",
        ),
        Index(
            "ix_payment_events_org_payment_occurred",
            "org_id",
            "payment_id",
            "occurred_at",
        ),
    )


@event.listens_for(PaymentEvent, "before_update")
def payment_event_reject_update(_mapper: object, _connection: object, _target: PaymentEvent) -> None:
    raise RuntimeError("payment_events is append-only")


@event.listens_for(PaymentEvent, "before_delete")
def payment_event_reject_delete(_mapper: object, _connection: object, _target: PaymentEvent) -> None:
    raise RuntimeError("payment_events is append-only")
