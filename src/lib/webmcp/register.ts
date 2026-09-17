import {
  type SelfEmployment2026Input,
  type SelfEmployment2026Output,
} from "@/lib/calc/selfEmployment2026";
import type { EinvoiceReport, VatIdCheck } from "@/lib/calc/einvoice";
import type {
  ReconcileStripePayoutInput,
  StripeReconOutput,
} from "@/lib/calc/stripeRecon";
import type { WebMCPToolDefinition } from "./types";

/** name/description/JSON-Schema of a tool, without its runtime handler. */
export type WebMCPToolSummary = Pick<
  WebMCPToolDefinition,
  "name" | "description" | "parameters"
>;



/**
 * Routes a browser WebMCP tax tool through the metered /api/agent/calculate path so the
 * agent tier is metered (track("agent_query") + Stripe metered usage) instead of computing
 * purely client-side. This is a server-backed call: a failure surfaces an explicit error
 * (no silent client-side fallback).
 */
async function runMeteredAgentCalculation(
  toolName: string,
  params: SelfEmployment2026Input,
): Promise<SelfEmployment2026Output> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": toolName,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent calculation failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: SelfEmployment2026Output;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent calculation failed: invalid response");
  }
  return json.data;
}


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
  handler: async (params: SelfEmployment2026Input) => {
    const result = await runMeteredAgentCalculation("calculate_qbi_deduction", params);
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
  handler: async (params: SelfEmployment2026Input) => {
    const result = await runMeteredAgentCalculation("calculate_quarterly_estimate", params);
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
 * LedgerLink WebMCP tool: reconcile_stripe_payout
 * Decomposes a netted Stripe payout into GL journal lines that sum to the payout
 * net exactly. Routes through the metered /api/agent/calculate path.
 */
async function runLedgerlinkAgentCalculation(
  params: ReconcileStripePayoutInput,
): Promise<StripeReconOutput> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": "reconcile_stripe_payout",
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent calculation failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: StripeReconOutput;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent calculation failed: invalid response");
  }
  return json.data;
}

export const reconcileStripePayoutTool: WebMCPToolDefinition<
  ReconcileStripePayoutInput,
  StripeReconOutput
> = {
  name: "reconcile_stripe_payout",
  description:
    "Reconciles a netted Stripe payout into categorized GL journal lines that sum to the payout net exactly (Σ net == payout.amount). Accepts a customer read-only Stripe restricted key or a pasted Stripe JSON export; never uses the factory account.",
  parameters: {
    type: "object",
    properties: {
      account_id: {
        type: "string",
        description: "Stripe account id whose payout is being reconciled.",
      },
      period: {
        type: "string",
        description:
          "Payout period, e.g. '2026-08' or a Stripe created range 'start:end'.",
      },
      payout_id: {
        type: "string",
        description: "Optional specific Stripe payout id to reconcile.",
      },
      stripe_restricted_key: {
        type: "string",
        description:
          "Customer read-only Stripe restricted key (rk_…). Required unless export_json is supplied.",
      },
      export_json: {
        type: "string",
        description:
          "Pasted/uploaded Stripe JSON export (payout + balance_transactions). Required unless stripe_restricted_key is supplied.",
      },
    },
    required: ["account_id", "period"],
  },
  handler: async (params: ReconcileStripePayoutInput) => {
    return await runLedgerlinkAgentCalculation(params);
  },
};

/**
 * FacturGate (EU e-invoice) tools. Like LedgerLink these are server-backed metered calls: the
 * browser tool posts to /api/agent/calculate, which runs the deterministic engine, records the
 * agent_query event and reports metered usage. A failure surfaces an explicit error — there is no
 * client-side fallback that would hide a rejection.
 */
async function runFacturgateAgentCall<TResult>(toolName: string, params: unknown): Promise<TResult> {
  const response = await fetch("/api/agent/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webmcp-tool": toolName,
    },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Agent call failed (${response.status}): ${text}`);
  }
  const json = (await response.json()) as {
    success?: boolean;
    data?: TResult;
    error?: string;
  };
  if (!json?.success || !json?.data) {
    throw new Error(json?.error || "Agent call failed: invalid response");
  }
  return json.data;
}

export interface ValidateEinvoiceParams {
  /** An existing CII / UBL 2.1 document to validate as-is. */
  xml?: string;
  /** Canonical invoice model as a JSON string: { seller, buyer, invoice }. */
  invoice?: string;
  target_country?: string;
  target_format?: string;
}

export interface ConvertInvoiceToFacturxParams {
  /** Canonical invoice model as a JSON string: { seller, buyer, invoice }. */
  invoice: string;
  target_country?: string;
  target_format?: string;
}

export interface CheckEuVatIdParams {
  vat_id: string;
  country: string;
}

export const validateEinvoiceTool: WebMCPToolDefinition<ValidateEinvoiceParams, EinvoiceReport> = {
  name: "validate_einvoice",
  description:
    "Pre-send compliance gate for EU e-invoices (EN 16931 + CIUS-FR): returns the exact findings (rule id, severity, field path, fix) with blocking vs advisory severity, a 0-100 readiness score, and the totals reconciliation with the drift delta. Accepts a canonical invoice model or an existing CII/UBL 2.1 document. No rule is reported as passing unless it is implemented (see coverage).",
  parameters: {
    type: "object",
    properties: {
      xml: {
        type: "string",
        description:
          "An existing CII (CrossIndustryInvoice) or UBL 2.1 Invoice document to validate as-is. Supply this or `invoice`.",
      },
      invoice: {
        type: "string",
        description:
          "Canonical invoice model as a JSON string: { seller, buyer, invoice, targetFormat, targetCountry }.",
      },
      target_country: {
        type: "string",
        description:
          "Rule set / rounding regime to validate against. Defaults to FR (CIUS-FR overlay).",
        enum: ["FR", "PL", "BE", "DE"],
      },
      target_format: {
        type: "string",
        description: "Artifact the document is destined for. Defaults to facturx.",
        enum: ["facturx", "cii", "ubl"],
      },
    },
    required: [],
  },
  handler: (params) => runFacturgateAgentCall<EinvoiceReport>("validate_einvoice", params),
};

export const convertInvoiceToFacturxTool: WebMCPToolDefinition<
  ConvertInvoiceToFacturxParams,
  EinvoiceReport
> = {
  name: "convert_invoice_to_facturx",
  description:
    "Converts a canonical invoice model into a compliant artifact at the EN 16931 profile (CII/Factur-X body or UBL 2.1 with the Peppol BIS 3.0 ProfileID), returning the corrected XML, the change list (every finding with its rule id and fix) and the reconciled totals. Refuses to emit a document that has blocking findings or an unmappable field.",
  parameters: {
    type: "object",
    properties: {
      invoice: {
        type: "string",
        description:
          "Canonical invoice model as a JSON string: { seller, buyer, invoice, targetFormat, targetCountry }.",
      },
      target_country: {
        type: "string",
        description: "Rule set / rounding regime for the emitted document. Defaults to FR.",
        enum: ["FR", "PL", "BE", "DE"],
      },
      target_format: {
        type: "string",
        description: "facturx (default, CII at EN 16931), cii (standalone CII) or ubl (UBL 2.1).",
        enum: ["facturx", "cii", "ubl"],
      },
    },
    required: ["invoice"],
  },
  handler: (params) => runFacturgateAgentCall<EinvoiceReport>("convert_invoice_to_facturx", params),
};

export const checkEuVatIdTool: WebMCPToolDefinition<CheckEuVatIdParams, VatIdCheck> = {
  name: "check_eu_vat_id",
  description:
    "Checks an EU VAT identifier offline: national format and (where implemented) the published checksum — FR VAT-key formula, DE MOD 11,10, BE mod 97, PL NIP, NL mod 11, IT Luhn. Reports formatValid/checksumValid explicitly and never claims a VIES status it did not query. An unknown country is a failure, not a pass.",
  parameters: {
    type: "object",
    properties: {
      vat_id: {
        type: "string",
        description: "The VAT identifier as written, e.g. 'FR83404833048' or 'BE 0123.456.749'.",
      },
      country: {
        type: "string",
        description: "ISO 3166-1 alpha-2 country code of the identifier (e.g. FR, DE, BE, PL, NL).",
      },
    },
    required: ["vat_id", "country"],
  },
  handler: (params) => runFacturgateAgentCall<VatIdCheck>("check_eu_vat_id", params),
};

/**
 * Canonical surface of the factory's WebMCP tools — name, description and JSON Schema.
 *
 * Single source of truth: the agent allowlist (./agentTools.ts) and the published
 * agent-discovery listing (./manifest.ts) both read from it, so a tool name can never be
 * advertised or accepted without a real definition here. Add a tool by adding its
 * definition above and listing it here + in src/products/registry.ts.
 */
export const WEBMCP_TOOL_SUMMARIES: WebMCPToolSummary[] = [
  calculateQbiDeductionTool,
  calculateQuarterlyEstimateTool,
  reconcileStripePayoutTool,
  validateEinvoiceTool,
  convertInvoiceToFacturxTool,
  checkEuVatIdTool,
].map(({ name, description, parameters }) => ({ name, description, parameters }));

/**
 * Registers all factory WebMCP tools in the current browser session.
 */
export function registerDefaultWebMCPTools(): void {
  registerWebMCPTool(calculateQbiDeductionTool);
  registerWebMCPTool(calculateQuarterlyEstimateTool);
  registerWebMCPTool(reconcileStripePayoutTool);
  registerWebMCPTool(validateEinvoiceTool);
  registerWebMCPTool(convertInvoiceToFacturxTool);
  registerWebMCPTool(checkEuVatIdTool);
}



