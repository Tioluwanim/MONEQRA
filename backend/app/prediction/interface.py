from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class PredictionResult:
    status: str
    predicted_settlement_at: datetime | None
    probability_settles_in_horizon: float | None
    model_version: str
    evidence_count: int
    limitations: tuple[str, ...]


class SettlementPredictor(Protocol):
    def predict_settlement(
        self,
        *,
        provider_key: str,
        channel: str,
        unresolved_since: datetime,
        horizon: datetime,
    ) -> PredictionResult:
        ...
