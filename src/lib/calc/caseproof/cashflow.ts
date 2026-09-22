/**
 * The deterministic cash-flow engine (PRD §2 `cashflow.ts`).
 *
 * Per option and per tax year: gross labour removed minus the downtime the buyer pays for anyway,
 * the error-cost saving, maintenance/licence, integration and facility amortization, the debt
 * service or lease/RaaS payment with its escalation, the one-off outlays, and the tax shield —
 * §179, then bonus, then straight-line, by tax year. Outputs payback in months, IRR and NPV at the
 * buyer's hurdle rate.
 *
 * Two rules the engine will not break:
 * - **No silent fallbacks.** A term the buyer has not stated is reported `unstated` and blocks a
 *   pass verdict; it is never defaulted to zero, to a percentage, or to an industry average.
 * - **A redeployment is not a saving.** `disposition: "redeploy"` means the people stay on the
 *   payroll, so the labour line is zero and the report says why — inventing that money is exactly
 *   the failure this product exists to catch.
 */
import type {
  Baseline,
  BidOption,
  CashflowYear,
  Finance,
  OptionResult,
  UnstatedField,
} from "./types";
import {
  CaseProofInputError,
  formatUsd,
  irr,
  levelPaymentCents,
  npvAt,
  paybackMonthsFrom,
  roundCents,
} from "./money";
import { annualLines, annualOrders, computeLoadedLaborRate } from "./loadedLabor";
import { applyQuote } from "./quoteLines";
import { buildDepreciationSchedule } from "./taxLayer";

/**
 * The fraction of a year's saving actually earned while the project ramps.
 *
 * Linear ramp from go-live to `rampMonths`: for a ramp inside year 1 the average is
 * `1 − rampMonths/24` (the triangle's area over the 12 months); for a ramp longer than a year it is
 * `6/rampMonths`. Reproducible by hand, which is the point.
 */
export function rampFactor(year: number, rampMonths: number): number {
  if (rampMonths <= 0) return 1;
  if (year > 1) return year - 1 >= rampMonths / 12 ? 1 : Math.min(1, 6 / rampMonths);
  if (rampMonths >= 12) return Math.max(0, Math.min(1, 6 / rampMonths));
  return Math.max(0, 1 - rampMonths / 24);
}

/** Amortizes a one-time cost straight-line across the horizon (documented convention, see notes). */
function amortize(cents: number, horizonYears: number): number {
  if (cents <= 0 || horizonYears <= 0) return 0;
  return roundCents(cents / horizonYears);
}

export interface CashflowInput {
  baseline: Baseline;
  finance: Finance;
  option: BidOption;
  /** Namespace for unstated paths when this is a vendor-assumption re-run. */
  prefix?: string;
}

export function computeOption(input: CashflowInput): OptionResult {
  const prefix = input.prefix ?? "option";
  const { baseline, finance } = input;
  const applied = applyQuote(input.option);
  const option = applied.option;

  validateFinance(finance);

  const horizon = Math.max(1, Math.floor(finance.horizonYears));
  const loaded = computeLoadedLaborRate(baseline);
  const linesPerYear = annualLines(baseline);
  const ordersPerYear = annualOrders(baseline);
  // Notes are deduped: the quote is resolved once by the caller and again inside this function (an
  // idempotent second pass), so an unchanged note must not appear twice in the report.
  const notes: string[] = [...new Set(applied.notes)];
  const unstated: UnstatedField[] = [];

  // --- one-time outlays -------------------------------------------------------------------
  const capex = option.capex;
  const equipmentCents = capex?.equipmentCents ?? 0;
  const installCents = capex?.installCents ?? 0;
  const freightCents = capex?.freightCents ?? 0;
  const qualifyingBasisCents = equipmentCents + installCents + freightCents;
  const integrationCents = option.integrationCostCents;
  const facilityCents = option.facilityCostCents;
  const trainingCents = option.trainingCostCents;

  const oneTimeOutlayCents = qualifyingBasisCents + (integrationCents ?? 0) + (facilityCents ?? 0) + (trainingCents ?? 0);
  if (option.model === "capex" && qualifyingBasisCents <= 0) {
    throw new CaseProofInputError(
      "cp-capex-missing",
      `${prefix}.capex`,
      "A capex bid needs its equipment line, stated by the case or priced in the quote CSV. Nothing was audited.",
    );
  }
  if (option.model !== "capex" && qualifyingBasisCents > 0) {
    notes.push(
      "A capex basis was stated on a lease/RaaS bid; ownership stays with the vendor, so the basis is not depreciated and §179 is not elected on it.",
    );
  }

  for (const [field, value, label] of [
    ["integrationCostCents", integrationCents, "Integration"],
    ["facilityCostCents", facilityCents, "Facility work"],
    ["trainingCostCents", trainingCents, "Training"],
  ] as const) {
    if (value === undefined) {
      unstated.push({
        field: `${prefix}.${field}`,
        label,
        detail:
          `${label} is one of the lines a vendor quote routinely omits and a project always incurs. ` +
          "It is not estimated here: state it, or leave it visible as an unpriced line.",
      });
    }
  }

  // --- financing --------------------------------------------------------------------------
  const financed = (finance.financingRatePct ?? 0) > 0 && (finance.financingMonths ?? 0) > 0;
  if ((finance.financingRatePct ?? 0) > 0 && !(finance.financingMonths ?? 0)) {
    notes.push("A financing rate was stated without a term, so the outlay is treated as paid at t=0.");
  }
  const debtServiceCents = financed
    ? levelPaymentCents(oneTimeOutlayCents, finance.financingRatePct as number, finance.financingMonths as number)
    : 0;
  const debtServiceYears = financed ? Math.ceil((finance.financingMonths as number) / 12) : 0;
  const downPaymentCents = option.lease?.downPaymentCents ?? 0;
  // Outright: the whole one-time outlay is paid at t=0. Financed: the outlay is an annuity and only
  // a down payment leaves at t=0.
  const upfrontCents = financed ? downPaymentCents : oneTimeOutlayCents + downPaymentCents;

  // --- depreciation / tax schedule ---------------------------------------------------------
  const capexOwned = option.model === "capex" && qualifyingBasisCents > 0;
  const electionStated = finance.section179ElectionCents;
  if (capexOwned && electionStated === undefined) {
    unstated.push({
      field: "finance.section179ElectionCents",
      label: "§179 election",
      detail:
        "The election is the largest single-year cash lever in a capex case. It is not assumed: state the amount (0 is a valid, explicit election).",
    });
  }
  const depreciation = buildDepreciationSchedule({
    qualifyingBasisCents: capexOwned ? qualifyingBasisCents : 0,
    electedCents: capexOwned ? electionStated ?? 0 : 0,
    taxYear: finance.inServiceTaxYear,
    ...(capex?.recoveryYears === undefined ? {} : { recoveryYears: capex.recoveryYears }),
    horizonYears: horizon,
  });
  unstated.push(...depreciation.unstated);
  notes.push(...depreciation.schedule.notes);
  if (!capexOwned) {
    notes.push(
      `No §179/bonus depreciation on this bid: ${option.model === "capex" ? "there is no stated capex basis" : "the vendor keeps ownership, so the payments are the deductible item"}.`,
    );
  }

  // --- recurring cost terms ----------------------------------------------------------------
  const maintenanceQuotedOrStated =
    option.maintenanceAnnualCents !== undefined
      ? option.maintenanceAnnualCents
      : option.maintenancePctOfCapex !== undefined && qualifyingBasisCents > 0
        ? roundCents(qualifyingBasisCents * (option.maintenancePctOfCapex / 100))
        : undefined;

  const maintenanceIncludedInPayment = Boolean(
    option.lease?.maintenanceIncluded || option.raas?.maintenanceIncluded,
  );
  let maintenanceCents = 0;
  if (maintenanceQuotedOrStated !== undefined) {
    maintenanceCents = maintenanceQuotedOrStated;
    if (option.maintenancePctOfCapex !== undefined && option.maintenanceAnnualCents === undefined) {
      notes.push(
        `Maintenance is priced at ${option.maintenancePctOfCapex}% of the ${formatUsd(
          qualifyingBasisCents,
        )} equipment basis = ${formatUsd(maintenanceCents)}/yr, as the case states it.`,
      );
    }
  } else if (maintenanceIncludedInPayment) {
    maintenanceCents = 0;
    notes.push("Maintenance is inside the vendor's monthly payment; no separate maintenance line is added.");
  } else {
    maintenanceCents = 0;
    unstated.push({
      field: `${prefix}.maintenancePctOfCapex`,
      label: "Annual maintenance",
      detail:
        "Warehouse automation runs 15–20% of equipment cost a year in maintenance and change. " +
        "It is not assumed here: leave it unstated and the case cannot pass.",
    });
  }

  const softwareCents = option.softwareAnnualCents === undefined ? 0 : option.softwareAnnualCents;
  if (softwareCents === 0 && option.softwareAnnualCents === undefined) {
    unstated.push({
      field: `${prefix}.softwareAnnualCents`,
      label: "Software licence",
      detail:
        "Fleet/WMS licensing is a recurring line a hardware quote does not carry. State it (0 is a valid, explicit answer).",
    });
  }

  const integrationAmortCents = amortize(integrationCents ?? 0, horizon);
  const facilityAmortCents = amortize(facilityCents ?? 0, horizon);
  const trainingAmortCents = amortize(trainingCents ?? 0, horizon);
  if (integrationAmortCents + facilityAmortCents + trainingAmortCents > 0) {
    notes.push(
      `Integration, facility work and training are ${formatUsd(oneTimeOutlayCents - qualifyingBasisCents)} of one-time cost, amortized straight-line over the ${horizon}-year horizon (${formatUsd(
        integrationAmortCents + facilityAmortCents + trainingAmortCents,
      )}/yr, deductible above). A capitalized or expensed treatment moves the tax timing, not the outlay.`,
    );
  }

  // --- labour and downtime ------------------------------------------------------------------
  const impact = option.labourImpact;
  if (impact.disposition === "redeploy") {
    notes.push(
      `The proposal redeploys the ${impact.fteRemoved} FTE it removes: redeployed people stay on the payroll, so this option carries **no labour cash saving** — only the errors and the downtime that follow the work.`,
    );
  }

  const availability = option.throughputClaim?.availabilityPct ?? option.raas?.uptimeSlaPct;
  let availabilityFactor = 1;
  if (availability === undefined) {
    unstated.push({
      field: `${prefix}.throughputClaim.availabilityPct`,
      label: "Availability / uptime SLA",
      detail:
        "Without an availability figure the case assumes a system that is never down. That is not a claim CaseProof will make for you: it is a claim the vendor must put in writing.",
    });
  } else {
    if (availability <= 0 || availability > 100) {
      throw new CaseProofInputError(
        "cp-availability-range",
        `${prefix}.throughputClaim.availabilityPct`,
        `Availability must be greater than 0 and at most 100; received ${availability}. Nothing was audited.`,
      );
    }
    availabilityFactor = availability / 100;
  }

  const peakFactor = baseline.peakFactor;
  if (option.raas && peakFactor === undefined) {
    unstated.push({
      field: "baseline.peakFactor",
      label: "Peak-season volume multiple",
      detail:
        "A per-unit subscription is priced against the peak fleet; without the peak multiple the subscription cost is understated.",
    });
  }

  const errorReductionPct = option.errorReductionPct;
  const errorStated =
    baseline.errorRatePct !== undefined &&
    baseline.costPerErrorCents !== undefined &&
    errorReductionPct !== undefined;
  if (baseline.errorRatePct === undefined) {
    unstated.push({
      field: "baseline.errorRatePct",
      label: "Pick/pack error rate",
      detail: "The error saving is part of the case's value and needs the current error rate to be counted.",
    });
  }
  if (baseline.costPerErrorCents === undefined) {
    unstated.push({
      field: "baseline.costPerErrorCents",
      label: "Cost per error",
      detail: "The fully loaded cost to find and re-ship one error is needed with the error rate.",
    });
  }
  if (errorReductionPct === undefined) {
    unstated.push({
      field: `${prefix}.errorReductionPct`,
      label: "Error reduction",
      detail: "What the vendor claims the system does to the error rate, in writing.",
    });
  }

  const labourGrossPerYearCents = roundCents(
    impact.fteRemoved * loaded.centsPerHour * baseline.paidHoursPerFtePerYear,
  );
  const errorGrossPerYearCents = errorStated
    ? roundCents(
        linesPerYear *
          (baseline.errorRatePct! / 100) *
          baseline.costPerErrorCents! *
          (errorReductionPct! / 100),
      )
    : 0;

  // --- the year loop ------------------------------------------------------------------------
  const years: CashflowYear[] = [];
  let cumulative = -upfrontCents;
  const cumulativeSeries: number[] = [cumulative];
  const lease = option.lease;
  const raas = option.raas;
  const peakMonths = raas?.peakMonthsPerYear ?? 0;
  const peakWeight = 1 - Math.min(12, Math.max(0, peakMonths)) / 12 + (Math.min(12, Math.max(0, peakMonths)) / 12) * (peakFactor ?? 1);

  for (let year = 1; year <= horizon; year += 1) {
    const ramp = rampFactor(year, impact.rampMonths);
    const labourSavingCents =
      impact.disposition === "cash_out" ? roundCents(labourGrossPerYearCents * ramp) : 0;
    // Downtime: the work the system cannot serve still has to be done by the labour the case is
    // counting on removing, so that share of the saving is not earned. ≤ 0 by construction.
    const downtimeCents = availability === undefined ? 0 : -roundCents(labourSavingCents * (1 - availabilityFactor));
    const errorSavingCents = roundCents(errorGrossPerYearCents * ramp);

    let leasePaymentCents = 0;
    let raasPaymentCents = 0;
    let outlayCents = 0;
    if (lease) {
      const monthsInYear = Math.max(0, Math.min(12, lease.termMonths - (year - 1) * 12));
      leasePaymentCents = roundCents(
        lease.monthlyPaymentCents * monthsInYear * (1 + lease.escalationPct / 100) ** (year - 1),
      );
      if (year === Math.ceil(lease.termMonths / 12) && lease.endOfTermCostCents) {
        outlayCents += lease.endOfTermCostCents;
      }
    }
    if (raas) {
      const monthsInYear = Math.max(0, Math.min(12, raas.termMonths - (year - 1) * 12));
      const monthlyBase = raas.monthlyPerUnitCents * raas.units;
      // The subscription is charged for the fleet the site needs, and the peak months need the
      // peak fleet (PRD §2's seasonal premium). The weight is stated, never inferred.
      const annualBase = year === 1 || monthsInYear === 12 ? monthlyBase * 12 * peakWeight : monthlyBase * monthsInYear * peakWeight;
      raasPaymentCents = roundCents(annualBase * (1 + raas.escalationPct / 100) ** (year - 1));
      if (year === Math.ceil(raas.termMonths / 12) && raas.exitCostCents) {
        outlayCents += raas.exitCostCents;
      }
    }

    const debt = year <= debtServiceYears ? debtServiceCents : 0;
    const taxBenefitCents = roundCents(
      (depreciation.schedule.years[year - 1]?.totalCents ?? 0) * (finance.taxRatePct / 100) +
        (leasePaymentCents + raasPaymentCents + maintenanceCents + softwareCents) * (finance.taxRatePct / 100) +
        (integrationAmortCents + facilityAmortCents + trainingAmortCents) * (finance.taxRatePct / 100),
    );

    const netCents =
      labourSavingCents +
      downtimeCents +
      errorSavingCents -
      maintenanceCents -
      softwareCents -
      debt -
      leasePaymentCents -
      raasPaymentCents -
      outlayCents +
      taxBenefitCents;

    cumulative += netCents;
    cumulativeSeries.push(cumulative);
    years.push({
      year,
      taxYear: finance.inServiceTaxYear + year - 1,
      labourSavingCents,
      downtimeCents,
      errorSavingCents,
      maintenanceCents,
      softwareCents,
      debtServiceCents: debt,
      leasePaymentCents: leasePaymentCents + raasPaymentCents,
      outlayCents,
      taxBenefitCents,
      netCents,
      cumulativeCents: cumulative,
    });
  }

  const flows = [-upfrontCents, ...years.map((entry) => entry.netCents)];
  const npvCents = roundCents(npvAt(finance.hurdleRatePct, flows));
  const irrPct = irr(flows);
  const paybackMonths = paybackMonthsFrom(cumulativeSeries);
  const totalNetCents = years.reduce((acc, entry) => acc + entry.netCents, 0) - upfrontCents;

  const totalCostCents =
    upfrontCents +
    years.reduce(
      (acc, entry) =>
        acc +
        entry.maintenanceCents +
        entry.softwareCents +
        entry.debtServiceCents +
        entry.leasePaymentCents +
        entry.outlayCents -
        entry.taxBenefitCents -
        entry.errorSavingCents,
      0,
    ) -
    years.reduce((acc, entry) => acc + entry.labourSavingCents + entry.downtimeCents, 0);

  return {
    id: option.id,
    vendor: option.vendor,
    model: option.model,
    years,
    upfrontCents,
    paybackMonths,
    paybackBasis:
      paybackMonths === null
        ? `the case never accumulates positive after-tax cash inside the ${horizon}-year horizon`
        : `t=0 outlay ${formatUsd(upfrontCents)} recovered from ${formatUsd(
            years.reduce((acc, entry) => acc + entry.netCents, 0),
          )} of after-tax cash over ${horizon} years`,
    npvCents,
    irrPct,
    irrBasis:
      irrPct === null
        ? "no internal rate of return exists for this flow series (the cash flows do not change sign)"
        : `the discount rate at which the ${horizon}-year after-tax flow is worth zero`,
    totalNetCents,
    costPerOrderCents: ordersPerYear > 0 ? roundCents(totalCostCents / (ordersPerYear * horizon)) : null,
    costPerLineCents: linesPerYear > 0 ? roundCents(totalCostCents / (linesPerYear * horizon)) : null,
    depreciation: depreciation.schedule,
    labour: loaded,
    quote: applied.quote,
    unstated,
    notes,
  };
}

function validateFinance(finance: Finance): void {
  if (!Number.isFinite(finance.horizonYears) || finance.horizonYears < 1) {
    throw new CaseProofInputError(
      "cp-horizon",
      "finance.horizonYears",
      `\`finance.horizonYears\` must be at least 1; received ${finance.horizonYears}. Nothing was audited.`,
    );
  }
  if (!Number.isFinite(finance.hurdleRatePct) || finance.hurdleRatePct <= -100) {
    throw new CaseProofInputError(
      "cp-hurdle-rate",
      "finance.hurdleRatePct",
      `\`finance.hurdleRatePct\` must be a percentage greater than -100; received ${finance.hurdleRatePct}.`,
    );
  }
  if (!Number.isFinite(finance.taxRatePct) || finance.taxRatePct < 0 || finance.taxRatePct > 100) {
    throw new CaseProofInputError(
      "cp-tax-rate",
      "finance.taxRatePct",
      `\`finance.taxRatePct\` must be between 0 and 100; received ${finance.taxRatePct}.`,
    );
  }
}
