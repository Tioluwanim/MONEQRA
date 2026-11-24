from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorDetail(SchemaModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(SchemaModel):
    error: ErrorDetail
    request_id: str


class HealthResponse(SchemaModel):
    status: str = "healthy"
    simulation_mode: bool


class PaymentEventInput(SchemaModel):
    provider_event_id: str = Field(min_length=1)
    provider_node_id: UUID
    provider_reference: str = Field(min_length=1)
    occurred_at: datetime
    received_at: datetime | None = None
    raw_status: str = Field(min_length=1)
    normalised_state: str
    evidence_kind: str
    evidence_source: str = ""
    evidence_reference: str = ""
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    simulated: bool = True

    @field_validator("occurred_at", "received_at")
    @classmethod
    def timezone_aware(cls, value: datetime | None) -> datetime | None:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("timestamp must be timezone-aware")
        return value

    @field_validator("normalised_state")
    @classmethod
    def payment_state(cls, value: str) -> str:
        allowed = {"created", "pending", "unknown", "succeeded", "settled", "failed", "reversed"}
        if value not in allowed:
            raise ValueError("invalid payment state")
        return value

    @field_validator("evidence_kind")
    @classmethod
    def evidence_kind(cls, value: str) -> str:
        allowed = {
            "provider_status_check",
            "provider_webhook",
            "manual_review",
            "timeout_signal",
        }
        if value not in allowed:
            raise ValueError("invalid evidence kind")
        return value


class ProviderSignalInput(SchemaModel):
    provider_node_id: UUID | None = None
    provider_key: str | None = None
    provider_event_id: str = Field(min_length=1)
    occurred_at: datetime
    status: str = Field(min_length=1)
    latency_ms: StrictInt | None = Field(default=None, ge=0)
    raw_payload: dict[str, Any]
    simulated: bool = True

    @field_validator("occurred_at")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must be timezone-aware")
        return value


class EventIngestionResult(SchemaModel):
    event_id: UUID
    duplicate: bool
    applied: bool
    reason: str | None = None
    new_state: str | None = None


class PaymentResponse(SchemaModel):
    id: UUID
    org_id: UUID
    provider_node_id: UUID
    provider_reference: str
    amount_kobo: StrictInt = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    state: str
    settled_at: datetime | None = None
    retry_eligible: bool
    simulated: bool


class PaymentDetailResponse(PaymentResponse):
    events: list[PaymentEventInput]


class PaymentListResponse(SchemaModel):
    items: list[PaymentResponse]
    next_cursor: str | None = None


class PaymentVerificationResult(SchemaModel):
    payment_id: UUID
    evidence_created: bool
    applied: bool
    new_state: str
    message: str


class IncidentTransitionResponse(SchemaModel):
    from_state: str
    to_state: str
    occurred_at: datetime
    evidence: dict[str, Any]


class IncidentResponse(SchemaModel):
    id: UUID
    org_id: UUID
    subject_node_id: UUID
    state: str
    severity: str
    opened_at: datetime
    resolved_at: datetime | None = None
    simulated: bool


class IncidentDetailResponse(IncidentResponse):
    transitions: list[IncidentTransitionResponse]


class IncidentListResponse(SchemaModel):
    items: list[IncidentResponse]


class DependencyNode(SchemaModel):
    id: UUID
    org_id: UUID
    kind: str
    key: str
    display_name: str


class DependencyEdgeResponse(SchemaModel):
    from_node_id: UUID
    to_node_id: UUID
    status: str
    source_note: str

    @field_validator("status")
    @classmethod
    def known_or_unknown(cls, value: str) -> str:
        if value not in {"known", "unknown"}:
            raise ValueError("invalid dependency edge status")
        return value


class DependencyGraphResponse(SchemaModel):
    nodes: list[DependencyNode]
    edges: list[DependencyEdgeResponse]


class ObligationResponse(SchemaModel):
    id: UUID
    org_id: UUID
    label: str
    amount_kobo: StrictInt = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)
    due_at: datetime
    status: str
    simulated: bool


class ObligationListResponse(SchemaModel):
    items: list[ObligationResponse]


class AssumptionResponse(SchemaModel):
    name: str
    description: str
    value: Any


class ScenarioReportResponse(SchemaModel):
    available_funds_kobo: StrictInt
    obligations_due_kobo: StrictInt
    worst_case_position_kobo: StrictInt
    scenario_recovery_kobo: StrictInt
    scenario_position_kobo: StrictInt
    inputs: list[str]
    assumptions: list[AssumptionResponse]
    limitations: list[str]


class LiquidityReportResponse(ScenarioReportResponse):
    recovery_probability_bps: StrictInt = Field(ge=0, le=10000)
    simulated: bool


class DemoScenariosResponse(SchemaModel):
    no_recovery: ScenarioReportResponse
    assumed_recovery: ScenarioReportResponse
    full_recovery: ScenarioReportResponse


class ScenarioRequest(SchemaModel):
    deadline: datetime
    recovery_probability_bps: StrictInt = Field(ge=0, le=10000)

    @field_validator("deadline")
    @classmethod
    def timezone_aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("deadline must be timezone-aware")
        return value


class RecommendationResponse(SchemaModel):
    id: UUID
    org_id: UUID
    incident_id: UUID
    action: str
    tier: int = Field(ge=1, le=2)
    reasons: list[str]
    evidence: list[str]
    limitations: list[str]
    approval_required: bool
    simulated: bool


class RecommendationListResponse(SchemaModel):
    items: list[RecommendationResponse]


class RecommendationDecision(SchemaModel):
    decision: str
    reason: str = ""

    @field_validator("decision")
    @classmethod
    def approve_or_reject(cls, value: str) -> str:
        if value not in {"approve", "reject"}:
            raise ValueError("decision must be approve or reject")
        return value


class ApprovalResponse(SchemaModel):
    id: UUID
    org_id: UUID
    recommendation_id: UUID
    approver_reference: str
    decision: str
    reason: str | None = None
    decided_at: datetime
    simulated: bool


class AuditRecordResponse(SchemaModel):
    id: UUID
    org_id: UUID
    actor: str
    action: str
    entity: dict[str, Any]
    occurred_at: datetime
    previous_hash: str | None
    hash: str
    simulated: bool


class AuditListResponse(SchemaModel):
    items: list[AuditRecordResponse]


class SimulatorSeedRequest(SchemaModel):
    branch: str = "independent"
    reset: bool = True

    @field_validator("branch")
    @classmethod
    def independent_or_shared(cls, value: str) -> str:
        if value not in {"independent", "shared"}:
            raise ValueError("branch must be independent or shared")
        return value


class SimulatorSeedResult(SchemaModel):
    scenario: str = "ade_stores"
    branch: str
    simulated: bool = True
    opening_available_kobo: StrictInt = 15000000
    settled_kobo: StrictInt = 84000000
    unknown_kobo: StrictInt = 36000000
    obligation_kobo: StrictInt = 110000000
