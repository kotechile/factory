/**
 * Date arithmetic for the audit clock. Pure UTC calendar math on ISO 8601 inputs — no `Date.now()`,
 * no locale, no timezone drift: the engine's "today" is always an explicit input (`asOfDate`), so a
 * report is reproducible to the day forever.
 */
import { ParcelAuditFieldError } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date part of an ISO 8601 date or timestamp ("2026-08-12T14:00:00Z" → "2026-08-12"). */
export function isoDatePart(value: string): string {
  return value.slice(0, 10);
}

/** Parses an ISO 8601 date (or timestamp) to a UTC midnight epoch. Throws, never NaN. */
export function parseIsoDate(value: unknown, fieldPath: string): number {
  if (typeof value !== "string" || !ISO_DATE.test(isoDatePart(value))) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `expected an ISO 8601 date (YYYY-MM-DD) or timestamp, received ${JSON.stringify(value)}.`,
    );
  }
  const datePart = isoDatePart(value);
  const [year, month, day] = datePart.split("-").map(Number);
  const ms = Date.UTC(year, month - 1, day);
  // Round-trip check: rejects 2026-13-45 and friends without inventing a rolled-over date.
  const roundTrip = new Date(ms).toISOString().slice(0, 10);
  if (roundTrip !== datePart) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `"${value}" is not a real calendar date.`,
    );
  }
  return ms;
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(iso: string, days: number): string {
  return toIsoDate(parseIsoDate(iso, "date") + days * DAY_MS);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseIsoDate(to, "to") - parseIsoDate(from, "from")) / DAY_MS);
}
