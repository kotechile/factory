import { describe, expect, it } from "vitest";

import {
  ASSUMPTION_LEVERS,
  CaseProofInputError,
  afterTaxPayback,
  auditCase,
  compareBids,
  computeOption,
  normalizeQuote,
  readCaseInput,
  resolveTaxYear,
  UNSUPPORTED_TAX_YEARS,
  TAX_YEAR_RULES,
} from ".";
import { computeLoadedLaborRate } from "./loadedLabor";
import { buildDepreciationSchedule } from "./taxLayer";
import { BUYER_BASELINE, BUYER_FINANCE, caseFor, VENDOR_OPTION } from "./fixtures";
import type { CaseInput } from "./types";

describe("CaseProof loaded labour rate", () => {
  it("derives the fully loaded rate component by component (known answer)", () => {
    const loaded = computeLoadedLaborRate(BUYER_BASELINE);
    // 21.50 wage + 11.9% burden (2.5585) + 16.5% benefits (3.5475)
    // + 4.5 OT h/week × 52 × 21.50 × 0.5 ÷ 2080 paid h (1.2094)
    // + 58% separations × $3,200 per hire ÷ 2080 paid h (0.8923)
    expect(loaded.components.map((component) => [component.key, component.centsPerHour])).toEqual([
      ["wage", 2150],
      ["payroll_burden", 256],
      ["benefits", 355],
      ["overtime_premium", 121],
      ["turnover_replacement", 89],
    ]);
    expect(loaded.centsPerHour).toBe(2971);
    expect(loaded.floorOnly).toBe(false);
    expect(loaded.headcount).toBe(128);
    expect(loaded.annualLoadedCostCents).toBe(790_999_040);
    expect(loaded.vendorAssumedHourlyRateCents).toBe(2150);
    expect(loaded.gapCents).toBe(821);
  });

  it("publishes a floor and blocks a pass when a component is unstated", () => {
    const partial = computeLoadedLaborRate({
      ...BUYER_BASELINE,
      payrollBurdenPct: undefined,
      turnoverPct: undefined,
      costPerHireCents: undefined,
    });
    expect(partial.floorOnly).toBe(true);
    expect(partial.components.find((component) => component.key === "payroll_burden")?.centsPerHour).toBe(0);
    expect(partial.notes.join(" ")).toContain("FLOOR ONLY");
    // The floor is strictly below the fully loaded rate — the direction the audit depends on.
    expect(partial.centsPerHour).toBeLessThan(2971);
  });
});

describe("CaseProof — vector 1: the 14-month claim", () => {
  const input = caseFor("vendor_case");
  const report = auditCase(input);

  it("reproduces the vendor's own 14-month payback on the vendor's assumptions", () => {
    expect(report.audit.vendorRun.reason).toBeNull();
    const vendorPayback = report.audit.vendorRun.result?.paybackMonths;
    expect(vendorPayback).not.toBeNull();
    expect(vendorPayback!).toBeGreaterThanOrEqual(13.5);
    expect(vendorPayback!).toBeLessThanOrEqual(14.5);
    // The claim the proposal states is 14 months: the engine's re-run has to land on it.
    expect(VENDOR_OPTION.vendorClaim?.claimedPaybackMonths).toBe(14);
  });

  it("audits the same project at 41 months on the buyer's numbers", () => {
    expect(report.audit.buyerRun.paybackMonths).toBe(41);
    expect(report.audit.verdict.status).toBe("clears");
    expect(report.audit.unstated).toEqual([]);
  });

  it("explains the flip as a chain of named inputs that ends exactly on the buyer's run", () => {
    const drivers = report.audit.drivers;
    expect(drivers.length).toBeGreaterThanOrEqual(8);
    expect(drivers[0]?.field).toBe("labour.fteRemoved");
    expect(drivers.at(-1)?.paybackAfterMonths).toBe(report.audit.buyerRun.paybackMonths);

    // Every month of the gap is attributable: 14.1 + Σ deltas == 41.0.
    const vendorPayback = report.audit.vendorRun.result!.paybackMonths!;
    const total = drivers.reduce((acc, driver) => acc + (driver.addedMonths ?? 0), vendorPayback);
    expect(Math.round(total * 10) / 10).toBe(report.audit.buyerRun.paybackMonths);

    // The three inputs the PRD names each move the number, and the loaded rate + turnover together
    // shorten it (they make the labour the project removes more expensive, not cheaper).
    const byField = new Map(drivers.map((driver) => [driver.field, driver]));
    expect(byField.get("labour.blendedToLoaded")!.addedMonths).toBeLessThan(0);
    expect(byField.get("labour.turnoverReplacement")!.addedMonths).toBeLessThan(0);
    expect(byField.get("cost.maintenance")!.addedMonths).toBeGreaterThan(0);
  });

  it("names the break-even of every assumption the case depends on", () => {
    const findings = new Map(report.audit.findings.map((finding) => [finding.field, finding]));
    // Labour: your loaded rate clears the hurdle down to $20.64/h — 44% of margin.
    const rate = findings.get("labour.loadedHourlyRate")!;
    expect(rate.verdict).toBe("pass");
    expect(rate.breakEvenValue).toBeCloseTo(20.64, 1);
    expect(rate.buyerValue).toBeCloseTo(29.71, 2);
    // Headcount: 17.3 FTE must go for the case to clear; the buyer's build identifies 18.
    expect(findings.get("labour.fteRemoved")!.breakEvenValue).toBeCloseTo(17.3, 1);
    // Maintenance: the case can carry up to 16.8% of capex.
    expect(findings.get("cost.maintenance")!.breakEvenValue).toBeCloseTo(16.83, 1);
    // And the vendor's own numbers, side by side with the buyer's, in the vendor's units.
    expect(findings.get("labour.loadedHourlyRate")!.vendorValue).toBe(21.5);
    expect(findings.get("labour.fteRemoved")!.vendorValue).toBe(52);
  });

  it("ranks what to confirm in writing before signature, riskiest first", () => {
    const ranked = report.audit.confirmInWriting;
    // The two tightest assumptions are the buyer's own headcount build and the uptime the case
    // assumes; both sit inside 5% of their break-even and lead the ranking.
    expect(ranked).toHaveLength(ASSUMPTION_LEVERS.length);
    expect(ranked.slice(0, 2).map((finding) => finding.field).sort()).toEqual([
      "labour.fteRemoved",
      "throughput.availabilityPct",
    ]);
    for (const finding of ranked.slice(0, 2)) {
      expect(finding.headroomPct).toBeGreaterThan(0);
      expect(finding.headroomPct).toBeLessThan(5);
      expect(finding.action.length).toBeGreaterThan(20);
    }
    // The widest-margin assumption is ranked last: the ordering is the risk ordering.
    expect(ranked.at(-1)?.field).toBe("cost.facility");
    expect(Math.abs(ranked.at(-1)!.headroomPct!)).toBeGreaterThan(40);
  });

  it("ships a decision pack built from the same numbers", () => {
    const csv = report.audit.decisionPack.csv;
    expect(report.audit.decisionPack.formats).toEqual(["csv"]);
    expect(csv).toContain("section,field,label,buyer_value,vendor_value,break_even_value,verdict");
    expect(csv).toContain("payback,vendor_basis,14.1");
    expect(csv).toContain("payback,buyer_basis,41");
    expect(csv).toContain("driver,labour.fteRemoved");
    expect(csv).toContain("depreciation,2026");
    expect(csv).toContain("#coverage_excluded");
  });

  it("is deterministic: two runs produce byte-identical output", () => {
    const again = auditCase(caseFor("vendor_case"));
    expect(JSON.stringify(again)).toBe(JSON.stringify(report));
  });
});

describe("CaseProof — vector 2: §179 phase-out above $4,090,000", () => {
  it("cuts the dollar limit by the excess and says what the election actually delivers", () => {
    const schedule = buildDepreciationSchedule({
      qualifyingBasisCents: 500_000_000, // $5,000,000 placed in service
      electedCents: 256_000_000, // the full 2026 dollar limit
      taxYear: 2026,
      recoveryYears: 7,
      horizonYears: 5,
    });
    expect(schedule.schedule.allowedLimitCents).toBe(165_000_000);
    expect(schedule.schedule.phaseOutReductionCents).toBe(91_000_000);
    expect(schedule.schedule.allowedCents).toBe(165_000_000);
    expect(schedule.schedule.remainingBasisCents).toBe(335_000_000);
    // 100% bonus takes the rest, so nothing is left for straight-line in 2026.
    expect(schedule.schedule.years[0]?.bonusCents).toBe(335_000_000);
    expect(schedule.schedule.notes.join(" ")).toContain("phase-out binds");
  });

  it("removes §179 entirely once property passes limit + threshold", () => {
    const schedule = buildDepreciationSchedule({
      qualifyingBasisCents: 700_000_000, // $7,000,000 > $2,560,000 + $4,090,000
      electedCents: 256_000_000,
      taxYear: 2026,
      recoveryYears: 7,
      horizonYears: 5,
    });
    expect(schedule.schedule.allowedLimitCents).toBe(0);
    expect(schedule.schedule.allowedCents).toBe(0);
    expect(schedule.schedule.phaseOutReductionCents).toBe(256_000_000);
  });

  it("refuses a tax year with no cited rule instead of guessing one", () => {
    expect(TAX_YEAR_RULES.map((rule) => rule.taxYear)).toEqual([2026]);
    expect(UNSUPPORTED_TAX_YEARS.map((year) => year.taxYear)).toContain(2025);
    expect(() => resolveTaxYear(2025)).toThrowError(/No cited §179/);
    expect(() => resolveTaxYear(2024)).toThrowError(CaseProofInputError);
    expect(resolveTaxYear(2026).inServiceDeadline).toBe("2026-12-31");
  });

  it("carries the phase-out into the audited case", () => {
    const report = auditCase(caseFor("phase_out"));
    const schedule = report.audit.buyerRun.depreciation;
    expect(schedule.qualifyingBasisCents).toBe(500_000_000);
    expect(schedule.allowedCents).toBe(165_000_000);
    expect(schedule.rule.taxYear).toBe(2026);
    expect(schedule.rule.source).toContain("section179.org");
    // The tax schedule is by tax year, never one blended deduction.
    expect(report.audit.buyerRun.years.map((year) => year.taxYear)).toEqual([2026, 2027, 2028, 2029, 2030]);
  });
});

describe("CaseProof — vector 3: the seasonal-premium crossing", () => {
  const input = caseFor("raas_comparison");
  const comparison = compareBids({
    baseline: input.baseline,
    finance: input.finance,
    options: input.options,
  });

  it("puts two differently-structured bids on one cash model", () => {
    expect(comparison.results).toHaveLength(2);
    expect(comparison.results.map((result) => result.model).sort()).toEqual(["capex", "raas"]);
    for (const result of comparison.results) {
      expect(result.costPerOrderCents).not.toBeNull();
      expect(result.costPerLineCents).not.toBeNull();
      expect(result.years).toHaveLength(5);
    }
  });

  it("finds the point where the ranking flips: a 40% seasonal premium", () => {
    const crossing = comparison.crossings.find((entry) => entry.axis === "peakFactor");
    expect(crossing, "a peakFactor crossing must exist for a per-unit subscription").toBeDefined();
    expect(crossing!.value).not.toBeNull();
    expect(Math.abs(crossing!.value! - 1.4)).toBeLessThan(0.005);
    // The direction is reported, not assumed: below the crossing the subscription leads.
    expect(crossing!.leaderBelow).toBe("bid-raas");

    const below = computeOption({
      baseline: { ...input.baseline, peakFactor: 1.3 },
      finance: input.finance,
      option: input.options[1]!,
    }).npvCents;
    const capexBelow = computeOption({
      baseline: { ...input.baseline, peakFactor: 1.3 },
      finance: input.finance,
      option: input.options[0]!,
    }).npvCents;
    expect(below).toBeGreaterThan(capexBelow);

    const above = computeOption({
      baseline: { ...input.baseline, peakFactor: 1.5 },
      finance: input.finance,
      option: input.options[1]!,
    }).npvCents;
    const capexAbove = computeOption({
      baseline: { ...input.baseline, peakFactor: 1.5 },
      finance: input.finance,
      option: input.options[0]!,
    }).npvCents;
    expect(above).toBeLessThan(capexAbove);
  });

  it("reports the sensitivity grid the PRD asks for", () => {
    expect(comparison.sensitivity.map((cell) => cell.label)).toEqual([
      "Volume -10%",
      "Volume -20%",
      "Volume -30%",
      "Capex +15%",
      "Maintenance +25%",
    ]);
    for (const cell of comparison.sensitivity) {
      expect(cell.ranking).toHaveLength(2);
      expect(cell.npvByOptionCents).toHaveLength(2);
    }
  });
});

describe("CaseProof — vector 4: a fully stated quote produces zero flags", () => {
  const report = auditCase(caseFor("clean_case"));

  it("passes every assumption and leaves nothing unstated", () => {
    expect(report.audit.buyerRun.unstated).toEqual([]);
    expect(report.audit.unstated).toEqual([]);
    expect(report.audit.findings.every((finding) => finding.verdict === "pass")).toBe(true);
    expect(report.audit.verdict.status).toBe("clears");
    expect(report.audit.verdict.reasons).toEqual([]);
  });

  it("prices every line from the vendor's own quote, echoed not re-priced", () => {
    const quote = report.audit.buyerRun.quote;
    expect(quote).not.toBeNull();
    expect(quote!.unmappedRows).toEqual([]);
    expect(quote!.unpricedRows).toEqual([]);
    expect(quote!.statedTotalCents).toBe(347_500_000);
    expect(quote!.itemizedTotalCents).toBe(347_500_000);
    expect(quote!.totalsByCategoryCents).toEqual({
      equipment: 245_000_000,
      install: 17_000_000,
      freight: 4_500_000,
      integration: 21_000_000,
      facility: 15_000_000,
      training: 5_200_000,
      software: 6_800_000,
      maintenance: 33_000_000,
    });
  });

  it("still bounds the assumptions: every lever has a break-even or a stated range verdict", () => {
    expect(report.audit.findings).toHaveLength(ASSUMPTION_LEVERS.length);
    for (const finding of report.audit.findings) {
      expect(finding.verdict).toBe("pass");
      expect(finding.message.length).toBeGreaterThan(30);
    }
  });
});

describe("CaseProof — vector 5: an empty maintenance field is unstated, not zero", () => {
  const report = auditCase(caseFor("unstated_maintenance"));

  it("reports the term unstated and blocks a pass", () => {
    expect(report.audit.unstated.map((field) => field.field)).toContain("option.maintenancePctOfCapex");
    expect(report.audit.verdict.status).toBe("blocked");
    expect(report.audit.verdict.reasons.join(" ")).toContain("unstated line blocks a pass verdict");
    const maintenance = report.audit.findings.find((finding) => finding.field === "cost.maintenance")!;
    expect(maintenance.verdict).toBe("unstated");
    expect(maintenance.breakEvenValue).toBeNull();
  });

  it("charges no maintenance at all rather than a guessed percentage", () => {
    expect(report.audit.buyerRun.years.every((year) => year.maintenanceCents === 0)).toBe(true);
    const quote = report.audit.buyerRun.quote!;
    // The amount cell is blank in the quote: an unpriced line, never a zero.
    expect(quote.unpricedRows).toEqual([4]);
    expect(quote.totalsByCategoryCents.maintenance).toBeUndefined();
    expect(report.audit.buyerRun.notes.join(" ")).toContain("carry no amount");
  });
});

describe("CaseProof quote normalizer", () => {
  it("surfaces unmapped rows instead of dropping them", () => {
    const quote = normalizeQuote(`item,amount_usd,category
AMR fleet,1000000,equipment
Something nobody classified,250000,
Total,1250000,`);
    expect(quote.lines.map((line) => line.category)).toEqual(["equipment", "unmapped"]);
    expect(quote.unmappedRows).toEqual([3]);
    expect(quote.statedTotalCents).toBe(125_000_000);
    expect(quote.itemizedTotalCents).toBe(125_000_000);
  });

  it("refuses a non-numeric amount and a missing required header", () => {
    expect(() => normalizeQuote(`item,amount_usd\nAMR fleet,TBD`)).toThrowError(/is not a dollar amount/);
    expect(() => normalizeQuote(`thing,cost\nAMR fleet,1000`)).toThrowError(/must start with a header row/);
  });
});

describe("CaseProof input validation", () => {
  const valid = caseFor("vendor_case");

  it("accepts the shipped scenarios", () => {
    for (const key of ["vendor_case", "clean_case", "phase_out", "raas_comparison", "unstated_maintenance"] as const) {
      expect(() => readCaseInput(caseFor(key))).not.toThrow();
    }
  });

  it("names the rule and the field for every malformed case", () => {
    const badModel: CaseInput = { ...valid, options: [{ ...valid.options[0]!, model: "hardware_subscription" as never }] };
    expect(() => readCaseInput(badModel)).toThrowError(/capex, lease, raas/);

    const badTerm: CaseInput = {
      ...valid,
      options: [{ ...valid.options[0]!, labourImpact: { ...valid.options[0]!.labourImpact, disposition: "maybe" as never } }],
    };
    expect(() => readCaseInput(badTerm)).toThrowError(/cash_out/);

    const badYear: CaseInput = { ...valid, finance: { ...BUYER_FINANCE, inServiceTaxYear: 2025 } };
    expect(() => readCaseInput(badYear)).toThrowError(/No cited §179/);

    const tooMany: CaseInput = {
      ...valid,
      options: [valid.options[0]!, valid.options[0]!, valid.options[0]!, valid.options[0]!],
    };
    expect(() => readCaseInput(tooMany)).toThrowError(/up to 3/);

    expect(() => readCaseInput({ options: [] })).toThrowError(CaseProofInputError);
    expect(() => readCaseInput("not a case")).toThrowError(/must be an object/);
  });

  it("reports an unstated availability as blocking rather than assuming a system that never stops", () => {
    const noAvailability: CaseInput = {
      ...valid,
      options: [
        {
          ...valid.options[0]!,
          throughputClaim: { picksPerHour: 1_200, basis: "sustained" },
        },
      ],
    };
    const report = auditCase(noAvailability);
    expect(report.audit.unstated.map((field) => field.field)).toContain("option.throughputClaim.availabilityPct");
    expect(report.audit.buyerRun.years.every((year) => year.downtimeCents === 0)).toBe(true);
    expect(report.audit.verdict.status).toBe("blocked");
  });

  it("carries no labour cash saving when the FTE are redeployed", () => {
    const redeployed: CaseInput = {
      ...valid,
      options: [
        { ...valid.options[0]!, labourImpact: { ...valid.options[0]!.labourImpact, disposition: "redeploy" } },
      ],
    };
    const report = auditCase(redeployed);
    expect(report.audit.buyerRun.years.every((year) => year.labourSavingCents === 0)).toBe(true);
    expect(report.audit.buyerRun.notes.join(" ")).toContain("no labour cash saving");
  });
});

describe("CaseProof after-tax primitive", () => {
  it("returns payback, NPV, IRR and the by-tax-year schedule for one bid", () => {
    const input = caseFor("vendor_case");
    const primitive = afterTaxPayback(input);
    expect(primitive.optionId).toBe("bid-a");
    expect(primitive.paybackMonths).toBe(41);
    expect(primitive.hurdleRatePct).toBe(12);
    expect(primitive.irrPct).toBeCloseTo(13.73, 1);
    expect(primitive.depreciation.years).toHaveLength(5);
    expect(primitive.depreciation.rule.taxYear).toBe(2026);
    expect(primitive.upfrontCents).toBe(323_000_000);
  });

  it("reports no IRR when the flow series has no sign change", () => {
    const input = caseFor("vendor_case");
    const { irrPct } = computeOption({
      baseline: { ...input.baseline, ordersPerDay: 1 },
      finance: { ...input.finance, section179ElectionCents: 0 },
      option: { ...input.options[0]!, labourImpact: { ...input.options[0]!.labourImpact, fteRemoved: 0 } },
    });
    expect(irrPct).toBeNull();
  });
});
