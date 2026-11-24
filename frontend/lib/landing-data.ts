export const landingData = {
  openingAvailableKobo: 15000000,
  settledCount: 28,
  settledKobo: 84000000,
  unknownCount: 12,
  unknownKobo: 36000000,
  obligationKobo: 110000000,
  obligationDue: "17:00",
  scenarios: [
    { label: "No recovery", positionKobo: -11000000, assumptionBps: 0 },
    { label: "Assumed recovery", positionKobo: 10600000, assumptionBps: 6000 },
    { label: "Full recovery", positionKobo: 25000000, assumptionBps: 10000 },
  ],
} as const;
