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
