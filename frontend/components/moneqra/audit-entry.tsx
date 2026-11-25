import { History } from "lucide-react";
import { describeAuditAction } from "@/lib/labels";
import { formatDayTime } from "@/lib/datetime";

function prettyActor(actor: string): string {
  const spaced = actor.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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
  const when = formatDayTime(timestamp) || timestamp;
  return (
    <li className="py-3.5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-ink)]">
          <History className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] text-[var(--text)]">
            <strong>{prettyActor(actor)}</strong> · {describeAuditAction(action)}
          </p>
          <p className="num text-sm text-[var(--text-faint)]">{when}</p>
          <details className="mt-1.5 text-sm text-[var(--text-muted)]">
            <summary className="cursor-pointer font-medium text-[var(--brand-ink)]">Show technical details</summary>
            <dl className="mt-2 grid gap-1 text-xs">
              <div><dt className="inline font-semibold">Record: </dt><dd className="inline">{entity}</dd></div>
              <div><dt className="inline font-semibold">Fingerprint: </dt><dd className="inline break-all font-mono">{hash.slice(0, 16)}</dd></div>
              <div><dt className="inline font-semibold">Previous: </dt><dd className="inline break-all font-mono">{previousHash ? previousHash.slice(0, 16) : "first record"}</dd></div>
            </dl>
          </details>
        </div>
      </div>
    </li>
  );
}
