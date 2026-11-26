import { http, HttpResponse } from "msw";
import { adeStoresFixture } from "./ade-stores";
import { calculateLiquidity, clampBps } from "@/lib/demo-finance";

const orgId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const providerId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const incidentId = "40000000-0000-4000-8000-000000000001";
const switchId = "cccccccc-cccc-cccc-cccc-cccccccccccc1";

const incident = {
  id: incidentId,
  org_id: orgId,
  subject_node_id: providerId,
  state: "confirmed",
  severity: "high",
  opened_at: "2026-11-19T14:10:00+01:00",
  resolved_at: null,
  simulated: true,
};

const transitions = [
  {
    from_state: "suspected",
    to_state: "suspected",
    occurred_at: "2026-11-19T14:10:00+01:00",
    evidence: { description: "Provider A timeout burst detected", source: "simulated monitor" },
  },
  {
    from_state: "suspected",
    to_state: "confirmed",
    occurred_at: "2026-11-19T16:32:00+01:00",
    evidence: { description: "Shared upstream switch confirmed", source: "simulated dependency check" },
  },
];

const mockObligations = [
  { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd1", label: "Ade Stores supplier obligation", category: "supplier", counterparty: "Ade Stores supplier", amount_kobo: 110_000_000, due_at: "2026-11-19T17:00:00+01:00" },
  { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd2", label: "Staff payroll", category: "payroll", counterparty: "Staff", amount_kobo: 65_000_000, due_at: "2026-11-20T17:00:00+01:00" },
  { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd3", label: "PAYE tax remittance", category: "tax", counterparty: "State revenue service", amount_kobo: 18_000_000, due_at: "2026-11-21T17:00:00+01:00" },
  { id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4", label: "Shop rent", category: "rent_utilities", counterparty: "Landlord", amount_kobo: 30_000_000, due_at: "2026-11-25T17:00:00+01:00" },
];

const mockActions: Array<Record<string, unknown> & { id: string; obligation_id: string; kind: string; status: string; requested_by: string }> = [];

function principalOf(request: Request) {
  return (request.headers.get("authorization") ?? "").replace("Bearer ", "").replace(/-key$/, "");
}

/** Same rules as the backend coverage engine, in integer kobo. */
function mockCoverage(bps: number) {
  const confirmed = adeStoresFixture.opening_available_kobo + adeStoresFixture.settled_payments.amount_kobo;
  const estimated = Math.floor((adeStoresFixture.unknown_payments.amount_kobo * bps) / 10_000);
  let c = confirmed;
  let e = estimated;
  let covered = 0, depends = 0, risk = 0, total = 0;
  const items = mockObligations.map((o) => {
    total += o.amount_kobo;
    const base = { obligation_id: o.id, label: o.label, category: o.category, amount_kobo: o.amount_kobo, due_at: o.due_at };
    if (c >= o.amount_kobo) {
      c -= o.amount_kobo; covered += o.amount_kobo;
      return { ...base, status: "covered", from_confirmed_kobo: o.amount_kobo, from_unconfirmed_kobo: 0, shortfall_kobo: 0, suggested_action: null };
    }
    const negotiable = ["supplier", "other", "rent_utilities"].includes(o.category);
    if (c + e >= o.amount_kobo) {
      const useC = c; const useE = o.amount_kobo - c; c = 0; e -= useE; depends += o.amount_kobo;
      return { ...base, status: "depends_on_unconfirmed", from_confirmed_kobo: useC, from_unconfirmed_kobo: useE, shortfall_kobo: 0, suggested_action: negotiable ? "split_payment" : "pay_from_confirmed_first" };
    }
    risk += o.amount_kobo;
    return { ...base, status: "at_risk", from_confirmed_kobo: 0, from_unconfirmed_kobo: 0, shortfall_kobo: o.amount_kobo - (c + e), suggested_action: negotiable ? "request_extension" : "pay_from_confirmed_first" };
  });
  return {
    recovery_probability_bps: bps, confirmed_funds_kobo: confirmed, assumed_unconfirmed_kobo: estimated,
    total_due_kobo: total, covered_kobo: covered, depends_on_unconfirmed_kobo: depends, at_risk_kobo: risk,
    limitations: ["Unconfirmed money is an assumption, not a guarantee.", "MONEQRA does not move money. Someone carries out any payment or request outside MONEQRA."],
    simulated: true, items,
  };
}

function liquidityReport(probabilityBps: number) {
  const position = calculateLiquidity(probabilityBps);
  const noRecovery = calculateLiquidity(0);
  const fullRecovery = calculateLiquidity(10_000);
  return {
    available_funds_kobo: Number(position.availableKobo),
    obligations_due_kobo: Number(position.obligationKobo),
    worst_case_position_kobo: Number(position.worstCaseKobo),
    scenario_recovery_kobo: Number(position.recoveryKobo),
    scenario_position_kobo: Number(position.scenarioKobo),
    recovery_probability_bps: position.recoveryBps,
    no_recovery: { scenario_position_kobo: Number(noRecovery.scenarioKobo) },
    full_recovery: { scenario_position_kobo: Number(fullRecovery.scenarioKobo) },
    inputs: ["Opening available cash", "28 settled payments", "One supplier obligation"],
    assumptions: [{ label: "Assumed recovery", probability_bps: position.recoveryBps, amount_kobo: Number(position.recoveryKobo) }],
    limitations: ["Unknown funds are not confirmed cash", "Recovery is rounded down and is not money received"],
    simulated: true,
  };
}

export const handlers = [
  http.get("*/v1/payments", () =>
    HttpResponse.json({
      items: [
        ...Array.from({ length: 28 }, (_, index) => ({
          id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          org_id: orgId,
          provider_node_id: providerId,
          provider_reference: `ade-settled-${index + 1}`,
          amount_kobo: 3000000,
          currency: "NGN",
          state: "settled",
          settled_at: "2026-11-19T16:05:00+01:00",
          simulated: true,
        })),
        ...Array.from({ length: 12 }, (_, index) => ({
          id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          org_id: orgId,
          provider_node_id: providerId,
          provider_reference: `ade-unknown-${index + 1}`,
          amount_kobo: 3000000,
          currency: "NGN",
          state: "unknown",
          retry_eligible: false,
          simulated: true,
        })),
      ],
      next_cursor: null,
    }),
  ),
  http.post("*/v1/payments/:id/verify", () =>
    HttpResponse.json({
      payment_id: "20000000-0000-4000-8000-000000000001",
      evidence_created: true,
      applied: false,
      new_state: "unknown",
      message: "Provider check failed; payment remains unknown and cannot be retried.",
    }),
  ),
  http.get("*/v1/obligations", () =>
    HttpResponse.json({ items: mockObligations.map((o) => ({ ...o, org_id: orgId, currency: "NGN", status: "open", simulated: true })) }),
  ),
  http.get("*/v1/coverage", ({ request }) => {
    const bps = clampBps(Number(new URL(request.url).searchParams.get("recovery_probability_bps") ?? 6000));
    return HttpResponse.json(mockCoverage(bps));
  }),
  http.get("*/v1/coordination-actions", () => HttpResponse.json({ items: [...mockActions] })),
  http.post("*/v1/coordination-actions", async ({ request }) => {
    const principal = principalOf(request);
    const body = (await request.json()) as { obligation_id: string; kind: string; note?: string; proposed_amount_kobo?: number };
    const ob = mockObligations.find((o) => o.id === body.obligation_id);
    if (principal === "demo-viewer") return HttpResponse.json({ detail: "role viewer is not permitted" }, { status: 403 });
    if (!ob) return HttpResponse.json({ detail: "obligation not found" }, { status: 404 });
    if (mockActions.some((a) => a.obligation_id === ob.id && a.kind === body.kind && ["pending", "approved"].includes(a.status))) {
      return HttpResponse.json({ detail: "this obligation already has an open request of that kind" }, { status: 400 });
    }
    const action = {
      id: `70000000-0000-4000-8000-${String(mockActions.length + 1).padStart(12, "0")}`,
      obligation_id: ob.id, obligation_label: ob.label, kind: body.kind, note: body.note ?? "",
      proposed_amount_kobo: body.proposed_amount_kobo ?? null, status: "pending", requested_by: principal,
      decided_by: null, decision_reason: null, outcome_note: null,
      created_at: "2026-11-19T16:40:00+01:00", decided_at: null, simulated: true,
    };
    mockActions.unshift(action);
    return HttpResponse.json(action, { status: 201 });
  }),
  http.post("*/v1/coordination-actions/:id/decision", async ({ request, params }) => {
    const principal = principalOf(request);
    const body = (await request.json()) as { decision: string; reason?: string };
    const action = mockActions.find((a) => a.id === params.id);
    if (!action) return HttpResponse.json({ detail: "coordination action not found" }, { status: 404 });
    if (principal !== "demo-approver" && principal !== "demo-admin") return HttpResponse.json({ detail: `role ${principal.replace("demo-", "")} is not permitted` }, { status: 403 });
    if (action.requested_by === principal) return HttpResponse.json({ detail: "the person who made the request cannot approve it" }, { status: 403 });
    if (action.status !== "pending") return HttpResponse.json({ detail: "this request has already been decided" }, { status: 400 });
    if (body.decision === "reject" && !body.reason?.trim()) return HttpResponse.json({ detail: "reject decision requires a reason" }, { status: 400 });
    Object.assign(action, { status: body.decision === "approve" ? "approved" : "rejected", decided_by: principal, decision_reason: body.reason || null, decided_at: "2026-11-19T16:45:00+01:00" });
    return HttpResponse.json(action);
  }),
  http.post("*/v1/coordination-actions/:id/complete", async ({ params, request }) => {
    const body = (await request.json()) as { outcome_note: string };
    const action = mockActions.find((a) => a.id === params.id);
    if (!action) return HttpResponse.json({ detail: "coordination action not found" }, { status: 404 });
    if (action.status !== "approved") return HttpResponse.json({ detail: "only an approved request can be marked as done" }, { status: 400 });
    Object.assign(action, { status: "completed", outcome_note: body.outcome_note });
    return HttpResponse.json(action);
  }),
  http.get("*/v1/incidents", () => HttpResponse.json({ items: [incident] })),
  http.get("*/v1/incidents/:id", () => HttpResponse.json({ ...incident, transitions })),
  http.get("*/v1/dependency-graph", () =>
    HttpResponse.json({
      nodes: [
        { id: providerId, kind: "provider", display_name: "Provider A", key: "provider-a" },
        { id: switchId, kind: "switch", display_name: "Shared switch", key: "shared-switch" },
        { id: "dddddddd-dddd-dddd-dddd-ddddddddddd1", kind: "provider", display_name: "Provider B", key: "provider-b" },
        { id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee1", kind: "merchant", display_name: "Ade Stores checkout", key: "checkout" },
      ],
      edges: [
        { from_node_id: providerId, to_node_id: switchId, status: "known", source_note: "Confirmed provider telemetry" },
        { from_node_id: "dddddddd-dddd-dddd-dddd-ddddddddddd1", to_node_id: switchId, status: "unknown", source_note: "Alternative route not yet verified" },
        { from_node_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee1", to_node_id: providerId, status: "known", source_note: "Observed checkout traffic" },
      ],
    }),
  ),
  http.get("*/v1/financial-impact", ({ request }) => {
    const bps = clampBps(Number(new URL(request.url).searchParams.get("recovery_probability_bps") ?? 6000));
    return HttpResponse.json(liquidityReport(bps));
  }),
  http.get("*/v1/recommendations", () =>
    HttpResponse.json({
      items: [{
        id: "30000000-0000-4000-8000-000000000001",
        org_id: orgId,
        incident_id: incidentId,
        action: "Withhold reroute; offer an extension request",
        tier: 2,
        reasons: ["Ade Stores has a worst-case shortfall.", "The upstream dependency is shared and unverified."],
        evidence: ["Seeded simulation incident", "Shared upstream switch", "28 settled payments"],
        limitations: ["Recovery probability is an assumption, not received cash."],
        approval_required: true,
        simulated: true,
      }],
    }),
  ),
  http.post("*/v1/recommendations/:id/decision", async ({ request }) => {
    const body = (await request.json()) as { decision?: string; reason?: string | null };
    return HttpResponse.json({
      id: "60000000-0000-4000-8000-000000000001",
      org_id: orgId,
      recommendation_id: "30000000-0000-4000-8000-000000000001",
      approver_reference: "demo-approver",
      decision: body.decision === "reject" ? "reject" : "approve",
      reason: body.reason ?? null,
      decided_at: "2026-11-19T16:50:00+01:00",
      simulated: true,
    });
  }),
  http.get("*/v1/audit", () =>
    HttpResponse.json({
      items: [{
        id: "50000000-0000-4000-8000-000000000001",
        org_id: orgId,
        actor: "demo-approver",
        action: "seed_ade_stores",
        entity: { type: "organisation", id: orgId },
        occurred_at: "2026-11-19T16:30:00+01:00",
        previous_hash: null,
        hash: "a1b2c3d4e5f6",
        simulated: true,
      }],
    }),
  ),
  http.post("*/v1/simulator/seed", () =>
    HttpResponse.json({
      scenario: "ade-stores",
      branch: "shared",
      simulated: true,
      opening_available_kobo: adeStoresFixture.opening_available_kobo,
      settled_kobo: adeStoresFixture.settled_payments.amount_kobo,
      unknown_kobo: adeStoresFixture.unknown_payments.amount_kobo,
      obligation_kobo: adeStoresFixture.obligation.amount_kobo,
    }),
  ),
];
