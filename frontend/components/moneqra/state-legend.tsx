export function StateLegend() {
  const states = [
    ["confirmed", "solid cash", "Cash received and settled"],
    ["pending", "clock", "Not yet settled"],
    ["unknown", "fog", "No provider evidence; never cash"],
    ["estimated", "assumption", "Model estimate, not guaranteed"],
  ] as const;
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {states.map(([state, marker, description]) => (
        <div key={state} className="border-t border-[var(--ledger-rule)] py-2">
          <dt className="font-mono text-xs uppercase" data-state={state}>{marker} · {state}</dt>
          <dd className="text-sm text-[var(--ink-muted)]">{description}</dd>
        </div>
      ))}
    </dl>
  );
}
