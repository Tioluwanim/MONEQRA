from datetime import datetime, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas import (
    PaymentEventInput,
    PaymentResponse,
    ProviderSignalInput,
    RecommendationDecision,
    ScenarioRequest,
    SimulatorSeedRequest,
)


UTC = timezone.utc


def test_payment_event_schema_accepts_timezone_aware_canonical_event():
    event = PaymentEventInput(
        provider_event_id="evt-1",
        provider_node_id=uuid4(),
        provider_reference="txn-1",
        occurred_at=datetime(2026, 11, 20, 17, 0, tzinfo=UTC),
        raw_status="SUCCESS",
        normalised_state="settled",
        evidence_kind="provider_webhook",
        evidence_source="paystack",
        evidence_reference="evt-1",
        raw_payload={"status": "SUCCESS"},
        simulated=True,
    )

    assert event.normalised_state == "settled"


def test_payment_event_schema_rejects_naive_timestamp_and_unknown_state():
    with pytest.raises(ValidationError, match="timezone-aware"):
        PaymentEventInput(
            provider_event_id="evt-1",
            provider_node_id=uuid4(),
            provider_reference="txn-1",
            occurred_at=datetime(2026, 11, 20, 17, 0),
            raw_status="SUCCESS",
            normalised_state="settled",
            evidence_kind="provider_webhook",
        )

    with pytest.raises(ValidationError, match="invalid payment state"):
        PaymentEventInput(
            provider_event_id="evt-1",
            provider_node_id=uuid4(),
            provider_reference="txn-1",
            occurred_at=datetime(2026, 11, 20, 17, 0, tzinfo=UTC),
            raw_status="SUCCESS",
            normalised_state="charged",
            evidence_kind="provider_webhook",
        )


@pytest.mark.parametrize("amount", [150.0, 150.5, True])
def test_money_schema_rejects_float_and_bool_kobo(amount):
    with pytest.raises(ValidationError):
        PaymentResponse(
            id=uuid4(),
            org_id=uuid4(),
            provider_node_id=uuid4(),
            provider_reference="txn-1",
            amount_kobo=amount,
            currency="NGN",
            state="settled",
            retry_eligible=False,
            simulated=True,
        )


def test_positive_kobo_and_valid_currency():
    payment = PaymentResponse(
        id=uuid4(),
        org_id=uuid4(),
        provider_node_id=uuid4(),
        provider_reference="txn-1",
        amount_kobo=84000000,
        currency="NGN",
        state="settled",
        retry_eligible=False,
        simulated=True,
    )
    assert payment.amount_kobo == 84000000

    with pytest.raises(ValidationError):
        PaymentResponse(
            id=uuid4(),
            org_id=uuid4(),
            provider_node_id=uuid4(),
            provider_reference="txn-1",
            amount_kobo=0,
            currency="NGN",
            state="settled",
            retry_eligible=False,
            simulated=True,
        )


@pytest.mark.parametrize("probability", [-1, 10001, 6000.0, True])
def test_scenario_schema_rejects_invalid_basis_points(probability):
    with pytest.raises(ValidationError):
        ScenarioRequest(
            deadline=datetime(2026, 11, 20, 17, 0, tzinfo=UTC),
            recovery_probability_bps=probability,
        )


def test_simulator_branch_and_decision_enums():
    seed = SimulatorSeedRequest(branch="shared", reset=True)
    assert seed.branch == "shared"

    decision = RecommendationDecision(decision="reject", reason="not independent")
    assert decision.decision == "reject"

    with pytest.raises(ValidationError):
        SimulatorSeedRequest(branch="unknown")
    with pytest.raises(ValidationError):
        RecommendationDecision(decision="pending")


def test_provider_signal_rejects_float_latency():
    with pytest.raises(ValidationError):
        ProviderSignalInput(
            provider_node_id=uuid4(),
            provider_event_id="evt-1",
            occurred_at=datetime(2026, 11, 20, 17, 0, tzinfo=UTC),
            status="degraded",
            latency_ms=250.5,
            raw_payload={},
            simulated=True,
        )
