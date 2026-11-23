import argparse
from datetime import datetime
import json
from pathlib import Path
import time
from typing import Any, Dict, List
from urllib import error, request

SCENARIO_FILES = [
    "normal_transactions.json",
    "timeouts.json",
    "delayed_confirmations.json",
    "duplicate_events.json",
    "upstream_infra_failure.json",
    "settlement_failure.json",
    "provider_recovery.json",
]

TIMESTAMP_KEYS = ("timestamp", "occurred_at", "created_at", "ts", "event_time")


def extract_timestamp(event: Dict[str, Any]) -> str:
    for key in TIMESTAMP_KEYS:
        val = event.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    meta = event.get("metadata")
    if isinstance(meta, dict):
        for key in TIMESTAMP_KEYS:
            val = meta.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    return ""


def parse_timestamp(ts: str) -> datetime:
    if not ts:
        return datetime.min
    normalized = ts.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    # Normalize timezone-aware and naive datetimes so comparisons never fail
    if dt.tzinfo is not None:
        return dt.astimezone().replace(tzinfo=None)
    return dt


def load_sorted_events(folder: Path) -> List[Dict[str, Any]]:
    collected: List[Dict[str, Any]] = []

    for filename in SCENARIO_FILES:
        file_path = folder / filename
        if not file_path.exists():
            continue

        data = json.loads(file_path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            raw_events = data.get("events") or data.get("items") or data.get("data") or []
            file_category = data.get("category")
            scenario_id = data.get("scenario_id")
        elif isinstance(data, list):
            raw_events = data
            file_category = None
            scenario_id = None
        else:
            raw_events = []
            file_category = None
            scenario_id = None

        for ev in raw_events:
            if not isinstance(ev, dict):
                continue
            item = dict(ev)
            if file_category and "category" not in item:
                item["category"] = file_category
            if scenario_id and "scenario_id" not in item:
                item["scenario_id"] = scenario_id
            item.setdefault("source_file", filename)
            collected.append(item)

    collected.sort(key=lambda e: parse_timestamp(extract_timestamp(e)))
    return collected


def build_payload(event: Dict[str, Any]) -> Dict[str, Any]:
    return event


def post_event(endpoint: str, payload: Dict[str, Any], timeout: float = 5.0) -> str:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8") or f"HTTP {resp.status}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay Ade Stores events into MONEQRA.")
    parser.add_argument("--folder", type=Path, default=Path("."))
    parser.add_argument("--mode", choices=["dry-run", "http"], default="dry-run")
    parser.add_argument("--endpoint", default="http://localhost:8000/api/v1/events")
    parser.add_argument("--delay", type=float, default=0.05)
    args = parser.parse_args()

    events = load_sorted_events(args.folder)
    print(f"Loaded {len(events)} events in chronological order ({args.mode}).")

    for idx, ev in enumerate(events, start=1):
        payload = build_payload(ev)
        ev_id = payload.get("event_id") or payload.get("transaction_id") or f"idx_{idx}"
        ts = extract_timestamp(payload)
        status = payload.get("status", "unknown")
        amount = payload.get("amount", 0)
        currency = payload.get("currency", "NGN")
        print(f"[{idx}/{len(events)}] {ts} | {ev_id} | {status} | {currency} {amount}")

        if args.mode == "http":
            try:
                ack = post_event(args.endpoint, payload)
                print(f"    -> Backend response: {ack}")
            except error.URLError as exc:
                print(f"    -> Backend request failed: {exc}")

        if args.delay > 0:
            time.sleep(args.delay)


if __name__ == "__main__":
    main()