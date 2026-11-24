import { http, HttpResponse } from "msw";
import { adeStoresFixture } from "./ade-stores";

const orgId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const providerId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";

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
  http.get("*/v1/financial-impact", () =>
    HttpResponse.json({
      opening_available_kobo: adeStoresFixture.opening_available_kobo,
      obligations_due_kobo: adeStoresFixture.obligation.amount_kobo,
      worst_case_position_kobo: adeStoresFixture.scenarios.no_recovery.position_kobo,
      scenario_position_kobo: adeStoresFixture.scenarios.assumed_recovery.position_kobo,
      no_recovery: { scenario_position_kobo: adeStoresFixture.scenarios.no_recovery.position_kobo },
      full_recovery: { scenario_position_kobo: adeStoresFixture.scenarios.full_recovery.position_kobo },
      recovery_probability_bps: 6000,
      simulated: true,
    }),
  ),
  http.get("*/v1/recommendations", () =>
    HttpResponse.json({
      items: [{
        id: "30000000-0000-4000-8000-000000000001",
        org_id: orgId,
        incident_id: "40000000-0000-4000-8000-000000000001",
        action: "Withhold reroute; offer an extension request",
        tier: 2,
        reasons: ["Ade Stores has a worst-case shortfall."],
        evidence: ["Seeded simulation incident", "Shared upstream switch"],
        limitations: ["Recovery probability is an assumption."],
        approval_required: true,
        simulated: true,
      }],
    }),
  ),
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
];
