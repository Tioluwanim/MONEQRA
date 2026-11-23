import argparse
from collections import defaultdict
from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from replay import extract_timestamp, load_sorted_events, parse_timestamp


def to_kobo(amount_ngn: float) -> int:
    return int(round(float(amount_ngn) * 100))


def detect_incidents(
    events: List[Dict[str, Any]],
    timeout_confirm_count: int = 2,
    recovery_streak_needed: int = 2,
    assumed_recovery_pct: float = 60.0,
) -> Dict[str, Any]:
    incidents: List[Dict[str, Any]] = []
    active_by_type: Dict[str, Dict[str, Any]] = {}
    seen_amount_counts: Dict[float, int] = defaultdict(int)
    seen_txn_counts: Dict[str, int] = defaultdict(int)
    healthy_streak = 0

    def resolve_active(reason_event: Dict[str, Any]) -> None:
        ts = extract_timestamp(reason_event)
        ev_id = reason_event.get("event_id", "")
        for inc in active_by_type.values():
            if inc["status"] != "RESOLVED":
                inc["status"] = "RESOLVED"
                inc["resolved_at"] = ts
                inc["evidence"]["resolution_events"].append(ev_id)
        active_by_type.clear()

    def build_liquidity(exposure_kobo: int, settled_kobo: int = 0) -> Dict[str, Any]:
        recovered_kobo = int(round(exposure_kobo * (assumed_recovery_pct / 100.0)))
        return {
            "no_recovery": {
                "unknown_settled_kobo": settled_kobo,
                "position_kobo": -exposure_kobo,
            },
            "assumed_recovery": {
                "pct": assumed_recovery_pct,
                "unknown_settled_kobo": recovered_kobo,
                "position_kobo": recovered_kobo - exposure_kobo,
            },
        }

    def upsert_incident(
        inc_type: str,
        severity: str,
        status: str,
        event: Dict[str, Any],
        amount_ngn: float,
        reason: str,
    ) -> None:
        ts = extract_timestamp(event)
        ev_id = event.get("event_id", "")
        txn_id = event.get("transaction_id")
        biz = event.get("business_name") or event.get("business_id") or "Ade Stores"

        if inc_type not in active_by_type:
            inc_obj = {
                "incident_id": f"inc_{len(incidents) + 1:03d}_{inc_type.lower()}",
                "incident_type": inc_type,
                "severity": severity,
                "status": status,
                "onset_timestamp": ts,
                "detected_at": ts,
                "ttd_seconds": 0.0,
                "businesses": [biz],
                "transactions": [txn_id] if txn_id else [],
                "at_risk_ngn": round(amount_ngn, 2),
                "at_risk_kobo": to_kobo(amount_ngn),
                "evidence": {
                    "rules_triggered": [reason],
                    "event_ids": [ev_id] if ev_id else [],
                    "resolution_events": [],
                },
                "liquidity_scenarios": build_liquidity(to_kobo(amount_ngn)),
                "model_outputs": {
                    "is_model_output": True,
                    "label": "MODEL_ESTIMATE_NOT_OBSERVED_FACT",
                    "settlement_delay_model": {
                        "estimated_delay_minutes": 240.0 if inc_type == "SETTLEMENT_FAILURE" else 60.0,
                        "basis": "heuristic_queue_model",
                    },
                    "recovery_estimate": {
                        "assumed_recovery_pct": assumed_recovery_pct,
                        "estimated_recovery_minutes": 30.0,
                        "basis": "heuristic_recovery_model",
                    },
                },
            }
            active_by_type[inc_type] = inc_obj
            incidents.append(inc_obj)
        else:
            inc_obj = active_by_type[inc_type]
            inc_obj["status"] = status
            inc_obj["severity"] = severity
            inc_obj["detected_at"] = ts
            onset_dt = parse_timestamp(inc_obj["onset_timestamp"])
            curr_dt = parse_timestamp(ts)
            if onset_dt != datetime.min and curr_dt != datetime.min:
                inc_obj["ttd_seconds"] = round((curr_dt - onset_dt).total_seconds(), 2)
            if biz and biz not in inc_obj["businesses"]:
                inc_obj["businesses"].append(biz)
            if txn_id and txn_id not in inc_obj["transactions"]:
                inc_obj["transactions"].append(txn_id)
            inc_obj["at_risk_ngn"] = round(inc_obj["at_risk_ngn"] + amount_ngn, 2)
            inc_obj["at_risk_kobo"] = to_kobo(inc_obj["at_risk_ngn"])
            if reason not in inc_obj["evidence"]["rules_triggered"]:
                inc_obj["evidence"]["rules_triggered"].append(reason)
            if ev_id and ev_id not in inc_obj["evidence"]["event_ids"]:
                inc_obj["evidence"]["event_ids"].append(ev_id)
            inc_obj["liquidity_scenarios"] = build_liquidity(inc_obj["at_risk_kobo"])
            inc_obj["model_outputs"]["recovery_estimate"]["estimated_recovered_kobo"] = inc_obj[
                "liquidity_scenarios"
            ]["assumed_recovery"]["unknown_settled_kobo"]

    for ev in events:
        status = str(ev.get("status", "")).lower()
        category = str(ev.get("category", "")).lower()
        amount = float(ev.get("amount") or 0.0)
        txn_id = ev.get("transaction_id")

        if txn_id:
            seen_txn_counts[str(txn_id)] += 1
        if amount > 0:
            seen_amount_counts[amount] += 1

        # Recovery signal check
        if status in {"healthy", "recovered"} or category == "provider_recovery":
            healthy_streak += 1
            if healthy_streak >= recovery_streak_needed:
                resolve_active(ev)
            continue

        # 1. Ambiguous timeouts
        if status == "ambiguous_timeout" or category in {"timeout", "timeouts"}:
            healthy_streak = 0
            existing = active_by_type.get("TIMEOUT_SPIKE")
            count = len(existing["evidence"]["event_ids"]) + 1 if existing else 1
            inc_status = "CONFIRMED" if count >= timeout_confirm_count else "SUSPECTED"
            upsert_incident(
                inc_type="TIMEOUT_SPIKE",
                severity="HIGH" if inc_status == "CONFIRMED" else "MEDIUM",
                status=inc_status,
                event=ev,
                amount_ngn=amount,
                reason="RULE_AMBIGUOUS_TIMEOUT",
            )

        # 2. Duplicate callbacks / repeated captures
        if status == "duplicate_event" or category in {"duplicate_event", "duplicate_events"} or (
            status == "captured" and (seen_txn_counts.get(str(txn_id), 0) > 1 or seen_amount_counts[amount] > 1)
        ):
            if status != "captured" or seen_amount_counts[amount] > 1 or seen_txn_counts.get(str(txn_id), 0) > 1:
                healthy_streak = 0
                upsert_incident(
                    inc_type="DUPLICATE_WEBHOOK_EVENT",
                    severity="HIGH",
                    status="CONFIRMED",
                    event=ev,
                    amount_ngn=amount,
                    reason="RULE_DUPLICATE_EVENT_OR_AMOUNT",
                )

        # 3. Hard payment failure
        if status in {"failed", "failure"}:
            healthy_streak = 0
            upsert_incident(
                inc_type="PAYMENT_FAILURE",
                severity="HIGH",
                status="CONFIRMED",
                event=ev,
                amount_ngn=amount,
                reason="RULE_FAILED_TRANSACTION",
            )

        # 4. Degraded / upstream infrastructure failure
        if status in {"degraded_outage", "upstream_failure"} or "upstream" in category:
            healthy_streak = 0
            upsert_incident(
                inc_type="UPSTREAM_INFRA_FAILURE",
                severity="CRITICAL",
                status="CONFIRMED",
                event=ev,
                amount_ngn=amount,
                reason="RULE_DEGRADED_OR_UPSTREAM_OUTAGE",
            )

        # 5. Settlement failure
        if status in {"settlement_failed", "settlement_failure"} or "settlement" in category:
            healthy_streak = 0
            upsert_incident(
                inc_type="SETTLEMENT_FAILURE",
                severity="CRITICAL",
                status="CONFIRMED",
                event=ev,
                amount_ngn=amount,
                reason="RULE_SETTLEMENT_BATCH_FAILED",
            )

        # Healthy capture after disruption counts toward recovery
        if status == "captured" and active_by_type:
            healthy_streak += 1
            if healthy_streak >= recovery_streak_needed:
                resolve_active(ev)

    return {
        "total_events_processed": len(events),
        "incidents": incidents,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run rule-based incident detection on Ade Stores events.")
    parser.add_argument("--folder", type=Path, default=Path("."))
    parser.add_argument("--timeout-confirm", type=int, default=2)
    parser.add_argument("--recovery-streak", type=int, default=2)
    parser.add_argument("--recovery-pct", type=float, default=60.0)
    parser.add_argument("--out", type=Path, default=Path("detected_incidents.json"))
    args = parser.parse_args()

    events = load_sorted_events(args.folder)
    result = detect_incidents(
        events=events,
        timeout_confirm_count=args.timeout_confirm,
        recovery_streak_needed=args.recovery_streak,
        assumed_recovery_pct=args.recovery_pct,
    )
    args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Processed {result['total_events_processed']} events -> {len(result['incidents'])} incidents:")
    for inc in result["incidents"]:
        print(
            f"  - {inc['incident_type']} [{inc['status']} | {inc['severity']}] | "
            f"At-Risk: NGN {inc['at_risk_ngn']:,.2f} ({inc['at_risk_kobo']} kobo) | "
            f"TTD: {inc['ttd_seconds']}s | Events: {inc['evidence']['event_ids']}"
        )
    print(f"Saved full report to {args.out}")


if __name__ == "__main__":
    main()

    