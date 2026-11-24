import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session
from dataclasses import replace

import app.apis.routes as routes
from app.apis.routes import db_session, router
from app.db.base import Base


@pytest.fixture
def api():
    import app.db.demo_models  # noqa: F401
    import app.db.payments  # noqa: F401

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    app = FastAPI()
    app.include_router(router)

    def override_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[db_session] = override_db
    original_settings = routes.settings
    routes.settings = replace(original_settings, simulation_mode=True)
    with TestClient(app) as client:
        yield client
    routes.settings = original_settings
    engine.dispose()


def test_health_is_public(api):
    response = api.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_fixed_demo_users_and_role_gate(api):
    unauthorized = api.get("/v1/payments")
    assert unauthorized.status_code == 401

    headers = {"Authorization": "Bearer demo-viewer-key"}
    users = api.get("/v1/demo/users", headers=headers)
    assert users.status_code == 200
    assert {u["role"] for u in users.json()["users"]} == {
        "viewer",
        "operator",
        "approver",
        "admin",
    }


def test_seed_endpoint_is_simulation_only_and_seeds_exact_numbers(api):
    operator = {"Authorization": "Bearer demo-operator-key"}
    seed = api.post(
        "/v1/simulator/seed",
        headers=operator,
        json={"branch": "independent", "reset": True},
    )
    assert seed.status_code == 200
    assert seed.json()["opening_available_kobo"] == 15000000
    assert seed.json()["settled_kobo"] == 84000000
    assert seed.json()["unknown_kobo"] == 36000000
    assert seed.json()["obligation_kobo"] == 110000000

    viewer = {"Authorization": "Bearer demo-viewer-key"}
    payments = api.get("/v1/payments", headers=viewer)
    assert payments.status_code == 200
    assert len(payments.json()["items"]) == 40
    unknown = next(item for item in payments.json()["items"] if item["state"] == "unknown")
    event = {
        "provider_event_id": "ade-timeout-1",
        "provider_node_id": unknown["provider_node_id"],
        "provider_reference": unknown["provider_reference"],
        "occurred_at": "2026-11-19T16:30:00+00:00",
        "raw_status": "TIMEOUT",
        "normalised_state": "unknown",
        "evidence_kind": "timeout_signal",
        "evidence_source": "simulator",
        "evidence_reference": "ade-timeout-1",
        "raw_payload": {"status": "TIMEOUT"},
        "simulated": True,
    }
    timeout = api.post("/v1/events/payments", headers=viewer, json=event)
    assert timeout.status_code == 200
    assert timeout.json()["applied"] is False
    assert timeout.json()["new_state"] == "unknown"
    duplicate = api.post("/v1/events/payments", headers=viewer, json=event)
    assert duplicate.status_code == 200
    assert duplicate.json()["duplicate"] is True
    impact = api.get(
        "/v1/financial-impact",
        headers=viewer,
        params={
            "deadline": "2026-11-19T17:00:00+00:00",
            "recovery_probability_bps": 6000,
        },
    )
    assert impact.status_code == 200
    assert impact.json()["worst_case_position_kobo"] == -11000000
    assert impact.json()["scenario_position_kobo"] == 10600000
    assert impact.json()["full_recovery"]["scenario_position_kobo"] == 25000000

    verified = api.post(
        f"/v1/payments/{unknown['id']}/verify",
        headers={"Authorization": "Bearer demo-operator-key"},
    )
    assert verified.status_code == 200
    assert verified.json()["evidence_created"] is True
    assert verified.json()["applied"] is True
    assert verified.json()["new_state"] == "succeeded"



def test_non_approver_cannot_decide_recommendation(api):
    recommendation_id = uuid.uuid4()
    response = api.post(
        f"/v1/recommendations/{recommendation_id}/decision",
        headers={"Authorization": "Bearer demo-operator-key"},
        json={"decision": "approve"},
    )
    assert response.status_code == 403


def test_shared_seed_branch_is_simulated(api):
    response = api.post(
        "/v1/simulator/seed",
        headers={"Authorization": "Bearer demo-operator-key"},
        json={"branch": "shared", "reset": True},
    )
    assert response.status_code == 200
    assert response.json()["branch"] == "shared"
    assert response.json()["simulated"] is True

    incidents = api.get(
        "/v1/incidents",
        headers={"Authorization": "Bearer demo-viewer-key"},
    )
    assert incidents.status_code == 200
    assert len(incidents.json()["items"]) == 1
    recommendations = api.get(
        "/v1/recommendations",
        headers={"Authorization": "Bearer demo-viewer-key"},
    )
    assert recommendations.status_code == 200
    assert len(recommendations.json()["items"]) == 1
    assert "Withhold reroute" in recommendations.json()["items"][0]["action"]


def test_provider_signal_and_scenario_routes(api):
    seed = api.post(
        "/v1/simulator/seed",
        headers={"Authorization": "Bearer demo-operator-key"},
        json={"branch": "independent", "reset": True},
    )
    assert seed.status_code == 200

    signal = {
        "provider_key": "provider-a",
        "provider_event_id": "sim-signal-1",
        "occurred_at": "2026-11-19T16:30:00+00:00",
        "status": "degraded",
        "latency_ms": 1500,
        "raw_payload": {"status": "degraded"},
        "simulated": True,
    }
    ingested = api.post(
        "/v1/events/signals",
        headers={"Authorization": "Bearer demo-operator-key"},
        json=signal,
    )
    assert ingested.status_code == 200
    assert ingested.json()["duplicate"] is False
    duplicate = api.post(
        "/v1/events/signals",
        headers={"Authorization": "Bearer demo-operator-key"},
        json=signal,
    )
    assert duplicate.status_code == 200
    assert duplicate.json()["duplicate"] is True

    scenario = api.post(
        "/v1/scenarios",
        headers={"Authorization": "Bearer demo-operator-key"},
        json={
            "deadline": "2026-11-19T17:00:00+00:00",
            "recovery_probability_bps": 6000,
        },
    )
    assert scenario.status_code == 200
    assert scenario.json()["assumed_recovery"]["scenario_position_kobo"] == 10600000
    assert scenario.json()["full_recovery"]["scenario_position_kobo"] == 25000000
