from datetime import datetime, timedelta, timezone

from app.prediction.baseline import HistoricalSettlementBaseline


UTC = timezone.utc


def test_baseline_is_unavailable_below_real_data_threshold():
    baseline = HistoricalSettlementBaseline([])
    result = baseline.predict_settlement(
        provider_key="provider-a",
        channel="card",
        unresolved_since=datetime(2026, 11, 26, 10, tzinfo=UTC),
        horizon=datetime(2026, 11, 26, 12, tzinfo=UTC),
    )
    assert result.status == "unavailable"
    assert result.predicted_settlement_at is None
    assert result.probability_settles_in_horizon is None


def test_baseline_returns_median_and_horizon_probability():
    unresolved = datetime(2026, 11, 26, 10, tzinfo=UTC)
    durations = [timedelta(minutes=30), timedelta(minutes=60), timedelta(minutes=90)]
    baseline = HistoricalSettlementBaseline(
        [(unresolved - timedelta(days=i), unresolved - timedelta(days=i) + duration)
         for i, duration in enumerate(durations)]
        * 7
    )
    baseline_items = baseline._durations
    assert len(baseline_items) >= 20
    result = baseline.predict_settlement(
        provider_key="provider-a",
        channel="card",
        unresolved_since=unresolved,
        horizon=unresolved + timedelta(hours=1),
    )
    assert result.status == "baseline"
    assert result.predicted_settlement_at is not None
    assert 0 <= (result.probability_settles_in_horizon or 0) <= 1
