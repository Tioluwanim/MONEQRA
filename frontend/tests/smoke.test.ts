import { describe, expect, it } from "vitest";
import { formatKobo, MoneyInputError, toIntegerKobo } from "@/lib/money";

describe("frontend foundation", () => {
  it("is configured", () => expect(true).toBe(true));
});

describe("integer kobo formatting", () => {
  it("formats zero and whole naira", () => {
    expect(formatKobo(0)).toBe("₦0");
    expect(formatKobo(110000000)).toBe("₦1,100,000");
  });

  it("shows kobo only when non-zero", () => {
    expect(formatKobo("110000050")).toBe("₦1,100,000.50");
  });

  it("formats negatives and very large values", () => {
    expect(formatKobo(-11000000)).toBe("-₦110,000");
    expect(formatKobo("9007199254740991")).toBe("₦90,071,992,547,409.91");
  });

  it("rejects fractions and unsafe numbers", () => {
    expect(() => formatKobo(12.5)).toThrow(MoneyInputError);
    expect(() => formatKobo("12.5")).toThrow(MoneyInputError);
    expect(() => toIntegerKobo(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyInputError);
  });
});
