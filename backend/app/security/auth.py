from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from enum import Enum
from typing import Iterable


class Role(str, Enum):
    VIEWER = "viewer"
    OPERATOR = "operator"
    APPROVER = "approver"
    ADMIN = "admin"


@dataclass(frozen=True)
class Principal:
    user_id: str
    org_id: str
    role: Role


class DemoAuth:
    def __init__(self, secret: str, ttl_seconds: int = 3600) -> None:
        if not secret:
            raise ValueError("authentication secret is required")
        self.secret = secret
        self.ttl_seconds = ttl_seconds
        demo_org_id = "00000000-0000-0000-0000-000000000001"
        self.fixed_users = {
            "demo-viewer-key": Principal("demo-viewer", demo_org_id, Role.VIEWER),
            "demo-operator-key": Principal("demo-operator", demo_org_id, Role.OPERATOR),
            "demo-approver-key": Principal("demo-approver", demo_org_id, Role.APPROVER),
            "demo-admin-key": Principal("demo-admin", demo_org_id, Role.ADMIN),
        }

    def authenticate(self, credential: str) -> Principal:
        if credential in self.fixed_users:
            return self.fixed_users[credential]

        try:
            payload_part, signature = credential.rsplit(".", 1)
        except ValueError as exc:
            raise PermissionError("invalid authentication credential") from exc

        expected = hmac.new(
            self.secret.encode("utf-8"),
            payload_part.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise PermissionError("invalid authentication credential")

        try:
            payload = json.loads(payload_part)
            exp = int(payload["exp"])
            org_id = str(payload["org_id"])
            user_id = str(payload["sub"])
            role = Role(payload["role"])
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise PermissionError("invalid authentication credential") from exc
        if exp < time.time():
            raise PermissionError("authentication credential expired")
        return Principal(user_id=user_id, org_id=org_id, role=role)

    def issue_token(self, principal: Principal) -> str:
        payload = json.dumps(
            {
                "sub": principal.user_id,
                "org_id": principal.org_id,
                "role": principal.role.value,
                "exp": int(time.time()) + self.ttl_seconds,
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        payload_part = payload.decode("ascii")
        signature = hmac.new(
            self.secret.encode("utf-8"),
            payload_part.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()
        return f"{payload_part}.{signature}"


def require_role(principal: Principal, allowed_roles: Iterable[Role]) -> None:
    allowed = set(allowed_roles)
    if principal.role is Role.ADMIN:
        return
    if principal.role not in allowed:
        raise PermissionError(
            f"role {principal.role.value} is not permitted"
        )


def require_approval_role(principal: Principal) -> None:
    require_role(principal, {Role.APPROVER})
