from __future__ import annotations

import hashlib
import hmac
import threading
import time
from dataclasses import dataclass


@dataclass(frozen=True)
class WebhookVerificationResult:
    valid: bool
    reason: str


class WebhookVerifier:
    def __init__(self, replay_window_seconds: int = 300) -> None:
        if replay_window_seconds < 0:
            raise ValueError("replay_window_seconds must not be negative")
        self.replay_window_seconds = replay_window_seconds
        self._seen: set[tuple[str, str]] = set()
        self._lock = threading.Lock()

    def verify(
        self,
        raw_body: bytes,
        signature: str | None,
        timestamp: str | None,
        provider: str,
        secret: str,
        event_id: str,
        now: float | None = None,
    ) -> WebhookVerificationResult:
        if not isinstance(raw_body, bytes):
            return WebhookVerificationResult(False, "raw request body must be bytes")
        if not signature:
            return WebhookVerificationResult(False, "missing webhook signature")
        if not timestamp:
            return WebhookVerificationResult(False, "missing webhook timestamp")
        if not secret:
            return WebhookVerificationResult(False, "missing provider webhook secret")
        if not event_id:
            return WebhookVerificationResult(False, "missing provider event id")

        try:
            signed_timestamp = int(timestamp)
        except (TypeError, ValueError):
            return WebhookVerificationResult(False, "invalid webhook timestamp")

        current_time = time.time() if now is None else now
        age = abs(current_time - signed_timestamp)
        if age > self.replay_window_seconds:
            return WebhookVerificationResult(False, "stale webhook timestamp")

        canonical = str(signed_timestamp).encode("ascii") + b"." + raw_body
        expected = hmac.new(
            secret.encode("utf-8"),
            canonical,
            hashlib.sha256,
        ).hexdigest()
        supplied = signature.lower().removeprefix("sha256=")
        if not hmac.compare_digest(expected, supplied):
            return WebhookVerificationResult(False, "invalid webhook signature")

        key = (provider, event_id)
        with self._lock:
            if key in self._seen:
                return WebhookVerificationResult(False, "replayed webhook event")
            self._seen.add(key)
        return WebhookVerificationResult(True, "verified")


DEFAULT_WEBHOOK_VERIFIER = WebhookVerifier()


def verify_webhook(
    raw_body: bytes,
    signature: str | None,
    timestamp: str | None,
    provider: str,
    secret: str,
    event_id: str,
    now: float | None = None,
    replay_window_seconds: int | None = None,
) -> WebhookVerificationResult:
    verifier = (
        DEFAULT_WEBHOOK_VERIFIER
        if replay_window_seconds is None
        else WebhookVerifier(replay_window_seconds)
    )
    return verifier.verify(
        raw_body=raw_body,
        signature=signature,
        timestamp=timestamp,
        provider=provider,
        secret=secret,
        event_id=event_id,
        now=now,
    )
