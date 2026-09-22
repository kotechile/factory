/**
 * CaseProof — the buyer-side audit of a warehouse automation business case (PRD §2).
 *
 * Entry points:
 * - `readCaseInput(value)` — validates untrusted case JSON (a pasted case or an agent call) and
 *   throws a `CaseProofInputError` naming the rule and the field. Bad input never half-runs.
 * - `auditCase(input)` — the deliverable: the vendor's own assumptions re-run, the buyer's run, the
 *   inputs that moved the payback between them, the break-even of every assumption the case depends
 *   on, the ranked list to confirm in writing, and the decision pack.
 * - `compareBids(input)` — two or three bids on one cash model, with the crossing points and the
 *   sensitivity grid.
 * - `afterTaxPayback(input)` — the primitive an agent calls when it only needs the after-tax payback
 *   and depreciation schedule for one bid.
 *
 * No I/O, no network, no LLM and no clock. Money is integer cents; percentages are percentage points;
 * an unstated term is reported `unstated` and blocks a pass (AGENTS.md rule 5).
 */
import type {
  AfterTaxPayback,
  Baseline,
  BidComparison,
  BidOption,
  CaseInput,
  CaseProofReport,
  Finance,
  FunctionStaffing,
} from "./types";
import {
  CaseProofInputError,
  formatPct,
  formatUsdCompact,
  optionalNumber,
  requireNumber,
} from "./money";
import { computeOption } from "./cashflow";
import { auditOption } from "./audit";
import { compareBids } from "./compare";
import { computeLoadedLaborRate } from "./loadedLabor";
import { buildCoverage, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES } from "./coverage";
import { normalizeQuote, parseQuoteCsv, QUOTE_CSV_HEADER } from "./quoteLines";
import { TAX_YEAR_RULES, UNSUPPORTED_TAX_YEARS, inServiceDeadline, resolveTaxYear } from "./taxLayer";

export const ENGINE_METADATA = {
  id: "warehouse_automation_case_audit",
  name: "CaseProof — buyer-side audit of a warehouse automation business case",
  version: "1.0.0",
  description:
    "Deterministic audit of a warehouse-automation business case from the buyer's side: re-runs the vendor's own quoted numbers against the buyer's fully loaded labour (turnover included), the lines vendors omit (integration, facility work, maintenance, commissioning ramp), the buyer's tax year, and normalizes 2–3 competing quotes onto one after-tax cash model with payback, IRR, NPV, break-evens and a sensitivity grid.",
} as const;

export function implementedRuleIds(): string[] {
  return [...IMPLEMENTED_RULE_IDS];
}

export { buildCoverage, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES };
export {
  TAX_YEAR_RULES,
  UNSUPPORTED_TAX_YEARS,
  inServiceDeadline,
  resolveTaxYear,
  QUOTE_CSV_HEADER,
  normalizeQuote,
  parseQuoteCsv,
};
export { compareBids };
export { auditOption };
export { computeLoadedLaborRate };
export { computeOption, rampFactor } from "./cashflow";
export { buildDecisionPack } from "./decisionPack";
export { ASSUMPTION_LEVERS, applyVendorAssumptions } from "./audit";
export * from "./types";
export {
  CaseProofInputError,
  formatLeverValue,
  formatMonths,
  formatPct,
  formatUsd,
  formatUsdCompact,
} from "./money";

// --- untrusted input -------------------------------------------------------

function asRecord(value: unknown, fieldPath: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CaseProofInputError(
      "cp-case-shape",
      fieldPath,
      `\`${fieldPath}\` must be an object; received ${Array.isArray(value) ? "an array" : typeof value}. Nothing was audited.`,
    );
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CaseProofInputError(
      "cp-field-missing",
      fieldPath,
      `\`${fieldPath}\` is required and must be a non-empty string. Nothing was audited.`,
    );
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStaffing(value: unknown, fieldPath: string): FunctionStaffing[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CaseProofInputError(
      "cp-staffing-empty",
      fieldPath,
      "`baseline.staffByFunction` must list at least one function with its headcount — the sheet the project reduces. Nothing was audited.",
    );
  }
  return value.map((entry, index) => {
    const record = asRecord(entry, `${fieldPath}[${index}]`);
    const hourlyWage = optionalNumber(record.hourlyWage, `${fieldPath}[${index}].hourlyWage`);
    const paidHours = optionalNumber(
      record.paidHoursPerFtePerYear,
      `${fieldPath}[${index}].paidHoursPerFtePerYear`,
    );
    return {
      function: asString(record.function, `${fieldPath}[${index}].function`),
      headcount: requireNumber(record.headcount, `${fieldPath}[${index}].headcount`),
      ...(hourlyWage === undefined ? {} : { hourlyWage }),
      ...(paidHours === undefined ? {} : { paidHoursPerFtePerYear: paidHours }),
    };
  });
}

function readBaseline(value: unknown): Baseline {
  const record = asRecord(value, "baseline");
  const baseline: Baseline = {
    ordersPerDay: requireNumber(record.ordersPerDay, "baseline.ordersPerDay"),
    linesPerOrder: requireNumber(record.linesPerOrder, "baseline.linesPerOrder"),
    operatingDaysPerYear: requireNumber(record.operatingDaysPerYear, "baseline.operatingDaysPerYear"),
    shifts: requireNumber(record.shifts, "baseline.shifts"),
    staffByFunction: readStaffing(record.staffByFunction, "baseline.staffByFunction"),
    hourlyWage: requireNumber(record.hourlyWage, "baseline.hourlyWage"),
    paidHoursPerFtePerYear: requireNumber(
      record.paidHoursPerFtePerYear,
      "baseline.paidHoursPerFtePerYear",
    ),
  };
  const optional: [keyof Baseline, unknown, string][] = [
    ["payrollBurdenPct", record.payrollBurdenPct, "baseline.payrollBurdenPct"],
    ["benefitsPct", record.benefitsPct, "baseline.benefitsPct"],
    ["overtimeHoursPerWeek", record.overtimeHoursPerWeek, "baseline.overtimeHoursPerWeek"],
    ["turnoverPct", record.turnoverPct, "baseline.turnoverPct"],
    ["costPerHireCents", record.costPerHireCents, "baseline.costPerHireCents"],
    ["errorRatePct", record.errorRatePct, "baseline.errorRatePct"],
    ["costPerErrorCents", record.costPerErrorCents, "baseline.costPerErrorCents"],
    ["peakFactor", record.peakFactor, "baseline.peakFactor"],
    ["vendorAssumedHourlyRate", record.vendorAssumedHourlyRate, "baseline.vendorAssumedHourlyRate"],
  ];
  for (const [key, raw, path] of optional) {
    const parsed = optionalNumber(raw, path);
    if (parsed !== undefined) {
      (baseline as unknown as Record<string, number>)[key as string] = parsed;
    }
  }
  return baseline;
}

function readFinance(value: unknown): Finance {
  const record = asRecord(value, "finance");
  const finance: Finance = {
    horizonYears: requireNumber(record.horizonYears, "finance.horizonYears"),
    hurdleRatePct: requireNumber(record.hurdleRatePct, "finance.hurdleRatePct"),
    taxRatePct: requireNumber(record.taxRatePct, "finance.taxRatePct"),
    inServiceTaxYear: requireNumber(record.inServiceTaxYear, "finance.inServiceTaxYear"),
  };
  const election = optionalNumber(record.section179ElectionCents, "finance.section179ElectionCents");
  if (election !== undefined) finance.section179ElectionCents = election;
  const financingRate = optionalNumber(record.financingRatePct, "finance.financingRatePct");
  if (financingRate !== undefined) finance.financingRatePct = financingRate;
  const financingMonths = optionalNumber(record.financingMonths, "finance.financingMonths");
  if (financingMonths !== undefined) finance.financingMonths = financingMonths;
  // Cite the tax year immediately: an uncited year is refused before any arithmetic runs.
  resolveTaxYear(finance.inServiceTaxYear);
  return finance;
}

function readOption(value: unknown, index: number): BidOption {
  const record = asRecord(value, `options[${index}]`);
  const model = asString(record.model, `options[${index}].model`);
  if (model !== "capex" && model !== "lease" && model !== "raas") {
    throw new CaseProofInputError(
      "cp-model-unsupported",
      `options[${index}].model`,
      `\`options[${index}].model\` must be one of capex, lease, raas; received '${model}'. Nothing was audited.`,
    );
  }
  const labour = asRecord(record.labourImpact, `options[${index}].labourImpact`);
  const disposition = asString(labour.disposition, `options[${index}].labourImpact.disposition`);
  if (disposition !== "cash_out" && disposition !== "redeploy") {
    throw new CaseProofInputError(
      "cp-disposition-unsupported",
      `options[${index}].labourImpact.disposition`,
      `\`labourImpact.disposition\` must be 'cash_out' (the roles leave the P&L) or 'redeploy' (the people stay); received '${disposition}'. Nothing was audited.`,
    );
  }

  const option: BidOption = {
    id: asString(record.id, `options[${index}].id`),
    vendor: asString(record.vendor, `options[${index}].vendor`),
    model,
    labourImpact: {
      fteRemoved: requireNumber(labour.fteRemoved, `options[${index}].labourImpact.fteRemoved`),
      disposition,
      rampMonths: requireNumber(labour.rampMonths, `options[${index}].labourImpact.rampMonths`),
    },
  };

  if (record.capex !== undefined) {
    const capex = asRecord(record.capex, `options[${index}].capex`);
    const install = optionalNumber(capex.installCents, `options[${index}].capex.installCents`);
    const freight = optionalNumber(capex.freightCents, `options[${index}].capex.freightCents`);
    const recovery = optionalNumber(capex.recoveryYears, `options[${index}].capex.recoveryYears`);
    option.capex = {
      equipmentCents: requireNumber(capex.equipmentCents, `options[${index}].capex.equipmentCents`),
      ...(install === undefined ? {} : { installCents: install }),
      ...(freight === undefined ? {} : { freightCents: freight }),
      ...(recovery === undefined ? {} : { recoveryYears: recovery }),
    };
  }

  if (record.lease !== undefined) {
    const lease = asRecord(record.lease, `options[${index}].lease`);
    const down = optionalNumber(lease.downPaymentCents, `options[${index}].lease.downPaymentCents`);
    const endOfTerm = optionalNumber(lease.endOfTermCostCents, `options[${index}].lease.endOfTermCostCents`);
    option.lease = {
      monthlyPaymentCents: requireNumber(lease.monthlyPaymentCents, `options[${index}].lease.monthlyPaymentCents`),
      termMonths: requireNumber(lease.termMonths, `options[${index}].lease.termMonths`),
      escalationPct: requireNumber(lease.escalationPct, `options[${index}].lease.escalationPct`),
      maintenanceIncluded: lease.maintenanceIncluded === true,
      ...(down === undefined ? {} : { downPaymentCents: down }),
      ...(endOfTerm === undefined ? {} : { endOfTermCostCents: endOfTerm }),
    };
  }

  if (record.raas !== undefined) {
    const raas = asRecord(record.raas, `options[${index}].raas`);
    const sla = optionalNumber(raas.uptimeSlaPct, `options[${index}].raas.uptimeSlaPct`);
    option.raas = {
      monthlyPerUnitCents: requireNumber(raas.monthlyPerUnitCents, `options[${index}].raas.monthlyPerUnitCents`),
      units: requireNumber(raas.units, `options[${index}].raas.units`),
      termMonths: requireNumber(raas.termMonths, `options[${index}].raas.termMonths`),
      escalationPct: requireNumber(raas.escalationPct, `options[${index}].raas.escalationPct`),
      peakMonthsPerYear: requireNumber(raas.peakMonthsPerYear, `options[${index}].raas.peakMonthsPerYear`),
      maintenanceIncluded: raas.maintenanceIncluded === true,
      exitCostCents: requireNumber(raas.exitCostCents, `options[${index}].raas.exitCostCents`),
      ...(sla === undefined ? {} : { uptimeSlaPct: sla }),
    };
  }

  for (const [key, raw, path] of [
    ["integrationCostCents", record.integrationCostCents, `options[${index}].integrationCostCents`],
    ["facilityCostCents", record.facilityCostCents, `options[${index}].facilityCostCents`],
    ["trainingCostCents", record.trainingCostCents, `options[${index}].trainingCostCents`],
    ["softwareAnnualCents", record.softwareAnnualCents, `options[${index}].softwareAnnualCents`],
    ["maintenancePctOfCapex", record.maintenancePctOfCapex, `options[${index}].maintenancePctOfCapex`],
    ["maintenanceAnnualCents", record.maintenanceAnnualCents, `options[${index}].maintenanceAnnualCents`],
    ["errorReductionPct", record.errorReductionPct, `options[${index}].errorReductionPct`],
  ] as const) {
    const parsed = optionalNumber(raw, path);
    if (parsed !== undefined) {
      (option as unknown as Record<string, number>)[key] = parsed;
    }
  }

  if (record.throughputClaim !== undefined) {
    const claim = asRecord(record.throughputClaim, `options[${index}].throughputClaim`);
    const basis = asString(claim.basis, `options[${index}].throughputClaim.basis`);
    if (basis !== "sustained" && basis !== "peak") {
      throw new CaseProofInputError(
        "cp-throughput-basis",
        `options[${index}].throughputClaim.basis`,
        `\`throughputClaim.basis\` must be 'sustained' or 'peak'; received '${basis}'. Nothing was audited.`,
      );
    }
    const availability = optionalNumber(claim.availabilityPct, `options[${index}].throughputClaim.availabilityPct`);
    option.throughputClaim = {
      picksPerHour: requireNumber(claim.picksPerHour, `options[${index}].throughputClaim.picksPerHour`),
      basis,
      ...(availability === undefined ? {} : { availabilityPct: availability }),
    };
  }

  if (record.vendorClaim !== undefined) {
    const claim = asRecord(record.vendorClaim, `options[${index}].vendorClaim`);
    const vendorClaim: NonNullable<BidOption["vendorClaim"]> = {};
    for (const [key, raw, path] of [
      ["claimedPaybackMonths", claim.claimedPaybackMonths, `options[${index}].vendorClaim.claimedPaybackMonths`],
      ["assumedLoadedHourlyRate", claim.assumedLoadedHourlyRate, `options[${index}].vendorClaim.assumedLoadedHourlyRate`],
      ["assumedTurnoverPct", claim.assumedTurnoverPct, `options[${index}].vendorClaim.assumedTurnoverPct`],
      ["assumedMaintenancePctOfCapex", claim.assumedMaintenancePctOfCapex, `options[${index}].vendorClaim.assumedMaintenancePctOfCapex`],
      ["assumedMaintenanceAnnualCents", claim.assumedMaintenanceAnnualCents, `options[${index}].vendorClaim.assumedMaintenanceAnnualCents`],
      ["assumedAvailabilityPct", claim.assumedAvailabilityPct, `options[${index}].vendorClaim.assumedAvailabilityPct`],
      ["assumedFteRemoved", claim.assumedFteRemoved, `options[${index}].vendorClaim.assumedFteRemoved`],
      ["assumedErrorReductionPct", claim.assumedErrorReductionPct, `options[${index}].vendorClaim.assumedErrorReductionPct`],
      ["assumedIntegrationCostCents", claim.assumedIntegrationCostCents, `options[${index}].vendorClaim.assumedIntegrationCostCents`],
      ["assumedFacilityCostCents", claim.assumedFacilityCostCents, `options[${index}].vendorClaim.assumedFacilityCostCents`],
      ["assumedRampMonths", claim.assumedRampMonths, `options[${index}].vendorClaim.assumedRampMonths`],
    ] as const) {
      const parsed = optionalNumber(raw, path);
      if (parsed !== undefined) {
        (vendorClaim as unknown as Record<string, number>)[key] = parsed;
      }
    }
    const source = optionalString(claim.source);
    if (source) vendorClaim.source = source;
    option.vendorClaim = vendorClaim;
  }

  const quoteCsv = optionalString(record.quoteCsv);
  if (quoteCsv) option.quoteCsv = quoteCsv;

  return option;
}

/** Validates a case from an untrusted source. Throws with a rule id + field path, never half-runs. */
export function readCaseInput(value: unknown): CaseInput {
  const record = asRecord(value, "case");
  const options = record.options;
  if (!Array.isArray(options) || options.length === 0) {
    throw new CaseProofInputError(
      "cp-options-empty",
      "case.options",
      "`options` must hold at least one bid to audit. Nothing was audited.",
    );
  }
  if (options.length > 3) {
    throw new CaseProofInputError(
      "cp-options-too-many",
      "case.options",
      `\`options\` holds ${options.length} bids; CaseProof v1 normalizes up to 3 on one cash model (PRD §5 scope guard). Nothing was audited.`,
    );
  }
  const label = optionalString(record.label);
  return {
    baseline: readBaseline(record.baseline),
    finance: readFinance(record.finance),
    options: options.map((option, index) => readOption(option, index)),
    ...(label ? { label } : {}),
  };
}

// --- entry points -----------------------------------------------------------

/**
 * Audits the primary bid of a case (and compares them all when the case holds more than one).
 * The primary bid is the first one: the case's list order is the buyer's, and re-ordering it
 * re-orders the report rather than changing the arithmetic.
 */
export function auditCase(input: CaseInput): CaseProofReport {
  const [primary] = input.options;
  if (!primary) {
    throw new CaseProofInputError(
      "cp-options-empty",
      "case.options",
      "`options` must hold at least one bid to audit. Nothing was audited.",
    );
  }
  const audit = auditOption({
    baseline: input.baseline,
    finance: input.finance,
    option: primary,
    ...(input.label === undefined ? {} : { label: input.label }),
  });
  const comparison: BidComparison | null =
    input.options.length > 1
      ? compareBids({ baseline: input.baseline, finance: input.finance, options: input.options })
      : null;

  return {
    engine: { id: ENGINE_METADATA.id, name: ENGINE_METADATA.name, version: ENGINE_METADATA.version },
    label: input.label ?? null,
    audit,
    comparison,
  };
}

/** The bare primitive: after-tax payback, NPV/IRR and the depreciation schedule for one bid. */
export function afterTaxPayback(input: CaseInput): AfterTaxPayback {
  const [primary] = input.options;
  if (!primary) {
    throw new CaseProofInputError(
      "cp-options-empty",
      "case.options",
      "`after_tax_payback` needs one bid in `options`. Nothing was audited.",
    );
  }
  const result = computeOptionForPrimitive(input, primary);
  return {
    optionId: result.id,
    paybackMonths: result.paybackMonths,
    paybackBasis: result.paybackBasis,
    npvCents: result.npvCents,
    hurdleRatePct: input.finance.hurdleRatePct,
    irrPct: result.irrPct,
    irrBasis: result.irrBasis,
    upfrontCents: result.upfrontCents,
    totalNetCents: result.totalNetCents,
    depreciation: result.depreciation,
    unstated: result.unstated,
  };
}

function computeOptionForPrimitive(input: CaseInput, option: BidOption) {
  return computeOption({ baseline: input.baseline, finance: input.finance, option });
}

/** Rendering helpers the page and the agent payload share. */
export function summariseCase(input: CaseInput): string {
  const loaded = computeLoadedLaborRate(input.baseline);
  return `${loaded.headcount} FTE at $${(loaded.centsPerHour / 100).toFixed(2)}/h fully loaded (${formatUsdCompact(
    loaded.annualLoadedCostCents,
  )}/yr), ${formatPct(input.finance.hurdleRatePct)} hurdle, in service in tax year ${
    input.finance.inServiceTaxYear
  } (by ${inServiceDeadline(input.finance.inServiceTaxYear)}).`;
}
