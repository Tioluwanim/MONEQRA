/**
 * Ade Stores demo finance — deterministic, integer-only arithmetic.
 *
 * Money is integer kobo (1 naira = 100 kobo). Recovery assumptions are
 * integer basis points (10,000 = 100%). Recovery is rounded DOWN so an
 * assumption never creates cash the business does not have.
 *
 * These figures are illustrative simulation data. An assumed recovery is
 * never presented as money received.
 */
import { landingData } from "./landing-data";

export const adeStores = {
  name: "Ade Stores",
  openingAvailableKobo: BigInt(landingData.openingAvailableKobo),
  settledCount: landingData.settledCount,
  settledKobo: BigInt(landingData.settledKobo),
  unknownCount: landingData.unknownCount,
  unknownKobo: BigInt(landingData.unknownKobo),
  obligationLabel: "Supplier obligation due at 17:00",
  obligationKobo: BigInt(landingData.obligationKobo),
  deadline: "17:00",
  incidentAt: "14:10",
} as const;

export type LiquidityPosition = {
  availableKobo: bigint;
  obligationKobo: bigint;
  worstCaseKobo: bigint;
  unresolvedKobo: bigint;
  recoveryBps: number;
  recoveryKobo: bigint;
  scenarioKobo: bigint;
  /** Number views for charts only — never used for arithmetic. */
  chart: {
    available: number;
    obligation: number;
    worstCase: number;
    recovery: number;
    scenario: number;
  };
};

export function clampBps(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10_000, Math.max(0, Math.round(value)));
}

export function calculateLiquidity(recoveryBps: number): LiquidityPosition {
  const bps = clampBps(recoveryBps);
  const availableKobo = adeStores.openingAvailableKobo + adeStores.settledKobo;
  const worstCaseKobo = availableKobo - adeStores.obligationKobo;
  // floor division for non-negative bigints is plain BigInt division.
  const recoveryKobo = (adeStores.unknownKobo * BigInt(bps)) / BigInt(10_000);
  const scenarioKobo = worstCaseKobo + recoveryKobo;

  return {
    availableKobo,
    obligationKobo: adeStores.obligationKobo,
    worstCaseKobo,
    unresolvedKobo: adeStores.unknownKobo,
    recoveryBps: bps,
    recoveryKobo,
    scenarioKobo,
    chart: {
      available: Number(availableKobo),
      obligation: Number(adeStores.obligationKobo),
      worstCase: Number(worstCaseKobo),
      recovery: Number(recoveryKobo),
      scenario: Number(scenarioKobo),
    },
  };
}

export type RouteRelationship = "shared" | "independent" | "unverifiable";

export type DemoRecommendation = {
  action: string;
  tier: 1 | 2;
  summary: string;
  reasons: string[];
  evidence: string[];
  risks: string[];
  limitations: string[];
  confidence: string;
};

export function deriveDemoRecommendation(
  relationship: RouteRelationship,
  position: LiquidityPosition,
): DemoRecommendation {
  const shortfall = position.worstCaseKobo < BigInt(0);
  const baseEvidence = [
    `${adeStores.settledCount} verified settled payments`,
    `${adeStores.unknownCount} unknown payments · retries blocked`,
    "One obligation due at 17:00",
  ];
  const baseLimitations = [
    "Recovery percentages are assumptions, not received funds.",
    "A payment succeeding later is not necessarily available before the deadline.",
    "All figures are simulated demonstration data.",
  ];

  if (!shortfall) {
    return {
      action: "Wait and keep verifying the unknown payments",
      tier: 1,
      summary: "Confirmed cash already covers the obligation. No consequential change is needed.",
      reasons: ["The confirmed position is at or above the obligation.", "Unknown payments stay excluded from cash."],
      evidence: baseEvidence,
      risks: ["Settlement timing can still change the confirmed position."],
      limitations: baseLimitations,
      confidence: "High on the confirmed position; settlement timing remains an input.",
    };
  }

  if (relationship === "independent") {
    return {
      action: "Route new checkouts to Provider B; keep verifying the 12",
      tier: 2,
      summary: "The alternative route is verified independent, so new payments can avoid the failing switch. This does not create cash for today's obligation.",
      reasons: [
        "No known upstream node is shared with the failing route.",
        "Every link on both paths is known, so independence is established.",
        "The worst-case position is short, so new inflows may still help later receipts.",
      ],
      evidence: [...baseEvidence, "Provider B ends at an independent switch"],
      risks: ["New inflows may not settle before the 17:00 deadline.", "Verification of the 12 unknown payments must continue."],
      limitations: baseLimitations,
      confidence: "High on route independence; low on any recovery before the deadline.",
    };
  }

  const isShared = relationship === "shared";
  return {
    action: "Withhold reroute; request an extension from the supplier",
    tier: 2,
    summary: isShared
      ? "Provider B reaches the same failing switch, so switching would not remove the failure. Ask for time and keep verifying."
      : "Route independence cannot be verified, so switching is withheld. Ask for time and keep verifying.",
    reasons: isShared
      ? ["Both routes share the failing upstream switch.", "A switch would move traffic, not remove the failure.", "The worst-case position is short."]
      : ["An upstream link is unverified.", "MONEQRA does not recommend an unverified route.", "The worst-case position is short."],
    evidence: [...baseEvidence, isShared ? "Both paths reach Switch S" : "One upstream link is marked unknown"],
    risks: ["The supplier may decline an extension.", "Unknown payments must not be retried without evidence."],
    limitations: baseLimitations,
    confidence: isShared ? "High on the shared failure domain; recovery remains an assumption." : "High on the absence of proof; the true topology is unknown.",
  };
}
