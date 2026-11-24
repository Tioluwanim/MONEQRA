export type MoneyInput = number | bigint | string;

export class MoneyInputError extends Error {
  constructor() {
    super("Money input must be an integer kobo value.");
    this.name = "MoneyInputError";
  }
}

export function toIntegerKobo(input: MoneyInput): bigint {
  if (typeof input === "number") {
    if (!Number.isSafeInteger(input)) {
      throw new MoneyInputError();
    }
    return BigInt(input);
  }
  if (typeof input === "bigint") {
    return input;
  }
  if (!/^-?\d+$/.test(input)) {
    throw new MoneyInputError();
  }
  return BigInt(input);
}

export function formatKobo(input: MoneyInput): string {
  const kobo = toIntegerKobo(input);
  const ZERO = BigInt(0);
  const HUNDRED = BigInt(100);
  const negative = kobo < ZERO;
  const absolute = negative ? -kobo : kobo;
  const naira = absolute / HUNDRED;
  const remainder = absolute % HUNDRED;
  const nairaText = naira.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const koboText = remainder === ZERO ? "" : `.${remainder.toString().padStart(2, "0")}`;
  return `${negative ? "-" : ""}₦${nairaText}${koboText}`;
}
