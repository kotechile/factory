/**
 * The variance engine: WHICH kind of discrepancy is in front of us.
 *
 * Given one reconciliation unit's invoice amount, its ledger-derived recompute, and the usage that
 * sits outside the tagged in-period set, this returns one of the five classes the PRD names. The
 * order of the tests IS the rule (each one is a mechanic, not a judgement):
 *
 *   1. more than one declared rate for the key          → price_drift   (no variance is computed)
 *   2. inside the per-row cent rounding tolerance       → rounding
 *   3. the gap is covered by untagged in-period usage   → untagged_spend
 *   4. the gap is covered by usage near a period edge   → period_boundary
 *   5. otherwise                                        → missing_usage
 *
 * `untagged_spend` is tested before `period_boundary` on purpose: unattributable usage blocks the
 * close on its own terms (rule 5), so it is never hidden behind a second explanation.
 */
import type { MicroUsd, VarianceKind } from "./types";

export interface VarianceInput {
  /** The invoice's own amount for this reconciliation unit. */
  invoiceAmountMicroUsd: MicroUsd;
  /** Quantity × the declared rate. null when the invoice declared more than one rate. */
  recomputedMicroUsd: MicroUsd | null;
  /** In-period untagged ledger quantity for the key. */
  untaggedQuantity: number;
  /** Untagged in-period usage valued at the invoice's own declared rate. */
  untaggedValueMicroUsd: MicroUsd;
  /** Ledger quantity near a period edge, outside the window. */
  boundaryQuantity: number;
  /** Boundary usage valued at the invoice's own declared rate. */
  boundaryValueMicroUsd: MicroUsd;
  /** Half a cent per contributing ledger row. */
  roundingToleranceMicroUsd: MicroUsd;
  /** The invoice declared more than one rate for this key inside the period. */
  hasMultipleDeclaredPrices: boolean;
}

export interface VarianceVerdict {
  kind: VarianceKind;
  /** invoice − recomputed; null for `price_drift`, where no single-rate recompute exists. */
  varianceMicroUsd: MicroUsd | null;
}

export function classifyVariance(input: VarianceInput): VarianceVerdict {
  if (input.hasMultipleDeclaredPrices || input.recomputedMicroUsd === null) {
    return { kind: "price_drift", varianceMicroUsd: null };
  }

  const variance = input.invoiceAmountMicroUsd - input.recomputedMicroUsd;
  const magnitude = Math.abs(variance);

  if (magnitude <= input.roundingToleranceMicroUsd) {
    return { kind: "rounding", varianceMicroUsd: variance };
  }

  if (variance > 0) {
    if (
      input.untaggedQuantity > 0 &&
      input.untaggedValueMicroUsd >= variance
    ) {
      return { kind: "untagged_spend", varianceMicroUsd: variance };
    }
    if (
      input.boundaryQuantity > 0 &&
      input.boundaryValueMicroUsd >= variance
    ) {
      return { kind: "period_boundary", varianceMicroUsd: variance };
    }
    return { kind: "missing_usage", varianceMicroUsd: variance };
  }

  // The ledger claims more usage than the invoice charged: rows billed in another period, or a
  // ledger that double-counts. A period edge explains it when boundary usage covers the gap.
  if (input.boundaryQuantity > 0 && input.boundaryValueMicroUsd >= magnitude) {
    return { kind: "period_boundary", varianceMicroUsd: variance };
  }
  return { kind: "missing_usage", varianceMicroUsd: variance };
}

/** The rule id a variance class is reported under, and how badly it withholds the close. */
export const VARIANCE_RULE: Record<
  VarianceKind,
  { ruleId: string; severity: "blocking" | "unmatched" | "advisory" }
> = {
  price_drift: { ruleId: "sp-price-drift", severity: "unmatched" },
  rounding: { ruleId: "sp-rounding-drift", severity: "advisory" },
  untagged_spend: { ruleId: "sp-untagged-spend", severity: "blocking" },
  period_boundary: { ruleId: "sp-period-overlap", severity: "unmatched" },
  missing_usage: { ruleId: "sp-missing-usage", severity: "unmatched" },
};
