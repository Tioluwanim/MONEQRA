import type { IncidentState } from "./types";

export function IncidentTimeline({
  state,
  events,
}: {
  state: IncidentState;
  events: { state: IncidentState; timestamp: string; evidence: string }[];
}) {
  return (
    <ol className="border-l border-[var(--ledger-rule-strong)] pl-4">
      {events.map((event) => (
        <li key={`${event.state}-${event.timestamp}`} className="relative pb-4">
          <span
            aria-hidden="true"
            className={`absolute -left-[21px] top-1 size-2 rounded-full ${event.state === state ? "bg-[var(--vermilion)]" : "border border-[var(--ink)] bg-[var(--paper)]"}`}
          />
          <time className="block font-mono text-xs text-[var(--ink-muted)]">{event.timestamp}</time>
          <strong className="capitalize">{event.state}</strong>
          <p className="text-sm">{event.evidence}</p>
        </li>
      ))}
    </ol>
  );
}
