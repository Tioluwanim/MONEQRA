from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session


def org_scoped_query(session: Session, model: type[Any], org_id: UUID | str):
    if org_id is None:
        raise ValueError("org_id is required")
    if not hasattr(model, "org_id"):
        raise TypeError(f"{model.__name__} is not organisation-scoped")
    return session.query(model).filter(model.org_id == org_id)


def require_tenant_match(principal_org_id: UUID | str, entity_org_id: UUID | str) -> None:
    if principal_org_id is None or entity_org_id is None:
        raise ValueError("org_id is required")
    if str(principal_org_id) != str(entity_org_id):
        raise PermissionError("cross-tenant access denied")
