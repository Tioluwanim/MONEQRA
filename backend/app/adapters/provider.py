from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Protocol
from urllib.parse import urlparse


@dataclass(frozen=True)
class ProviderStatusResult:
    provider_event_id: str
    status: str
    settlement_status: str
    raw_response: dict[str, object]


class ProviderError(RuntimeError):
    pass


class ProviderAdapter(Protocol):
    def check_payment_status(self, provider_reference: str) -> ProviderStatusResult:
        ...

    def check_settlement_status(self, provider_reference: str) -> ProviderStatusResult:
        ...


class FakeProviderAdapter:
    """Deterministic, read-only provider used by simulation mode and tests."""

    def __init__(
        self,
        *,
        host: str = "https://sandbox.provider.invalid",
        allowed_hosts: tuple[str, ...] = ("sandbox.provider.invalid",),
        min_interval_seconds: float = 0.0,
    ) -> None:
        parsed = urlparse(host)
        if parsed.hostname not in allowed_hosts:
            raise ValueError("provider host is not allow-listed")
        self._min_interval_seconds = min_interval_seconds
        self._last_request = float("-inf")
        self._results: dict[str, ProviderStatusResult] = {}

    def set_result(self, provider_reference: str, result: ProviderStatusResult) -> None:
        self._results[provider_reference] = result

    def _check(self, provider_reference: str) -> ProviderStatusResult:
        now = time.monotonic()
        if now - self._last_request < self._min_interval_seconds:
            raise ProviderError("provider rate limit reached; retry later")
        self._last_request = now
        result = self._results.get(provider_reference)
        if result is None:
            if provider_reference.startswith("ade-unknown-"):
                return ProviderStatusResult(
                    provider_event_id=f"fake-status-{provider_reference}",
                    status="succeeded",
                    settlement_status="pending",
                    raw_response={
                        "provider_reference": provider_reference,
                        "status": "succeeded",
                        "settlement_status": "pending",
                        "simulated": True,
                    },
                )
            raise ProviderError("provider status unavailable")
        return result

    def check_payment_status(self, provider_reference: str) -> ProviderStatusResult:
        return self._check(provider_reference)

    def check_settlement_status(self, provider_reference: str) -> ProviderStatusResult:
        return self._check(provider_reference)
