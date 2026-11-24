"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DemoRole } from "./types";

export function ApprovalBar({
  role,
  onApprove,
  onReject,
}: {
  role: DemoRole;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
}) {
  const allowed = role === "approver" || role === "admin";
  const [reason, setReason] = useState("");
  return (
    <div className="border-t border-[var(--ledger-rule)] pt-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!allowed}
          aria-describedby={!allowed ? "approval-role-reason" : undefined}
          onClick={onApprove}
        >Approve</Button>
        <label className="flex min-w-64 flex-1 items-center gap-2">
          <span className="sr-only">Reject reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for rejection"
            disabled={!allowed}
            className="h-8 min-w-0 flex-1 border border-[var(--ledger-rule-strong)] bg-transparent px-2"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!allowed || reason.trim().length === 0}
          onClick={() => onReject?.(reason.trim())}
        >Reject</Button>
      </div>
      {!allowed && <p id="approval-role-reason" className="mt-2 text-xs text-[var(--ink-muted)]">Approval requires approver or admin role.</p>}
    </div>
  );
}

export function RecommendationCard({
  action,
  tier,
  reasons,
  evidence,
  limitations,
  role,
}: {
  action: string;
  tier: 1 | 2;
  reasons: string[];
  evidence: string[];
  limitations: string[];
  role: DemoRole;
}) {
  return (
    <article className="border-y-2 border-[var(--ink)] py-4">
      <p className="font-mono text-xs uppercase">Tier {tier} · {tier === 1 ? "automatic and read-only" : "human approval required"}</p>
      <h3 className="mt-2 text-2xl">{action}</h3>
      <dl className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["Reasons", reasons],
          ["Evidence", evidence],
          ["Limitations", limitations],
        ].map(([label, lines]) => (
          <div key={String(label)} className="border-t border-[var(--ledger-rule)] pt-2">
            <dt className="font-semibold">{String(label)}</dt>
            <dd><ul>{(lines as string[]).map((line) => <li key={line} className="mt-1 text-sm">{line}</li>)}</ul></dd>
          </div>
        ))}
      </dl>
      {tier === 2 && <ApprovalBar role={role} />}
    </article>
  );
}
