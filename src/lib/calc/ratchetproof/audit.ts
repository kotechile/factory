/**
 * The audit: aligned interval data + a declared tariff + the bills that were charged.
 *
 * Order of operations, each step refusing rather than guessing:
 *   1. align every meter onto one grid (a gap, a mixed granularity or a short file is refused);
 *   2. restrict the peak search to the tariff's billing window (a Saturday spike sets nothing);
 *   3. per month, take the billed-window peak and compute
 *      max(peak, ratchetPct × max(history[lookback]), contractMinimum) over an EXPLICIT history;
 *   4. compare the recomputed billed demand to the number the bill printed;
 *   5. price the gap (billed − metered) × rate into the ratchet ledger, and the counterfactual shave
 *      of the interval that set the floor.
 *
 * A month whose tariff clause or bill figure is not `extracted` is BLOCKED: it has no billed number
 * at all, and `verdict` is `blocked` — a partial answer is never presented as the audit.
 */
import {
  DEMAND_TOLERANCE_MILLI_KW,
  ENGINE_METADATA,
  IMPLEMENTED_RULE_IDS,
  UNSUPPORTED_FAMILIES,
} from "./coverage";
import { billedDemand } from "./demand";
import { billableWindowPeaks, buildAuditHistory, historyForMonth } from "./history";
import { carryOver } from "./ledger";
import { RatchetProofFieldError, demandChargeMicroUsd } from "./money";
import { align, billingWindow, monthKeyOf } from "./grid";
import type {
  AuditInput,
  AuditReport,
  BillRecord,
  Finding,
  GridSlot,
  MilliKw,
  MonthVerdict,
  PeakEvent,
  TariffRateLine,
} from "./types";

/** The highest slot, first occurrence on a tie. */
function highestSlot(slots: GridSlot[]): GridSlot | null {
  let best: GridSlot | null = null;
  for (const slot of slots) {
    if (best === null || slot.totalKwMilli > best.totalKwMilli) best = slot;
  }
  return best;
}

function asPeakEvent(slot: GridSlot, month: string, inBillingWindow: boolean): PeakEvent {
  return {
    month,
    startUtc: slot.startUtc,
    totalKwMilli: slot.totalKwMilli,
    byMeter: [...slot.byMeter].sort((a, b) => b.kwMilli - a.kwMilli),
    inBillingWindow,
  };
}

/** The rate that applies to a month, or the reason none can be chosen. Never a default. */
function resolveRate(
  bill: BillRecord,
  tariff: AuditInput["tariff"],
): { rate: number | null; source: "bill" | "tariff" | null; finding: Finding | null } {
  if (bill.printedDemandRateProvenance === "extracted" && bill.printedDemandRateMicroUsdPerKw !== null) {
    return {
      rate: bill.printedDemandRateMicroUsdPerKw,
      source: "bill",
      finding: null,
    };
  }
  const field = tariff.demandRates;
  if (field.provenance !== "extracted" || field.value === null || field.value.length === 0) {
    return {
      rate: null,
      source: null,
      finding: {
        ruleId: "rp-rate-missing",
        kind: "rate_missing",
        severity: "blocking",
        scope: `bill.${bill.month}.demandRate`,
        message: `Neither the ${bill.month} bill nor the tariff states a demand rate, so the carry-over for that month cannot be priced. The month's billed-demand figure is still computed; its dollars are withheld rather than valued at an invented rate.`,
        fix: "Supply the bill page that prints the demand rate, or the tariff's rate sheet for this season and voltage class.",
      },
    };
  }

  const declaredClass = tariff.voltageClass.value;
  const byClass =
    declaredClass === null
      ? field.value
      : field.value.filter(
          (line) => line.voltageClass.trim().toLowerCase() === declaredClass.trim().toLowerCase(),
        );
  const candidates = byClass.length > 0 ? byClass : field.value;
  const distinctRates = [...new Set(candidates.map((line: TariffRateLine) => line.rateMicroUsdPerKw))];
  if (distinctRates.length === 1) {
    return { rate: distinctRates[0], source: "tariff", finding: null };
  }
  return {
    rate: null,
    source: null,
    finding: {
      ruleId: "rp-rate-missing",
      kind: "rate_missing",
      severity: "blocking",
      scope: `bill.${bill.month}.demandRate`,
      message: `The tariff declares ${distinctRates.length} different demand rates (${candidates
        .map((line) => `${line.season}/${line.voltageClass} ${line.rateMicroUsdPerKw} µUSD/kW`)
        .join("; ")}), and the ${bill.month} bill does not print the one that applied. Choosing one would be an invented rate, so the month's dollars are withheld.`,
      fix: "Supply the bill page that prints the demand rate for this period, or the tariff's season and voltage-class assignment for the month.",
    },
  };
}

function blockedVerdict(month: string, findings: Finding[], note: string, peak: MilliKw | null): MonthVerdict {
  return {
    month,
    meteredPeakKwMilli: peak,
    recomputedBilledKwMilli: null,
    printedBilledKwMilli: null,
    varianceKwMilli: null,
    rateMicroUsdPerKw: null,
    rateSource: null,
    binding: null,
    ratchetFloorKwMilli: null,
    ratchetDriverMonth: null,
    varianceMicroUsd: null,
    blocked: true,
    blockingRuleIds: [...new Set(findings.map((finding) => finding.ruleId))],
    note,
  };
}

/** Labels for every declared tariff field and bill figure — printed on the page and filed. */
function labelledFields(input: AuditInput): string[] {
  const labels: string[] = [];
  const push = (name: string, provenance: string) => labels.push(`${name}=${provenance}`);
  push("tariff.utility", input.tariff.utility.provenance);
  push("tariff.schedule", input.tariff.schedule.provenance);
  push("tariff.voltageClass", input.tariff.voltageClass.provenance);
  push("tariff.demandRates", input.tariff.demandRates.provenance);
  push("tariff.ratchetPercent", input.tariff.ratchetPercent.provenance);
  push("tariff.ratchetLookbackMonths", input.tariff.ratchetLookbackMonths.provenance);
  push("tariff.billingWindow", input.tariff.billingWindow.provenance);
  push("tariff.intervalMinutes", input.tariff.intervalMinutes.provenance);
  push("tariff.contractMinimumKw", input.tariff.contractMinimumKw.provenance);
  for (const bill of input.bills) {
    push(`bill.${bill.month}.printedBilledDemand`, bill.printedBilledDemandProvenance);
    push(`bill.${bill.month}.printedDemandRate`, bill.printedDemandRateProvenance);
    push(`bill.${bill.month}.printedRatchetLine`, bill.printedRatchetLineProvenance);
  }
  return labels;
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** The deterministic finding set — no clock, no random id, so two runs produce the same bytes. */
function buildFindingSet(
  months: MonthVerdict[],
  findings: Finding[],
  carryOverMicroUsd: number,
): string {
  const lines = [
    "month,rule_id,severity,scope,message,fix,delta_kw,delta_usd",
    ...months.flatMap((month) =>
      findings
        .filter((finding) => finding.scope.includes(month.month))
        .map((finding) =>
          [
            month.month,
            finding.ruleId,
            finding.severity,
            csvCell(finding.scope),
            csvCell(finding.message),
            csvCell(finding.fix),
            finding.deltaKwMilli === undefined ? "" : (finding.deltaKwMilli / 1000).toFixed(3),
            finding.deltaMicroUsd === undefined ? "" : (finding.deltaMicroUsd / 1_000_000).toFixed(2),
          ].join(","),
        ),
    ),
    `TOTAL,,,,,,carry_over_usd,${(carryOverMicroUsd / 1_000_000).toFixed(2)}`,
  ];
  return lines.join("\n");
}

export function auditDemandBilling(input: AuditInput): AuditReport {
  const grid = align(input.meters);
  const window = billingWindow(input.tariff);
  const findings: Finding[] = [];
  const labels = labelledFields(input);

  // The tariff's own interval length is a declared clause: a grid on a different length than the
  // tariff bills on would compute a peak the tariff does not charge against.
  if (input.tariff.intervalMinutes.provenance !== "extracted") {
    findings.push({
      ruleId: "rp-tariff-unstated",
      kind: "tariff_unstated",
      severity: "blocking",
      scope: "tariff.intervalMinutes",
      message: `The tariff's demand interval length is ${input.tariff.intervalMinutes.provenance}, so the ${grid.intervalMinutes}-minute grid cannot be confirmed as the one it bills on. Every month's verdict is withheld.`,
      fix: "Supply the tariff page that states the demand interval (15 or 30 minutes) and re-run.",
    });
  } else if (input.tariff.intervalMinutes.value !== grid.intervalMinutes) {
    findings.push({
      ruleId: "rp-tariff-interval-mismatch",
      kind: "interval_granularity",
      severity: "blocking",
      scope: "tariff.intervalMinutes",
      message: `The tariff bills demand on a ${input.tariff.intervalMinutes.value}-minute interval, but the interval data is on ${grid.intervalMinutes}-minute intervals. Re-exporting is the only honest fix: a peak measured on a different interval is not the tariff's peak. Every month's verdict is withheld.`,
      fix: "Re-export the interval data at the tariff's own interval length and re-run.",
    });
  }

  if (!window.stated) {
    findings.push({
      ruleId: "rp-tariff-unstated",
      kind: "tariff_unstated",
      severity: "blocking",
      scope: "tariff.billingWindow",
      message:
        "The tariff's billing window (days and hours the demand charge applies to) is not stated, so an interval cannot be classified as billed or ignored. Every month's verdict is withheld rather than assuming all hours bill.",
      fix: "Supply the tariff page that states the demand-billing hours and days, and re-run.",
    });
  }

  const offset = window.spec?.utcOffsetMinutes ?? 0;
  const monthPeaks = billableWindowPeaks(grid, window);
  const gridMonths = [...monthPeaks.keys()].sort();
  if (gridMonths.length === 0) {
    throw new RatchetProofFieldError(
      "rp-intervals-empty",
      "meters",
      "The interval series covers no complete month. Nothing was audited.",
    );
  }
  const firstMonth = gridMonths[0];

  const history = buildAuditHistory(monthPeaks, input.seedHistory, firstMonth);

  const months: MonthVerdict[] = [];
  const ledgerRows: AuditReport["ledger"]["rows"] = [];

  for (const bill of input.bills) {
    const peak = monthPeaks.get(bill.month);
    if (peak === undefined) {
      const finding: Finding = {
        ruleId: "rp-intervals-missing",
        kind: "interval_gap",
        severity: "blocking",
        scope: `months.${bill.month}`,
        message: `The ${bill.month} bill is being audited, but the interval data covers no part of ${bill.month}. The month's verdict is withheld; it is not computed from a neighbouring month.`,
        fix: `Supply the interval export for ${bill.month} and re-run.`,
      };
      findings.push(finding);
      months.push(blockedVerdict(bill.month, [finding], "no interval data for this month", null));
      continue;
    }

    if (!window.stated) {
      const finding = findings.find((entry) => entry.scope === "tariff.billingWindow") as Finding;
      months.push(
        blockedVerdict(bill.month, [finding], "the tariff's billing window is not stated", peak.peakKwMilli),
      );
      continue;
    }

    let computed;
    try {
      computed = billedDemand(
        { month: bill.month, peakKwMilli: peak.peakKwMilli },
        historyForMonth(
          history,
          bill.month,
          input.tariff.ratchetLookbackMonths.value ?? 0,
        ),
        input.tariff,
      );
    } catch (error) {
      if (!(error instanceof RatchetProofFieldError)) throw error;
      const finding: Finding = {
        ruleId: error.ruleId,
        kind: "history_window",
        severity: "blocking",
        scope: `months.${bill.month}`,
        message: error.message,
        fix: `Supply the ${input.tariff.ratchetLookbackMonths.value ?? "tariff's"} prior month peaks in order (most recent first) and re-run.`,
      };
      findings.push(finding);
      months.push(blockedVerdict(bill.month, [finding], "the history window is not complete", peak.peakKwMilli));
      continue;
    }

    if (computed.blocked || computed.billedKwMilli === null) {
      findings.push(...computed.findings);
      months.push(
        blockedVerdict(
          bill.month,
          computed.findings,
          computed.findings[0]?.message ?? "a tariff clause is not stated",
          peak.peakKwMilli,
        ),
      );
      continue;
    }

    const rate = resolveRate(bill, input.tariff);
    if (rate.finding) findings.push(rate.finding);

    const printed =
      bill.printedBilledDemandProvenance === "extracted" ? bill.printedBilledDemandKwMilli : null;
    if (printed === null) {
      const finding: Finding = {
        ruleId: "rp-bill-unstated",
        kind: "bill_unstated",
        severity: "blocking",
        scope: `bill.${bill.month}.printedBilledDemand`,
        message: `The ${bill.month} bill does not state its printed billed demand (${bill.printedBilledDemandProvenance}), so there is nothing to reconcile the recomputed figure against. The month has no variance verdict — the recompute is shown, the comparison is withheld.`,
        fix: "Supply the bill page that prints the billed demand (kW) line and re-run.",
      };
      findings.push(finding);
      months.push({
        ...blockedVerdict(bill.month, [finding], "the bill's printed billed demand is not stated", peak.peakKwMilli),
        recomputedBilledKwMilli: computed.billedKwMilli,
        binding: computed.binding,
        ratchetFloorKwMilli: computed.ratchetFloorKwMilli,
        ratchetDriverMonth: computed.ratchetDriverMonth,
      });
      continue;
    }

    const varianceKwMilli = printed - computed.billedKwMilli;
    const varianceMicroUsd =
      rate.rate === null ? null : demandChargeMicroUsd(varianceKwMilli, rate.rate);

    if (varianceKwMilli !== 0) {
      const beyondRounding = Math.abs(varianceKwMilli) > DEMAND_TOLERANCE_MILLI_KW;
      findings.push({
        ruleId: beyondRounding ? "rp-billed-variance" : "rp-billed-rounding",
        kind: "variance",
        severity: beyondRounding ? "unmatched" : "advisory",
        scope: `months.${bill.month}`,
        message: beyondRounding
          ? `The ${bill.month} bill charged ${printed} milli-kW of billed demand against ${computed.billedKwMilli} recomputed from the tariff (${computed.binding?.replace("_", " ")}). ${
              varianceKwMilli > 0 ? "The bill is above the tariff formula." : "The bill is below the tariff formula."
            }`
          : `The ${bill.month} bill prints ${printed} milli-kW against ${computed.billedKwMilli} recomputed — within the ${DEMAND_TOLERANCE_MILLI_KW / 1000} kW printing tolerance.`,
        fix: beyondRounding
          ? `Ask the utility to re-rate ${bill.month} against the tariff's demand clause, citing the ratchet driver (${computed.ratchetDriverMonth ?? "none"}).`
          : "No action: the difference is bill rounding.",
        deltaKwMilli: varianceKwMilli,
        ...(varianceMicroUsd === null ? {} : { deltaMicroUsd: varianceMicroUsd }),
      });
    }

    months.push({
      month: bill.month,
      meteredPeakKwMilli: peak.peakKwMilli,
      recomputedBilledKwMilli: computed.billedKwMilli,
      printedBilledKwMilli: printed,
      varianceKwMilli,
      rateMicroUsdPerKw: rate.rate,
      rateSource: rate.source,
      binding: computed.binding,
      ratchetFloorKwMilli: computed.ratchetFloorKwMilli,
      ratchetDriverMonth: computed.ratchetDriverMonth,
      varianceMicroUsd,
      blocked: false,
      blockingRuleIds: [],
      note:
        computed.tiedWith.length > 0
          ? `Billed on ${computed.binding?.replace("_", " ")} (tied with ${computed.tiedWith
              .map((basis) => basis.replace("_", " "))
              .join(", ")}).`
          : `Billed on ${computed.binding?.replace("_", " ")}.`,
    });

    if (rate.rate !== null) {
      ledgerRows.push({
        month: bill.month,
        meteredKwMilli: peak.peakKwMilli,
        billedKwMilli: computed.billedKwMilli,
        rateMicroUsdPerKw: rate.rate,
        rateSource: rate.source as "bill" | "tariff",
        binding: computed.binding as NonNullable<typeof computed.binding>,
        ratchetPercent: computed.ratchetPercent ?? 0,
        contractMinimumKwMilli: computed.contractMinimumKwMilli ?? 0,
        ratchetDriver:
          computed.ratchetDriverMonth === null || computed.ratchetDriverPeakKwMilli === null
            ? null
            : { month: computed.ratchetDriverMonth, peakKwMilli: computed.ratchetDriverPeakKwMilli },
        carryMicroUsd: demandChargeMicroUsd(
          computed.billedKwMilli - peak.peakKwMilli,
          rate.rate,
        ),
      });
    }
  }

  const carry =
    ledgerRows.length > 0
      ? carryOver({ rows: ledgerRows })
      : { totalCarryMicroUsd: 0, rows: [], counterfactual: null };

  // The events: the site's overall peak, the highest interval the tariff does NOT bill, and the
  // interval that set the ratchet floor (the one worth shaving).
  const allSlots = grid.slots;
  const overall = highestSlot(allSlots);
  const outsideSlots = allSlots.filter((slot) => window.stated && !window.includes(slot.epochMinute));
  const outside = highestSlot(outsideSlots);

  const ratchetBound = ledgerRows.filter((row) => row.binding === "ratchet" && row.ratchetDriver);
  let floorEvent: PeakEvent | null = null;
  if (ratchetBound.length > 0) {
    const driverMonth = ratchetBound[0].ratchetDriver?.month;
    const driverPeak = Math.max(
      ...ratchetBound.map((row) => row.ratchetDriver?.peakKwMilli ?? 0),
    );
    const driverSlots = allSlots.filter(
      (slot) =>
        monthKeyOf(slot.epochMinute, offset) === driverMonth &&
        window.stated &&
        window.includes(slot.epochMinute),
    );
    const driverSlot = highestSlot(driverSlots);
    const peakSlot =
      driverSlot !== null && driverSlot.totalKwMilli === driverPeak
        ? driverSlot
        : driverSlots.find((slot) => slot.totalKwMilli === driverPeak) ?? driverSlot;
    if (peakSlot !== null && driverMonth) {
      floorEvent = asPeakEvent(peakSlot, driverMonth, true);
    }
  }

  const monthsBlocked = months.filter((month) => month.blocked).length;
  const blocked = monthsBlocked > 0;
  const meteredKwMilli = ledgerRows.reduce((sum, row) => sum + row.meteredKwMilli, 0);
  const billedKwMilli = ledgerRows.reduce((sum, row) => sum + row.billedKwMilli, 0);

  return {
    engine: ENGINE_METADATA,
    months,
    ledger: { rows: ledgerRows },
    carryOverMicroUsd: carry.totalCarryMicroUsd,
    counterfactual: carry.counterfactual,
    floorEvent,
    sitePeakEvent:
      overall === null
        ? null
        : asPeakEvent(overall, monthKeyOf(overall.epochMinute, offset), window.stated && window.includes(overall.epochMinute)),
    ignoredPeakEvent: outside === null ? null : asPeakEvent(outside, monthKeyOf(outside.epochMinute, offset), false),
    totals: {
      meteredKwMilli,
      billedKwMilli,
      intervalsRead: grid.intervalsRead,
      intervalsDeclared: grid.intervalsDeclared,
      monthsAudited: months.length,
      monthsBlocked,
    },
    findings,
    blocked,
    verdict: blocked ? "blocked" : "complete",
    labels,
    provenance: { computedBy: "deterministic-engine", tariffSource: "declared-fields" },
    findingSet: buildFindingSet(months, findings, carry.totalCarryMicroUsd),
  };
}

export { ENGINE_METADATA, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES };
