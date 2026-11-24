export const adeStoresFixture = {
  opening_available_kobo: 15000000,
  settled_payments: { count: 28, amount_kobo: 84000000 },
  unknown_payments: { count: 12, amount_kobo: 36000000 },
  obligation: { label: "Ade Stores supplier obligation", amount_kobo: 110000000, due_at: "2026-11-19T17:00:00+01:00" },
  scenarios: {
    no_recovery: { recovery_probability_bps: 0, recovery_kobo: 0, position_kobo: -11000000 },
    assumed_recovery: { recovery_probability_bps: 6000, recovery_kobo: 21600000, position_kobo: 10600000 },
    full_recovery: { recovery_probability_bps: 10000, recovery_kobo: 36000000, position_kobo: 25000000 },
  },
};
