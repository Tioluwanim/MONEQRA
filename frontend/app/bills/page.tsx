"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  useCoverage, useCoordinationActions, useCoordinationMutations,
  type ActionKind, type CoordinationAction, type CoverageItem,
} from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { MoneqraApiError } from "@/lib/api-client";
import { actionKindLabels, actionStatusLabels, categoryLabels, coverageLabels } from "@/lib/labels";
import { formatDayTime } from "@/lib/datetime";
import { formatKobo } from "@/lib/money";
import { ProductShell, PageTitle } from "@/components/product/shell";
import { EmptyState, ErrorState, LoadingSkeleton, MoneyValue, StatusPill } from "@/components/moneqra";

const options = [
  { bps: 0, label: "None arrive" },
  { bps: 6000, label: "60% arrive" },
  { bps: 10000, label: "All arrive" },
];

function friendly(error: unknown) {
  if (error instanceof MoneqraApiError) {
    if (error.status === 403) return "You can't do that as this person. If you made the request, someone else has to approve it. Switch the person at the top of the page.";
    if (error.status === 400) return "That request was not accepted. It may already exist or have been decided.";
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function BillsPage() {
  const auth = useAuth();
  const me = `demo-${auth.role}`;
  const [probability, setProbability] = useState(6000);
  const coverage = useCoverage(probability);
  const actions = useCoordinationActions();
  const { create, decide, complete } = useCoordinationMutations();
  const canRequest = auth.role !== "viewer";
  const canDecide = auth.role === "approver" || auth.role === "admin";
  const [error, setError] = useState("");
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [doneNote, setDoneNote] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<unknown>) => { setError(""); void fn().catch((e) => setError(friendly(e))); };
  const request = (item: CoverageItem, kind: ActionKind) => run(() => create.mutateAsync({
    obligation_id: item.obligation_id, kind,
    note: actionKindLabels[kind].hint,
    ...(kind === "split_payment" ? { proposed_amount_kobo: Math.max(1, item.from_confirmed_kobo || Math.floor(item.amount_kobo / 2)) } : {}),
  }));
  const hasOpen = (item: CoverageItem, kind: ActionKind) =>
    (actions.data?.items ?? []).some((a) => a.obligation_id === item.obligation_id && a.kind === kind && (a.status === "pending" || a.status === "approved"));

  return (
    <ProductShell>
      <PageTitle
        title="Which bills are safe?"
        lead="We line up your bills by due date and check each one against money you actually have. Payments we cannot confirm are never counted as yours."
      />

      <section aria-labelledby="cov-heading" className="mb-10">
        <h2 id="cov-heading" className="text-xl">Your bills against your money</h2>
        <p className="mb-4 mt-1 text-[var(--text-muted)]">How many of the waiting payments arrive is unknown, so choose a guess.</p>
        <div className="segmented mb-4" role="group" aria-label="How many waiting payments arrive">
          {options.map((o) => (
            <button key={o.bps} type="button" aria-pressed={probability === o.bps} onClick={() => setProbability(o.bps)}>{o.label}</button>
          ))}
        </div>

        {coverage.isLoading ? <LoadingSkeleton rows={3} /> : coverage.isError ? <ErrorState title="Could not load your bills" detail={coverage.error.message} onRetry={() => void coverage.refetch()} /> : coverage.data ? (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="card card-pad"><MoneyValue kobo={coverage.data.covered_kobo} state="confirmed" label="Covered by money you have" /></div>
              <div className="card card-pad"><MoneyValue kobo={coverage.data.depends_on_unconfirmed_kobo} state="estimated" label="Only if waiting payments arrive" /></div>
              <div className="card card-pad"><MoneyValue kobo={coverage.data.at_risk_kobo} state="unknown" label="At risk" /></div>
            </div>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              You have {formatKobo(coverage.data.confirmed_funds_kobo)} confirmed. At this guess, {formatKobo(coverage.data.assumed_unconfirmed_kobo)} more may arrive. It is an estimate, not a promise.
            </p>

            {coverage.data.items.length === 0 ? <div className="mt-4"><EmptyState title="No open bills" detail="Nothing is due." /></div> : (
              <ul className="mt-5 grid gap-3" aria-label="Bills in due-date order">
                {coverage.data.items.map((item) => {
                  const label = coverageLabels[item.status];
                  return (
                    <li key={item.obligation_id} className="card card-pad">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-sm text-[var(--text-muted)]">{categoryLabels[item.category] ?? "Other"} · due {formatDayTime(item.due_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{formatKobo(item.amount_kobo)}</p>
                          <StatusPill tone={label.tone} title={label.hint}>{label.label}</StatusPill>
                        </div>
                      </div>
                      {item.status === "at_risk" && <p className="mt-2 text-sm text-[var(--text-muted)]">Short by {formatKobo(item.shortfall_kobo)} even if the guess is right.</p>}
                      {item.status === "depends_on_unconfirmed" && <p className="mt-2 text-sm text-[var(--text-muted)]">{formatKobo(item.from_confirmed_kobo)} from money you have and {formatKobo(item.from_unconfirmed_kobo)} from payments not yet confirmed.</p>}
                      {item.suggested_action && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3">
                          <span className="text-sm text-[var(--text-muted)]">Suggested: {actionKindLabels[item.suggested_action].hint}</span>
                          <button
                            type="button" className="btn btn-secondary btn-sm"
                            disabled={!canRequest || create.isPending || hasOpen(item, item.suggested_action)}
                            onClick={() => request(item, item.suggested_action!)}
                          >
                            {hasOpen(item, item.suggested_action) ? "Requested" : `${actionKindLabels[item.suggested_action].label}`}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </section>

      {error && <div role="alert" className="callout callout-bad mb-6">{error}</div>}

      <section aria-labelledby="act-heading" className="mb-6">
        <h2 id="act-heading" className="text-xl">Requests waiting on a person</h2>
        <p className="mb-4 mt-1 text-[var(--text-muted)]">Someone proposes it, a different person approves it, and then someone does it outside MONEQRA. MONEQRA never pays or contacts anyone.</p>
        {actions.isLoading ? <LoadingSkeleton rows={2} /> : actions.isError ? <ErrorState title="Could not load requests" detail={actions.error.message} onRetry={() => void actions.refetch()} /> : actions.data?.items.length === 0 ? <EmptyState title="No requests yet" detail="Use a suggested action above to start one." /> : (
          <ul className="grid gap-3">
            {actions.data?.items.map((a: CoordinationAction) => {
              const status = actionStatusLabels[a.status];
              const own = a.requested_by === me;
              return (
                <li key={a.id} className="card card-pad">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{actionKindLabels[a.kind].label} · {a.obligation_label}</p>
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">Requested by {a.requested_by.replace("demo-", "")}{a.decided_by ? ` · decided by ${a.decided_by.replace("demo-", "")}` : ""}{a.decision_reason ? ` · “${a.decision_reason}”` : ""}</p>
                  {a.outcome_note && <p className="mt-1 text-sm">Outcome: {a.outcome_note}</p>}
                  {a.status === "pending" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" className="btn btn-primary btn-sm" disabled={!canDecide || own || decide.isPending} onClick={() => run(() => decide.mutateAsync({ id: a.id, decision: "approve" }))}>Approve</button>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={!canDecide || own} onClick={() => { setDeclining(declining === a.id ? null : a.id); setReason(""); }}>Decline</button>
                      {own && <span className="text-sm text-[var(--text-muted)]">You made this request, so someone else has to approve it.</span>}
                      {!canDecide && !own && <span className="text-sm text-[var(--text-muted)]">Only an approver can decide.</span>}
                    </div>
                  )}
                  {declining === a.id && (
                    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await decide.mutateAsync({ id: a.id, decision: "reject", reason }); setDeclining(null); }); }}>
                      <label className="grid gap-1 text-sm">Why decline?
                        <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} required />
                      </label>
                      <button type="submit" className="btn btn-secondary btn-sm" disabled={!reason.trim()}>Confirm decline</button>
                    </form>
                  )}
                  {a.status === "approved" && canRequest && (
                    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); run(() => complete.mutateAsync({ id: a.id, outcome_note: doneNote[a.id] ?? "" })); }}>
                      <label className="grid gap-1 text-sm">What happened when you did it?
                        <input className="field" value={doneNote[a.id] ?? ""} onChange={(e) => setDoneNote({ ...doneNote, [a.id]: e.target.value })} required />
                      </label>
                      <button type="submit" className="btn btn-secondary btn-sm" disabled={!(doneNote[a.id] ?? "").trim()}>
                        <CheckCircle2 aria-hidden="true" className="size-4" /> Mark as done
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </ProductShell>
  );
}
