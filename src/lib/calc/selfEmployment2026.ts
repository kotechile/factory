/**
 * QuarterLine: 2026 Self-Employment Tax, Section 199A QBI & Estimated-Payment Engine
 * Pure TypeScript deterministic core without I/O or side effects.
 *
 * Governing Law: One Big Beautiful Bill Act (OBBBA, Pub. L. 119-21) & Rev. Proc. 2025-32.
 * Key 2026 parameters:
 *  - Section 199A QBI deduction rate: 20% (pinned to enacted law, NOT the 23% House proposal)
 *  - QBI phase-in threshold: $201,750 (Single/HOH/MFS) / $403,500 (MFJ)
 *  - QBI phase-in band: $75,000 (Single/HOH/MFS) / $150,000 (MFJ)
 *  - OBBBA QBI minimum floor: $400 (for QBI >= $1,000, under threshold)
 *  - Social Security wage base: $184,500 (12.4% rate)
 *  - Medicare rate: 2.9% + 0.9% additional Medicare above $200k Single / $250k MFJ
 *  - Standard deduction: $16,100 (Single/MFS) / $32,200 (MFJ) / $24,150 (HOH)
 *  - OBBBA Senior deduction (65+): $6,000 above-the-line (phase-out 6¢/$ over $75k Single / $150k MFJ)
 *  - OBBBA "No Tax on Tips": up to $25,000 deduction for tipped occupations (income tax only, capped at net profit)
 *  - OBBBA SALT cap: $40,400
 *  - Estimated tax safe harbor: 100% prior year tax (110% if prior year AGI > $150,000 / $75,000 MFS)
 */

import type { CalculationEngine } from "./index";

export type FilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household";

export interface SelfEmployment2026Input {
  filingStatus?: FilingStatus;
  grossIncome: number;
  businessExpenses?: number;
  w2Wages?: number;
  priorYearAgi?: number;
  priorYearTax?: number;
  age?: number;
  isSenior?: boolean;
  isTippedOccupation?: boolean;
  qualifiedTips?: number;
  isSstb?: boolean;
  w2WagesPaidByBusiness?: number;
  ubia?: number;
  retirementContributions?: number;
  sehi?: number;
  stateLocalTaxPaid?: number;
  otherItemizedDeductions?: number;
  otherTaxableIncome?: number;
  netCapitalGain?: number;
}

export interface TaxBracketBreakdown {
  rate: number;
  min: number;
  max: number;
  taxableInBracket: number;
  tax: number;
}

export interface EstimatedPaymentQuarter {
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  dueDate: string;
  amount: number;
  isUrgent?: boolean;
}

export interface SelfEmployment2026Output {
  // Schedule C Summary
  grossIncome: number;
  businessExpenses: number;
  netBusinessProfit: number;

  // Self-Employment Tax (Schedule SE)
  seEarningsSubjectToTax: number;
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalSelfEmploymentTax: number;
  halfSeTaxDeduction: number;

  // Above-the-line Deductions & AGI
  seniorDeduction: number;
  tipDeduction: number;
  sehiDeduction: number;
  retirementDeduction: number;
  adjustedGrossIncome: number;

  // Deductions & Taxable Income Before QBI
  standardDeduction: number;
  itemizedDeductions: number;
  claimedDeduction: number;
  taxableIncomeBeforeQbi: number;

  // Section 199A QBI Deduction Breakdown
  qualifiedBusinessIncome: number;
  qbiRate: number; // 0.20
  tentativeQbiDeduction: number;
  qbiThreshold: number;
  qbiPhaseInRange: number;
  isSstb: boolean;
  qbiPhaseRatio: number;
  w2UbiaLimit: number;
  qbiDeduction: number;
  qbiTaxSavings: number;

  // Accuracy Trap Check (23% House Proposal vs 20% Enacted Law)
  trapCheck: {
    enactedRate: 0.20;
    proposedFailedRate: 0.23;
    erroneous23PercentDeduction: number;
    overstatementAmount: number;
    potentialPenaltyRisk: number;
    explanation: string;
  };

  // Income Tax Breakdown
  finalTaxableIncome: number;
  federalIncomeTax: number;
  effectiveIncomeTaxRate: number;
  marginalIncomeTaxBracket: number;
  bracketBreakdown: TaxBracketBreakdown[];

  // Total Liability & Blended Effective Rate
  totalTaxLiability: number;
  overallEffectiveRate: number;

  // Estimated Payments & Safe Harbor
  estimatedPayments: {
    requiredAnnualPayment: number;
    methodUsed: "90_percent_current_year" | "100_percent_prior_year" | "110_percent_prior_year";
    safeHarborApplied: boolean;
    safeHarborThresholdAmount: number;
    quarterlyInstallments: EstimatedPaymentQuarter[];
    underpaymentWarning: boolean;
    nextDeadline: string;
    daysUntilDeadline: number;
  };

  // Tax Readiness Scorecard (0-100)
  scorecard: {
    totalScore: number;
    qbiOptimizationScore: number;
    safeHarborComplianceScore: number;
    underpaymentRiskScore: number;
    deductionCaptureScore: number;
    rating: "Excellent" | "Good" | "Needs Attention" | "High Audit/Penalty Risk";
    keyActionItems: string[];
  };

  // Engine Metadata
  taxYear: 2026;
  governingLaw: string;
}

// ---------------------------------------------------------------------------
// 2026 Statutory Constants (Rev. Proc. 2025-32 & OBBBA Pub. L. 119-21)
// ---------------------------------------------------------------------------

export const CONSTANTS_2026 = {
  // Self-Employment Tax
  SE_NET_PROFIT_RATIO: 0.9235,
  SE_THRESHOLD_FLOOR: 400,
  SOCIAL_SECURITY_RATE: 0.124,
  SOCIAL_SECURITY_WAGE_BASE: 184500,
  MEDICARE_RATE: 0.029,
  ADDITIONAL_MEDICARE_RATE: 0.009,
  ADDITIONAL_MEDICARE_THRESHOLDS: {
    single: 200000,
    head_of_household: 200000,
    married_filing_jointly: 250000,
    married_filing_separately: 125000,
  },

  // Standard Deductions
  STANDARD_DEDUCTIONS: {
    single: 16100,
    married_filing_jointly: 32200,
    head_of_household: 24150,
    married_filing_separately: 16100,
  },

  // QBI Section 199A (Rev. Proc. 2025-32 & OBBBA)
  QBI_RATE: 0.20,
  QBI_THRESHOLDS: {
    single: 201750,
    head_of_household: 201750,
    married_filing_jointly: 403500,
    married_filing_separately: 201750,
  },
  QBI_PHASE_IN_BANDS: {
    single: 75000,
    head_of_household: 75000,
    married_filing_jointly: 150000,
    married_filing_separately: 75000,
  },
  QBI_MINIMUM_FLOOR: 400,
  QBI_MINIMUM_QUALIFYING_INCOME: 1000,

  // Senior Deduction (OBBBA)
  SENIOR_DEDUCTION_BASE: 6000,
  SENIOR_PHASEOUT_THRESHOLDS: {
    single: 75000,
    head_of_household: 75000,
    married_filing_jointly: 150000,
    married_filing_separately: 75000,
  },
  SENIOR_PHASEOUT_RATE: 0.06,

  // Tip Deduction (OBBBA "No Tax on Tips")
  TIP_DEDUCTION_MAX: 25000,

  // SALT Cap (OBBBA)
  SALT_CAP: 40400,

  // Federal Income Tax Brackets (2026 Rev. Proc. 2025-32)
  TAX_BRACKETS: {
    single: [
      { rate: 0.10, min: 0, max: 12400 },
      { rate: 0.12, min: 12400, max: 50400 },
      { rate: 0.22, min: 50400, max: 105700 },
      { rate: 0.24, min: 105700, max: 201750 },
      { rate: 0.32, min: 201750, max: 256225 },
      { rate: 0.35, min: 256225, max: 640600 },
      { rate: 0.37, min: 640600, max: Infinity },
    ],
    married_filing_jointly: [
      { rate: 0.10, min: 0, max: 24800 },
      { rate: 0.12, min: 24800, max: 100800 },
      { rate: 0.22, min: 100800, max: 211400 },
      { rate: 0.24, min: 211400, max: 403500 },
      { rate: 0.32, min: 403500, max: 512450 },
      { rate: 0.35, min: 512450, max: 768700 },
      { rate: 0.37, min: 768700, max: Infinity },
    ],
    head_of_household: [
      { rate: 0.10, min: 0, max: 17700 },
      { rate: 0.12, min: 17700, max: 67500 },
      { rate: 0.22, min: 67500, max: 105700 },
      { rate: 0.24, min: 105700, max: 201750 },
      { rate: 0.32, min: 201750, max: 256225 },
      { rate: 0.35, min: 256225, max: 640600 },
      { rate: 0.37, min: 640600, max: Infinity },
    ],
    married_filing_separately: [
      { rate: 0.10, min: 0, max: 12400 },
      { rate: 0.12, min: 12400, max: 50400 },
      { rate: 0.22, min: 50400, max: 105700 },
      { rate: 0.24, min: 105700, max: 201750 },
      { rate: 0.32, min: 201750, max: 256225 },
      { rate: 0.35, min: 256225, max: 384350 },
      { rate: 0.37, min: 384350, max: Infinity },
    ],
  },
} as const;

/**
 * Calculates federal income tax across progressive brackets.
 */
export function calculateIncomeTax(
  taxableIncome: number,
  filingStatus: FilingStatus,
): { totalTax: number; marginalRate: number; breakdown: TaxBracketBreakdown[] } {
  if (taxableIncome <= 0) {
    return { totalTax: 0, marginalRate: 0, breakdown: [] };
  }

  const brackets = CONSTANTS_2026.TAX_BRACKETS[filingStatus];
  let totalTax = 0;
  let marginalRate: number = brackets[0].rate;
  const breakdown: TaxBracketBreakdown[] = [];

  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      marginalRate = bracket.rate;
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      const bracketTax = taxableInBracket * bracket.rate;
      totalTax += bracketTax;

      breakdown.push({
        rate: bracket.rate,
        min: bracket.min,
        max: bracket.max,
        taxableInBracket,
        tax: bracketTax,
      });
    } else {
      break;
    }
  }

  return { totalTax, marginalRate, breakdown };
}

/**
 * Core deterministic 2026 Self-Employment & QBI Tax Calculation Engine.
 */
export function calculateSelfEmployment2026(
  input: SelfEmployment2026Input,
): SelfEmployment2026Output {
  const filingStatus: FilingStatus = input.filingStatus || "single";
  const grossIncome = Math.max(0, input.grossIncome || 0);
  const businessExpenses = Math.max(0, input.businessExpenses || 0);
  const w2Wages = Math.max(0, input.w2Wages || 0);
  const priorYearAgi = Math.max(0, input.priorYearAgi || 0);
  const priorYearTax = Math.max(0, input.priorYearTax || 0);
  const age = input.age !== undefined ? input.age : 35;
  const isSenior = Boolean(input.isSenior || age >= 65);
  const isTippedOccupation = Boolean(input.isTippedOccupation);
  const qualifiedTips = Math.max(0, input.qualifiedTips || 0);
  const isSstb = Boolean(input.isSstb);
  const w2WagesPaidByBusiness = Math.max(0, input.w2WagesPaidByBusiness || 0);
  const ubia = Math.max(0, input.ubia || 0);
  const retirementContributions = Math.max(0, input.retirementContributions || 0);
  const sehi = Math.max(0, input.sehi || 0);
  const stateLocalTaxPaid = Math.max(0, input.stateLocalTaxPaid || 0);
  const otherItemizedDeductions = Math.max(0, input.otherItemizedDeductions || 0);
  const otherTaxableIncome = Math.max(0, input.otherTaxableIncome || 0);
  const netCapitalGain = Math.max(0, input.netCapitalGain || 0);

  // 1. Schedule C Net Profit
  const netBusinessProfit = Math.max(0, grossIncome - businessExpenses);

  // 2. Self-Employment Tax (Schedule SE)
  let seEarningsSubjectToTax = 0;
  let socialSecurityTax = 0;
  let medicareTax = 0;
  let additionalMedicareTax = 0;
  let halfSeTaxDeduction = 0;

  if (netBusinessProfit >= CONSTANTS_2026.SE_THRESHOLD_FLOOR) {
    seEarningsSubjectToTax = netBusinessProfit * CONSTANTS_2026.SE_NET_PROFIT_RATIO;

    // Social Security (12.4% capped at $184,500 after W-2 wages)
    const availableSsCeiling = Math.max(0, CONSTANTS_2026.SOCIAL_SECURITY_WAGE_BASE - w2Wages);
    const ssTaxableIncome = Math.min(seEarningsSubjectToTax, availableSsCeiling);
    socialSecurityTax = ssTaxableIncome * CONSTANTS_2026.SOCIAL_SECURITY_RATE;

    // Medicare (2.9% uncapped)
    medicareTax = seEarningsSubjectToTax * CONSTANTS_2026.MEDICARE_RATE;

    // Additional Medicare Tax (0.9% above threshold)
    const addlMedicareThreshold = CONSTANTS_2026.ADDITIONAL_MEDICARE_THRESHOLDS[filingStatus];
    const totalMedicareEarnings = w2Wages + seEarningsSubjectToTax;
    if (totalMedicareEarnings > addlMedicareThreshold) {
      const sePortionSubjectToAddl = Math.min(
        seEarningsSubjectToTax,
        Math.max(0, totalMedicareEarnings - addlMedicareThreshold),
      );
      additionalMedicareTax = sePortionSubjectToAddl * CONSTANTS_2026.ADDITIONAL_MEDICARE_RATE;
    }

    // Half SE Tax above-the-line deduction (Note: 0.9% Add'l Medicare is not deductible)
    halfSeTaxDeduction = 0.5 * (socialSecurityTax + medicareTax);
  }

  const totalSelfEmploymentTax = socialSecurityTax + medicareTax + additionalMedicareTax;

  // 3. Above-the-line Deductions (SEHI, Retirement, Senior, Tips)
  const sehiDeduction = Math.min(sehi, Math.max(0, netBusinessProfit - halfSeTaxDeduction));
  const retirementDeduction = retirementContributions;

  // Provisional AGI before Senior and Tip deductions
  const provisionalAgi = Math.max(
    0,
    grossIncome +
      w2Wages +
      otherTaxableIncome -
      businessExpenses -
      halfSeTaxDeduction -
      sehiDeduction -
      retirementDeduction,
  );

  // Senior Deduction (OBBBA $6,000 above-the-line with 6¢/$ phaseout)
  let seniorDeduction = 0;
  if (isSenior) {
    const seniorThreshold = CONSTANTS_2026.SENIOR_PHASEOUT_THRESHOLDS[filingStatus];
    const excessAgi = Math.max(0, provisionalAgi - seniorThreshold);
    const phaseOut = excessAgi * CONSTANTS_2026.SENIOR_PHASEOUT_RATE;
    seniorDeduction = Math.max(0, CONSTANTS_2026.SENIOR_DEDUCTION_BASE - phaseOut);
  }

  // Tip Deduction (OBBBA "No Tax on Tips" up to $25k income-tax-only)
  let tipDeduction = 0;
  if (isTippedOccupation) {
    tipDeduction = Math.min(
      CONSTANTS_2026.TIP_DEDUCTION_MAX,
      qualifiedTips,
      netBusinessProfit,
    );
  }

  const adjustedGrossIncome = Math.max(0, provisionalAgi - seniorDeduction - tipDeduction);

  // 4. Standard vs Itemized Deductions
  const standardDeduction = CONSTANTS_2026.STANDARD_DEDUCTIONS[filingStatus];
  const allowableSalt = Math.min(CONSTANTS_2026.SALT_CAP, stateLocalTaxPaid);
  const itemizedDeductions = allowableSalt + otherItemizedDeductions;
  const claimedDeduction = Math.max(standardDeduction, itemizedDeductions);

  const taxableIncomeBeforeQbi = Math.max(0, adjustedGrossIncome - claimedDeduction);

  // 5. Section 199A QBI Deduction Core
  // QBI for Schedule C filer is net profit reduced by half-SE tax, SEHI, and retirement deductions
  const qualifiedBusinessIncome = Math.max(
    0,
    netBusinessProfit - halfSeTaxDeduction - sehiDeduction - retirementDeduction,
  );

  const qbiThreshold = CONSTANTS_2026.QBI_THRESHOLDS[filingStatus];
  const qbiPhaseInRange = CONSTANTS_2026.QBI_PHASE_IN_BANDS[filingStatus];
  const qbiUpperThreshold = qbiThreshold + qbiPhaseInRange;

  const w2UbiaLimit = Math.max(
    0.50 * w2WagesPaidByBusiness,
    0.25 * w2WagesPaidByBusiness + 0.025 * ubia,
  );

  let tentativeQbiDeduction = 0;
  let qbiPhaseRatio = 0;

  if (qualifiedBusinessIncome > 0) {
    if (taxableIncomeBeforeQbi <= qbiThreshold) {
      // Case 1: Taxable income is at or below threshold -> full 20% without W-2/UBIA/SSTB limits
      tentativeQbiDeduction = CONSTANTS_2026.QBI_RATE * qualifiedBusinessIncome;
      qbiPhaseRatio = 0;

      // OBBBA $400 minimum floor for QBI >= $1,000 when under threshold
      if (
        qualifiedBusinessIncome >= CONSTANTS_2026.QBI_MINIMUM_QUALIFYING_INCOME &&
        taxableIncomeBeforeQbi > 0 &&
        tentativeQbiDeduction < CONSTANTS_2026.QBI_MINIMUM_FLOOR
      ) {
        tentativeQbiDeduction = CONSTANTS_2026.QBI_MINIMUM_FLOOR;
      }
    } else if (taxableIncomeBeforeQbi >= qbiUpperThreshold) {
      // Case 2: Fully above threshold + band
      qbiPhaseRatio = 1;
      if (isSstb) {
        tentativeQbiDeduction = 0;
      } else {
        tentativeQbiDeduction = Math.min(
          CONSTANTS_2026.QBI_RATE * qualifiedBusinessIncome,
          w2UbiaLimit,
        );
      }
    } else {
      // Case 3: In the phase-in band
      qbiPhaseRatio = (taxableIncomeBeforeQbi - qbiThreshold) / qbiPhaseInRange;

      if (isSstb) {
        const applicablePercentage = 1 - qbiPhaseRatio;
        const applicableQbi = qualifiedBusinessIncome * applicablePercentage;
        const applicableW2 = w2WagesPaidByBusiness * applicablePercentage;
        const applicableUbia = ubia * applicablePercentage;

        const tentative = CONSTANTS_2026.QBI_RATE * applicableQbi;
        const phasedLimit = Math.max(0.50 * applicableW2, 0.25 * applicableW2 + 0.025 * applicableUbia);
        const excess = Math.max(0, tentative - phasedLimit);
        tentativeQbiDeduction = Math.max(0, tentative - qbiPhaseRatio * excess);
      } else {
        const fullTentative = CONSTANTS_2026.QBI_RATE * qualifiedBusinessIncome;
        const excess = Math.max(0, fullTentative - w2UbiaLimit);
        const reduction = qbiPhaseRatio * excess;
        tentativeQbiDeduction = Math.max(0, fullTentative - reduction);
      }
    }
  }

  // Overall limitation: 20% of (Taxable Income before QBI − Net Capital Gain)
  const overallTaxableIncomeCap =
    CONSTANTS_2026.QBI_RATE * Math.max(0, taxableIncomeBeforeQbi - netCapitalGain);
  const qbiDeduction = Math.min(tentativeQbiDeduction, overallTaxableIncomeCap);

  // 6. Federal Income Tax Calculation
  const finalTaxableIncome = Math.max(0, taxableIncomeBeforeQbi - qbiDeduction);
  const incomeTaxResult = calculateIncomeTax(finalTaxableIncome, filingStatus);
  const federalIncomeTax = incomeTaxResult.totalTax;
  const marginalIncomeTaxBracket = incomeTaxResult.marginalRate;
  const bracketBreakdown = incomeTaxResult.breakdown;
  const effectiveIncomeTaxRate =
    adjustedGrossIncome > 0 ? federalIncomeTax / adjustedGrossIncome : 0;

  // Approximate QBI tax savings at marginal bracket
  const qbiTaxSavings = qbiDeduction * marginalIncomeTaxBracket;

  // 7. Total Tax & Blended Rates
  const totalTaxLiability = totalSelfEmploymentTax + federalIncomeTax;
  const totalIncomeBase = grossIncome + w2Wages + otherTaxableIncome;
  const overallEffectiveRate =
    totalIncomeBase > 0 ? totalTaxLiability / totalIncomeBase : 0;

  // 8. Trap Check (23% House proposal vs 20% enacted law)
  let erroneous23PercentDeduction = 0;
  if (qualifiedBusinessIncome > 0 && taxableIncomeBeforeQbi <= qbiThreshold) {
    erroneous23PercentDeduction = Math.min(
      0.23 * qualifiedBusinessIncome,
      0.23 * Math.max(0, taxableIncomeBeforeQbi - netCapitalGain),
    );
  } else {
    erroneous23PercentDeduction = qbiDeduction * (0.23 / 0.20);
  }
  const overstatementAmount = Math.max(0, erroneous23PercentDeduction - qbiDeduction);
  const potentialPenaltyRisk = overstatementAmount * marginalIncomeTaxBracket * 0.20;

  // 9. Estimated Tax Payments & Safe Harbor
  const currentYear90Percent = 0.90 * totalTaxLiability;
  let requiredAnnualPayment = currentYear90Percent;
  let methodUsed: "90_percent_current_year" | "100_percent_prior_year" | "110_percent_prior_year" =
    "90_percent_current_year";
  let safeHarborApplied = false;
  let safeHarborThresholdAmount = 0;

  if (priorYearTax > 0) {
    const safeHarborAgiThreshold = filingStatus === "married_filing_separately" ? 75000 : 150000;
    const safeHarborMultiplier = priorYearAgi > safeHarborAgiThreshold ? 1.10 : 1.00;
    safeHarborThresholdAmount = priorYearTax * safeHarborMultiplier;

    if (safeHarborThresholdAmount < currentYear90Percent) {
      requiredAnnualPayment = safeHarborThresholdAmount;
      methodUsed =
        safeHarborMultiplier === 1.10 ? "110_percent_prior_year" : "100_percent_prior_year";
      safeHarborApplied = true;
    }
  }

  const quarterlyAmount = Math.round((requiredAnnualPayment / 4) * 100) / 100;
  const quarterlyInstallments: EstimatedPaymentQuarter[] = [
    { quarter: "Q1", dueDate: "April 15, 2026", amount: quarterlyAmount },
    { quarter: "Q2", dueDate: "June 15, 2026", amount: quarterlyAmount },
    { quarter: "Q3", dueDate: "September 15, 2026", amount: quarterlyAmount, isUrgent: true },
    { quarter: "Q4", dueDate: "January 15, 2027", amount: quarterlyAmount },
  ];

  // 10. Tax Readiness Scorecard (0-100)
  let qbiScore = 25;
  const actionItems: string[] = [];

  if (qualifiedBusinessIncome > 0) {
    if (isSstb && taxableIncomeBeforeQbi > qbiThreshold) {
      qbiScore = Math.max(5, Math.round(25 * (1 - qbiPhaseRatio)));
      actionItems.push(
        `SSTB phase-out active ($${Math.round(taxableIncomeBeforeQbi).toLocaleString()} taxable income). Maximize pre-tax retirement or business expenses to preserve QBI deduction.`,
      );
    } else if (!isSstb && taxableIncomeBeforeQbi > qbiThreshold && w2UbiaLimit < 0.20 * qualifiedBusinessIncome) {
      qbiScore = 15;
      actionItems.push(
        "QBI limited by W-2 wages / UBIA asset base. Consider W-2 payroll optimization or qualifying equipment acquisitions.",
      );
    }
  } else {
    qbiScore = 10;
  }

  let safeHarborScore = 25;
  if (priorYearTax === 0) {
    safeHarborScore = 15;
    actionItems.push(
      "Prior-year tax not entered — safe-harbor protection cannot be calculated. Enter 2025 tax to eliminate underpayment penalty risk.",
    );
  }

  let underpaymentScore = 25;
  if (quarterlyAmount > 5000) {
    underpaymentScore = 20;
    actionItems.push(
      `Q3 deadline is September 15, 2026. Ensure payment of $${quarterlyAmount.toLocaleString()} is scheduled via IRS Direct Pay / EFTPS.`,
    );
  }

  let deductionScore = 25;
  if (!retirementContributions && netBusinessProfit > 50000) {
    deductionScore -= 5;
    actionItems.push(
      "No Solo 401(k) or SEP-IRA contributions detected. Contributing before year-end can reduce both income tax and preserve QBI thresholds.",
    );
  }
  if (!sehi && netBusinessProfit > 0) {
    deductionScore -= 5;
    actionItems.push(
      "Check eligibility for the Self-Employed Health Insurance (SEHI) above-the-line deduction.",
    );
  }

  const totalScore = Math.min(100, Math.max(0, qbiScore + safeHarborScore + underpaymentScore + deductionScore));
  let rating: "Excellent" | "Good" | "Needs Attention" | "High Audit/Penalty Risk" = "Good";
  if (totalScore >= 90) rating = "Excellent";
  else if (totalScore >= 75) rating = "Good";
  else if (totalScore >= 50) rating = "Needs Attention";
  else rating = "High Audit/Penalty Risk";

  if (actionItems.length === 0) {
    actionItems.push(
      "Your 2026 tax positions are fully optimized for the Q3 September 15 deadline.",
    );
  }

  return {
    grossIncome,
    businessExpenses,
    netBusinessProfit,
    seEarningsSubjectToTax,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    totalSelfEmploymentTax,
    halfSeTaxDeduction,
    seniorDeduction,
    tipDeduction,
    sehiDeduction,
    retirementDeduction,
    adjustedGrossIncome,
    standardDeduction,
    itemizedDeductions,
    claimedDeduction,
    taxableIncomeBeforeQbi,
    qualifiedBusinessIncome,
    qbiRate: CONSTANTS_2026.QBI_RATE,
    tentativeQbiDeduction,
    qbiThreshold,
    qbiPhaseInRange,
    isSstb,
    qbiPhaseRatio,
    w2UbiaLimit,
    qbiDeduction,
    qbiTaxSavings,
    trapCheck: {
      enactedRate: 0.20,
      proposedFailedRate: 0.23,
      erroneous23PercentDeduction,
      overstatementAmount,
      potentialPenaltyRisk,
      explanation:
        "The House-passed 23% QBI rate was omitted from enacted Public Law 119-21 (OBBBA). The permanent statutory rate remains 20.0%. Filing at 23% creates an IRS underpayment subject to 20% accuracy penalties.",
    },
    finalTaxableIncome,
    federalIncomeTax,
    effectiveIncomeTaxRate,
    marginalIncomeTaxBracket,
    bracketBreakdown,
    totalTaxLiability,
    overallEffectiveRate,
    estimatedPayments: {
      requiredAnnualPayment,
      methodUsed,
      safeHarborApplied,
      safeHarborThresholdAmount,
      quarterlyInstallments,
      underpaymentWarning: requiredAnnualPayment > 1000,
      nextDeadline: "September 15, 2026 (Q3)",
      daysUntilDeadline: 15,
    },
    scorecard: {
      totalScore,
      qbiOptimizationScore: qbiScore,
      safeHarborComplianceScore: safeHarborScore,
      underpaymentRiskScore: underpaymentScore,
      deductionCaptureScore: deductionScore,
      rating,
      keyActionItems: actionItems,
    },
    taxYear: 2026,
    governingLaw: "OBBBA (Pub. L. 119-21) & Rev. Proc. 2025-32",
  };
}

/**
 * Factory CalculationEngine contract implementation.
 */
export const selfEmployment2026Engine: CalculationEngine<
  SelfEmployment2026Input,
  SelfEmployment2026Output
> = {
  metadata: {
    id: "self_employment_2026_engine",
    name: "2026 Self-Employment & QBI Tax Engine (OBBBA Compliant)",
    version: "1.0.0",
    description:
      "Deterministic 2026 Schedule SE, Section 199A QBI (20% enacted rate), OBBBA deductions, and estimated quarterly tax calculator.",
  },
  validate(input: SelfEmployment2026Input) {
    const errors: string[] = [];
    if (typeof input.grossIncome !== "number" || Number.isNaN(input.grossIncome) || input.grossIncome < 0) {
      errors.push("grossIncome must be a non-negative number.");
    }
    if (input.businessExpenses !== undefined && (typeof input.businessExpenses !== "number" || input.businessExpenses < 0)) {
      errors.push("businessExpenses must be a non-negative number if provided.");
    }
    if (input.w2Wages !== undefined && (typeof input.w2Wages !== "number" || input.w2Wages < 0)) {
      errors.push("w2Wages must be a non-negative number if provided.");
    }
    if (input.priorYearAgi !== undefined && (typeof input.priorYearAgi !== "number" || input.priorYearAgi < 0)) {
      errors.push("priorYearAgi must be a non-negative number if provided.");
    }
    if (input.priorYearTax !== undefined && (typeof input.priorYearTax !== "number" || input.priorYearTax < 0)) {
      errors.push("priorYearTax must be a non-negative number if provided.");
    }
    if (input.filingStatus !== undefined) {
      const validStatuses: FilingStatus[] = [
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
      ];
      if (!validStatuses.includes(input.filingStatus)) {
        errors.push(`filingStatus must be one of: ${validStatuses.join(", ")}`);
      }
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
  calculate(input: SelfEmployment2026Input): SelfEmployment2026Output {
    return calculateSelfEmployment2026(input);
  },
};
