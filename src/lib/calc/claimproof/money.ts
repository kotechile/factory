/**
 * Money and time arithmetic for ClaimProof: integers at every boundary.
 *
 *   • money — integer CENTS (1 USD = 100)
 *   • time  — integer TENTHS of an hour (1 h = 10)
 *
 * The only division in the money path is labour dollars = allowedTenths × hourlyRateCents ÷ 10,
 * rounded exactly once.
 */
import type { Cents, TenthsOfHour } from "./types";

export const CENTS_PER_USD = 100;
export const TENTHS_PER_HOUR = 10;

/** The engine's explicit failure type — carries a rule id and field path for a loud 400. */
export class ClaimProofFieldError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(message);
    this.name = "ClaimProofFieldError";
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
    throw new ClaimProofFieldError(
      "cp-field-invalid",
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
    throw new ClaimProofFieldError(
      "cp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a plain dollar amount; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  const negative = match[1] === "-";
  const whole = match[2];
  const fraction = match[3] ?? "";
  if (fraction.length > 2) {
    throw new ClaimProofFieldError(
      "cp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` carries ${fraction.length} decimals, finer than the cent this engine represents; received ${JSON.stringify(text)}. It was not rounded. Nothing was audited.`,
    );
  }
  const value = Number(whole) * CENTS_PER_USD + Number((fraction + "00").slice(0, 2) || "0");
  if (!Number.isSafeInteger(value)) {
    throw new ClaimProofFieldError(
      "cp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` is outside the exact-integer range this engine computes in; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  return negative ? -value : value;
}

/** A required hour value ("4.5" or "4½" rejected; use a decimal) as integer tenths. */
export function parseHoursToTenths(text: string, fieldPath: string): TenthsOfHour {
  const cleaned = String(text).trim().replace(/h(ou)?rs?\.?$/i, "").trim();
  const match = /^(-)?(\d+)(?:\.(\d))?$/.exec(cleaned);
  if (!match) {
    throw new ClaimProofFieldError(
      "cp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be an hour value with at most one decimal (e.g. "4.5"); received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  const negative = match[1] === "-";
  const whole = match[2];
  const tenths = match[3] ?? "0";
  const value = Number(whole) * TENTHS_PER_HOUR + Number(tenths);
  if (!Number.isSafeInteger(value)) {
    throw new ClaimProofFieldError(
      "cp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` is outside the exact-integer range this engine computes in; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  return negative ? -value : value;
}

/**
 * Labour dollars = allowed hours × hourly rate, as integer cents, rounded half-up once.
 * `allowedTenths × rateCents ÷ 10`.
 */
export function laborCents(allowedTenths: TenthsOfHour, rateCentsPerHour: Cents): Cents {
  const product = allowedTenths * rateCentsPerHour;
  if (!Number.isSafeInteger(product)) {
    throw new ClaimProofFieldError(
      "cp-out-of-range",
      "labor",
      `Allowed labour ${allowedTenths} tenths × ${rateCentsPerHour}¢/h exceeds the exact-integer range this engine computes in. Nothing was audited.`,
    );
  }
  return Math.round(product / TENTHS_PER_HOUR);
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

/** "4.5 h" from integer tenths. */
export function formatTenths(tenths: TenthsOfHour): string {
  const whole = Math.floor(tenths / TENTHS_PER_HOUR);
  const frac = tenths % TENTHS_PER_HOUR;
  return frac === 0 ? `${whole} h` : `${whole}.${frac} h`;
}
