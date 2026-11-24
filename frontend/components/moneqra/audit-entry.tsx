export function AuditEntry({
  actor,
  action,
  entity,
  timestamp,
  hash,
  previousHash,
}: {
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
  hash: string;
  previousHash: string | null;
}) {
  return (
    <article className="grid gap-2 border-b border-[var(--ledger-rule)] py-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <div><span className="block text-xs text-[var(--ink-muted)]">Actor</span><strong>{actor}</strong></div>
      <div><span className="block text-xs text-[var(--ink-muted)]">{entity}</span><strong>{action}</strong></div>
      <time className="font-mono text-xs">{timestamp}</time>
      <div className="flex gap-1 font-mono text-[10px]" aria-label={`Hash ${hash}, previous hash ${previousHash ?? "none"}`}>
        <span className="border border-[var(--ledger-rule)] px-1">#{hash.slice(0, 8)}</span>
        <span className="border border-dashed border-[var(--ledger-rule)] px-1">{previousHash ? previousHash.slice(0, 8) : "genesis"}</span>
      </div>
    </article>
  );
}
