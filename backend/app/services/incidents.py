from __future__ import annotations

import importlib.util
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.demo_models import Incident, IncidentTransition
from app.domain.incident_states import (
    IncidentEvidence,
    IncidentState,
    transition_incident as domain_transition_incident,
)
from app.security.auth import Principal, Role, require_role
from app.security.audit import append_audit
from app.security.tenancy import require_tenant_match


def transition_incident(
    session: Session,
    principal: Principal,
    *,
    incident: Incident,
    to_state: IncidentState,
    occurred_at: datetime,
    evidence: dict[str, Any],
) -> IncidentTransition:
    require_role(principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    require_tenant_match(principal.org_id, incident.org_id)

    incident_evidence = IncidentEvidence(
        kind=str(evidence.get("kind", "provider_signal")),
        description=str(evidence.get("description", "Recorded incident evidence")),
        observed_at=occurred_at,
        source=str(evidence.get("source", "")),
    )
    transition = domain_transition_incident(
        IncidentState(incident.state),
        to_state,
        occurred_at,
        incident_evidence,
    )
    row = IncidentTransition(
        org_id=incident.org_id,
        incident_id=incident.id,
        from_state=transition.from_state.value,
        to_state=transition.to_state.value,
        occurred_at=transition.occurred_at,
        evidence=evidence,
        simulated=incident.simulated,
    )
    session.add(row)
    incident.state = to_state.value
    if to_state is IncidentState.RESOLVED:
        incident.resolved_at = occurred_at
    session.flush()
    append_audit(
        session,
        principal_org_id=principal.org_id,
        org_id=incident.org_id,
        actor=principal.user_id,
        action="transition_incident",
        entity_type="incident",
        entity_id=incident.id,
        payload={"from": row.from_state, "to": row.to_state, "evidence": evidence},
        simulated=incident.simulated,
    )
    session.commit()
    return row


def ingest_detection(
    session: Session,
    principal: Principal,
    *,
    org_id: UUID,
    subject_node_id: UUID,
    events: list[dict[str, Any]],
    timeout_confirm_count: int = 2,
    recovery_streak_needed: int = 2,
) -> list[Incident]:
    require_role(principal, {Role.OPERATOR, Role.APPROVER, Role.ADMIN})
    require_tenant_match(principal.org_id, org_id)

    simulator_dir = Path(__file__).resolve().parents[2] / "simulator"
    module_path = simulator_dir / "detect_incidents.py"
    sys.path.insert(0, str(simulator_dir))
    try:
        spec = importlib.util.spec_from_file_location("moneqra_detect_incidents", module_path)
        if spec is None or spec.loader is None:
            raise RuntimeError("detection module could not be loaded")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        detected = module.detect_incidents(
            events=events,
            timeout_confirm_count=timeout_confirm_count,
            recovery_streak_needed=recovery_streak_needed,
            assumed_recovery_pct=60.0,
        )
    finally:
        sys.path.pop(0)

    incident_rows: list[Incident] = []
    for item in detected["incidents"]:
        state_by_status = {
            "SUSPECTED": IncidentState.SUSPECTED,
            "CONFIRMED": IncidentState.CONFIRMED,
            "RESOLVED": IncidentState.RESOLVED,
        }
        state = state_by_status[str(item["status"]).upper()]
        occurred_at = datetime.fromisoformat(
            str(item["detected_at"]).replace("Z", "+00:00")
        )
        row = Incident(
            org_id=org_id,
            subject_node_id=subject_node_id,
            state=state.value,
            severity=str(item["severity"]).lower(),
            opened_at=occurred_at,
            resolved_at=occurred_at if state is IncidentState.RESOLVED else None,
            simulated=True,
        )
        session.add(row)
        session.flush()
        incident_rows.append(row)
        append_audit(
            session,
            principal_org_id=principal.org_id,
            org_id=org_id,
            actor=principal.user_id,
            action="open_or_update_incident",
            entity_type="incident",
            entity_id=row.id,
            payload={"detection": item},
            simulated=True,
        )
    session.commit()
    return incident_rows
