/**
 * The fully loaded cost of one productive hour (PRD §2 `loadedLabor.ts`).
 *
 * The single number a vendor's case is built on is a **blended wage**. The number the buyer pays is
 * the wage plus employer payroll taxes, benefits, the overtime premium and the amortized cost of
 * replacing the people warehousing loses every year. This module derives that rate, returns the
 * component breakdown so the buyer's real rate can be set beside the blended one, and — when any
 * component is unstated — says so instead of quietly assuming it away.
 *
 * A missing component is reported `unstated` and the rate is published as a **floor**
 * (`floorOnly: true`), which blocks a pass verdict (PRD §5, AGENTS.md rule 5).
 */
import type {
  Baseline,
  LabourComponent,
  LoadedLaborRate,
  UnstatedField,
} from "./types";
import { CaseProofInputError, roundCents } from "./money";

interface FunctionRate {
  function: string;
  headcount: number;
  paidHours: number;
  centsPerHour: number;
}

/** A calendar fact, not an assumption: weeks in a year, used to annualize the weekly OT premium. */
const WEEKS_PER_YEAR = 52;

interface RateBreakdown {
  centsPerHour: number;
  components: LabourComponent[];
  unstated: UnstatedField[];
}

/**
 * The loaded rate for one wage/paid-hours pair.
 *
 * - wage: the stated blended wage.
 * - payroll burden: `wage × payrollBurdenPct/100` (FICA + FUTA/SUTA + workers' comp).
 * - benefits: `wage × benefitsPct/100` (health, PTO, 401(k) match).
 * - overtime premium: `overtimeHoursPerWeek × 52 × wage × 0.5 / paidHoursPerFtePerYear` — the FLSA
 *   half-time premium on a year of OT hours, spread over the paid hours of one FTE-year (the OT hours
 *   themselves are already inside paid hours, so only the premium is added).
 * - turnover replacement: `turnoverPct/100 × costPerHire / paidHoursPerFtePerYear` — annual
 *   separations per FTE multiplied by the fully loaded cost of one replacement, spread the same way.
 */
function rateBreakdown(input: {
  wage: number;
  paidHours: number;
  baseline: Baseline;
  prefix: string;
}): RateBreakdown {
  const { wage, paidHours, baseline, prefix } = input;
  const components: LabourComponent[] = [];
  const unstated: UnstatedField[] = [];

  components.push({
    key: "wage",
    label: "Blended wage",
    centsPerHour: roundCents(wage * 100),
    basis: "the wage the vendor's case uses",
    unstated: false,
  });

  const burdenPct = baseline.payrollBurdenPct;
  components.push({
    key: "payroll_burden",
    label: "Payroll burden",
    centsPerHour: burdenPct === undefined ? 0 : roundCents(wage * 100 * (burdenPct / 100)),
    basis:
      burdenPct === undefined
        ? "unstated — no employer payroll tax or insurance is counted"
        : `wage × ${burdenPct}% (FICA, FUTA/SUTA, workers' comp)`,
    unstated: burdenPct === undefined,
  });
  if (burdenPct === undefined) {
    unstated.push({
      field: `${prefix}.payrollBurdenPct`,
      label: "Employer payroll burden",
      detail:
        "Without the employer payroll tax and insurance load the loaded rate is a floor. State it, or the case cannot clear a verdict.",
    });
  }

  const benefitsPct = baseline.benefitsPct;
  components.push({
    key: "benefits",
    label: "Benefits",
    centsPerHour: benefitsPct === undefined ? 0 : roundCents(wage * 100 * (benefitsPct / 100)),
    basis:
      benefitsPct === undefined
        ? "unstated — no benefits load is counted"
        : `wage × ${benefitsPct}% (health, PTO, 401(k) match)`,
    unstated: benefitsPct === undefined,
  });
  if (benefitsPct === undefined) {
    unstated.push({
      field: `${prefix}.benefitsPct`,
      label: "Benefits load",
      detail: "Benefits are a real hourly cost. State them or the loaded rate stays a floor.",
    });
  }

  const otHours = baseline.overtimeHoursPerWeek;
  const overtimeCents =
    otHours === undefined || paidHours <= 0
      ? 0
      : roundCents(((otHours * WEEKS_PER_YEAR * wage * 0.5) / paidHours) * 100);
  components.push({
    key: "overtime_premium",
    label: "Overtime premium",
    centsPerHour: overtimeCents,
    basis:
      otHours === undefined
        ? "unstated — no overtime premium is counted"
        : `${otHours} OT h/week × ${WEEKS_PER_YEAR} weeks × wage × 0.5 ÷ ${paidHours} paid h (FLSA half-time premium)`,
    unstated: otHours === undefined,
  });
  if (otHours === undefined) {
    unstated.push({
      field: `${prefix}.overtimeHoursPerWeek`,
      label: "Overtime hours",
      detail:
        "Warehouses run overtime; if it is unstated the case assumes a warehouse that never does.",
    });
  }

  const turnoverPct = baseline.turnoverPct;
  const costPerHireCents = baseline.costPerHireCents;
  const turnoverStated = turnoverPct !== undefined && costPerHireCents !== undefined;
  const turnoverCents =
    !turnoverStated || paidHours <= 0
      ? 0
      : roundCents((((turnoverPct as number) / 100) * (costPerHireCents as number)) / paidHours);
  components.push({
    key: "turnover_replacement",
    label: "Turnover replacement",
    centsPerHour: turnoverCents,
    basis:
      !turnoverStated
        ? "unstated — no replacement cost is counted"
        : `${turnoverPct}% separations × $${(((costPerHireCents as number) / 100) || 0).toFixed(0)}/hire ÷ ${paidHours} paid h`,
    unstated: !turnoverStated,
  });
  if (turnoverPct === undefined) {
    unstated.push({
      field: `${prefix}.turnoverPct`,
      label: "Annual turnover",
      detail:
        "Warehousing runs 60%+/yr; the rehire cost of the crew the project removes is part of the loaded rate.",
    });
  }
  if (costPerHireCents === undefined) {
    unstated.push({
      field: `${prefix}.costPerHireCents`,
      label: "Cost per hire",
      detail: "Recruiting and onboarding cost per replacement — needed with turnover to price churn.",
    });
  }

  const centsPerHour = components.reduce((acc, component) => acc + component.centsPerHour, 0);
  return { centsPerHour, components, unstated };
}

/**
 * The loaded rate across the staffing sheet, weighted by paid headcount-hours (a function with more
 * headcount or longer hours moves the site-wide rate more than a small one).
 */
export function computeLoadedLaborRate(baseline: Baseline, prefix = "baseline"): LoadedLaborRate {
  const staff = baseline.staffByFunction ?? [];
  if (staff.length === 0) {
    throw new CaseProofInputError(
      "cp-staffing-empty",
      `${prefix}.staffByFunction`,
      "The staffing sheet is empty: there is no labour for the project to reduce, so there is no case to audit.",
    );
  }

  const rates: FunctionRate[] = [];
  const componentsByFunction: { rates: RateBreakdown; paidHours: number; headcount: number }[] = [];
  let headcount = 0;

  for (const [index, entry] of staff.entries()) {
    const headcountValue = entry.headcount;
    if (typeof headcountValue !== "number" || !Number.isFinite(headcountValue) || headcountValue <= 0) {
      throw new CaseProofInputError(
        "cp-field-invalid",
        `${prefix}.staffByFunction[${index}].headcount`,
        `\`${entry.function || `function #${index + 1}`}\` needs a positive headcount; received ${JSON.stringify(headcountValue)}.`,
      );
    }
    const wage = entry.hourlyWage ?? baseline.hourlyWage;
    const paidHours = entry.paidHoursPerFtePerYear ?? baseline.paidHoursPerFtePerYear;
    const breakdown = rateBreakdown({ wage, paidHours, baseline, prefix });
    rates.push({
      function: entry.function,
      headcount: headcountValue,
      paidHours,
      centsPerHour: breakdown.centsPerHour,
    });
    componentsByFunction.push({ rates: breakdown, paidHours, headcount: headcountValue });
    headcount += headcountValue;
  }

  const totalWeight = rates.reduce((acc, rate) => acc + rate.headcount * rate.paidHours, 0);
  if (totalWeight <= 0) {
    throw new CaseProofInputError(
      "cp-field-invalid",
      `${prefix}.paidHoursPerFtePerYear`,
      "Paid hours per FTE per year must be positive — it is the denominator of the loaded hourly rate.",
    );
  }

  const centsPerHour = roundCents(
    rates.reduce((acc, rate) => acc + rate.centsPerHour * rate.headcount * rate.paidHours, 0) /
      totalWeight,
  );

  // Component values are the same per unit of wage across functions, so the first function's
  // breakdown is representative; the note states that the site rate is weighted.
  const representative = componentsByFunction[0]!.rates;
  const unstated = dedupeUnstated(representative.unstated);
  const floorOnly = unstated.length > 0;

  const vendorAssumedHourlyRateCents =
    baseline.vendorAssumedHourlyRate === undefined
      ? null
      : roundCents(baseline.vendorAssumedHourlyRate * 100);
  const notes: string[] = [
    `Weighted across ${staff.length} function${staff.length === 1 ? "" : "s"} and ${headcount} FTE by paid hours.`,
  ];
  if (floorOnly) {
    notes.push(
      `FLOOR ONLY — ${unstated.length} component${unstated.length === 1 ? "" : "s"} unstated: the real loaded rate is higher than the ${(
        centsPerHour / 100
      ).toFixed(2)} shown, and a case cannot pass on a floor.`,
    );
  }
  if (vendorAssumedHourlyRateCents !== null) {
    const gap = centsPerHour - vendorAssumedHourlyRateCents;
    notes.push(
      `The vendor's case prices labour at $${(vendorAssumedHourlyRateCents / 100).toFixed(2)}/h; the buyer's loaded rate is $${(
        centsPerHour / 100
      ).toFixed(2)}/h (${gap >= 0 ? "+" : ""}$${(gap / 100).toFixed(2)}/h, ${gap >= 0 ? "understated" : "overstated"} by the vendor).`,
    );
  }

  return {
    centsPerHour,
    floorOnly,
    components: representative.components,
    vendorAssumedHourlyRateCents,
    gapCents:
      vendorAssumedHourlyRateCents === null ? null : centsPerHour - vendorAssumedHourlyRateCents,
    paidHoursPerFtePerYear: baseline.paidHoursPerFtePerYear,
    annualLoadedCostCents: roundCents(
      rates.reduce((acc, rate) => acc + rate.centsPerHour * rate.headcount * rate.paidHours, 0),
    ),
    headcount,
    notes,
  };
}

function dedupeUnstated(fields: UnstatedField[]): UnstatedField[] {
  const seen = new Set<string>();
  const out: UnstatedField[] = [];
  for (const field of fields) {
    if (seen.has(field.field)) continue;
    seen.add(field.field);
    out.push(field);
  }
  return out;
}

/** The lines-per-year volume the cash model works from. */
export function annualLines(baseline: Baseline): number {
  return baseline.ordersPerDay * baseline.linesPerOrder * baseline.operatingDaysPerYear;
}

/** Orders per year, unrounded — the cost-per-order denominator. */
export function annualOrders(baseline: Baseline): number {
  return baseline.ordersPerDay * baseline.operatingDaysPerYear;
}

/**
 * The share of the year's labour the peak season carries: `peakFactor` multiples the wage for the
 * peak months. With `peakMonthsPerYear` unstated the whole year is priced at the average wage and
 * the note says so — the factor is never silently applied to twelve months.
 */
export function peakWageMultiplier(baseline: Baseline, peakMonthsPerYear: number): number {
  const peakFactor = baseline.peakFactor ?? 1;
  const share = Math.min(12, Math.max(0, peakMonthsPerYear)) / 12;
  return 1 + (peakFactor - 1) * share;
}
