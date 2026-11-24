import { describe, expect, it } from "vitest";
import { adeStoresFixture } from "@/mocks/ade-stores";
import { server } from "@/mocks/server";
import { afterAll, beforeAll } from "vitest";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("Ade Stores mock contract", () => {
  it("uses integer kobo and the required three positions", () => {
    expect(adeStoresFixture.opening_available_kobo).toBe(15000000);
    expect(adeStoresFixture.settled_payments.amount_kobo).toBe(84000000);
    expect(adeStoresFixture.unknown_payments.amount_kobo).toBe(36000000);
    expect(adeStoresFixture.obligation.amount_kobo).toBe(110000000);
    expect(adeStoresFixture.scenarios.no_recovery.position_kobo).toBe(-11000000);
    expect(adeStoresFixture.scenarios.assumed_recovery.position_kobo).toBe(10600000);
    expect(adeStoresFixture.scenarios.full_recovery.position_kobo).toBe(25000000);
  });
});
