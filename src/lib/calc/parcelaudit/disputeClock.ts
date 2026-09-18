/**
 * The dispute clock: how long the shipper has left to claim a line, counted from the invoice date.
 *
 * PRD §2 pins UPS ≈30 days and FedEx ≈21 days. USPS is not pinned by the PRD; v1 uses 30 days
 * (the window it also applies to USPS money-back claims) and publishes that assumption in the
 * coverage panel rather than leaving it implicit.
 *
 * A window is reported per line whether or not the line is over-billed — the UI shows the clock for
 * every line — but only a line with claimable money raises a finding (`pp-clk-expiring` /
 * `pp-clk-expired`), so a clean invoice stays at zero flags.
 */
import { addDays, daysBetween, parseIsoDate } from "./dates";
import type { Carrier, DisputeWindow } from "./types";

export const DISPUTE_WINDOW_DAYS: Record<Carrier, number> = {
  ups: 30,
  fedex: 21,
  usps: 30,
};

/** A claim inside this many days of its deadline is surfaced first. */
export const EXPIRING_SOON_DAYS = 7;

export const DISPUTE_WINDOW_SOURCE: Record<Carrier, string> = {
  ups: "UPS billing-dispute window ≈30 days from the invoice date (PRD §2)",
  fedex: "FedEx billing-dispute window ≈21 days from the invoice date (PRD §2)",
  usps: "USPS: 30 days — v1 assumption, not pinned by the PRD (published in the coverage panel)",
};

export function disputeWindowFor(
  carrier: Carrier,
  invoiceDate: string,
  asOfDate: string,
): DisputeWindow {
  parseIsoDate(invoiceDate, "invoiceDate");
  parseIsoDate(asOfDate, "asOfDate");
  const windowDays = DISPUTE_WINDOW_DAYS[carrier];
  const daysRemaining = windowDays - daysBetween(invoiceDate, asOfDate);
  const status = daysRemaining < 0 ? "expired" : daysRemaining <= EXPIRING_SOON_DAYS ? "expiring" : "open";
  return {
    carrier,
    windowDays,
    invoiceDate,
    deadline: addDays(invoiceDate, windowDays),
    daysRemaining,
    status,
  };
}
