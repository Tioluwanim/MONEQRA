"use client";

import { useId, useState } from "react";
import { Lock } from "lucide-react";
import { roleLabels } from "@/lib/labels";
import type { DemoRole } from "./types";
import { StatusPill } from "./status-pill";

/**
 * The one place a person approves or declines. Declining needs a short reason so
 * the decision history makes sense later.
 */
export function ApprovalBar({
  role,
  onApprove,
  onReject,
  pending = false,
}: {
  role: DemoRole;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  pending?: boolean;
}) {
  const allowed = role === "approver" || role === "admin";
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const noteId = useId();
  const reasonId = useId();

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!allowed || pending}
          aria-describedby={!allowed ? noteId : undefined}
          onClick={onApprove}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          disabled={!allowed || pending}
          aria-expanded={declining}
          onClick={() => setDeclining((open) => !open)}
        >
          Decline…
        </button>
      </div>

      {declining && allowed && (
        <div className="mt-4 max-w-xl">
          <label htmlFor={reasonId} className="mb-1.5 block text-sm font-medium">Why are you declining? (this is saved in the decision history)</label>
          <textarea
            id={reasonId}
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: the supplier already agreed to wait"
            className="field"
          />
          <button
            type="button"
            className="btn btn-danger mt-3"
            disabled={reason.trim().length === 0 || pending}
            onClick={() => onReject?.(reason.trim())}
          >
            Confirm decline
          </button>
        </div>
      )}

      {!allowed && (
        <p id={noteId} className="mt-4 flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>Only an approver can decide this. You are viewing as <strong>{roleLabels[role].label}</strong>. Switch role at the top of the page to try it.</span>
        </p>
      )}
    </div>
  );
}

function Bullets({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-[var(--text)]">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="flex gap-2 text-[0.95rem] text-[var(--text-muted)]">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--border-strong)]" />
            {line}
          </li>
        ))}
      </ul>
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
  onApprove,
  onReject,
  pending,
}: {
  action: string;
  tier: 1 | 2;
  reasons: string[];
  evidence: string[];
  limitations: string[];
  role: DemoRole;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  pending?: boolean;
}) {
  return (
    <article className="card card-pad">
      <StatusPill tone={tier === 1 ? "good" : "brand"}>
        {tier === 1 ? "Happens automatically, no money moves" : "Needs your approval"}
      </StatusPill>
      <h3 className="mt-3 text-2xl leading-snug">{action}</h3>
      <div className="mt-5 grid gap-6 md:grid-cols-3">
        <Bullets title="Why we suggest this" lines={reasons} />
        <Bullets title="What we looked at" lines={evidence} />
        <Bullets title="Good to know" lines={limitations} />
      </div>
      {tier === 2 && <ApprovalBar role={role} onApprove={onApprove} onReject={onReject} pending={pending} />}
    </article>
  );
}
