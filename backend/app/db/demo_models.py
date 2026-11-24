from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    JSON,
    String,
    Text,
    UniqueConstraint,
    event,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models import utcnow, uuid_pk


INCIDENT_STATES = (
    "suspected",
    "confirmed",
    "monitoring",
    "recovering",
    "resolved",
)


class DependencyEdge(Base):
    __tablename__ = "dependency_edges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    from_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("infra_nodes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    to_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("infra_nodes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    relation: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    source_note: Mapped[str] = mapped_column(Text, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint("status IN ('known', 'unknown')", name="ck_dependency_edges_status"),
        CheckConstraint("from_node_id <> to_node_id", name="ck_dependency_edges_not_self"),
    )


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subject_node_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("infra_nodes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    state: Mapped[str] = mapped_column(String, nullable=False, default="suspected")
    severity: Mapped[str] = mapped_column(String, nullable=False)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint(
            "state IN ('suspected', 'confirmed', 'monitoring', 'recovering', 'resolved')",
            name="ck_incidents_state",
        ),
    )


class IncidentTransition(Base):
    __tablename__ = "incident_transitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    from_state: Mapped[str] = mapped_column(String, nullable=False)
    to_state: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    evidence: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint(
            "from_state IN ('suspected', 'confirmed', 'monitoring', 'recovering', 'resolved')",
            name="ck_incident_transitions_from_state",
        ),
        CheckConstraint(
            "to_state IN ('suspected', 'confirmed', 'monitoring', 'recovering', 'resolved')",
            name="ck_incident_transitions_to_state",
        ),
    )


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String, nullable=False)
    amount_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="open")
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint("amount_kobo > 0", name="ck_obligations_amount_positive"),
        CheckConstraint("length(currency) = 3", name="ck_obligations_currency_code"),
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("incidents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    tier: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reasons: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    evidence: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    limitations: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    approval_required: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint("tier IN (1, 2, 3)", name="ck_recommendations_tier"),
    )


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    approver_reference: Mapped[str] = mapped_column(String, nullable=False)
    decision: Mapped[str] = mapped_column(String, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint(
            "recommendation_id",
            name="uq_approvals_recommendation",
        ),
        CheckConstraint(
            "decision IN ('approve', 'reject')",
            name="ck_approvals_decision",
        ),
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    actor_reference: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    previous_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    sequence_number: Mapped[int] = mapped_column(BigInteger, nullable=False)
    hash: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class ProviderCredential(Base):
    __tablename__ = "provider_credentials"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider_node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False)
    environment: Mapped[str] = mapped_column(String, nullable=False)
    secret_ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    __table_args__ = (
        UniqueConstraint("org_id", "provider_node_id", "environment", name="uq_provider_credentials_org_provider_environment"),
        CheckConstraint("environment IN ('sandbox', 'live')", name="ck_provider_credentials_environment"),
    )


class ProviderSignal(Base):
    __tablename__ = "provider_signals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider_node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False)
    provider_event_id: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    status: Mapped[str] = mapped_column(String, nullable=False)
    latency_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    raw_payload: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    __table_args__ = (
        UniqueConstraint("org_id", "provider_node_id", "provider_event_id", name="uq_provider_signals_org_provider_event"),
    )


class ProviderRequest(Base):
    __tablename__ = "provider_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False, index=True)
    provider_node_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("infra_nodes.id", ondelete="RESTRICT"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    provider_reference: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    response_summary: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class FinancialSnapshot(Base):
    __tablename__ = "financial_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False, index=True)
    opening_available_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    settled_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unresolved_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    obligations_due_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    worst_case_position_kobo: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    __table_args__ = (
        CheckConstraint("length(currency) = 3", name="ck_financial_snapshots_currency_code"),
    )


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid_pk)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="RESTRICT"), nullable=False, index=True)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recovery_probability_bps: Mapped[int] = mapped_column(BigInteger, nullable=False)
    inputs: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    result: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    __table_args__ = (
        CheckConstraint("recovery_probability_bps >= 0 AND recovery_probability_bps <= 10000", name="ck_scenario_runs_probability"),
    )


@event.listens_for(IncidentTransition, "before_update")
@event.listens_for(IncidentTransition, "before_delete")
def incident_transition_append_only(_mapper, _connection, _target) -> None:
    raise RuntimeError("incident_transitions is append-only")


@event.listens_for(AuditEvent, "before_update")
@event.listens_for(AuditEvent, "before_delete")
def audit_event_append_only(_mapper, _connection, _target) -> None:
    raise RuntimeError("audit_events is append-only")


@event.listens_for(ProviderSignal, "before_update")
@event.listens_for(ProviderSignal, "before_delete")
def provider_signal_append_only(_mapper, _connection, _target) -> None:
    raise RuntimeError("provider_signals is append-only")


@event.listens_for(ProviderRequest, "before_update")
@event.listens_for(ProviderRequest, "before_delete")
def provider_request_append_only(_mapper, _connection, _target) -> None:
    raise RuntimeError("provider_requests is append-only")


@event.listens_for(FinancialSnapshot, "before_update")
@event.listens_for(FinancialSnapshot, "before_delete")
def financial_snapshot_append_only(_mapper, _connection, _target) -> None:
    raise RuntimeError("financial_snapshots is append-only")


@event.listens_for(ScenarioRun, "before_update")
@event.listens_for(ScenarioRun, "before_delete")
def scenario_run_append_only(_mapper, _connection, _target) -> None:
    raise RuntimeError("scenario_runs is append-only")
