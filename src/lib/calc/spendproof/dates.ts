/**
 * Dates for SpendProof: day-granularity comparisons only, so the engine needs no clock.
 *
 * The caller always supplies the period and the ledger timestamps; nothing here reads `Date.now()`.
 */
import { SpendProofFieldError } from "./money";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** The `YYYY-MM-DD` part of an ISO date or timestamp. Throws on anything else. */
export function isoDay(value: string, fieldPath: string): string {
  const match = ISO_DATE.exec(value.trim());
  if (!match) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be an ISO 8601 date or timestamp (YYYY-MM-DD…); received ${JSON.stringify(value)}. Nothing was reconciled.`,
    );
  }
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const roundTrip = new Date(parsed);
  if (
    roundTrip.getUTCFullYear() !== Number(match[1]) ||
    roundTrip.getUTCMonth() !== Number(match[2]) - 1 ||
    roundTrip.getUTCDate() !== Number(match[3])
  ) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` is not a real calendar date; received ${JSON.stringify(value)}. Nothing was reconciled.`,
    );
  }
  return day;
}

/** Whole days between two ISO days (b - a). */
export function daysBetween(a: string, b: string): number {
  const start = Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1, Number(a.slice(8, 10)));
  const end = Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1, Number(b.slice(8, 10)));
  return Math.round((end - start) / 86_400_000);
}

export interface PeriodWindow {
  start: string;
  end: string;
}

/** True when `day` falls inside the period, both bounds inclusive. */
export function withinPeriod(day: string, period: PeriodWindow): boolean {
  return day >= period.start && day <= period.end;
}

/**
 * How far outside the billing window a usage row may sit and still be treated as a
 * period-boundary overlap (clock skew and timezone edges put rows a day or so either side).
 * Anything further out is out of period and is NOT silently folded into the reconciliation.
 */
export const PERIOD_BOUNDARY_GRACE_DAYS = 2;

/** True when `day` is outside the period but within the boundary grace window. */
export function nearPeriodBoundary(day: string, period: PeriodWindow): boolean {
  if (withinPeriod(day, period)) return false;
  if (day < period.start) return daysBetween(day, period.start) <= PERIOD_BOUNDARY_GRACE_DAYS;
  return daysBetween(period.end, day) <= PERIOD_BOUNDARY_GRACE_DAYS;
}
