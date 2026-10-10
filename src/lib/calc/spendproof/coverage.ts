/**
 * Honest coverage statement for SpendProof v1 (PRD §2 / the approved v1 scope).
 *
 * The close pack says what this reconciliation does not claim, next to what it does. A clean close
 * is a statement about the two records in front of the engine — not a claim that the invoice is
 * correct in every respect, and not a claim about a surface v1 deliberately does not read.
 */
import type { CoverageNote } from "./types";

export const IMPLEMENTED_RULE_IDS: readonly string[] = [
  // input contract
  "sp-csv-empty",
  "sp-csv-header",
  "sp-csv-unterminated",
  "sp-field-missing",
  "sp-field-invalid",
  "sp-amount-out-of-range",
  // balancing invariants
  "sp-invoice-unbalanced",
  "sp-aggregate-unreconciled",
  // the variance engine's five classes
  "sp-rounding-drift",
  "sp-period-overlap",
  "sp-missing-usage",
  "sp-untagged-spend",
  "sp-price-drift",
  // attribution
  "sp-bucket-unmatched",
  // coverage between the two inputs
  "sp-ledger-orphan",
  // the extraction layer (in front of the engine)
  "sp-extraction-unavailable",
  "sp-extraction-unreadable",
  "sp-extraction-unstated",
];

export const UNSUPPORTED_FAMILIES: readonly string[] = [
  "multi-provider saved rate cards — v1 reconciles one invoice at a time against the rates THAT invoice declares; there is no stored price book and no cross-provider rate history (parked behind the PRD, not dropped)",
  "a scheduled close — v1 runs when the operator runs it; no recurring job, no automatic period rollover",
  "a live rate or duty feed — the engine never looks a rate up, so a change the invoice does not state is invisible by construction (that is the rule-1 posture, not a gap)",
  "provider-side discount, credit or tax lines — a line whose effect the ledger cannot recompute (a negotiated discount, a credit memo, VAT) is not silently netted into a usage line; it is out of scope for v1's per-SKU recompute",
  "usage rows timestamped further than two days outside the billing window — reported as out-of-period rather than folded into the reconciliation, so a mislabelled period shows up as a variance instead of hiding",
  "an unreadable invoice region — the extraction layer reports it `unreadable` and the verdict is withheld; v1 never infers the missing number from the rest of the document",
];

export function buildCoverage(
  implementedRuleIds: readonly string[] = IMPLEMENTED_RULE_IDS,
): CoverageNote {
  return {
    implementedRuleIds: [...implementedRuleIds],
    unsupportedFamilies: [...UNSUPPORTED_FAMILIES],
    note:
      `v1 recomputes every invoice line from your own tagged-usage ledger at the rate the invoice itself ` +
      `declares, classifies each variance as rounding, a period-boundary overlap, missing or late usage, ` +
      `untagged spend or a mid-period rate change, and withholds a clean close whenever a bucket does not ` +
      `reconcile or usage cannot be attributed — across ${implementedRuleIds.length} rule ids. No rate is looked ` +
      "up, no missing value is estimated, and the model that reads the document never computes a number in this report.",
  };
}
