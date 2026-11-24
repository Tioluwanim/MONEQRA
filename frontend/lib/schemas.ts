import { z } from "zod";

export const paymentSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  provider_node_id: z.string().uuid(),
  provider_reference: z.string(),
  amount_kobo: z.number().int().nonnegative(),
  currency: z.literal("NGN"),
  state: z.enum(["created", "pending", "unknown", "succeeded", "settled", "failed", "reversed"]),
  settled_at: z.string().nullable().optional(),
  retry_eligible: z.boolean().optional(),
  simulated: z.boolean(),
});

export const paymentListSchema = z.object({
  items: z.array(paymentSchema),
  next_cursor: z.string().nullable(),
});

export const liquiditySchema = z.object({
  opening_available_kobo: z.number().int(),
  obligations_due_kobo: z.number().int(),
  worst_case_position_kobo: z.number().int(),
  scenario_position_kobo: z.number().int(),
  no_recovery: z.object({ scenario_position_kobo: z.number().int() }),
  full_recovery: z.object({ scenario_position_kobo: z.number().int() }),
  recovery_probability_bps: z.number().int().min(0).max(10000),
  simulated: z.boolean(),
});

export const recommendationSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  incident_id: z.string().uuid(),
  action: z.string(),
  tier: z.union([z.literal(1), z.literal(2)]),
  reasons: z.array(z.string()),
  evidence: z.array(z.string()),
  limitations: z.array(z.string()),
  approval_required: z.boolean(),
  simulated: z.boolean(),
});

export const recommendationListSchema = z.object({
  items: z.array(recommendationSchema),
});

export const auditSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    org_id: z.string().uuid(),
    actor: z.string(),
    action: z.string(),
    entity: z.object({ type: z.string(), id: z.string().nullable() }),
    occurred_at: z.string(),
    previous_hash: z.string().nullable(),
    hash: z.string(),
    simulated: z.boolean(),
  })),
});

export type Payment = z.infer<typeof paymentSchema>;
