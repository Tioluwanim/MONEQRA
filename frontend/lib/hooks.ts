"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { apiRequest } from "./api-client";
import { z } from "zod";

export const paymentListSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    org_id: z.string(),
    provider_node_id: z.string(),
    provider_reference: z.string(),
    amount_kobo: z.number().int().nonnegative(),
    currency: z.string(),
    state: z.enum(["created", "pending", "unknown", "succeeded", "settled", "failed", "reversed"]),
    settled_at: z.string().nullable().optional(),
    retry_eligible: z.boolean().optional(),
    simulated: z.boolean(),
  })),
  next_cursor: z.string().nullable(),
});

export const incidentListSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    org_id: z.string(),
    subject_node_id: z.string(),
    state: z.enum(["suspected", "confirmed", "monitoring", "recovering", "resolved"]),
    severity: z.string(),
    opened_at: z.string(),
    resolved_at: z.string().nullable().optional(),
    simulated: z.boolean(),
  })),
});

export const incidentDetailSchema = incidentListSchema.shape.items.element.extend({
  transitions: z.array(z.object({
    from_state: z.string(),
    to_state: z.string(),
    occurred_at: z.string(),
    evidence: z.record(z.string(), z.unknown()),
  })),
});

export const dependencySchema = z.object({
  nodes: z.array(z.record(z.string(), z.unknown())),
  edges: z.array(z.object({
    from_node_id: z.string(),
    to_node_id: z.string(),
    status: z.enum(["known", "unknown"]),
    source_note: z.string(),
  })),
});

export const liquiditySchema = z.object({
  available_funds_kobo: z.number().int(),
  obligations_due_kobo: z.number().int(),
  worst_case_position_kobo: z.number().int(),
  scenario_recovery_kobo: z.number().int(),
  scenario_position_kobo: z.number().int(),
  recovery_probability_bps: z.number().int(),
  no_recovery: z.object({ scenario_position_kobo: z.number().int() }).passthrough(),
  full_recovery: z.object({ scenario_position_kobo: z.number().int() }).passthrough(),
  inputs: z.array(z.string()).optional(),
  assumptions: z.array(z.record(z.string(), z.unknown())).optional(),
  limitations: z.array(z.string()).optional(),
  simulated: z.boolean(),
});

export const recommendationSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    org_id: z.string(),
    incident_id: z.string(),
    action: z.string(),
    tier: z.union([z.literal(1), z.literal(2)]),
    reasons: z.array(z.string()),
    evidence: z.array(z.string()),
    limitations: z.array(z.string()),
    approval_required: z.boolean(),
    simulated: z.boolean(),
  })),
});

export const auditSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    org_id: z.string(),
    actor: z.string(),
    action: z.string(),
    entity: z.object({ type: z.string(), id: z.string().nullable() }),
    occurred_at: z.string(),
    previous_hash: z.string().nullable(),
    hash: z.string(),
    simulated: z.boolean(),
  })),
});

export type Payment = z.infer<typeof paymentListSchema>["items"][number];

export function usePayments() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["payments", auth.orgId, auth.role],
    queryFn: ({ signal }) => apiRequest("/v1/payments", paymentListSchema, auth.credential, signal),
    refetchInterval: () => (typeof document === "undefined" || document.visibilityState === "hidden" ? false : 15000),
  });
}

export function useIncidents() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["incidents", auth.orgId, auth.role],
    queryFn: ({ signal }) => apiRequest("/v1/incidents", incidentListSchema, auth.credential, signal),
    refetchInterval: () => (typeof document === "undefined" || document.visibilityState === "hidden" ? false : 15000),
  });
}

export function useIncident(id?: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: ["incident", auth.orgId, auth.role, id],
    enabled: Boolean(id),
    queryFn: ({ signal }) => apiRequest(`/v1/incidents/${id}`, incidentDetailSchema, auth.credential, signal),
  });
}

export function useDependencyGraph() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["dependency", auth.orgId, auth.role],
    queryFn: ({ signal }) => apiRequest("/v1/dependency-graph", dependencySchema, auth.credential, signal),
  });
}

const obligationListSchema = z.object({
  items: z.array(z.object({ due_at: z.string(), status: z.string() }).passthrough()),
});
const FALLBACK_DEADLINE = "2026-11-19T17:00:00+01:00";

export function useFinancialImpact(probabilityBps = 6000) {
  const auth = useAuth();
  return useQuery({
    queryKey: ["financial-impact", auth.orgId, auth.role, probabilityBps],
    queryFn: async ({ signal }) => {
      // The deadline is the due time of the open obligation, not a hard-coded value.
      let deadline = FALLBACK_DEADLINE;
      try {
        const obligations = await apiRequest("/v1/obligations", obligationListSchema, auth.credential, signal);
        const due = obligations.items.filter((o) => o.status === "open").map((o) => o.due_at).sort()[0];
        if (due) deadline = due;
      } catch {
        // Keep the fallback so the screen still renders.
      }
      return apiRequest(
        `/v1/financial-impact?deadline=${encodeURIComponent(deadline)}&recovery_probability_bps=${probabilityBps}`,
        liquiditySchema,
        auth.credential,
        signal,
      );
    },
  });
}

export function useRecommendations() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["recommendations", auth.orgId, auth.role],
    queryFn: ({ signal }) => apiRequest("/v1/recommendations", recommendationSchema, auth.credential, signal),
  });
}

export function useAudit() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["audit", auth.orgId, auth.role],
    queryFn: ({ signal }) => apiRequest("/v1/audit", auditSchema, auth.credential, signal),
  });
}

export function useDecisionMutation() {
  const auth = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: "approve" | "reject"; reason?: string }) =>
      apiRequest(`/v1/recommendations/${id}/decision`, z.object({
        id: z.string(),
        org_id: z.string(),
        recommendation_id: z.string(),
        approver_reference: z.string(),
        decision: z.enum(["approve", "reject"]),
        reason: z.string().nullable(),
        decided_at: z.string(),
        simulated: z.boolean(),
      }), auth.credential, undefined, {
        method: "POST",
        body: JSON.stringify({ decision, reason }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["recommendations", auth.orgId, auth.role] });
      void client.invalidateQueries({ queryKey: ["audit", auth.orgId, auth.role] });
    },
  });
}

export const coverageSchema = z.object({
  recovery_probability_bps: z.number().int(),
  confirmed_funds_kobo: z.number().int(),
  assumed_unconfirmed_kobo: z.number().int(),
  total_due_kobo: z.number().int(),
  covered_kobo: z.number().int(),
  depends_on_unconfirmed_kobo: z.number().int(),
  at_risk_kobo: z.number().int(),
  limitations: z.array(z.string()),
  simulated: z.boolean(),
  items: z.array(z.object({
    obligation_id: z.string(),
    label: z.string(),
    category: z.string(),
    amount_kobo: z.number().int(),
    due_at: z.string(),
    status: z.enum(["covered", "depends_on_unconfirmed", "at_risk"]),
    from_confirmed_kobo: z.number().int(),
    from_unconfirmed_kobo: z.number().int(),
    shortfall_kobo: z.number().int(),
    suggested_action: z.enum(["request_extension", "split_payment", "pay_from_confirmed_first"]).nullable(),
  })),
});
export type CoverageItem = z.infer<typeof coverageSchema>["items"][number];
export type ActionKind = NonNullable<CoverageItem["suggested_action"]>;

export const actionSchema = z.object({
  id: z.string(),
  obligation_id: z.string(),
  obligation_label: z.string(),
  kind: z.enum(["request_extension", "split_payment", "pay_from_confirmed_first"]),
  note: z.string(),
  proposed_amount_kobo: z.number().int().nullable(),
  status: z.enum(["pending", "approved", "rejected", "completed"]),
  requested_by: z.string(),
  decided_by: z.string().nullable(),
  decision_reason: z.string().nullable(),
  outcome_note: z.string().nullable(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  simulated: z.boolean(),
});
export type CoordinationAction = z.infer<typeof actionSchema>;
const actionListSchema = z.object({ items: z.array(actionSchema) });

export function useCoverage(probabilityBps = 6000) {
  const auth = useAuth();
  return useQuery({
    queryKey: ["coverage", auth.orgId, auth.role, probabilityBps],
    queryFn: ({ signal }) =>
      apiRequest(`/v1/coverage?recovery_probability_bps=${probabilityBps}`, coverageSchema, auth.credential, signal),
  });
}

export function useCoordinationActions() {
  const auth = useAuth();
  return useQuery({
    queryKey: ["coordination-actions", auth.orgId, auth.role],
    queryFn: ({ signal }) => apiRequest("/v1/coordination-actions", actionListSchema, auth.credential, signal),
  });
}

export function useCoordinationMutations() {
  const auth = useAuth();
  const client = useQueryClient();
  const refresh = () => {
    // Invalidate for every role: switching "Viewing as" must not show a stale list.
    void client.invalidateQueries({ queryKey: ["coordination-actions"] });
    void client.invalidateQueries({ queryKey: ["audit"] });
  };
  const post = (path: string, body: unknown) =>
    apiRequest(path, actionSchema, auth.credential, undefined, { method: "POST", body: JSON.stringify(body) });
  return {
    create: useMutation({
      mutationFn: (b: { obligation_id: string; kind: ActionKind; note?: string; proposed_amount_kobo?: number }) =>
        post("/v1/coordination-actions", b),
      onSuccess: refresh,
    }),
    decide: useMutation({
      mutationFn: ({ id, decision, reason }: { id: string; decision: "approve" | "reject"; reason?: string }) =>
        post(`/v1/coordination-actions/${id}/decision`, { decision, reason: reason ?? "" }),
      onSuccess: refresh,
    }),
    complete: useMutation({
      mutationFn: ({ id, outcome_note }: { id: string; outcome_note: string }) =>
        post(`/v1/coordination-actions/${id}/complete`, { outcome_note }),
      onSuccess: refresh,
    }),
  };
}
