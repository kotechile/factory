/**
 * Money arithmetic for FFRProof: integer CENTS at every boundary (1 USD = 100).
 *
 * There is no division in the money path — every figure is an integer count of cents, so the only
 * rounding is the one at the point of display (`formatCents`). Percentages are integer basis points
 * (1% = 100) so a match fraction or a prior-approval threshold is never a float either.
 */
import type { Cents } from "./types";

export const CENTS_PER_USD = 100;
export const BASIS_POINTS_PER_PERCENT = 100;

/** The engine's explicit failure type — carries a rule id and field path for a loud 400. */
export class FFRProofFieldError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(message);
    this.name = "FFRProofFieldError";
    this.ruleId = ruleId;
    this.fieldPath = fieldPath;
  }
}

/** A required non-negative integer. */
export function requireInteger(value: unknown, fieldPath: string, min = 0): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new FFRProofFieldError(
      "ffr-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a whole number${min > 0 ? ` of at least ${min}` : " of zero or more"}; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return parsed;
}

/**
 * Parses a decimal string into integer cents, exactly. More than 2 decimals is refused rather than
 * rounded — a money figure finer than a cent is not the figure the engine represents.
 */
export function parseUsdToCents(text: string, fieldPath: string): Cents {
  const cleaned = String(text).trim().replace(/,/g, "").replace(/^\$/, "");
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (!match) {
    throw new FFRProofFieldError(
      "ffr-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a plain dollar amount; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  const negative = match[1] === "-";
  const whole = match[2];
  const fraction = match[3] ?? "";
  if (fraction.length > 2) {
    throw new FFRProofFieldError(
      "ffr-field-invalid",
      fieldPath,
      `\`${fieldPath}\` carries ${fraction.length} decimals, finer than the cent this engine represents; received ${JSON.stringify(text)}. It was not rounded. Nothing was audited.`,
    );
  }
  const value = Number(whole) * CENTS_PER_USD + Number((fraction + "00").slice(0, 2) || "0");
  if (!Number.isSafeInteger(value)) {
    throw new FFRProofFieldError(
      "ffr-field-invalid",
      fieldPath,
      `\`${fieldPath}\` is outside the exact-integer range this engine computes in; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  return negative ? -value : value;
}

/** "$1,234.56" — rounded once, at the point of display. */
export function formatCents(cents: Cents): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / CENTS_PER_USD);
  const frac = abs % CENTS_PER_USD;
  const grouped = `${whole}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}.${String(frac).padStart(2, "0")}`;
}

/** "+$750.00" / "-$750.00" / "$0.00". */
export function formatCentsSigned(cents: Cents): string {
  return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}

/** "20.00%" from integer basis points. */
export function formatBps(bps: number): string {
  const sign = bps < 0 ? "-" : "";
  const abs = Math.abs(bps);
  const whole = Math.floor(abs / BASIS_POINTS_PER_PERCENT);
  const frac = abs % BASIS_POINTS_PER_PERCENT;
  return `${sign}${whole}.${String(frac).padStart(2, "0")}%`;
}
