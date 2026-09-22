/**
 * Money, percentages and the two numerical solvers CaseProof needs (IRR and break-even bisection).
 *
 * Everything is integer cents at the boundary. Floats appear only inside a solver/ratio and are
 * rounded back to cents at the line that publishes a number, so two runs of the same case on
 * different machines produce the same report.
 */

const CS = 100;

/** The engine's explicit failure type. Carries a rule id, so the API returns 400 + the rule. */
export class CaseProofInputError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(message);
    this.name = "CaseProofInputError";
    this.ruleId = ruleId;
    this.fieldPath = fieldPath;
  }
}

export function roundCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new CaseProofInputError(
      "cp-non-finite",
      "arithmetic",
      `A cash-flow line came out non-finite (${value}). The case cannot be audited.`,
    );
  }
  return Math.round(value);
}

/** A required finite number from an untrusted source (pasted JSON, an agent call). */
export function requireNumber(value: unknown, fieldPath: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CaseProofInputError(
      "cp-field-missing",
      fieldPath,
      `\`${fieldPath}\` is required and must be a finite number; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return value;
}

/** An optional finite number: absent stays absent (an unstated term never becomes a zero). */
export function optionalNumber(value: unknown, fieldPath: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CaseProofInputError(
      "cp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a finite number when present; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return value;
}

export function requireNonNegative(value: unknown, fieldPath: string): number {
  const n = requireNumber(value, fieldPath);
  if (n < 0) {
    throw new CaseProofInputError(
      "cp-field-negative",
      fieldPath,
      `\`${fieldPath}\` must not be negative; received ${n}. Nothing was audited.`,
    );
  }
  return n;
}

export function usdToCents(value: number): number {
  return roundCents(value * CS);
}

export function centsToUsd(cents: number): number {
  return cents / CS;
}

export function formatUsd(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / CS);
  const remainder = abs % CS;
  const formatted = dollars.toLocaleString("en-US");
  return `${negative ? "-" : ""}$${formatted}.${String(remainder).padStart(2, "0")}`;
}

/** Short form for headline numbers ($1.2M, $412k, $980). */
export function formatUsdCompact(cents: number): string {
  const dollars = Math.round(cents / CS);
  const abs = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function formatPct(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

export function formatMonths(months: number | null, basis = ""): string {
  if (months === null) return "never pays back within the horizon";
  const years = months / 12;
  const suffix = basis ? ` (${basis})` : "";
  return `${months} month${months === 1 ? "" : "s"}${years >= 1 ? ` · ${years.toFixed(1)} yr` : ""}${suffix}`;
}

/** Net present value of a year-0..n flow series, at an annual rate in percent. */
export function npvAt(ratePct: number, flowsCents: number[]): number {
  const rate = ratePct / 100;
  return flowsCents.reduce((acc, flow, index) => acc + flow / (1 + rate) ** index, 0);
}

/**
 * Annual IRR of a year-0..n flow series, in percent — or `null` with the caller stating why.
 *
 * Deterministic bisection, never Newton: 200 halvings of a wide bracket, so the same case always
 * returns the same number. A series with no sign change has no IRR and is reported as such rather
 * than as 0% (which would read as a real, terrible rate).
 */
export function irr(flowsCents: number[]): number | null {
  const hasPositive = flowsCents.some((flow) => flow > 0);
  const hasNegative = flowsCents.some((flow) => flow < 0);
  if (!hasPositive || !hasNegative) return null;

  let low = -99.9;
  let high = 1000;
  let lowValue = npvAt(low, flowsCents);
  let highValue = npvAt(high, flowsCents);
  if (lowValue * highValue > 0) return null;

  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const midValue = npvAt(mid, flowsCents);
    if (midValue === 0) return Math.round(mid * 100) / 100;
    if (lowValue * midValue < 0) {
      high = mid;
      highValue = midValue;
    } else {
      low = mid;
      lowValue = midValue;
    }
  }
  return Math.round(((low + high) / 2) * 100) / 100;
}

/** Level annual debt service for a financed outlay (0 when the term/rate is unstated or zero). */
export function levelPaymentCents(principalCents: number, ratePct: number, months: number): number {
  if (principalCents <= 0 || months <= 0) return 0;
  const monthlyRate = ratePct / 100 / 12;
  if (monthlyRate === 0) return roundCents(principalCents / months);
  const factor = (monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
  return roundCents(principalCents * factor);
}

/**
 * Bisection over a monotone scalar lever.
 *
 * Returns `null` — never a guess — when the two bracket ends do not straddle zero: a lever that
 * does not move the sign inside the bracket has no break-even to report, and inventing one is the
 * failure mode this product exists to catch.
 */
export function bisect(
  fn: (value: number) => number,
  low: number,
  high: number,
  iterations = 200,
): number | null {
  let lo = low;
  let hi = high;
  let loValue = fn(lo);
  const hiValue = fn(hi);
  if (!Number.isFinite(loValue) || !Number.isFinite(hiValue)) return null;
  if (loValue === 0) return lo;
  if (hiValue === 0) return hi;
  if (loValue * hiValue > 0) return null;

  for (let i = 0; i < iterations; i += 1) {
    const mid = (lo + hi) / 2;
    const midValue = fn(mid);
    if (!Number.isFinite(midValue)) return null;
    if (midValue === 0) return mid;
    if (loValue * midValue < 0) {
      hi = mid;
    } else {
      lo = mid;
      loValue = midValue;
    }
  }
  return (lo + hi) / 2;
}

/** Rounds a solved axis value to a stable precision so a report is byte-identical across runs. */
export function roundAxis(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** A break-even or assumption value rendered in its own unit (shared by the page and the pack). */
export function formatLeverValue(
  value: number,
  unit: "usd" | "usd_per_hour" | "percent" | "fte" | "months" | "count",
): string {
  switch (unit) {
    case "usd":
      return formatUsd(roundCents(value * 100));
    case "usd_per_hour":
      return `$${value.toFixed(2)}/h`;
    case "percent":
      return `${value.toFixed(2)}%`;
    case "fte":
      return `${value.toFixed(2)} FTE`;
    case "months":
      return `${value.toFixed(1)} months`;
    default:
      return `${value}`;
  }
}

/** The linear-interpolated month at which a cumulative series first crosses zero. */
export function paybackMonthsFrom(cumulative: number[]): number | null {
  for (let index = 0; index < cumulative.length; index += 1) {
    const value = cumulative[index];
    if (value === undefined) continue;
    if (value >= 0) {
      if (index === 0) return 0;
      const previous = cumulative[index - 1] ?? 0;
      const step = value - previous;
      if (step <= 0) return index * 12;
      const fraction = previous < 0 ? -previous / step : 0;
      return Math.round((index - 1 + fraction) * 12 * 10) / 10;
    }
  }
  return null;
}
