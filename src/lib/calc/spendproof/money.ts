/**
 * Money for SpendProof: integer micro-USD (1e-6 USD) at every boundary.
 *
 * The engine's arithmetic is exact-integer by construction — quantities and rates are integers, and
 * the only division (`quantity × rate / 1000`) is rounded once, at a named function. A dollar
 * amount never travels as a float between two steps.
 */
import type { MicroUsd } from "./types";

export const MICROS_PER_CENT = 10_000;
export const MICROS_PER_USD = 1_000_000;
/** Rates are declared per 1,000 billed units (how providers publish token prices). */
export const UNITS_PER_RATE_DENOMINATOR = 1_000;

/**
 * The engine's explicit failure type. Carries a rule id + the field path, so the API can answer
 * 400 with the rule the caller has to fix (AGENTS.md rule 5 — no silent fallbacks).
 */
export class SpendProofFieldError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(message);
    this.name = "SpendProofFieldError";
    this.ruleId = ruleId;
    this.fieldPath = fieldPath;
  }
}

/** A required money amount that arrives as a `$1,234.56`-style string, parsed exactly. */
export function parseUsdToMicros(text: string, fieldPath: string): MicroUsd {
  const cleaned = text.trim().replace(/\$/g, "").replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a plain USD amount (e.g. 3.00 or 1234.56); received ${JSON.stringify(text)}. Nothing was reconciled.`,
    );
  }
  const negative = cleaned.startsWith("-");
  const [whole, fraction = ""] = (negative ? cleaned.slice(1) : cleaned).split(".");
  if (fraction.length > 6) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` has more than 6 decimal places, which is finer than the engine's micro-USD unit; received ${JSON.stringify(text)}. Nothing was reconciled.`,
    );
  }
  const micros =
    Number(whole) * MICROS_PER_USD + Number(fraction.padEnd(6, "0") || "0");
  if (!Number.isSafeInteger(micros)) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` is outside the range the engine can hold exactly; received ${JSON.stringify(text)}. Nothing was reconciled.`,
    );
  }
  return negative ? -micros : micros;
}

/** A required integer count from an untrusted source (CSV cell, agent call). */
export function requireInteger(value: unknown, fieldPath: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a whole number of units; received ${JSON.stringify(value)}. Nothing was reconciled.`,
    );
  }
  if (parsed < 0) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must not be negative; received ${JSON.stringify(value)}. Nothing was reconciled.`,
    );
  }
  return parsed;
}

/**
 * The declared-charge recompute: quantity × the invoice's own declared rate.
 *
 * The only division in the money path, rounded once here. A product whose quantities × rates would
 * exceed the exact-integer range is REFUSED rather than silently degraded to a float: a
 * reconciliation that cannot be trusted to the micro-dollar is not a reconciliation.
 */
export function chargeFromDeclaredRate(
  quantity: number,
  unitPriceMicroUsdPerThousandUnits: number,
  fieldPath: string,
): MicroUsd {
  const product = quantity * unitPriceMicroUsdPerThousandUnits;
  if (!Number.isSafeInteger(product)) {
    throw new SpendProofFieldError(
      "sp-amount-out-of-range",
      fieldPath,
      `\`${fieldPath}\`: quantity × unit price exceeds the exact-integer range the engine computes in (${quantity} × ${unitPriceMicroUsdPerThousandUnits}). Split the line or scale the declared unit; nothing was reconciled.`,
    );
  }
  return Math.round(product / UNITS_PER_RATE_DENOMINATOR);
}

/** Half a cent per contributing ledger row: how far a per-row cent rounding can move a total. */
export function roundingToleranceMicros(rows: number): MicroUsd {
  return rows * (MICROS_PER_CENT / 2);
}

/** The declared reconciliation tolerance: `bps` basis points of an amount, never below rounding. */
export function declaredToleranceMicros(amountMicroUsd: MicroUsd, bps: number): MicroUsd {
  return Math.round((Math.abs(amountMicroUsd) * bps) / 10_000);
}

/** "$3.00", "-$0.30" — rounded once, at the point of display. */
export function formatMicros(micros: MicroUsd): string {
  const negative = micros < 0;
  const abs = Math.abs(micros);
  const whole = Math.floor(abs / MICROS_PER_USD);
  const cents = Math.round((abs % MICROS_PER_USD) / MICROS_PER_CENT);
  const padded = cents === 100 ? `${whole + 1}.00` : `${whole}.${String(cents).padStart(2, "0")}`;
  const grouped = padded.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}`;
}

/** "+$0.30" / "-$0.30" / "$0.00" — for a variance column. */
export function formatMicrosSigned(micros: MicroUsd): string {
  if (micros > 0) return `+${formatMicros(micros)}`;
  return formatMicros(micros);
}

/** A rate as it should be shown: "$0.0030 / 1K units". */
export function formatRatePerThousand(micros: MicroUsd): string {
  return `$${(micros / MICROS_PER_USD).toFixed(4)} / 1K units`;
}
