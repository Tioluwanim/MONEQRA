export type DemoRole = "viewer" | "operator" | "approver" | "admin";
export type MoneyState = "confirmed" | "pending" | "unknown" | "estimated";
export type PaymentState =
  | "created"
  | "pending"
  | "unknown"
  | "succeeded"
  | "settled"
  | "failed"
  | "reversed";
export type IncidentState =
  | "suspected"
  | "confirmed"
  | "monitoring"
  | "recovering"
  | "resolved";
