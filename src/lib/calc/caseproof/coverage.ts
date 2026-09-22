/**
 * What CaseProof v1 does and does not claim (PRD §5 scope guard + rule-5 honesty).
 *
 * This is published on the page, in the agent payload and in the decision pack, because an audit
 * whose coverage is implicit is indistinguishable from one that checked everything.
 */
import type { Coverage } from "./types";

export const IMPLEMENTED_RULE_IDS: readonly string[] = [
  "cp-cashflow-loaded-labour",
  "cp-cashflow-downtime",
  "cp-cashflow-error-saving",
  "cp-cashflow-maintenance",
  "cp-cashflow-amortization",
  "cp-cashflow-debt-service",
  "cp-cashflow-lease-escalation",
  "cp-cashflow-raas-peak",
  "cp-tax-section179-phaseout",
  "cp-tax-bonus-depreciation",
  "cp-tax-straight-line",
  "cp-metric-payback",
  "cp-metric-irr",
  "cp-metric-npv",
  "cp-breakeven-monotone",
  "cp-quote-line-normalizer",
  "cp-quote-unstated-lines",
  "cp-compare-ranking",
  "cp-compare-crossing",
  "cp-sensitivity-grid",
];

/** Families a case may depend on that v1 does **not** check. Never reported as a pass. */
export const UNSUPPORTED_FAMILIES: readonly string[] = [
  "PDF/OCR extraction of a vendor proposal (PRD §5: line items are pasted or uploaded as CSV rows)",
  "Rate tables of our own — no industry maintenance/utilisation/wage benchmark is applied anywhere",
  "Throughput sizing (what an installation can move) — that is the separate recon candidate, not v1",
  "The §179 taxable-business-income limitation (a case with no active-trade income to absorb the deduction)",
  "MACRS half-year convention, mid-quarter convention and listed-property class lives (the residual uses the class life you state, straight-line)",
  "Amortization conventions for integration/facility/training other than straight-line across the case horizon",
  "State and local incentives, grants, sales-tax treatment and property tax on the asset",
  "Zoning, permitting, labour-agreement and safety-certification timing",
  "Stripe checkout for the paid decision pack — pricing and the public launch call are the founder's, not this build's",
];

export function buildCoverage(): Coverage {
  return {
    implementedRuleIds: [...IMPLEMENTED_RULE_IDS],
    unsupportedFamilies: [...UNSUPPORTED_FAMILIES],
    note:
      "Deterministic core: no LLM call, no network request and no benchmark of our own. Every number in " +
      "the audit is reproducible by hand from the buyer's numbers and the vendor's quote; every line the " +
      "case does not state is reported unstated, and an unstated line blocks a pass.",
  };
}
