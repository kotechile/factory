/**
 * What this engine implements, and what it deliberately does not (v1 scope guard).
 *
 * The disclosure ships on the page and in the report: a product that quietly omits a case is worse
 * than one that names the omission, because the reader assumes coverage.
 */
export const ENGINE_METADATA = { id: "ratchetproof", version: "1.0.0" } as const;

/** Printed demand is rounded on the bill; this is the band treated as printing noise, not a finding. */
export const DEMAND_TOLERANCE_MILLI_KW = 1_000;

export const IMPLEMENTED_RULE_IDS = [
  "rp-interval-gap",
  "rp-interval-count-mismatch",
  "rp-interval-granularity-mixed",
  "rp-interval-misaligned",
  "rp-interval-overlap",
  "rp-interval-coverage-gap",
  "rp-history-window",
  "rp-tariff-unstated",
  "rp-tariff-unreadable",
  "rp-tariff-invalid",
  "rp-tariff-interval-mismatch",
  "rp-bill-unstated",
  "rp-rate-missing",
  "rp-billed-variance",
  "rp-billed-rounding",
] as const;

export const UNSUPPORTED_FAMILIES = [
  "Sales-tax, rider and surcharge lines (the audit prices demand only)",
  "Utility API / Green Button Connect OAuth data pulls (file upload only)",
  "Weather or satellite normalisation of a peak",
  "Portfolio roll-up across sites (one site per audit in v1)",
  "Time-of-use energy charges (this engine audits billed demand)",
] as const;

export const COVERAGE_NOTE =
  "v1 implements the demand clause: coincident peaks across meters, the tariff's billed window, the " +
  "ratchet lookback, the contract minimum, and the carry-over dollars. Every figure is computed in " +
  "this deterministic engine; a document reader may only fill declared fields.";
