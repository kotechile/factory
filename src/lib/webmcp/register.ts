import {
  calculateSelfEmployment2026,
  type SelfEmployment2026Input,
  type SelfEmployment2026Output,
} from "@/lib/calc/selfEmployment2026";
import {
  formatArticleForDistribution,
  type FormatArticleInput,
  type DistributionAnalysis,
} from "@/lib/calc/content-distributor/engine";
import type { WebMCPToolDefinition } from "./types";


/**
 * WebMCP tool: calculate_qbi_deduction
 * Evaluates 2026 Section 199A Qualified Business Income deduction under OBBBA (Pub. L. 119-21).
 */
export const calculateQbiDeductionTool: WebMCPToolDefinition<
  SelfEmployment2026Input,
  {
    qualifiedBusinessIncome: number;
    qbiRate: number;
    qbiDeduction: number;
    qbiTaxSavings: number;
    isSstb: boolean;
    qbiPhaseRatio: number;
    w2UbiaLimit: number;
    trapCheck: SelfEmployment2026Output["trapCheck"];
    taxableIncomeBeforeQbi: number;
    taxYear: number;
  }
> = {
  name: "calculate_qbi_deduction",
  description:
    "Calculates the exact 2026 Section 199A QBI deduction under enacted law (OBBBA Pub. L. 119-21 at 20% rate, Rev. Proc. 2025-32 thresholds $201,750/$403,500, and SSTB/W-2/UBIA limits).",
  parameters: {
    type: "object",
    properties: {
      grossIncome: {
        type: "number",
        description: "Gross Schedule C / 1099 revenue.",
      },
      businessExpenses: {
        type: "number",
        description: "Deductible business expenses.",
      },
      filingStatus: {
        type: "string",
        description: "Filing status: 'single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'.",
        enum: ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"],
      },
      isSstb: {
        type: "boolean",
        description: "Whether the business is a Specified Service Trade or Business (law, health, consulting, financial services, etc.).",
      },
      w2WagesPaidByBusiness: {
        type: "number",
        description: "W-2 wages paid by the business to employees for W-2/UBIA limitation.",
      },
      ubia: {
        type: "number",
        description: "Unadjusted basis immediately after acquisition of qualified business property.",
      },
      w2Wages: {
        type: "number",
        description: "Individual's outside W-2 wages.",
      },
      retirementContributions: {
        type: "number",
        description: "Deductible SEP-IRA / Solo 401(k) contributions.",
      },
      sehi: {
        type: "number",
        description: "Self-employed health insurance deduction.",
      },
      otherTaxableIncome: {
        type: "number",
        description: "Other taxable income impacting overall taxable income threshold.",
      },
    },
    required: ["grossIncome"],
  },
  handler: (params: SelfEmployment2026Input) => {
    const result = calculateSelfEmployment2026(params);
    return {
      qualifiedBusinessIncome: result.qualifiedBusinessIncome,
      qbiRate: result.qbiRate,
      qbiDeduction: result.qbiDeduction,
      qbiTaxSavings: result.qbiTaxSavings,
      isSstb: result.isSstb,
      qbiPhaseRatio: result.qbiPhaseRatio,
      w2UbiaLimit: result.w2UbiaLimit,
      trapCheck: result.trapCheck,
      taxableIncomeBeforeQbi: result.taxableIncomeBeforeQbi,
      taxYear: result.taxYear,
    };
  },
};

/**
 * WebMCP tool: calculate_quarterly_estimate
 * Computes 2026 SE tax, income tax, and quarterly estimated tax payments (including Q3 Sept 15 deadline).
 */
export const calculateQuarterlyEstimateTool: WebMCPToolDefinition<
  SelfEmployment2026Input,
  {
    netBusinessProfit: number;
    totalSelfEmploymentTax: number;
    federalIncomeTax: number;
    totalTaxLiability: number;
    overallEffectiveRate: number;
    estimatedPayments: SelfEmployment2026Output["estimatedPayments"];
    scorecard: SelfEmployment2026Output["scorecard"];
    taxYear: number;
  }
> = {
  name: "calculate_quarterly_estimate",
  description:
    "Computes 2026 self-employment tax, progressive income tax, and quarterly estimated tax installments with safe-harbor protection (highlighting Q3 Sept 15 deadline).",
  parameters: {
    type: "object",
    properties: {
      grossIncome: {
        type: "number",
        description: "Gross Schedule C / 1099 revenue.",
      },
      businessExpenses: {
        type: "number",
        description: "Deductible business expenses.",
      },
      filingStatus: {
        type: "string",
        description: "Filing status: 'single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'.",
        enum: ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"],
      },
      priorYearAgi: {
        type: "number",
        description: "2025 Prior-year Adjusted Gross Income (AGI) for safe-harbor calculation.",
      },
      priorYearTax: {
        type: "number",
        description: "2025 Prior-year total tax liability for safe-harbor rule (100% or 110%).",
      },
      w2Wages: {
        type: "number",
        description: "W-2 wages received (reduces available Social Security $184,500 wage base).",
      },
      age: {
        type: "number",
        description: "Age of taxpayer (evaluates $6,000 OBBBA senior deduction if 65+).",
      },
      isTippedOccupation: {
        type: "boolean",
        description: "Flag for tipped occupation under OBBBA 'No Tax on Tips'.",
      },
      qualifiedTips: {
        type: "number",
        description: "Qualified tips eligible for up to $25k deduction.",
      },
    },
    required: ["grossIncome"],
  },
  handler: (params: SelfEmployment2026Input) => {
    const result = calculateSelfEmployment2026(params);
    return {
      netBusinessProfit: result.netBusinessProfit,
      totalSelfEmploymentTax: result.totalSelfEmploymentTax,
      federalIncomeTax: result.federalIncomeTax,
      totalTaxLiability: result.totalTaxLiability,
      overallEffectiveRate: result.overallEffectiveRate,
      estimatedPayments: result.estimatedPayments,
      scorecard: result.scorecard,
      taxYear: result.taxYear,
    };
  },
};

/**
 * Registers a WebMCP tool on navigator.modelContext in browser runtime.
 */
export function registerWebMCPTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(tool: WebMCPToolDefinition<TInput, TOutput>): boolean {
  if (typeof window === "undefined" || !navigator.modelContext?.registerTool) {
    return false;
  }

  try {
    navigator.modelContext.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: async (params: Record<string, unknown>) => {
        return await tool.handler(params as TInput);
      },
    });
    return true;
  } catch (error) {
    console.error(`Failed to register WebMCP tool: ${tool.name}`, error);
    return false;
  }
}



/**
 * WebMCP tool: format_article_for_linkedin
 * Deterministically formats articles into 3 viral LinkedIn post variants with exact limits and hooks.
 */
export const formatArticleForLinkedInTool: WebMCPToolDefinition<
  FormatArticleInput,
  DistributionAnalysis
> = {
  name: "format_article_for_linkedin",
  description:
    "Deterministically formats raw articles or notes into 3 optimized LinkedIn post variants (Contrarian Hook, 3-Bullet Framework, Story Lesson) with character limits, preview hooks, and hashtags.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the article or main concept.",
      },
      content: {
        type: "string",
        description: "Full text content or notes of the article.",
      },
      sourceUrl: {
        type: "string",
        description: "Optional URL linking back to the full article or tool.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Optional topic tags for hashtag generation.",
      },
    },
    required: ["title", "content"],
  },
  handler: (params: FormatArticleInput) => {
    return formatArticleForDistribution(params);
  },
};

/**
 * Registers all factory WebMCP tools in the current browser session.
 */
export function registerDefaultWebMCPTools(): void {
  registerWebMCPTool(calculateQbiDeductionTool);
  registerWebMCPTool(calculateQuarterlyEstimateTool);
  registerWebMCPTool(formatArticleForLinkedInTool);
}

