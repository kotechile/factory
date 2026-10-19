/**
 * The billed-demand formula.
 *
 *   billed = max( monthPeak , ratchetPct × max( history[lookback] ) , contractMinimum )
 *
 * `history` is an EXPLICIT, ORDERED array, most recent first, ending at the month immediately before
 * the month being billed, and it must be exactly `lookback` entries long. That shape is the point:
 * "the trailing 11 months" is not a range the engine re-derives from dates (which drifts the moment a
 * bill is missing), it is a list the caller had to produce, and a list that is short, out of order or
 * skips a month is refused rather than silently narrowed.
 *
 * A clause the tariff does not state BLOCKS the month. It is never defaulted to 0%: a 0% default is a
 * fabricated floor, and the floor is the whole number under audit.
 */
import { RatchetProofFieldError, applyBasisPoints } from "./money";
import { previousMonth } from "./grid";
import type {
  BilledDemandResult,
  Declared,
  Finding,
  MonthPeak,
  PeakHistoryEntry,
  Tariff,
} from "./types";

function clauseFinding(
  fieldPath: string,
  provenance: "unstated" | "unreadable",
  detail: string,
): Finding {
  return {
    ruleId: provenance === "unstated" ? "rp-tariff-unstated" : "rp-tariff-unreadable",
    kind: provenance === "unstated" ? "tariff_unstated" : "tariff_unreadable",
    severity: "blocking",
    scope: fieldPath,
    message:
      provenance === "unstated"
        ? `The tariff does not state \`${fieldPath}\` (${detail}). This month's verdict is withheld: a missing clause is never defaulted — a 0% ratchet would fabricate the floor the audit exists to price.`
        : `\`${fieldPath}\` is unreadable on the tariff (${detail}). This month's verdict is withheld rather than defaulted.`,
    fix:
      provenance === "unstated"
        ? "Supply the tariff page that carries the demand clause (or the utility's rate sheet) and re-run; nothing is filled in for you."
        : "Re-supply a legible copy of that tariff page and re-run.",
  };
}

function readClause(
  field: Declared<number>,
  fieldPath: string,
): { value: number; findings: Finding[] } {
  if (field.provenance !== "extracted" || field.value === null) {
    return {
      value: 0,
      findings: [
        clauseFinding(
          fieldPath,
          field.provenance === "unreadable" ? "unreadable" : "unstated",
          field.provenance === "unreadable" ? "the region did not parse" : "the document is silent",
        ),
      ],
    };
  }
  return { value: field.value, findings: [] };
}

/**
 * Validates the ordered history against the month being billed.
 *
 * Throws rather than returning a verdict: a history that is the wrong length or out of order is a
 * caller bug, and computing a floor from it would publish a number that is not the tariff's.
 */
export function validateHistory(
  month: string,
  history: PeakHistoryEntry[],
  lookbackMonths: number,
): void {
  if (history.length !== lookbackMonths) {
    throw new RatchetProofFieldError(
      "rp-history-window",
      `history.${month}`,
      `Billing ${month} needs exactly ${lookbackMonths} prior month peak${lookbackMonths === 1 ? "" : "s"} (the tariff's lookback), but ${history.length} were supplied. The window is never shortened or padded: a shorter window would publish a floor from a different rule. Nothing was audited.`,
    );
  }
  let expectedMonth = previousMonth(month);
  for (const [index, entry] of history.entries()) {
    if (entry.month !== expectedMonth) {
      throw new RatchetProofFieldError(
        "rp-history-window",
        `history.${month}[${index}]`,
        `Billing ${month}: history entry ${index + 1} must be ${expectedMonth} (most recent first, contiguous), but is ${entry.month}. A drifting lookback window is refused, never re-sorted. Nothing was audited.`,
      );
    }
    if (!Number.isInteger(entry.peakKwMilli) || entry.peakKwMilli < 0) {
      throw new RatchetProofFieldError(
        "rp-history-window",
        `history.${month}[${index}].peakKwMilli`,
        `Billing ${month}: the peak for ${entry.month} must be a non-negative integer number of milli-kW; received ${entry.peakKwMilli}. Nothing was audited.`,
      );
    }
    expectedMonth = previousMonth(expectedMonth);
  }
}

/** The prior month whose peak set the floor: the highest, first occurrence on a tie. */
function driverOf(history: PeakHistoryEntry[]): PeakHistoryEntry {
  return history.reduce((best, entry) =>
    entry.peakKwMilli > best.peakKwMilli ? entry : best,
  );
}

export function billedDemand(
  month: MonthPeak,
  history: PeakHistoryEntry[],
  tariff: Tariff,
): BilledDemandResult {
  const findings: Finding[] = [];
  const percent = readClause(tariff.ratchetPercent, "tariff.ratchetPercent");
  const lookback = readClause(tariff.ratchetLookbackMonths, "tariff.ratchetLookbackMonths");
  const contractPercent = readClause(tariff.contractMinimumKw, "tariff.contractMinimumKw");
  findings.push(...percent.findings, ...lookback.findings, ...contractPercent.findings);

  if (!Number.isInteger(month.peakKwMilli) || month.peakKwMilli < 0) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      `months.${month.month}.peakKwMilli`,
      `The metered peak for ${month.month} must be a non-negative integer number of milli-kW; received ${month.peakKwMilli}. Nothing was audited.`,
    );
  }

  if (findings.length > 0) {
    return {
      month: month.month,
      meteredPeakKwMilli: month.peakKwMilli,
      ratchetPercent: tariff.ratchetPercent.value,
      ratchetBasisPoints: null,
      lookbackMonths: tariff.ratchetLookbackMonths.value,
      ratchetFloorKwMilli: null,
      ratchetDriverMonth: null,
      ratchetDriverPeakKwMilli: null,
      contractMinimumKwMilli:
        tariff.contractMinimumKw.value === null
          ? null
          : Math.round(tariff.contractMinimumKw.value * 1000),
      billedKwMilli: null,
      binding: null,
      tiedWith: [],
      blocked: true,
      findings,
    };
  }

  if (percent.value < 0 || percent.value > 100) {
    throw new RatchetProofFieldError(
      "rp-tariff-invalid",
      "tariff.ratchetPercent",
      `The tariff's ratchet percentage reads ${percent.value}%, outside 0–100%. That is a misread, not a clause; nothing was audited.`,
    );
  }
  if (!Number.isInteger(lookback.value) || lookback.value < 1 || lookback.value > 24) {
    throw new RatchetProofFieldError(
      "rp-tariff-invalid",
      "tariff.ratchetLookbackMonths",
      `The tariff's ratchet lookback reads ${lookback.value} months; expected a whole number from 1 to 24. Nothing was audited.`,
    );
  }
  const contractMinimumKwMilli = Math.round(contractPercent.value * 1000);

  validateHistory(month.month, history, lookback.value);

  // A 0% ratchet is a real clause (no ratchet) and produces a 0 kW floor — not a block.
  const basisPoints = Math.round(percent.value * 100);
  const driver = driverOf(history);
  const ratchetFloorKwMilli = applyBasisPoints(driver.peakKwMilli, basisPoints);

  const candidates: { basis: "month_peak" | "ratchet" | "contract_minimum"; value: number }[] = [
    { basis: "month_peak", value: month.peakKwMilli },
    { basis: "ratchet", value: ratchetFloorKwMilli },
    { basis: "contract_minimum", value: contractMinimumKwMilli },
  ];
  const billedKwMilli = Math.max(...candidates.map((entry) => entry.value));
  const winners = candidates.filter((entry) => entry.value === billedKwMilli);
  const binding = winners[0].basis;

  return {
    month: month.month,
    meteredPeakKwMilli: month.peakKwMilli,
    ratchetPercent: percent.value,
    ratchetBasisPoints: basisPoints,
    lookbackMonths: lookback.value,
    ratchetFloorKwMilli,
    ratchetDriverMonth: driver.month,
    ratchetDriverPeakKwMilli: driver.peakKwMilli,
    contractMinimumKwMilli,
    billedKwMilli,
    binding,
    tiedWith: winners.slice(1).map((entry) => entry.basis),
    blocked: false,
    findings,
  };
}
