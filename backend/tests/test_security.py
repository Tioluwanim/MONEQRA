import hashlib
import hmac
import time
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, delete, update
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import Organisation
from app.db.demo_models import AuditEvent
from app.security.webhooks import WebhookVerifier
from app.security.tenancy import org_scoped_query, require_tenant_match
from app.security.auth import (
    DemoAuth,
    Principal,
    Role,
    require_approval_role,
)
from app.security.audit import append_audit, verify_audit_chain
from app.security.redaction import redact_secrets
from app.security.simulation import require_simulation_mode


UTC = timezone.utc


def signed(raw_body: bytes, timestamp: str, secret: str) -> str:
    canonical = timestamp.encode("ascii") + b"." + raw_body
    return hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()


def test_webhook_forged_and_tampered_body_rejected():
    body = b'{"status":"succeeded"}'
    now = time.time()
    timestamp = str(int(now))
    secret = "provider-secret"
    verifier = WebhookVerifier(300)

    forged = verifier.verify(body, "sha256=deadbeef", timestamp, "provider", secret, "evt-1", now)
    assert not forged.valid
    assert "signature" in forged.reason

    valid = signed(body, timestamp, secret)
    tampered = verifier.verify(b'{"status":"failed"}', valid, timestamp, "provider", secret, "evt-2", now)
    assert not tampered.valid


def test_webhook_missing_stale_and_replayed_rejected():
    body = b'{}'
    now = 2000000000
    timestamp = str(now)
    secret = "secret"
    signature = signed(body, timestamp, secret)
    verifier = WebhookVerifier(300)

    missing = verifier.verify(body, None, timestamp, "provider", secret, "evt", now)
    assert missing.reason == "missing webhook signature"

    stale = verifier.verify(body, signature, str(now - 301), "provider", secret, "evt-2", now)
    assert stale.reason == "stale webhook timestamp"

    first = verifier.verify(body, signature, timestamp, "provider", secret, "evt-1", now)
    replay = verifier.verify(body, signature, timestamp, "provider", secret, "evt-1", now)
    assert first.valid
    assert replay.reason == "replayed webhook event"


@pytest.fixture
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        yield db
    engine.dispose()


def test_tenant_query_and_cross_tenant_access():
    org_id = uuid.uuid4()
    assert org_id is not None

    with pytest.raises(ValueError, match="org_id is required"):
        org_scoped_query(None, Organisation, None)
    with pytest.raises(PermissionError, match="cross-tenant"):
        require_tenant_match(org_id, uuid.uuid4())


def test_fixed_demo_roles_and_approval_permission():
    auth = DemoAuth("test-secret")
    viewer = auth.authenticate("demo-viewer-key")
    approver = auth.authenticate("demo-approver-key")
    admin = auth.authenticate("demo-admin-key")

    assert viewer.role is Role.VIEWER
    require_approval_role(approver)
    require_approval_role(admin)
    with pytest.raises(PermissionError):
        require_approval_role(viewer)


def test_signed_tokens():
    auth = DemoAuth("test-secret")
    principal = Principal("u1", "org-1", Role.OPERATOR)
    token = auth.issue_token(principal)
    assert auth.authenticate(token) == principal

    expired_payload = principal
    with pytest.raises(PermissionError):
        auth.authenticate(token + "tampered")


def test_audit_append_verify_and_edit_tamper(session):
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Ade", slug=f"ade-{org_id}", is_demo=True)
    session.add(org)
    session.flush()

    first = append_audit(
        session,
        principal_org_id=org_id,
        org_id=org_id,
        actor="demo-operator",
        action="seed",
        entity_type="organisation",
        entity_id=org_id,
        payload={"branch": "independent"},
        simulated=True,
    )
    second = append_audit(
        session,
        principal_org_id=org_id,
        org_id=org_id,
        actor="demo-approver",
        action="approve",
        entity_type="recommendation",
        entity_id=uuid.uuid4(),
        payload={"decision": "approve"},
        simulated=True,
    )
    head = second.hash

    assert verify_audit_chain(session, org_id=org_id, principal_org_id=org_id)
    assert verify_audit_chain(
        session,
        org_id=org_id,
        principal_org_id=org_id,
        expected_head_hash=head,
    )

    session.execute(
        update(AuditEvent)
        .where(AuditEvent.id == first.id)
        .values(action="edited")
    )
    session.commit()
    assert not verify_audit_chain(session, org_id=org_id, principal_org_id=org_id)


def test_audit_delete_reorder_and_cross_tenant(session):
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Ade", slug=f"ade-{org_id}", is_demo=True)
    session.add(org)
    session.flush()

    first = append_audit(
        session,
        principal_org_id=org_id,
        org_id=org_id,
        actor="demo",
        action="one",
        entity_type="test",
        entity_id=None,
        payload={"n": 1},
    )
    second = append_audit(
        session,
        principal_org_id=org_id,
        org_id=org_id,
        actor="demo",
        action="two",
        entity_type="test",
        entity_id=None,
        payload={"n": 2},
    )

    assert verify_audit_chain(
        session,
        org_id=org_id,
        principal_org_id=org_id,
        expected_head_hash=second.hash,
    )
    with pytest.raises(PermissionError):
        append_audit(
            session,
            principal_org_id=uuid.uuid4(),
            org_id=org_id,
            actor="demo",
            action="cross",
            entity_type="test",
            entity_id=None,
            payload={},
        )

    session.execute(
        update(AuditEvent)
        .where(AuditEvent.id == first.id)
        .values(sequence_number=2)
    )
    session.execute(
        update(AuditEvent)
        .where(AuditEvent.id == second.id)
        .values(sequence_number=1)
    )
    session.commit()
    assert not verify_audit_chain(session, org_id=org_id, principal_org_id=org_id)


def test_audit_delete_middle_detected(session):
    org_id = uuid.uuid4()
    org = Organisation(id=org_id, name="Ade", slug=f"ade-{org_id}", is_demo=True)
    session.add(org)
    session.flush()

    first = append_audit(
        session, principal_org_id=org_id, org_id=org_id,
        actor="demo", action="one", entity_type="test",
        entity_id=None, payload={"n": 1},
    )
    second = append_audit(
        session, principal_org_id=org_id, org_id=org_id,
        actor="demo", action="two", entity_type="test",
        entity_id=None, payload={"n": 2},
    )
    head = second.hash

    session.execute(delete(AuditEvent).where(AuditEvent.id == first.id))
    session.commit()
    assert not verify_audit_chain(
        session,
        org_id=org_id,
        principal_org_id=org_id,
        expected_head_hash=head,
    )


def test_redaction_simulation_guard_and_secrets():
    value = {
        "authorization": "Bearer secret",
        "provider_secret": "abc",
        "safe": "visible",
        "nested": {"api_key": "xyz"},
    }
    redacted = redact_secrets(value)
    assert redacted["authorization"] == "[REDACTED]"
    assert redacted["provider_secret"] == "[REDACTED]"
    assert redacted["nested"]["api_key"] == "[REDACTED]"
    assert "abc" not in str(redacted)

    require_simulation_mode(True)
    with pytest.raises(PermissionError, match="simulation mode"):
        require_simulation_mode(False)
