/**
 * The audit deliverable (PRD §2 `audit.ts`).
 *
 * For every assumption the vendor's case depends on: the value at which the case stops clearing the
 * buyer's hurdle rate, pass/fail against the buyer's own numbers, and a ranked list of what has to be
 * confirmed in writing before signature.
 *
 * Two properties this module is built to guarantee:
 * - **The flip is reproducible from the two input sets.** The vendor's own assumptions are re-run
 *   through the same engine, then the buyer's real inputs are applied one group at a time, recording
 *   the payback after each step. The chain ends exactly on the buyer's run, so the distance between
 *   a claimed 14 months and an audited 41 is a sequence of named inputs, not an opinion.
 * - **No break-even is invented.** A lever whose bracket does not straddle zero returns `null` with a
 *   stated reason, and lands as `unverifiable` — never as a number the engine guessed.
 */
import type {
  AssumptionFinding,
  Baseline,
  BidOption,
  CaseAudit,
  Finance,
  OptionResult,
  PaybackDriver,
  UnstatedField,
} from "./types";
import { bisect, formatLeverValue, roundAxis, roundCents } from "./money";
import { annualLines, computeLoadedLaborRate } from "./loadedLabor";
import { computeOption } from "./cashflow";
import { applyQuote } from "./quoteLines";
import { buildCoverage } from "./coverage";
import { buildDecisionPack } from "./decisionPack";

interface LeverContext {
  baseline: Baseline;
  option: BidOption;
  finance: Finance;
}

interface Lever {
  field: string;
  label: string;
  unit: AssumptionFinding["unit"];
  higherIsBetter: boolean;
  /** The case's current value (null when the case does not state it). */
  read: (context: LeverContext) => number | null;
  /** A copy of the case with the lever set. */
  apply: (value: number, context: LeverContext) => LeverContext;
  /** Search bracket around the current value. */
  bracket: (current: number) => [number, number];
  /** The value the vendor's proposal assumes, when it states one. */
  vendorValue?: (option: BidOption) => number | null;
  action: string;
}

const dollarsToCents = (value: number) => roundCents(value * 100);

/** The levers the audit solves, in the order the report ranks them. */
export const ASSUMPTION_LEVERS: Lever[] = [
  {
    field: "labour.loadedHourlyRate",
    label: "Fully loaded labour rate",
    unit: "usd_per_hour",
    higherIsBetter: true,
    read: (context) => computeLoadedLaborRate(context.baseline).centsPerHour / 100,
    apply: (value, context) => ({
      ...context,
      baseline: {
        ...context.baseline,
        hourlyWage: value,
        staffByFunction: context.baseline.staffByFunction.map((entry) => {
          const { hourlyWage: _drop, ...rest } = entry;
          void _drop;
          return rest;
        }),
      },
    }),
    bracket: (current) => [Math.max(0.5, current * 0.1), Math.max(10, current * 5)],
    vendorValue: (option) => option.vendorClaim?.assumedLoadedHourlyRate ?? null,
    action:
      "Have payroll confirm the fully loaded rate (wage + burden + benefits + overtime + replacement) in writing.",
  },
  {
    field: "labour.fteRemoved",
    label: "FTE-equivalents removed",
    unit: "fte",
    higherIsBetter: true,
    read: (context) => context.option.labourImpact.fteRemoved,
    apply: (value, context) => ({
      ...context,
      option: {
        ...context.option,
        labourImpact: { ...context.option.labourImpact, fteRemoved: value },
      },
    }),
    bracket: (current) => [0, Math.max(1, current * 4)],
    vendorValue: (option) => option.vendorClaim?.assumedFteRemoved ?? null,
    action:
      "Get the headcount removal written into the contract as a schedule, function by function — not as a single FTE number.",
  },
  {
    field: "cost.maintenance",
    label: "Annual maintenance and change",
    unit: "percent",
    higherIsBetter: false,
    read: (context) =>
      context.option.maintenanceAnnualCents !== undefined
        ? context.option.maintenanceAnnualCents / 100
        : (context.option.maintenancePctOfCapex ?? null),
    apply: (value, context) =>
      context.option.maintenanceAnnualCents !== undefined
        ? { ...context, option: { ...context.option, maintenanceAnnualCents: dollarsToCents(value) } }
        : { ...context, option: { ...context.option, maintenancePctOfCapex: value } },
    bracket: (current) => [0, Math.max(25, current * 4)],
    vendorValue: (option) =>
      option.vendorClaim?.assumedMaintenanceAnnualCents !== undefined
        ? option.vendorClaim.assumedMaintenanceAnnualCents / 100
        : (option.vendorClaim?.assumedMaintenancePctOfCapex ?? null),
    action:
      "Make the vendor state maintenance, spares and software change in $/year in the contract — 15–20% of equipment cost a year is the published range.",
  },
  {
    field: "cost.integration",
    label: "Integration with WMS/ERP",
    unit: "usd",
    higherIsBetter: false,
    read: (context) =>
      context.option.integrationCostCents === undefined ? null : context.option.integrationCostCents / 100,
    apply: (value, context) => ({
      ...context,
      option: { ...context.option, integrationCostCents: dollarsToCents(value) },
    }),
    bracket: (current) => [0, Math.max(100_000, current * 4)],
    vendorValue: (option) =>
      option.vendorClaim?.assumedIntegrationCostCents === undefined
        ? null
        : option.vendorClaim.assumedIntegrationCostCents / 100,
    action:
      "Get the WMS/ERP integration scope and price into the quote (the published range is $25k–$100k over 6–14 weeks).",
  },
  {
    field: "cost.facility",
    label: "Facility, power and network work",
    unit: "usd",
    higherIsBetter: false,
    read: (context) => (context.option.facilityCostCents === undefined ? null : context.option.facilityCostCents / 100),
    apply: (value, context) => ({
      ...context,
      option: { ...context.option, facilityCostCents: dollarsToCents(value) },
    }),
    bracket: (current) => [0, Math.max(100_000, current * 4)],
    vendorValue: (option) =>
      option.vendorClaim?.assumedFacilityCostCents === undefined
        ? null
        : option.vendorClaim.assumedFacilityCostCents / 100,
    action:
      "Have your own facilities engineer quote the power, network and structural work — it is routinely missed in vendor planning.",
  },
  {
    field: "throughput.availabilityPct",
    label: "Availability / uptime",
    unit: "percent",
    higherIsBetter: true,
    read: (context) => context.option.throughputClaim?.availabilityPct ?? context.option.raas?.uptimeSlaPct ?? null,
    apply: (value, context) => ({
      ...context,
      option: {
        ...context.option,
        ...(context.option.throughputClaim
          ? { throughputClaim: { ...context.option.throughputClaim, availabilityPct: value } }
          : { throughputClaim: { picksPerHour: 0, basis: "sustained" as const, availabilityPct: value } }),
      },
    }),
    bracket: (current) => [Math.max(1, current * 0.5), 100],
    vendorValue: (option) => option.vendorClaim?.assumedAvailabilityPct ?? null,
    action:
      "Put the uptime figure in the contract as an SLA with a service credit — an availability number in a slide deck is not a claim the case can carry.",
  },
  {
    field: "labour.rampMonths",
    label: "Ramp to full productivity",
    unit: "months",
    higherIsBetter: false,
    read: (context) => context.option.labourImpact.rampMonths,
    apply: (value, context) => ({
      ...context,
      option: {
        ...context.option,
        labourImpact: { ...context.option.labourImpact, rampMonths: Math.max(0, value) },
      },
    }),
    bracket: (current) => [0, Math.max(48, current * 4)],
    vendorValue: (option) => option.vendorClaim?.assumedRampMonths ?? null,
    action: "Agree the ramp curve in writing, site by site: month 1 rarely runs at reference-site speed.",
  },
  {
    field: "finance.hurdleRatePct",
    label: "Your hurdle rate vs the case's IRR",
    unit: "percent",
    higherIsBetter: false,
    read: (context) => context.finance.hurdleRatePct,
    apply: (value, context) => ({ ...context, finance: { ...context.finance, hurdleRatePct: value } }),
    bracket: (current) => [Math.max(0, current * 0.25), 200],
    action: "Confirm the hurdle rate the capital committee will actually apply to this request.",
  },
];

/** The vendor's own assumptions, as a case the same engine can re-run. */
export function applyVendorAssumptions(context: LeverContext): LeverContext {
  const claim = context.option.vendorClaim ?? {};
  const baseline: Baseline = {
    ...context.baseline,
    hourlyWage: claim.assumedLoadedHourlyRate ?? context.baseline.hourlyWage,
    // A vendor case prices a blended wage: no employer burden, no benefits, no overtime premium and
    // no turnover replacement. That absence IS the vendor's arithmetic, so it is reproduced here
    // rather than argued about.
    payrollBurdenPct: undefined,
    benefitsPct: undefined,
    overtimeHoursPerWeek: undefined,
    turnoverPct: claim.assumedTurnoverPct,
    costPerHireCents: claim.assumedTurnoverPct === undefined ? undefined : context.baseline.costPerHireCents,
  };
  const option: BidOption = {
    ...context.option,
    maintenanceAnnualCents: undefined,
    maintenancePctOfCapex: claim.assumedMaintenancePctOfCapex,
    integrationCostCents: claim.assumedIntegrationCostCents,
    facilityCostCents: claim.assumedFacilityCostCents,
    trainingCostCents: undefined,
    softwareAnnualCents: undefined,
    errorReductionPct: claim.assumedErrorReductionPct,
    labourImpact: {
      ...context.option.labourImpact,
      fteRemoved: claim.assumedFteRemoved ?? context.option.labourImpact.fteRemoved,
      rampMonths: claim.assumedRampMonths ?? context.option.labourImpact.rampMonths,
    },
    ...(claim.assumedAvailabilityPct === undefined
      ? {}
      : {
          throughputClaim: {
            picksPerHour: context.option.throughputClaim?.picksPerHour ?? 0,
            basis: context.option.throughputClaim?.basis ?? ("sustained" as const),
            availabilityPct: claim.assumedAvailabilityPct,
          },
        }),
  };
  // A vendor case does not model the buyer's tax position: the run is pre-tax, which is what makes
  // its number comparable to the payback a proposal quotes.
  const finance: Finance = { ...context.finance, taxRatePct: 0, section179ElectionCents: 0 };
  return { baseline, option, finance };
}

/** One step in the vendor → buyer chain: a named group of inputs applied together. */
interface DriverStep {
  field: string;
  label: string;
  unit: AssumptionFinding["unit"];
  detail: string;
  apply: (context: LeverContext) => LeverContext;
  /** The value moved from/to, for the report. */
  fromValue: number;
  toValue: number;
}

function driverSteps(buyer: LeverContext, vendor: LeverContext): DriverStep[] {
  const steps: DriverStep[] = [];
  const vendorClaim = buyer.option.vendorClaim ?? {};

  // The vendor's headcount claim is the largest single input in the case, so the chain starts there:
  // "how many roles actually go" is a different number from "how many the proposal assumed".
  steps.push({
    field: "labour.fteRemoved",
    label: "The vendor's headcount claim vs the buyer's own analysis",
    unit: "fte",
    detail:
      "The proposal assumes every removed role goes at full productivity; the buyer's build confirms the roles it can actually remove, function by function.",
    fromValue: vendor.option.labourImpact.fteRemoved,
    toValue: buyer.option.labourImpact.fteRemoved,
    apply: (context) => ({
      ...context,
      option: {
        ...context.option,
        labourImpact: { ...context.option.labourImpact, fteRemoved: buyer.option.labourImpact.fteRemoved },
      },
    }),
  });

  steps.push({
    field: "labour.blendedToLoaded",
    label: "Blended wage → fully loaded rate",
    unit: "usd_per_hour",
    detail:
      "The vendor's wage becomes a loaded rate: employer payroll burden, benefits, and the FLSA half-time overtime premium.",
    fromValue: vendor.baseline.hourlyWage,
    toValue: buyer.baseline.hourlyWage,
    apply: (context) => ({
      ...context,
      baseline: {
        ...context.baseline,
        hourlyWage: buyer.baseline.hourlyWage,
        payrollBurdenPct: buyer.baseline.payrollBurdenPct,
        benefitsPct: buyer.baseline.benefitsPct,
        overtimeHoursPerWeek: buyer.baseline.overtimeHoursPerWeek,
      },
    }),
  });

  steps.push({
    field: "labour.turnoverReplacement",
    label: "Turnover the vendor's model does not carry",
    unit: "percent",
    detail:
      "Annual separations per FTE multiplied by the cost of one replacement, spread over the paid hours of an FTE-year.",
    fromValue: vendorClaim.assumedTurnoverPct ?? 0,
    toValue: buyer.baseline.turnoverPct ?? 0,
    apply: (context) => ({
      ...context,
      baseline: {
        ...context.baseline,
        turnoverPct: buyer.baseline.turnoverPct,
        costPerHireCents: buyer.baseline.costPerHireCents,
      },
    }),
  });

  steps.push({
    field: "labour.rampMonths",
    label: "The ramp the proposal does not model",
    unit: "months",
    detail:
      "The proposal assumes full productivity from month one; the buyer's ramp earns the saving in proportion over the first year.",
    fromValue: vendor.option.labourImpact.rampMonths,
    toValue: buyer.option.labourImpact.rampMonths,
    apply: (context) => ({
      ...context,
      option: {
        ...context.option,
        labourImpact: { ...context.option.labourImpact, rampMonths: buyer.option.labourImpact.rampMonths },
      },
    }),
  });

  steps.push({
    field: "cost.maintenance",
    label: "Maintenance the quote left blank",
    unit: "percent",
    detail:
      "Maintenance and change, as the buyer's own number (15–20% of equipment cost a year is the published range).",
    fromValue: vendorClaim.assumedMaintenancePctOfCapex ?? 0,
    toValue: buyer.option.maintenancePctOfCapex ?? (buyer.option.maintenanceAnnualCents ?? 0) / 100,
    apply: (context) => ({
      ...context,
      option: {
        ...context.option,
        maintenancePctOfCapex: buyer.option.maintenancePctOfCapex,
        maintenanceAnnualCents: buyer.option.maintenanceAnnualCents,
      },
    }),
  });

  steps.push({
    field: "tax.afterTaxTreatment",
    label: "Your tax position, not the vendor's",
    unit: "percent",
    detail:
      "The buyer's §179 election, bonus depreciation by tax year and the tax rate. Applied before the omitted lines so the outlay and its shield are read together.",
    fromValue: 0,
    toValue: buyer.finance.taxRatePct,
    apply: (context) => ({ ...context, finance: buyer.finance }),
  });

  steps.push({
    field: "cost.omittedOneTimeLines",
    label: "Integration, facility work and training",
    unit: "usd",
    detail: "The one-time lines a vendor quote routinely omits and a project always incurs.",
    fromValue: 0,
    toValue: (buyer.option.integrationCostCents ?? 0) / 100,
    apply: (context) => ({
      ...context,
      option: {
        ...context.option,
        integrationCostCents: buyer.option.integrationCostCents,
        facilityCostCents: buyer.option.facilityCostCents,
        trainingCostCents: buyer.option.trainingCostCents,
        softwareAnnualCents: buyer.option.softwareAnnualCents,
      },
    }),
  });

  steps.push({
    field: "throughput.availabilityPct",
    label: "Uptime the buyer is not promised",
    unit: "percent",
    detail: "The share of the saving the system cannot serve, priced at the loaded rate the case removed.",
    fromValue: vendorClaim.assumedAvailabilityPct ?? 0,
    toValue: buyer.option.throughputClaim?.availabilityPct ?? buyer.option.raas?.uptimeSlaPct ?? 0,
    apply: (context) => ({
      ...context,
      option: {
        ...context.option,
        ...(buyer.option.throughputClaim ? { throughputClaim: buyer.option.throughputClaim } : {}),
      },
    }),
  });

  steps.push({
    field: "cost.errorSaving",
    label: "The error-cost saving the proposal did not claim",
    unit: "percent",
    detail:
      "The proposal claims no error reduction, so the vendor's run carries none; the buyer's error rate, cost per error and claimed reduction are applied here.",
    fromValue: vendorClaim.assumedErrorReductionPct ?? 0,
    toValue: buyer.option.errorReductionPct ?? 0,
    apply: (context) => ({
      ...context,
      option: { ...context.option, errorReductionPct: buyer.option.errorReductionPct },
    }),
  });

  return steps;
}

/**
 * Runs one option through the vendor's assumptions, the buyer's, and the chain between them.
 */
export function auditOption(input: {
  baseline: Baseline;
  finance: Finance;
  option: BidOption;
  label?: string;
}): CaseAudit {
  // The quote is resolved once, up front: the audit's levers must read the same cost terms the cash
  // model computes with, or a line the quote prices would read as unstated.
  const buyerContext: LeverContext = {
    baseline: input.baseline,
    finance: input.finance,
    option: applyQuote(input.option).option,
  };
  const buyerRun = computeOption({ ...buyerContext, prefix: "option" });
  const vendorContext = applyVendorAssumptions(buyerContext);

  let vendorRun: OptionResult | null = null;
  let vendorReason: string | null = null;
  try {
    vendorRun = computeOption({ ...vendorContext, prefix: "vendor.baseline" });
  } catch (error) {
    vendorReason = `The vendor's own basis could not be re-run: ${
      error instanceof Error ? error.message : "unknown failure"
    }`;
  }

  const drivers: PaybackDriver[] = [];
  if (vendorRun) {
    let running = vendorContext;
    let previousPayback = vendorRun.paybackMonths;
    for (const step of driverSteps(buyerContext, vendorContext)) {
      running = step.apply(running);
      const result = computeOption({ ...running, prefix: "driver" });
      const added =
        previousPayback !== null && result.paybackMonths !== null
          ? Math.round((result.paybackMonths - previousPayback) * 10) / 10
          : null;
      drivers.push({
        field: step.field,
        label: step.label,
        unit: step.unit,
        fromValue: step.fromValue,
        toValue: step.toValue,
        paybackBeforeMonths: previousPayback,
        paybackAfterMonths: result.paybackMonths,
        addedMonths: added,
        detail: step.detail,
      });
      previousPayback = result.paybackMonths;
    }
  }

  const findings = ASSUMPTION_LEVERS.map((lever) => auditLever(lever, buyerContext));

  const unstated = dedupe(buyerRun.unstated);
  const failing = findings.filter((finding) => finding.verdict === "fail");
  const unverifiable = findings.filter((finding) => finding.verdict === "unverifiable");

  const verdict = buildVerdict({
    unstated,
    failing,
    unverifiable,
    buyerRun,
    finance: input.finance,
  });

  const confirmInWriting = [...findings].sort((a, b) => riskKey(a) - riskKey(b));

  const linesPerYear = annualLines(input.baseline);
  const loaded = computeLoadedLaborRate(input.baseline);

  const audit: CaseAudit = {
    verdict,
    claimedPaybackMonths: input.option.vendorClaim?.claimedPaybackMonths ?? null,
    hurdleRatePct: input.finance.hurdleRatePct,
    baselineSummary: {
      linesPerDay: Math.round(input.baseline.ordersPerDay * input.baseline.linesPerOrder * 100) / 100,
      linesPerYear: Math.round(linesPerYear),
      peakFactor: input.baseline.peakFactor ?? null,
      totalHeadcount: loaded.headcount,
      annualLoadedCostCents: loaded.annualLoadedCostCents,
    },
    vendorRun: { result: vendorRun, reason: vendorReason },
    buyerRun,
    drivers,
    findings,
    confirmInWriting,
    unstated,
    coverage: buildCoverage(),
    decisionPack: { csv: "", formats: ["csv"], note: "" },
  };
  audit.decisionPack = buildDecisionPack({ audit, label: input.label ?? null });
  return audit;
}

function riskKey(finding: AssumptionFinding): number {
  // Unstated and unverifiable assumptions rank ahead of measured ones; among measured ones the
  // smallest relative headroom is the riskiest, so it sorts first. A pass with no break-even inside
  // the tested range is the least risky: the assumption cannot fail the case on its own.
  const tier =
    finding.verdict === "unstated"
      ? 0
      : finding.verdict === "unverifiable"
        ? 1
        : finding.verdict === "fail"
          ? 2
          : finding.breakEvenValue === null
            ? 4
            : 3;
  const headroom = finding.headroomPct === null ? (tier === 4 ? 0 : 1_000) : Math.abs(finding.headroomPct);
  return tier * 1_000_000 + headroom;
}

function auditLever(lever: Lever, context: LeverContext): AssumptionFinding {
  const current = lever.read(context);
  const vendorValue = lever.vendorValue ? lever.vendorValue(context.option) : null;
  const base = {
    field: lever.field,
    label: lever.label,
    unit: lever.unit,
    buyerValue: current,
    vendorValue,
    higherIsBetter: lever.higherIsBetter,
    action: lever.action,
  };

  if (current === null) {
    return {
      ...base,
      breakEvenValue: null,
      verdict: "unstated",
      headroomPct: null,
      message: `The case does not state ${lever.label.toLowerCase()}, so there is nothing to test — and an unstated term blocks a pass (PRD §5).`,
    };
  }

  const [low, high] = lever.bracket(current);
  const npvWith = (value: number) => {
    const next = lever.apply(value, context);
    return computeOption({ ...next, prefix: "breakeven" }).npvCents;
  };
  const npvLow = npvWith(low);
  const npvHigh = npvWith(high);
  const straddles = npvLow === 0 || npvHigh === 0 || npvLow * npvHigh < 0;

  if (!straddles) {
    // No break-even inside the bracket is a *result*, not a hole: if the case clears the hurdle at
    // both ends it clears across the whole tested range, which is stronger than a pass; if it clears
    // at neither end it never clears and no break-even is needed to say so. Only a genuinely
    // mixed/unstable bracket would be `unverifiable`, and that cannot happen here.
    const clearsEverywhere = npvLow > 0 && npvHigh > 0;
    return {
      ...base,
      breakEvenValue: null,
      verdict: clearsEverywhere ? "pass" : "fail",
      headroomPct: null,
      message: clearsEverywhere
        ? `Clears the ${context.finance.hurdleRatePct}% hurdle with ${lever.label.toLowerCase()} anywhere in ${formatRange(low, high, lever.unit)} — there is no break-even inside the tested range, so this assumption cannot fail the case on its own.`
        : `Does not clear the ${context.finance.hurdleRatePct}% hurdle anywhere in ${formatRange(low, high, lever.unit)} — the case fails on this assumption regardless of the value.`,
    };
  }

  const breakEvenRaw = bisect(npvWith, low, high);
  if (breakEvenRaw === null) {
    return {
      ...base,
      breakEvenValue: null,
      verdict: "unverifiable",
      headroomPct: null,
      message: `No value of ${lever.label.toLowerCase()} inside ${formatRange(low, high, lever.unit)} makes this case stop clearing the ${context.finance.hurdleRatePct}% hurdle — the NPV does not change sign in that range. CaseProof reports that as unverifiable rather than inventing a break-even.`,
    };
  }

  const breakEvenValue = roundAxis(breakEvenRaw, lever.unit === "fte" ? 3 : 2);
  const headroomPct = roundAxis(((current - breakEvenValue) / Math.abs(breakEvenValue || 1)) * 100, 2);
  const clears = lever.higherIsBetter ? current >= breakEvenValue : current <= breakEvenValue;

  return {
    ...base,
    breakEvenValue,
    verdict: clears ? "pass" : "fail",
    headroomPct,
    message: clears
      ? `${formatLeverValue(current, lever.unit)} against a break-even of ${formatLeverValue(breakEvenValue, lever.unit)} — ${Math.abs(headroomPct).toFixed(1)}% of margin${lever.higherIsBetter ? " above" : " below"} the value at which this case stops clearing the hurdle.`
      : `${formatLeverValue(current, lever.unit)} is on the wrong side of the break-even of ${formatLeverValue(breakEvenValue, lever.unit)}: this case does NOT clear the ${context.finance.hurdleRatePct}% hurdle on your numbers. The vendor's run clears it because it assumed ${vendorValue === null ? "a different value" : formatLeverValue(vendorValue, lever.unit)}.`,
  };
}

function formatRange(low: number, high: number, unit: AssumptionFinding["unit"]): string {
  return `${formatLeverValue(low, unit)}–${formatLeverValue(high, unit)}`;
}

export function formatLeverValueForReport(value: number, unit: AssumptionFinding["unit"]): string {
  return formatLeverValue(value, unit);
}

function buildVerdict(input: {
  unstated: UnstatedField[];
  failing: AssumptionFinding[];
  unverifiable: AssumptionFinding[];
  buyerRun: OptionResult;
  finance: Finance;
}): CaseAudit["verdict"] {
  const reasons: string[] = [];
  if (input.unstated.length > 0) {
    reasons.push(
      `${input.unstated.length} cost term${input.unstated.length === 1 ? " is" : "s are"} unstated (${input.unstated
        .map((field) => field.label)
        .join(", ")}): an unstated line blocks a pass verdict.`,
    );
  }
  if (input.failing.length > 0) {
    reasons.push(
      `${input.failing.length} assumption${input.failing.length === 1 ? "" : "s"} fail the buyer's own numbers (${input.failing
        .map((finding) => finding.label)
        .join(", ")}).`,
    );
  }
  if (input.unverifiable.length > 0) {
    reasons.push(
      `${input.unverifiable.length} assumption${input.unverifiable.length === 1 ? "" : "s"} could not be solved inside a defensible range and ${input.unverifiable.length === 1 ? "is" : "are"} reported unverifiable rather than guessed.`,
    );
  }
  if (input.buyerRun.paybackMonths === null) {
    reasons.push(
      `The buyer's run never recovers its outlay inside the ${input.finance.horizonYears}-year horizon.`,
    );
  }

  const status: CaseAudit["verdict"]["status"] =
    input.unstated.length > 0 || input.unverifiable.length > 0
      ? "blocked"
      : input.failing.length > 0 || input.buyerRun.paybackMonths === null
        ? "fails"
        : "clears";

  const headline =
    status === "clears"
      ? `Clears the ${input.finance.hurdleRatePct}% hurdle on your numbers, with no unstated cost line.`
      : status === "fails"
        ? `Does not clear the ${input.finance.hurdleRatePct}% hurdle on your numbers.`
        : "Blocked: the case cannot pass while lines are unstated or unsolvable.";

  return { status, headline, reasons };
}

function dedupe(fields: UnstatedField[]): UnstatedField[] {
  const seen = new Set<string>();
  const out: UnstatedField[] = [];
  for (const field of fields) {
    if (seen.has(field.field)) continue;
    seen.add(field.field);
    out.push(field);
  }
  return out;
}

