from __future__ import annotations


def require_simulation_mode(enabled: bool) -> None:
    if not enabled:
        raise PermissionError("simulator-only endpoint requires simulation mode")
