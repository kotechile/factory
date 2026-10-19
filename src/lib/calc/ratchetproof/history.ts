/**
 * The explicit, ordered month history the ratchet window is taken from.
 *
 * "The trailing 11 months" is the clause that drifts: a missing bill, a re-export with a later start,
 * or a month silently dropped turns the floor into a number from a different rule. So the history is
 * built once, ordered descending, every month present exactly once, and the seed history (the prior
 * peaks that predate the interval data) must chain onto the first audited month with no hole.
 */
import { monthKeyOf, previousMonth, type BillingWindowFilter } from "./grid";
import { RatchetProofFieldError } from "./money";
import type { AlignedGrid, MilliKw, PeakHistoryEntry } from "./types";

export interface BillableMonthPeak {
  month: string;
  peakKwMilli: MilliKw;
  /** The interval the billed peak occurred in, when the month has a billed-window interval. */
  slotStartUtc: string | null;
}

/** Each month's peak RESTRICTED to the tariff's billed window (with the slot it happened in). */
export function billableWindowPeaks(
  grid: AlignedGrid,
  window: BillingWindowFilter,
): Map<string, BillableMonthPeak> {
  const offset = window.spec?.utcOffsetMinutes ?? 0;
  const peaks = new Map<string, BillableMonthPeak>();
  for (const slot of grid.slots) {
    if (!window.stated) continue;
    if (!window.includes(slot.epochMinute)) continue;
    const month = monthKeyOf(slot.epochMinute, offset);
    const current = peaks.get(month);
    if (current === undefined) {
      peaks.set(month, { month, peakKwMilli: slot.totalKwMilli, slotStartUtc: slot.startUtc });
    } else if (slot.totalKwMilli > current.peakKwMilli) {
      current.peakKwMilli = slot.totalKwMilli;
      current.slotStartUtc = slot.startUtc;
    }
  }
  return peaks;
}

export interface OrderedHistory {
  /** Month → peak, every month from the oldest seed to the newest audited month. */
  peaks: Map<string, MilliKw>;
  /** Every month present, newest first. */
  monthsDesc: string[];
}

/**
 * Builds the ordered history from the seed (prior months before the interval data) plus the months the
 * grid covers. Throws when the seed is not contiguous onto the first grid month: a hole is a different
 * ratchet window, and it is refused rather than skipped.
 */
export function buildAuditHistory(
  monthPeaks: Map<string, BillableMonthPeak>,
  seedHistory: PeakHistoryEntry[],
  firstGridMonth: string,
): OrderedHistory {
  let expected = previousMonth(firstGridMonth);
  const seeds = new Map<string, MilliKw>();
  for (const [index, entry] of seedHistory.entries()) {
    if (entry.month !== expected) {
      throw new RatchetProofFieldError(
        "rp-history-window",
        `seedHistory[${index}]`,
        `The supplied prior-month history must be ordered most recent first and end at ${expected} (the month before the first audited month, ${firstGridMonth}); entry ${index + 1} is ${entry.month}. A gapped history is refused, never skipped. Nothing was audited.`,
      );
    }
    if (seeds.has(entry.month)) {
      throw new RatchetProofFieldError(
        "rp-history-window",
        `seedHistory[${index}]`,
        `The prior-month history lists ${entry.month} twice. Nothing was audited.`,
      );
    }
    if (!Number.isInteger(entry.peakKwMilli) || entry.peakKwMilli < 0) {
      throw new RatchetProofFieldError(
        "rp-history-window",
        `seedHistory[${index}].peakKwMilli`,
        `The prior-month peak for ${entry.month} must be a non-negative integer number of milli-kW. Nothing was audited.`,
      );
    }
    seeds.set(entry.month, entry.peakKwMilli);
    expected = previousMonth(expected);
  }

  const peaks = new Map<string, MilliKw>(seeds);
  for (const [month, peak] of monthPeaks) peaks.set(month, peak.peakKwMilli);
  const monthsDesc = [...peaks.keys()].sort().reverse();
  return { peaks, monthsDesc };
}

/**
 * The lookback window for one month, most recent first. Throws (rather than returning a short list)
 * when any month in the window is absent — that absence is exactly the drift this module prevents.
 */
export function historyForMonth(
  history: OrderedHistory,
  month: string,
  lookbackMonths: number,
): PeakHistoryEntry[] {
  if (!Number.isInteger(lookbackMonths) || lookbackMonths < 1) {
    throw new RatchetProofFieldError(
      "rp-history-window",
      `history.${month}`,
      `The tariff's ratchet lookback is not a usable month count (${lookbackMonths}), so the window cannot be formed. Nothing was audited.`,
    );
  }
  const entries: PeakHistoryEntry[] = [];
  let cursor = previousMonth(month);
  for (let index = 0; index < lookbackMonths; index += 1) {
    const peak = history.peaks.get(cursor);
    if (peak === undefined) {
      throw new RatchetProofFieldError(
        "rp-history-window",
        `history.${month}`,
        `Billing ${month} needs the peak for ${cursor} (part of the tariff's ${lookbackMonths}-month lookback), and no bill or interval reading covers it. The verdict is withheld rather than computed from a shorter window. Nothing was audited.`,
      );
    }
    entries.push({ month: cursor, peakKwMilli: peak });
    cursor = previousMonth(cursor);
  }
  return entries;
}
