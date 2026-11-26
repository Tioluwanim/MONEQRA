from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from app.prediction.interface import PredictionResult


class HistoricalSettlementBaseline:
    """Small statistical baseline; never a replacement for validated evidence."""

    MINIMUM_REAL_SETTLEMENTS = 20

    def __init__(self, settlements: Iterable[tuple[datetime, datetime]]) -> None:
        durations = sorted(
            (settled - unresolved).total_seconds()
            for unresolved, settled in settlements
            if settled >= unresolved
        )
        self._durations = durations

    def predict_settlement(
        self,
        *,
        provider_key: str,
        channel: str,
        unresolved_since: datetime,
        horizon: datetime,
    ) -> PredictionResult:
        if len(self._durations) < self.MINIMUM_REAL_SETTLEMENTS:
            return PredictionResult(
                status="unavailable",
                predicted_settlement_at=None,
                probability_settles_in_horizon=None,
                model_version="historical_median_v1",
                evidence_count=len(self._durations),
                limitations=(
                    "Advanced predictions require at least 20 representative real settlements.",
                    "This baseline has not been trained or evaluated.",
                ),
            )

        seconds = sorted(self._durations)[len(self._durations) // 2]
        predicted = unresolved_since + timedelta(seconds=seconds)
        in_window = sum(duration <= (horizon - unresolved_since).total_seconds()
                        for duration in self._durations)
        probability = in_window / len(self._durations)
        return PredictionResult(
            status="baseline",
            predicted_settlement_at=predicted,
            probability_settles_in_horizon=probability,
            model_version="historical_median_v1",
            evidence_count=len(self._durations),
            limitations=(
                "Statistical baseline, not a trained model.",
                "Baseline evidence is not shown as confirmed settlement.",
                "Provider and channel limits require segment-specific real data.",
            ),
        )
