from __future__ import annotations

import re
from typing import Any


SENSITIVE_KEYS = (
    "password",
    "secret",
    "token",
    "authorization",
    "api_key",
    "apikey",
    "credential",
    "signature",
)


def redact_secrets(value: Any) -> Any:
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            if any(
                re.search(rf"(?:^|_){marker}(?:$|_)", key_text.lower())
                or key_text.lower() == marker
                for marker in SENSITIVE_KEYS
            ):
                redacted[key_text] = "[REDACTED]"
            else:
                redacted[key_text] = redact_secrets(item)
        return redacted
    if isinstance(value, (list, tuple)):
        return [redact_secrets(item) for item in value]
    return value
