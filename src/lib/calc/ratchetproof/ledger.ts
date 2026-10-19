/**
 * The ratchet ledger — what the floor cost, and what shaving the interval that set it would have saved.
 *
 * `carryOver` is Σ over months of (billed − metered) × rate: the dollars charged for demand the site
 * did not use. A month billed on its own peak contributes nothing (billed == metered), which is why a
 * ratchet is invisible on the bill that prints it and shows up eleven months later.
 *
 * The counterfactual is deliberately conservative: it shaves the floor-setting interval only as far as
 * the highest metered peak among the months the ratchet actually bound. Shaving below that would be a
 * different, smaller site and the saving would be a fiction.
 */
import { RatchetProofFieldError, demandChargeMicroUsd, peakRequiredForFloor } from "./money";
import type { CarryOverResult, Counterfactual, MilliKw, RatchetLedger } from "./types";

interface GroupMember {
  month: string;
  meteredKwMilli: MilliKw;
  billedKwMilli: MilliKw;
  contractMinimumKwMilli: MilliKw;
  rateMicroUsdPerKw: number;
}

/** The counterfactual for one floor-setting event, over the months it bound. */
function counterfactualFor(
  driverMonth: string,
  driverPeakKwMilli: MilliKw,
  ratchetPercent: number,
  members: GroupMember[],
): Counterfactual | null {
  if (members.length === 0 || ratchetPercent <= 0) return null;
  const basisPoints = Math.round(ratchetPercent * 100);
  // The floor after the shave: the highest demand these months actually reached (never below the
  // contract minimum, which no amount of shaving moves).
  const floorAfterShaveKwMilli = Math.max(
    ...members.map((member) => Math.max(member.meteredKwMilli, member.contractMinimumKwMilli)),
  );
  const requiredPeak = peakRequiredForFloor(floorAfterShaveKwMilli, basisPoints);
  const shaveKwMilli = Math.max(0, driverPeakKwMilli - requiredPeak);
  let savingMicroUsd = 0;
  for (const member of members) {
    const billedAfter = Math.max(
      member.meteredKwMilli,
      floorAfterShaveKwMilli,
      member.contractMinimumKwMilli,
    );
    savingMicroUsd += demandChargeMicroUsd(
      Math.max(0, member.billedKwMilli - billedAfter),
      member.rateMicroUsdPerKw,
    );
  }
  return {
    driverMonth,
    driverPeakKwMilli,
    shaveKwMilli,
    floorAfterShaveKwMilli,
    savingMicroUsd,
    monthsAffected: members.map((member) => member.month),
  };
}

export function carryOver(ledger: RatchetLedger): CarryOverResult {
  if (ledger.rows.length === 0) {
    throw new RatchetProofFieldError(
      "rp-ledger-empty",
      "ledger.rows",
      "The ledger has no rows, so there is no carry-over to compute. Nothing was audited.",
    );
  }

  const rows = ledger.rows.map((row) => {
    if (!Number.isInteger(row.billedKwMilli) || !Number.isInteger(row.meteredKwMilli)) {
      throw new RatchetProofFieldError(
        "rp-field-invalid",
        `ledger.${row.month}`,
        `Ledger row ${row.month} carries a non-integer demand figure. Nothing was audited.`,
      );
    }
    if (row.billedKwMilli < row.meteredKwMilli) {
      throw new RatchetProofFieldError(
        "rp-field-invalid",
        `ledger.${row.month}.billedKwMilli`,
        `Ledger row ${row.month} bills ${row.billedKwMilli} milli-kW against a metered peak of ${row.meteredKwMilli}: billed demand can never be below the month's own peak under ` +
          "this formula, so the row is inconsistent. Nothing was audited.",
      );
    }
    return {
      month: row.month,
      carryMicroUsd: demandChargeMicroUsd(
        row.billedKwMilli - row.meteredKwMilli,
        row.rateMicroUsdPerKw,
      ),
    };
  });

  const totalCarryMicroUsd = rows.reduce((sum, row) => sum + row.carryMicroUsd, 0);

  // Group the months the RATCHET bound by the prior month that set their floor, and price the
  // counterfactual for the group carrying the most dollars (the one worth acting on).
  const groups = new Map<string, { driverPeak: MilliKw; percent: number; members: GroupMember[] }>();
  for (const row of ledger.rows) {
    if (row.binding !== "ratchet" || row.ratchetDriver === null) continue;
    if (row.billedKwMilli <= row.meteredKwMilli) continue;
    const key = row.ratchetDriver.month;
    const group = groups.get(key) ?? {
      driverPeak: row.ratchetDriver.peakKwMilli,
      percent: row.ratchetPercent,
      members: [],
    };
    group.members.push({
      month: row.month,
      meteredKwMilli: row.meteredKwMilli,
      billedKwMilli: row.billedKwMilli,
      contractMinimumKwMilli: row.contractMinimumKwMilli,
      rateMicroUsdPerKw: row.rateMicroUsdPerKw,
    });
    groups.set(key, group);
  }

  let best: Counterfactual | null = null;
  for (const [driverMonth, group] of groups) {
    const candidate = counterfactualFor(
      driverMonth,
      group.driverPeak,
      group.percent,
      group.members,
    );
    if (candidate === null) continue;
    if (best === null || candidate.savingMicroUsd > best.savingMicroUsd) best = candidate;
  }

  return { totalCarryMicroUsd, rows, counterfactual: best };
}
