/**
 * ParcelProof — carrier invoice DIM-weight & surcharge audit (v1).
 *
 * Pure data types + the audit's public output contract. No I/O, no network, no LLM: every number
 * in a report is derived deterministically from the inputs (shipment records + invoice lines +
 * optional contract rate card), and every flag names the rule id and the evidence behind it.
 *
 * Scope (PRD `context/recon_proposals/2026-09-14_parcelproof.md` §5 guard, nothing beyond it):
 * UPS/FedEx/USPS domestic parcel — DIM-weight recompute (carrier × service × ship-date divisor,
 * round-up, cubic-inch threshold), accessorial eligibility (AHS-Dimension, AHS-Weight, oversize,
 * residential, address correction), service-commitment refund eligibility, per-line dispute-window
 * clock, CSV ingest, recovery ledger + dispute CSV.
 *
 * Rule-id namespaces used by this engine
 * --------------------------------------
 * - `pp-dim-*`   — billable-weight recomputation (divisor, cubic-inch threshold, measurement).
 * - `pp-sur-*`   — accessorial (surcharge) eligibility, one id per surcharge kind.
 * - `pp-svc-*`   — service-commitment / money-back eligibility.
 * - `pp-clk-*`   — dispute-window clock.
 * - `pp-rate-*`  — contract rate-card verification.
 * - `pp-line-*` / `pp-record-*` — reconciliation coverage between the two inputs.
 * - `pp-field-*` — input contract failures (missing / invalid / unparsable). These are *errors*,
 *   thrown as `ParcelAuditFieldError`, never substituted with a default (factory rule 5).
 *
 * Nothing outside v1 is silently passed: an unsupported carrier/service, an unmapped surcharge
 * code, an unpriced line and an unknown eligibility state are each an explicit finding.
 */

export type Carrier = "ups" | "fedex" | "usps";

/** v1 domestic parcel services with a divisor rule (PRD §2 — no LTL/ocean, no international). */
export type ServiceCode =
  | "ups_ground"
  | "ups_air"
  | "ups_express_saver"
  | "fedex_ground"
  | "fedex_home_delivery"
  | "fedex_express"
  | "usps_ground_advantage"
  | "usps_priority_mail"
  | "usps_priority_mail_express"
  | "usps_parcel_select";

/**
 * How much a finding is worth to the reader:
 * - `recoverable` — money the shipper was over-billed and can still claim (the delta is priced
 *   from the contract rate card and the dispute window is open).
 * - `advisory`    — a real defect, but no claimable amount: the window closed, the line is not
 *   priced, the record cannot confirm eligibility, or the carrier under-billed.
 * - `blocking`    — the line could not be audited at all (missing required field, no shipment
 *   record, unsupported carrier/service, out-of-range date). Never counted as "clean".
 */
export type Severity = "recoverable" | "advisory" | "blocking";

/**
 * A record field the shipper either asserts or does not tell us. `"unknown"` is an explicit
 * state, not a default: a surcharge whose eligibility depends on an `unknown` field is reported
 * as unverifiable, never guessed in either direction.
 */
export type TriState = true | false | "unknown";

export type WindowStatus = "open" | "expiring" | "expired";

/** Which quantity the carrier actually charged for: the scale weight or the dimensional weight. */
export type BillingBasis = "actual" | "dimensional";

/** Whether the line's money could be recomputed from the customer's own contract rate card. */
export type RateVerification = "verified" | "unverifiable-rate" | "unmapped";

export interface Dimensions {
  /** inches */
  length: number;
  /** inches */
  width: number;
  /** inches */
  height: number;
}

/** What the shipper recorded when it handed the parcel over (the declared side of the audit). */
export interface ShipmentRecord {
  orderId: string;
  tracking: string;
  carrier: Carrier;
  service: ServiceCode;
  /** ISO 8601 (YYYY-MM-DD) — selects the divisor rule in force. */
  shipDate: string;
  dims: Dimensions;
  actualWeightLb: number;
  /** Carrier zone the shipper's own manifest used. */
  zone: string;
  declaredValueCents?: number;
  /** Shown in the dispute packet; never used to price a line. */
  accessorialsDeclared?: string[];
  /** Carrier's committed delivery date for the service (ISO 8601). */
  promisedDate?: string;
  /** Actual delivery timestamp (ISO 8601). */
  deliveredAt?: string;
  /**
   * Whether the ship-to address is residential. `"unknown"` (or absent) means the record does not
   * tell us, so a billed residential surcharge is unverifiable rather than wrong.
   */
  residential?: TriState;
  /** Whether the carrier reported an address correction on this parcel. */
  addressCorrection?: TriState;
}

export interface InvoiceSurcharge {
  /** As billed, e.g. "AHS-DIM", "Additional Handling - Dimension", "FUEL". */
  code: string;
  amountCents: number;
}

/** What the carrier billed (the billed side of the audit). */
export interface InvoiceLine {
  tracking: string;
  carrier?: Carrier;
  service?: ServiceCode;
  billedWeightLb: number;
  /** Dimensions the carrier claims it measured, when the invoice carries them. */
  billedDims?: Dimensions;
  zone: string;
  baseChargeCents: number;
  surcharges: InvoiceSurcharge[];
  fuelPct?: number;
  totalCents: number;
  /** ISO 8601 — the dispute clock starts here. */
  invoiceDate: string;
}

export interface RateCardRow {
  carrier: Carrier;
  service: ServiceCode;
  zone: string;
  /** Inclusive lower bound of the weight bracket, in pounds. */
  minWeightLb: number;
  /** Inclusive upper bound; `null` = "and above". */
  maxWeightLb: number | null;
  rateCents: number;
}

/** Customer-supplied contract rate card (CSV). Absent ⇒ every line is `unverifiable-rate`. */
export interface RateCard {
  rows: RateCardRow[];
  source?: string;
}

export interface AuditInput {
  shipmentRecords: ShipmentRecord[];
  invoiceLines: InvoiceLine[];
  /** "Today", ISO 8601. Required — the engine never reads the clock (determinism). */
  asOfDate: string;
  /** Optional carrier filter; lines outside it get an explicit out-of-scope finding. */
  carrier?: Carrier;
  /** Optional contract rate card; without it no line's money is guessed. */
  rateCard?: RateCard;
}

export interface AuditFinding {
  ruleId: string;
  severity: Severity;
  /** Index-based path into the input, e.g. `invoiceLines[2].billedWeightLb`. */
  fieldPath: string;
  tracking: string;
  message: string;
  fix: string;
  /** Signed cents; positive = over-billed (money to claim), negative = under-billed. */
  deltaCents?: number;
  /** The rule condition that failed, in the form the carrier's own tariff states it. */
  trigger?: string;
  /** Every input value the finding is reproducible from. */
  evidence: Record<string, string | number | boolean | null>;
}

export interface DisputeWindow {
  carrier: Carrier;
  /** Days the carrier allows for a billing dispute, from the invoice date. */
  windowDays: number;
  invoiceDate: string;
  deadline: string;
  daysRemaining: number;
  status: WindowStatus;
}

export interface WeightResolution {
  carrier: Carrier;
  service: ServiceCode;
  divisor: number;
  divisorRuleEffectiveFrom: string;
  thresholdCuIn: number;
  cubicInches: number;
  rawDims: Dimensions;
  roundedDims: Dimensions;
  roundUpApplied: boolean;
  dimApplied: boolean;
  dimWeightRawLb: number;
  dimWeightLb: number;
  actualWeightLb: number;
  billableWeightLb: number;
  basis: BillingBasis;
}

export interface SurchargeAssessment {
  code: string;
  kind: string;
  amountCents: number;
  eligible: boolean;
  /** `unknown` = the record cannot confirm it; reported unverifiable, never guessed. */
  verdict: "eligible" | "ineligible" | "unverifiable" | "unsupported";
  trigger: string;
}

export interface ServiceCommitmentResult {
  promisedDate: string | null;
  deliveredAt: string | null;
  late: boolean;
  daysLate: number;
  guaranteed: boolean;
  moneyBackDays: number;
  /** Days left to file a guarantee claim as of `asOfDate`; `null` when not claimable. */
  claimDaysRemaining: number | null;
  /** Last day the guarantee claim can be filed; `null` when not claimable. */
  claimDeadline: string | null;
  refundableCents: number;
  status: "on-time" | "late-claimable" | "late-window-closed" | "late-not-covered" | "unverifiable";
  note: string;
}

export interface LineAudit {
  tracking: string;
  /** `null` only when the line could not be audited far enough to know its carrier. */
  carrier: Carrier | null;
  service: ServiceCode | null;
  /** False when the line was blocked (missing field, orphan, out-of-scope carrier). */
  audited: boolean;
  unauditedReason: string | null;
  zone: {
    record: string | null;
    invoice: string | null;
    match: boolean;
  };
  billedWeightLb: number | null;
  recomputedWeightLb: number | null;
  weightDeltaLb: number | null;
  weight: WeightResolution | null;
  billedBaseCents: number;
  /** `null` when the contract rate card could not price the recomputed weight. */
  recomputedBaseCents: number | null;
  billedTotalCents: number;
  /** `billed − Σ finding deltas` — the total the carrier should have billed. */
  recomputedTotalCents: number;
  rateVerification: RateVerification;
  findings: AuditFinding[];
  /** Σ of this line's signed deltas (positive = over-billed). */
  deltaCents: number;
  /** Over-billed and still claimable inside the dispute window. */
  claimableCents: number;
  /** Over-billed but the dispute window has closed. */
  expiredCents: number;
  underBilledCents: number;
  surcharges: SurchargeAssessment[];
  serviceCommitment: ServiceCommitmentResult | null;
  disputeWindow: DisputeWindow | null;
}

export interface RuleRollup {
  ruleId: string;
  count: number;
  totalCents: number;
}

export interface CarrierRollup {
  carrier: Carrier;
  lines: number;
  recoverableCents: number;
  expiredCents: number;
  /**
   * Linear extrapolation of the recovery to a year, from the invoice window actually observed.
   * `null` when that window is shorter than 7 days (a single invoice cannot be annualised).
   */
  annualisedRunRateCents: number | null;
}

export interface ExposureSummary {
  linesAudited: number;
  linesUnverifiable: number;
  /** Audited lines whose money could not be priced (no rate card row matched). */
  linesUnpriced: number;
  recordsUnbilled: number;
  findings: number;
  /** Claimable now (window open or closing within 7 days). */
  recoverableTotalCents: number;
  /** Subset of the above closing within 7 days — act first. */
  expiringSoonCents: number;
  /** Proven over-billing whose claim window has already closed. */
  expiredTotalCents: number;
  /** Negative deltas: the carrier under-billed. Reported, never claimed. */
  underBilledTotalCents: number;
  /** Always 0 — this engine never invents an amount for an unpriced line. */
  unverifiableCents: 0;
  observedWindowDays: number;
  byRule: RuleRollup[];
  byCarrier: CarrierRollup[];
}

export interface CoverageNote {
  implementedRuleIds: string[];
  unsupportedFamilies: string[];
  note: string;
}

export interface AuditReport {
  /** True only when nothing was flagged as recoverable, advisory or blocking. */
  clean: boolean;
  asOfDate: string;
  lines: LineAudit[];
  findings: AuditFinding[];
  /** Feed the per-carrier dispute packet (one row per finding). */
  disputePacket: string;
  summary: ExposureSummary;
  coverage: CoverageNote;
}

/**
 * Thrown when a required value is absent, invalid or unmappable — including an out-of-scope
 * carrier/service and a ship date no divisor rule covers. Never substituted with a default.
 */
export class ParcelAuditFieldError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(`${ruleId} @ ${fieldPath}: ${message}`);
    this.name = "ParcelAuditFieldError";
    this.ruleId = ruleId;
    this.fieldPath = fieldPath;
  }
}
