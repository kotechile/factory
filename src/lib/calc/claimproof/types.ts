/**
 * ClaimProof — types.
 *
 * A manufacturer pays warranty labour against its OWN published payment schedule: an allowed time per
 * repair code, a multiple-repair increment, a travel rule, and per-claim fee caps. The shop files a
 * claim; the OEM pays what IT computes; the remittance arrives as an amount, not a reconciliation.
 * ClaimProof re-derives the schedule against the payment, per line.
 *
 * UNITS, chosen so no value is ever a float at a boundary:
 *   • money is an integer count of CENTS           (1 USD = 100)          → `Cents`
 *   • time  is an integer count of TENTHS of an hour (4½ h = 45)          → `TenthsOfHour`
 * Every division is rounded exactly once, inside a named function in ./money.ts.
 *
 * There is NO clock, NO network, NO randomness and NO model in this folder. The extraction layer
 * (`./extraction.ts`) may read the two documents with a model; it may not compute anything, and a
 * field it cannot read is `unstated` and blocks that line instead of being estimated.
 */

/** An integer count of cents (1 USD = 100). */
export type Cents = number;

/** An integer count of tenths of an hour (4.5 h = 45). */
export type TenthsOfHour = number;

/**
 * `extracted` — the value was read off the document.
 * `unreadable` — the region could not be read (scan, redaction, corruption).
 * `unstated`   — the document is legible but does not state the value.
 * The last two BLOCK a verdict; they are not a softer kind of `extracted`.
 */
export type FieldProvenance = "extracted" | "unreadable" | "unstated";

/** A declared field: its value (null unless `extracted`), its label, and where it came from. */
export interface Declared<T> {
  value: T | null;
  provenance: FieldProvenance;
  /** 1-based page of the document the value was read on, when known. */
  page?: number;
  /** The verbatim run of document text the value was read from, when known. */
  quote?: string;
}

export type RepairCategory = "refrigeration" | "electrical" | "cabinet";

/** One allowed-time row of a vendored schedule. */
export interface RepairAllowance {
  code: string;
  description: string;
  allowedTenths: TenthsOfHour;
  page: string;
  category: RepairCategory;
}

export type FeeKey = "nitrogen" | "miscMaterials" | "reclaim";

export interface FeeCap {
  key: FeeKey;
  label: string;
  maxCents: Cents;
  page: string;
  note: string;
}

/**
 * A vendored, version-stamped manufacturer labour schedule.
 *
 * `supersededAfter` is the ISO date on/after which a NEWER revision of the schedule applies. A claim
 * whose service date is on/after that date is audited against a stale schedule and the report says so
 * on its face. `null` means the vendored revision is still current.
 */
export interface LabourSchedule {
  oem: string;
  slug: string;              // "truemfg@2022-06"
  version: string;           // "2022-06"
  effectiveFrom: string;     // "2022-06-10"
  /** The document's own stated revision date. */
  revisionDate: string;
  supersededAfter: string | null;
  sourceUrl: string;
  sourceLabel: string;
  rules: Record<string, RepairAllowance>;
  multipleRepair: {
    incrementTenths: TenthsOfHour;
    ruleText: string;
    page: string;
  };
  travel: {
    maxMilesOneWay: number;
    /** The schedule publishes no fixed travel-hour allowance; null. True determines reasonableness. */
    fixedHoursTenths: TenthsOfHour | null;
    ruleText: string;
    page: string;
  };
  caps: FeeCap[];
  /**
   * The schedule publishes no fixed hourly labour rate (it pays ≤ the average commercial rate in the
   * territory); null. The engine prices labour at the CLAIM's own declared rate.
   */
  hourlyRateCents: Cents | null;
  hourlyRateNote: string;
}

export interface RepairLineClaim {
  code: string;
  description: string;
  hoursClaimedTenths: TenthsOfHour;
}

export interface TravelClaim {
  milesOneWay: number;
  hoursClaimedTenths: TenthsOfHour;
  claimedCents: Cents;
}

export interface FeeClaim {
  key: FeeKey;
  claimedCents: Cents;
}

/** The filed claim, as declared fields (from extraction, or pasted as declared JSON). */
export interface Claim {
  claimId: string;
  /** The schedule slug the claim is audited against, e.g. "truemfg@2022-06". */
  oemSlug: string;
  model: string;
  serial: string;
  /** ISO date (YYYY-MM-DD) the repair was performed — the staleness clock. */
  serviceDate: string;
  laborRateCentsPerHour: Cents;
  repairs: RepairLineClaim[];
  travel: TravelClaim | null;
  partsCents: Cents;
  fees: FeeClaim[];
}

/** What the OEM actually paid, as declared fields (from the remittance / payment advice). */
export interface Payment {
  laborCents: Cents;
  partsCents: Cents;
  travelCents: Cents;
  fees: Record<FeeKey, Cents>;
  totalCents: Cents;
}

export type Verdict = "underpaid" | "correctly-paid" | "overpaid" | "unverifiable";

/** One line of the variance table: labour, parts, one fee, or travel. */
export interface VarianceLine {
  scope: string;              // "labor" | "parts" | "travel" | `fee:${FeeKey}`
  label: string;
  ruleId: string;
  page: string;
  scheduleVersion: string;
  scheduleSlug: string;
  expectedCents: Cents | null;
  paidCents: Cents;
  /** paid − expected; null when the line is blocked (unverifiable). */
  varianceCents: Cents | null;
  verdict: Verdict;
  blocked: boolean;
  message: string;
}

/** One repair code's allowance, in hours — the breakdown feeding the labour line. */
export interface RepairAllowanceLine {
  code: string;
  description: string;
  category: RepairCategory;
  claimedTenths: TenthsOfHour;
  allowedTenths: TenthsOfHour | null;
  page: string;
  /** True when this line is a multiple-repair increment (paid at the increment, not its table value). */
  multipleRepairIncrement: boolean;
  blocked: boolean;
  ruleId: string | null;
}

export type FindingKind =
  | "repair_unstated"
  | "fee_over_cap"
  | "travel_over_miles"
  | "stale_schedule"
  | "rate_unstated";

export type FindingSeverity = "blocking" | "unmatched" | "advisory";

export interface Finding {
  ruleId: string;
  kind: FindingKind;
  severity: FindingSeverity;
  scope: string;
  message: string;
  fix: string;
  deltaCents?: Cents;
}

export interface AuditReport {
  engine: { id: string; version: string };
  scheduleSlug: string;
  scheduleVersion: string;
  oem: string;
  staleSchedule: boolean;
  /** The allowance breakdown feeding the labour line, in hours. */
  repairAllowances: RepairAllowanceLine[];
  lines: VarianceLine[];
  blockedLineCount: number;
  totalExpectedCents: Cents;
  totalPaidCents: Cents;
  /** Σ(line.varianceCents) — enforced equal to (totalPaid − totalExpected) over unblocked lines. */
  totalVarianceCents: Cents;
  verdict: Verdict;
  findings: Finding[];
  labels: string[];
  provenance: { computedBy: "deterministic-engine"; scheduleSource: "vendored" };
  /** A deterministic resubmission summary (no clock, no randomness). */
  resubmissionSummary: string;
}
