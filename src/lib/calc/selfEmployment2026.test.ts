import { describe, it, expect } from "vitest";
import {
  calculateSelfEmployment2026,
  selfEmployment2026Engine,
} from "./selfEmployment2026";
import { executeCalculation } from "./index";

describe("2026 Self-Employment & QBI Calculation Engine (OBBBA Compliant)", () => {
  // PRD Validation Case 1: biztaxcalc.com benchmark
  // $150K gross - $20K expenses -> SE tax $18,368; QBI $120,816 -> deduction $20,943 (saves $4,607)
  it("validates PRD Case 1 (biztaxcalc.com benchmark: $150k gross, $20k expenses)", () => {
    const result = calculateSelfEmployment2026({
      grossIncome: 150000,
      businessExpenses: 20000,
      filingStatus: "single",
    });

    expect(result.netBusinessProfit).toBe(130000);
    // Net SE earnings: 130000 * 0.9235 = 120055
    expect(result.seEarningsSubjectToTax).toBeCloseTo(120055, 0);
    // SE tax: 15.3% on 120055 = 18368.415 -> ~$18,368
    expect(Math.round(result.totalSelfEmploymentTax)).toBe(18368);
    // Half SE tax: 9184.21
    expect(Math.round(result.halfSeTaxDeduction)).toBe(9184);
    // QBI: 130000 - 9184.21 = 120815.79 -> ~$120,816
    expect(Math.round(result.qualifiedBusinessIncome)).toBe(120816);
    // Taxable income before QBI = 130000 - 9184.21 - 16100 (standard deduction) = 104715.79
    // QBI deduction capped at 20% of taxable income (104715.79 * 0.20 = 20943.16 -> ~$20,943)
    expect(Math.round(result.qbiDeduction)).toBe(20943);
    // Saves ~$4,607 at 22% marginal bracket (20943.16 * 0.22 = 4607.50)
    expect(Math.round(result.qbiTaxSavings)).toBe(4607);
    // QBI rate must be pinned to 20%
    expect(result.qbiRate).toBe(0.20);
  });

  // PRD Validation Case 2: unclekam.com benchmark
  // Single $320K TI, $250K QBI, $80K W-2, $200K UBIA -> W-2/UBIA limit $40,000 (deduction = $40,000)
  it("validates PRD Case 2 (unclekam.com benchmark: high earner W-2/UBIA limit)", () => {
    // We construct a case where gross profit generates ~$250k QBI and taxable income is ~$320k (above $276,750 phase-in cap)
    const result = calculateSelfEmployment2026({
      grossIncome: 270000,
      businessExpenses: 0,
      otherTaxableIncome: 90000, // pushes Taxable Income well above $276,750 single threshold
      w2WagesPaidByBusiness: 80000,
      ubia: 200000,
      isSstb: false,
      filingStatus: "single",
    });

    // 50% W-2 = $40,000; 25% W-2 + 2.5% UBIA = $20,000 + $5,000 = $25,000.
    // Greater limit is $40,000.
    expect(result.w2UbiaLimit).toBe(40000);
    expect(result.qbiPhaseRatio).toBe(1); // Fully phased-in limit applies
    expect(result.qbiDeduction).toBe(40000);
  });

  // PRD Validation Case 3: indie-calc.com OBBBA savings tables ($60k / $100k / $200k single filer deltas)
  it("validates PRD Case 3 ($60k, $100k, $200k single filer cases)", () => {
    const case60k = calculateSelfEmployment2026({
      grossIncome: 60000,
      businessExpenses: 0,
      filingStatus: "single",
    });
    // SE tax: 60000 * 0.9235 * 0.153 = 8477.73
    expect(case60k.totalSelfEmploymentTax).toBeCloseTo(8477.73, 1);
    // QBI: 60000 - 4238.87 = 55761.13
    expect(case60k.qualifiedBusinessIncome).toBeCloseTo(55761.13, 1);
    // Taxable income before QBI = 60000 - 4238.865 - 16100 = 39661.135
    // 20% cap on taxable income = 7932.23
    expect(case60k.qbiDeduction).toBeCloseTo(7932.23, 1);

    const case100k = calculateSelfEmployment2026({
      grossIncome: 100000,
      businessExpenses: 0,
      filingStatus: "single",
    });
    // SE tax: 100000 * 0.9235 * 0.153 = 14129.55
    expect(case100k.totalSelfEmploymentTax).toBeCloseTo(14129.55, 1);
    // QBI deduction = 20% of (100000 - 7064.775 - 16100) = 15367.045
    expect(case100k.qbiDeduction).toBeCloseTo(15367.05, 1);

    const case200k = calculateSelfEmployment2026({
      grossIncome: 200000,
      businessExpenses: 0,
      filingStatus: "single",
    });
    // SE Earnings: 200000 * 0.9235 = 184700.
    // SS portion capped at $184,500 * 0.124 = 22878.00
    // Medicare: 184700 * 0.029 = 5356.30
    // Total SE tax = 28234.30
    expect(case200k.socialSecurityTax).toBeCloseTo(22878.00, 1);
    expect(case200k.medicareTax).toBeCloseTo(5356.30, 1);
    expect(case200k.totalSelfEmploymentTax).toBeCloseTo(28234.30, 1);
  });

  // Test: 23% vs 20% Trap Check Detection
  it("accurately flags the 23% House proposal trap vs 20% enacted law", () => {
    const result = calculateSelfEmployment2026({
      grossIncome: 120000,
      businessExpenses: 20000,
      filingStatus: "single",
    });

    expect(result.trapCheck.enactedRate).toBe(0.20);
    expect(result.trapCheck.proposedFailedRate).toBe(0.23);
    expect(result.trapCheck.overstatementAmount).toBeGreaterThan(0);
    expect(result.trapCheck.potentialPenaltyRisk).toBeGreaterThan(0);
    expect(result.trapCheck.explanation).toContain("Public Law 119-21");
  });

  // Test: OBBBA "No Tax on Tips"
  it("applies OBBBA No Tax on Tips deduction up to $25k for income tax only", () => {
    const withTips = calculateSelfEmployment2026({
      grossIncome: 80000,
      businessExpenses: 10000,
      isTippedOccupation: true,
      qualifiedTips: 20000,
      filingStatus: "single",
    });

    const withoutTips = calculateSelfEmployment2026({
      grossIncome: 80000,
      businessExpenses: 10000,
      isTippedOccupation: false,
      filingStatus: "single",
    });

    // SE tax is untouched by tip deduction
    expect(withTips.totalSelfEmploymentTax).toBe(withoutTips.totalSelfEmploymentTax);
    // Tip deduction reduces AGI and Federal Income Tax
    expect(withTips.tipDeduction).toBe(20000);
    expect(withTips.adjustedGrossIncome).toBe(withoutTips.adjustedGrossIncome - 20000);
    expect(withTips.federalIncomeTax).toBeLessThan(withoutTips.federalIncomeTax);
  });

  // Test: OBBBA Senior Deduction ($6k with 6¢/$ phaseout above $75k)
  it("applies OBBBA $6,000 senior deduction with 6¢ phaseout above $75k", () => {
    // Under $75k AGI -> full $6,000
    const seniorUnder75k = calculateSelfEmployment2026({
      grossIncome: 60000,
      age: 67,
      filingStatus: "single",
    });
    expect(seniorUnder75k.seniorDeduction).toBe(6000);

    // Over $75k AGI -> phased out at 6 cents per dollar
    const seniorOver75k = calculateSelfEmployment2026({
      grossIncome: 100000,
      age: 70,
      filingStatus: "single",
    });
    expect(seniorOver75k.seniorDeduction).toBeGreaterThan(0);
    expect(seniorOver75k.seniorDeduction).toBeLessThan(6000);
  });

  // Test: OBBBA SALT Cap ($40,400)
  it("applies OBBBA SALT cap at $40,400 for itemizers", () => {
    const result = calculateSelfEmployment2026({
      grossIncome: 250000,
      stateLocalTaxPaid: 50000, // exceeds $40,400 cap
      filingStatus: "single",
    });

    expect(result.itemizedDeductions).toBe(40400);
    expect(result.claimedDeduction).toBe(40400);
  });

  // Test: SSTB Phase-out
  it("phases out SSTB QBI deduction between $201,750 and $276,750, and eliminates above $276,750", () => {
    // Completely above $276,750 -> 0 QBI deduction for SSTB
    const sstbHigh = calculateSelfEmployment2026({
      grossIncome: 350000,
      isSstb: true,
      filingStatus: "single",
    });
    expect(sstbHigh.qbiDeduction).toBe(0);

    // Below $201,750 -> full 20% QBI deduction even for SSTB
    const sstbLow = calculateSelfEmployment2026({
      grossIncome: 120000,
      isSstb: true,
      filingStatus: "single",
    });
    expect(sstbLow.qbiDeduction).toBeGreaterThan(0);
    expect(sstbLow.qbiPhaseRatio).toBe(0);
  });

  // Test: Estimated tax safe harbor (100% vs 110%)
  it("calculates quarterly safe-harbor installments correctly", () => {
    const resultWithPriorYear = calculateSelfEmployment2026({
      grossIncome: 200000,
      priorYearAgi: 180000, // > $150k -> 110% safe harbor
      priorYearTax: 20000,
      filingStatus: "single",
    });

    expect(resultWithPriorYear.estimatedPayments.safeHarborApplied).toBe(true);
    expect(resultWithPriorYear.estimatedPayments.safeHarborThresholdAmount).toBe(22000); // 110% of 20000
    expect(resultWithPriorYear.estimatedPayments.quarterlyInstallments.length).toBe(4);
    expect(resultWithPriorYear.estimatedPayments.quarterlyInstallments[2].dueDate).toBe("September 15, 2026");
    expect(resultWithPriorYear.estimatedPayments.quarterlyInstallments[2].isUrgent).toBe(true);
  });

  // Test: Factory calculation engine contract execution
  it("conforms to the factory CalculationEngine contract with executeCalculation", () => {
    const input = {
      grossIncome: 100000,
      businessExpenses: 15000,
      filingStatus: "single" as const,
    };

    const res = executeCalculation(selfEmployment2026Engine, input);
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.netBusinessProfit).toBe(85000);
    expect(res.data?.qbiRate).toBe(0.20);
    expect(res.data?.estimatedPayments.quarterlyInstallments[2].quarter).toBe("Q3");
  });

  // Test: Validation fails gracefully on invalid parameters
  it("fails validation cleanly on negative inputs", () => {
    const validation = selfEmployment2026Engine.validate({
      grossIncome: -5000,
    });
    expect(validation.valid).toBe(false);
    expect(validation.errors?.[0]).toContain("non-negative");
  });
});
