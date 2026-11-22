import argparse
import json
from pathlib import Path
from typing import Dict, List

from detect_incidents import detect_incidents
from replay import load_sorted_events

PROFILES: Dict[str, dict] = {
    "fast": {"timeout_confirm_count": 1, "recovery_streak_needed": 1, "assumed_recovery_pct": 60.0},
    "balanced": {"timeout_confirm_count": 2, "recovery_streak_needed": 2, "assumed_recovery_pct": 60.0},
    "strict": {"timeout_confirm_count": 3, "recovery_streak_needed": 2, "assumed_recovery_pct": 60.0},
}


def benchmark_profiles(events: List[dict]) -> List[dict]:
    summary: List[dict] = []

    for name, cfg in PROFILES.items():
        res = detect_incidents(
            events=events,
            timeout_confirm_count=cfg["timeout_confirm_count"],
            recovery_streak_needed=cfg["recovery_streak_needed"],
            assumed_recovery_pct=cfg["assumed_recovery_pct"],
        )
        inc_list = res["incidents"]
        ttds = [float(i["ttd_seconds"]) for i in inc_list]
        avg_ttd = round(sum(ttds) / len(ttds), 2) if ttds else 0.0
        max_ttd = max(ttds) if ttds else 0.0
        resolved_cnt = sum(1 for i in inc_list if i["status"] == "RESOLVED")
        total_at_risk_ngn = round(sum(float(i["at_risk_ngn"]) for i in inc_list), 2)

        summary.append(
            {
                "profile": name,
                "config": cfg,
                "incidents_detected": len(inc_list),
                "resolved_count": resolved_cnt,
                "avg_ttd_seconds": avg_ttd,
                "max_ttd_seconds": max_ttd,
                "total_at_risk_ngn": total_at_risk_ngn,
            }
        )

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Sunday threshold tuning & TTD latency benchmark.")
    parser.add_argument("--folder", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path, default=Path("sunday_benchmark.json"))
    args = parser.parse_args()

    events = load_sorted_events(args.folder)
    rows = benchmark_profiles(events)

    # Also verify normal transactions alone produce 0 false incidents
    normal_events = [e for e in events if str(e.get("category", "")).lower() in {"normal", "normal_transactions"}]
    normal_check = detect_incidents(normal_events)

    report = {
        "normal_baseline_false_positives": len(normal_check["incidents"]),
        "profiles": rows,
    }
    args.out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Normal baseline false positives: {report['normal_baseline_false_positives']}")
    for r in rows:
        print(
            f"  Profile [{r['profile']:<8}] | Incidents: {r['incidents_detected']} | "
            f"Resolved: {r['resolved_count']} | Avg TTD: {r['avg_ttd_seconds']}s | "
            f"Max TTD: {r['max_ttd_seconds']}s"
        )
    print(f"Saved Sunday benchmark to {args.out}")


if __name__ == "__main__":
    main()