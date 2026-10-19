/**
 * Money and demand arithmetic for RatchetProof: integers at every boundary.
 *
 *   • demand — integer milli-kilowatts (1 kW = 1,000)
 *   • money  — integer micro-USD (1 USD = 1,000,000)
 *   • ratchet percent — integer basis points internally (75% = 7,500)
 *
 * The only divisions in the demand/money path are `applyBasisPoints` (peak × pct) and `demandCharge`
 * (kW × $/kW), and each is rounded exactly once, in a named function.
 */
import type { MicroUsd, MilliKw } from "./types";

export const MICROS_PER_CENT = 10_000;
export const MICROS_PER_USD = 1_000_000;
export const MILLI_KW_PER_KW = 1_000;
export const BASIS_POINTS_PER_PERCENT = 100;
export const BASIS_POINTS_FULL = 10_000;

/**
 * The engine's explicit failure type. Carries a rule id and a field path, so the API can answer 400
 * with the thing the caller has to fix (AGENTS.md rule 5 — no silent fallbacks).
 */
export class RatchetProofFieldError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(message);
    this.name = "RatchetProofFieldError";
    this.ruleId = ruleId;
    this.fieldPath = fieldPath;
  }
}

/**
 * Parses a decimal string into an integer count of `scale` units, exactly.
 *
 * `parseScaled("120.5", 1000)` → 120500. More decimal places than the scale allows is refused rather
 * than rounded: a demand figure the file carries to four decimals is not the figure the engine can
 * represent, and silently trimming it would move a peak.
 */
export function parseScaledDecimal(
  text: string,
  scale: number,
  fieldPath: string,
): number {
  const cleaned = String(text).trim().replace(/,/g, "").replace(/^\$/, "");
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(cleaned);
  if (!match) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a plain decimal number; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  const negative = match[1] === "-";
  const whole = match[2];
  const fraction = match[3] ?? "";
  const decimals = String(scale).length - 1;
  if (fraction.length > decimals) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` carries ${fraction.length} decimal places, finer than the ${decimals} this engine represents; received ${JSON.stringify(text)}. It was not rounded. Nothing was audited.`,
    );
  }
  const value =
    Number(whole) * scale + Number((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
  if (!Number.isSafeInteger(value)) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` is outside the exact-integer range this engine computes in; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  return negative ? -value : value;
}

/** A required demand value in kW (up to 3 decimals) as integer milli-kW. */
export function parseKilowatts(text: string, fieldPath: string): MilliKw {
  return parseScaledDecimal(text, MILLI_KW_PER_KW, fieldPath);
}

/** A required USD amount (up to 6 decimals) as integer micro-USD. */
export function parseUsdToMicros(text: string, fieldPath: string): MicroUsd {
  return parseScaledDecimal(text, MICROS_PER_USD, fieldPath);
}

/** A required percentage (up to 2 decimals) as integer basis points. */
export function parsePercentToBasisPoints(text: string, fieldPath: string): number {
  const points = parseScaledDecimal(text, BASIS_POINTS_PER_PERCENT, fieldPath);
  if (points < 0 || points > BASIS_POINTS_FULL) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be between 0% and 100%; received ${JSON.stringify(text)}. Nothing was audited.`,
    );
  }
  return points;
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
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a whole number${min > 0 ? ` of at least ${min}` : " of zero or more"}; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return parsed;
}

/**
 * `peak × percent`, in milli-kW, rounded half-up once.
 *
 * Half-up (not truncation) because a utility's tariff arithmetic rounds the same way; truncating a
 * 0.5 kW would understate a floor by up to a kilowatt on every month that bills against it.
 */
export function applyBasisPoints(valueMilli: MilliKw, basisPoints: number): MilliKw {
  const product = valueMilli * basisPoints;
  if (!Number.isSafeInteger(product)) {
    throw new RatchetProofFieldError(
      "rp-out-of-range",
      "tariff.ratchetPercent",
      `A peak of ${valueMilli} milli-kW × ${basisPoints} basis points exceeds the exact-integer range this engine computes in. Split the meter series by year; nothing was audited.`,
    );
  }
  return Math.floor((product + BASIS_POINTS_FULL / 2) / BASIS_POINTS_FULL);
}

/**
 * The inverse of `applyBasisPoints`: the smallest peak whose ratchet value reachies `floorMilli`.
 * Used by the counterfactual ("how far would that interval have to fall?").
 */
export function peakRequiredForFloor(floorMilli: MilliKw, basisPoints: number): MilliKw {
  if (basisPoints <= 0) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      "tariff.ratchetPercent",
      "A ratchet floor cannot be produced by a 0% ratchet; there is no peak to solve for. Nothing was audited.",
    );
  }
  return Math.ceil((floorMilli * BASIS_POINTS_FULL) / basisPoints);
}

/** (billed − metered) kW × $/kW, as integer micro-USD, rounded once. */
export function demandChargeMicroUsd(
  kwMilli: MilliKw,
  rateMicroUsdPerKw: MicroUsd,
): MicroUsd {
  const product = kwMilli * rateMicroUsdPerKw;
  if (!Number.isSafeInteger(product)) {
    throw new RatchetProofFieldError(
      "rp-out-of-range",
      "ledger.rate",
      `A demand delta of ${kwMilli} milli-kW × ${rateMicroUsdPerKw} micro-USD/kW exceeds the exact-integer range this engine computes in. Nothing was audited.`,
    );
  }
  return Math.round(product / MILLI_KW_PER_KW);
}

/** "$1,234.56" — rounded once, at the point of display. */
export function formatMicros(micros: MicroUsd): string {
  const negative = micros < 0;
  const abs = Math.abs(micros);
  const whole = Math.floor(abs / MICROS_PER_USD);
  const cents = Math.round((abs % MICROS_PER_USD) / MICROS_PER_CENT);
  const padded = cents === 100 ? `${whole + 1}.00` : `${whole}.${String(cents).padStart(2, "0")}`;
  const grouped = padded.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}$${grouped}`;
}

/** "+$750.00" / "-$750.00" / "$0.00". */
export function formatMicrosSigned(micros: MicroUsd): string {
  return micros > 0 ? `+${formatMicros(micros)}` : formatMicros(micros);
}

/** "1,000.0 kW" — one decimal is how a bill prints a demand. */
export function formatKw(kwMilli: MilliKw): string {
  const negative = kwMilli < 0;
  const abs = Math.abs(kwMilli);
  const whole = Math.floor(abs / MILLI_KW_PER_KW);
  const tenths = Math.round((abs % MILLI_KW_PER_KW) / 100);
  const value = tenths === 10 ? `${whole + 1}.0` : `${whole}.${String(tenths).padStart(1, "0")}`;
  const grouped = value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped} kW`;
}

/** "$15.00 / kW". */
export function formatRate(rateMicroUsdPerKw: MicroUsd): string {
  return `${formatMicros(rateMicroUsdPerKw)} / kW`;
}
