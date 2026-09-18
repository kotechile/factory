/**
 * Honest coverage statement for ParcelProof v1 (PRD §5 scope guard).
 *
 * The audit says what it does not check, next to what it does. A line that passes v1 is not claimed
 * to be error-free: the unsupported families below are published rather than folded into a pass, and
 * every one of them surfaces as an explicit `unverifiable` / `unsupported` finding when it appears
 * on an invoice.
 */
import type { CoverageNote } from "./types";

export const IMPLEMENTED_RULE_IDS: readonly string[] = [
  // billable weight
  "pp-dim-divisor",
  "pp-dim-threshold",
  "pp-dim-measurement",
  "pp-billing-under",
  "pp-dim-unsupported-service",
  "pp-dim-date-out-of-range",
  // accessorials
  "pp-sur-ahs-dimension",
  "pp-sur-ahs-weight",
  "pp-sur-oversize",
  "pp-sur-residential",
  "pp-sur-address-correction",
  "pp-sur-fuel-unverifiable",
  "pp-sur-unverifiable",
  "pp-sur-unsupported",
  // service commitment
  "pp-svc-late",
  "pp-svc-late-expired",
  "pp-svc-not-covered",
  "pp-svc-unverifiable",
  "pp-svc-unsupported-service",
  // dispute clock
  "pp-clk-expiring",
  "pp-clk-expired",
  // contract rates
  "pp-rate-unverifiable",
  "pp-rate-unmapped",
  // reconciliation coverage between the two inputs
  "pp-line-orphan",
  "pp-record-unbilled",
  "pp-record-duplicate",
  "pp-zone-mismatch",
  "pp-service-mismatch",
  "pp-carrier-out-of-scope",
  // input contract
  "pp-field-missing",
  "pp-field-invalid",
  "pp-field-unsupported-value",
];

export const UNSUPPORTED_FAMILIES: readonly string[] = [
  "zone-matrix derivation — the audit prices from the zone on your shipment record, and flags a record/invoice zone disagreement instead of deriving the zone (P1)",
  "published fuel-surcharge tables — a billed fuel amount is reported `pp-sur-fuel-unverifiable`, never validated against a percentage table (P1)",
  "LTL, ocean, international, returns and multi-piece shipments — no divisor rule exists for them in v1 (`pp-dim-unsupported-service`) (P1)",
  "rate-card auto-mapping — the contract rate card must already be in the audit's own CSV shape (carrier, service, zone, weight bracket, rate); tariff PDFs are not parsed (P1)",
  "prior-year tariffs — a ship date outside the v1 rule table (before 2026-01-01) is `pp-dim-date-out-of-range`, never extrapolated",
  "dimension re-measurement — the audit compares billed weight against your declared dims and the tariff's rules; it cannot prove which measurement is physically correct, so an unexplained difference is reported as the carrier's measurement, with both weights shown",
  "USPS dispute window — the PRD pins UPS ≈30 days and FedEx ≈21 days only; v1 uses 30 days for USPS and states that assumption here rather than hiding it",
  "USPS AHS/Oversize — USPS does not assess AHS-Dimension/AHS-Weight/Oversize on domestic parcel in v1's table, so such a charge is `unsupported` rather than ineligible",
  "USPS money-back guarantee — only Priority Mail Express is treated as guaranteed; Priority Mail / Ground Advantage / Parcel Select are treated as not covered (v1 asserts no claim it cannot support)",
];

export function buildCoverage(
  implementedRuleIds: readonly string[] = IMPLEMENTED_RULE_IDS,
): CoverageNote {
  return {
    implementedRuleIds: [...implementedRuleIds],
    unsupportedFamilies: [...UNSUPPORTED_FAMILIES],
    note:
      `v1 recomputes billable weight (carrier × service × ship-date divisor, round-up, cubic-inch threshold), ` +
      `accessorial eligibility, service-commitment and dispute-window status, and prices every line from your own ` +
      `contract rate card when you supply one — across ${implementedRuleIds.length} rule ids. ` +
      "A line whose amount cannot be priced is reported unverifiable and counted as unverifiable, never as a zero-dollar overcharge.",
  };
}
