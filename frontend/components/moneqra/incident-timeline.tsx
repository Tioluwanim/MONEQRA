import { incidentStateLabels } from "@/lib/labels";
import type { IncidentState } from "./types";

export function IncidentTimeline({
  state,
  events,
}: {
  state: IncidentState;
  events: { state: IncidentState; timestamp: string; evidence: string }[];
}) {
  return (
    <ol className="relative space-y-5 border-l-2 border-[var(--border)] pl-6">
      {events.map((event) => {
        const current = event.state === state;
        return (
          <li key={`${event.state}-${event.timestamp}`} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[1.95rem] top-1.5 size-3 rounded-full border-2 ${current ? "border-[var(--brand)] bg-[var(--brand)]" : "border-[var(--border-strong)] bg-[var(--surface)]"}`}
            />
            <time className="num block text-sm font-medium text-[var(--text-faint)]">{event.timestamp}</time>
            <strong className="block text-[0.95rem] text-[var(--text)]">{incidentStateLabels[event.state].label}</strong>
            <p className="text-[0.95rem] text-[var(--text-muted)]">{event.evidence}</p>
          </li>
        );
      })}
    </ol>
  );
}
