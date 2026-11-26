/**
 * Plain-language dictionary.
 *
 * The domain uses precise internal terms (unknown, settled, tier 2, shared
 * failure domain...). People using the product are business owners and finance
 * staff, so every screen says the same plain thing, from this one place.
 * Technical detail stays available behind "Show details" disclosures.
 */
import type { IncidentState, MoneyState, PaymentState } from "@/components/moneqra/types";

export type Tone = "good" | "wait" | "unsure" | "bad" | "estimate" | "brand" | "neutral";

export const paymentStateLabels: Record<PaymentState, { label: string; hint: string; tone: Tone }> = {
  created: { label: "Not sent yet", hint: "Created but not yet sent to the payment provider.", tone: "neutral" },
  pending: { label: "Waiting for provider", hint: "Sent to the provider. We are waiting for an answer.", tone: "wait" },
  unknown: { label: "Not confirmed yet", hint: "We cannot tell if the customer was charged. It is not counted as money you have.", tone: "unsure" },
  succeeded: { label: "Paid, on its way", hint: "The provider says it was paid, but it has not reached your account yet.", tone: "wait" },
  settled: { label: "In your account", hint: "The money has reached your account. You can count on it.", tone: "good" },
  failed: { label: "Failed", hint: "The provider confirmed it did not go through.", tone: "bad" },
  reversed: { label: "Reversed", hint: "The payment was undone after it went through.", tone: "neutral" },
};

export const moneyStateLabels: Record<MoneyState, { label: string; hint: string; tone: Tone }> = {
  confirmed: { label: "In your account", hint: "Money you can count on.", tone: "good" },
  pending: { label: "Due", hint: "An amount that has to be paid or is still on its way.", tone: "wait" },
  unknown: { label: "Not confirmed yet", hint: "We cannot count this as money you have.", tone: "unsure" },
  estimated: { label: "Estimate", hint: "Our best guess, not a promise.", tone: "estimate" },
};

export const incidentStateLabels: Record<IncidentState, { label: string; hint: string; tone: Tone }> = {
  suspected: { label: "Looks wrong, checking", hint: "Something looks off. We are checking it.", tone: "wait" },
  confirmed: { label: "Problem confirmed", hint: "We are confident the provider has a problem.", tone: "bad" },
  monitoring: { label: "Being handled", hint: "A response is under way and we are watching.", tone: "wait" },
  recovering: { label: "Recovering", hint: "Things are getting better.", tone: "brand" },
  resolved: { label: "Resolved", hint: "The problem is over.", tone: "good" },
};

export const severityLabels: Record<string, string> = {
  low: "Small problem",
  medium: "Moderate problem",
  high: "Serious problem",
  critical: "Critical problem",
};

export const routeVerdictLabels = {
  independent: {
    label: "Safe to switch",
    headline: "Yes, you can switch to the other provider.",
    hint: "The other provider does not depend on the system that is failing.",
    tone: "good" as Tone,
  },
  shared: {
    label: "Same failing system",
    headline: "No, switching would not help.",
    hint: "Both providers depend on the same failing system, so moving payments would not avoid the problem.",
    tone: "bad" as Tone,
  },
  unverifiable: {
    label: "Can't be sure",
    headline: "We can't be sure that switching would help.",
    hint: "We could not confirm what the other provider depends on, so we do not recommend switching.",
    tone: "unsure" as Tone,
  },
};

export const nodeKindLabels: Record<string, string> = {
  business: "Your business",
  merchant: "Your business",
  provider: "Payment provider",
  processor: "Processor",
  switch: "Network switch",
  bank: "Bank",
  rail: "Payment network",
};

export const roleLabels = {
  viewer: { label: "Viewer", hint: "Can look, cannot change anything." },
  operator: { label: "Operator", hint: "Can check payments with the provider." },
  approver: { label: "Approver", hint: "Can approve or decline recommendations." },
  admin: { label: "Admin", hint: "Can do everything, including loading demo data." },
} as const;

/** Short, human sentence for audit actions coming from the API. */
export function describeAuditAction(action: string): string {
  const key = action.toLowerCase().replace(/[_\s]+/g, ".");
  const known: Record<string, string> = {
    "recommendation.approved": "Approved the recommendation",
    "recommendation.rejected": "Declined the recommendation",
    "recommendation.approve": "Approved the recommendation",
    "recommendation.reject": "Declined the recommendation",
    "incident.opened": "Opened a payment problem",
    "incident.confirmed": "Confirmed the payment problem",
    "payment.verified": "Checked a payment with the provider",
    "seed.loaded": "Loaded the demo scenario",
  };
  if (known[key]) return known[key];
  const text = action.replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const coverageLabels = {
  covered: { label: "Covered", hint: "Money already in your account covers this.", tone: "good" as Tone },
  depends_on_unconfirmed: { label: "Only if waiting payments arrive", hint: "Covered only if payments we cannot confirm yet come in.", tone: "unsure" as Tone },
  at_risk: { label: "At risk", hint: "Not covered even if the waiting payments arrive as guessed.", tone: "bad" as Tone },
};

export const categoryLabels: Record<string, string> = {
  tax: "Tax",
  payroll: "Salaries",
  loan: "Loan repayment",
  rent_utilities: "Rent or utilities",
  supplier: "Supplier",
  other: "Other",
};

export const actionKindLabels = {
  request_extension: { label: "Ask for more time", short: "Ask for more time", hint: "Ask the other side to wait a few days." },
  split_payment: { label: "Pay in two parts", short: "Pay in two parts", hint: "Pay part now and the rest when money arrives." },
  pay_from_confirmed_first: { label: "Pay from money you have first", short: "Pay this first", hint: "Use confirmed money on this one before anything else." },
};

export const actionStatusLabels = {
  pending: { label: "Waiting for approval", tone: "wait" as Tone },
  approved: { label: "Approved, not done yet", tone: "brand" as Tone },
  rejected: { label: "Declined", tone: "neutral" as Tone },
  completed: { label: "Done", tone: "good" as Tone },
};
