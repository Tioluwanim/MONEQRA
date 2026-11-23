import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.apis.routes import db_session, router
from app.config import settings
from app.db.base import Base


@pytest.fixture
def api():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    app = FastAPI()
    app.include_router(router)

    def override_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[db_session] = override_db
    original = settings.simulation_mode
    settings.simulation_mode = True
    with TestClient(app) as client:
        yield client
    settings.simulation_mode = original
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

    payments = api.get("/v1/payments", headers={"Authorization": "Bearer demo-viewer-key"})
    assert payments.status_code == 200
    assert len(payments.json()["items"]) == 40

    obligations = api.get(
        "/v1/obligations",
        headers={"Authorization": "Bearer demo-viewer-key"},
    )
    assert obligations.status_code == 200
    assert obligations.json()["items"][0]["amount_kobo"] == 110000000


def test_non_approver_cannot_decide_recommendation(api):
    recommendation_id = uuid.uuid4()
    response = api.post(
        f"/v1/recommendations/{recommendation_id}/decision",
        headers={"Authorization": "Bearer demo-operator-key"},
        json={"decision": "approve"},
    )
    assert response.status_code == 403
