/**
 * RatchetProof — types.
 *
 * A commercial electric bill charges *billed demand*, which is not the meter's peak. The tariff sets
 * it to the greater of the month's own peak, a percentage (usually 70–90%) of the highest peak in a
 * lookback window (commonly the trailing 11 months), and a contract minimum. One hot afternoon sets a
 * floor the account pays against for a year, and the bill prints only the resulting number.
 *
 * UNITS, chosen so no money or demand value is ever a float at a boundary:
 *   • demand is an integer count of MILLI-KILOWATTS (1 kW = 1,000)  → `MilliKw`
 *   • money is an integer count of MICRO-USD        (1 USD = 1,000,000) → `MicroUsd`
 *   • a ratchet percentage is an integer count of BASIS POINTS (75% = 7,500) internally, while the
 *     declared field stays in percent because that is how a tariff prints it.
 * Every division is rounded once, inside a named function.
 *
 * There is NO clock, NO network, NO randomness and NO model in this folder. The extraction layer
 * (`./extraction.ts`) may read a document with a model; it may not compute anything, and a field it
 * cannot read is `unstated` and blocks that month's verdict instead of being estimated.
 */

/** An integer count of micro-dollars (1e-6 USD). */
export type MicroUsd = number;

/** An integer count of milli-kilowatts (1/1000 kW). */
export type MilliKw = number;

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

/** Why a month's billed demand came out where it did. */
export type BindingBasis = "month_peak" | "ratchet" | "contract_minimum";

/** The days a demand charge bills on, 0 = Sunday … 6 = Saturday. */
export interface BillingWindowSpec {
  days: number[];
  /** Minutes after local midnight when the billed window opens (0–1439). */
  startMinute: number;
  /** Minutes after local midnight when it closes, exclusive. 1440 = end of day. */
  endMinute: number;
  /**
   * The offset the tariff's clock runs on, in minutes (e.g. −480 for Pacific Daylight). A fixed offset
   * is declared rather than resolved from a timezone database: a named zone would need daylight-saving
   * transitions the document does not state, and guessing one moves a peak across a month boundary.
   */
  utcOffsetMinutes: number;
}

/** One rate line: a season × voltage class and the demand rate that applies. */
export interface TariffRateLine {
  season: string;
  voltageClass: string;
  rateMicroUsdPerKw: MicroUsd;
  page?: number;
  quote?: string;
}

/** A rate schedule, as the tariff document declares it. Every field carries its label. */
export interface Tariff {
  utility: Declared<string>;
  schedule: Declared<string>;
  voltageClass: Declared<string>;
  demandRates: Declared<TariffRateLine[]>;
  /** Percent, as printed (75 for 75%). */
  ratchetPercent: Declared<number>;
  ratchetLookbackMonths: Declared<number>;
  billingWindow: Declared<BillingWindowSpec>;
  intervalMinutes: Declared<15 | 30>;
  contractMinimumKw: Declared<number>;
}

/** One reading: the interval that STARTS at `startUtc`, and the demand over it. */
export interface MeterReading {
  startUtc: string;
  kwMilli: MilliKw;
}

/**
 * One meter's interval series.
 *
 * `declaredIntervalCount` is the count the FILE says it holds (a header/metadata count, or — when the
 * export states none — the number of data rows the parser read). `align` asserts
 * Σ(readings) == Σ(declared counts), so a truncated export that still parses is an explicit failure
 * rather than a peak quietly computed from half a month.
 */
export interface MeterSeries {
  meterId: string;
  intervalMinutes: 15 | 30;
  declaredIntervalCount: number;
  readings: MeterReading[];
}

/** One slot of the aligned site grid: the sum of every meter covering it. */
export interface GridSlot {
  startUtc: string;
  epochMinute: number;
  totalKwMilli: MilliKw;
  byMeter: { meterId: string; kwMilli: MilliKw }[];
}

export interface AlignedGrid {
  intervalMinutes: 15 | 30;
  slots: GridSlot[];
  intervalsRead: number;
  intervalsDeclared: number;
  firstSlotUtc: string;
  lastSlotUtc: string;
}

/** A month's peak, as a history entry. `month` is `YYYY-MM`. */
export interface PeakHistoryEntry {
  month: string;
  peakKwMilli: MilliKw;
}

/** A month's own peak, the left-hand side of the billed-demand formula. */
export interface MonthPeak {
  month: string;
  peakKwMilli: MilliKw;
}

export interface BilledDemandResult {
  month: string;
  meteredPeakKwMilli: MilliKw;
  ratchetPercent: number | null;
  ratchetBasisPoints: number | null;
  lookbackMonths: number | null;
  ratchetFloorKwMilli: MilliKw | null;
  /** The prior month whose peak set the floor. null when the ratchet does not bind. */
  ratchetDriverMonth: string | null;
  ratchetDriverPeakKwMilli: MilliKw | null;
  contractMinimumKwMilli: MilliKw | null;
  /** null when a clause is unstated/unreadable: the verdict is blocked, never defaulted. */
  billedKwMilli: MilliKw | null;
  binding: BindingBasis | null;
  /** Bases that produced exactly the same billed demand (a tie is reported, not hidden). */
  tiedWith: BindingBasis[];
  blocked: boolean;
  findings: Finding[];
}

/** One month's row in the ratchet ledger. */
export interface RatchetLedgerRow {
  month: string;
  meteredKwMilli: MilliKw;
  billedKwMilli: MilliKw;
  rateMicroUsdPerKw: MicroUsd;
  rateSource: "bill" | "tariff";
  binding: BindingBasis;
  ratchetPercent: number;
  contractMinimumKwMilli: MilliKw;
  ratchetDriver: { month: string; peakKwMilli: MilliKw } | null;
  /** (billed − metered) × rate, rounded once. */
  carryMicroUsd: MicroUsd;
}

export interface RatchetLedger {
  rows: RatchetLedgerRow[];
}

export interface Counterfactual {
  /** The month whose interval set the floor. */
  driverMonth: string;
  driverPeakKwMilli: MilliKw;
  /** How far that peak would have to fall for the ratchet to stop binding. */
  shaveKwMilli: MilliKw;
  /** The floor that remains after the shave (the highest metered peak among the bound months). */
  floorAfterShaveKwMilli: MilliKw;
  savingMicroUsd: MicroUsd;
  monthsAffected: string[];
}

export interface CarryOverResult {
  totalCarryMicroUsd: MicroUsd;
  rows: { month: string; carryMicroUsd: MicroUsd }[];
  counterfactual: Counterfactual | null;
}

export type FindingKind =
  | "interval_gap"
  | "interval_count"
  | "interval_granularity"
  | "interval_alignment"
  | "tariff_unstated"
  | "tariff_unreadable"
  | "history_window"
  | "bill_unstated"
  | "rate_missing"
  | "variance"
  | "out_of_scope";

/**
 * `blocking` — no billed-demand verdict can be produced for the subject.
 * `unmatched` — a number was produced and it disagrees with the printed bill.
 * `advisory`  — reported, never a reason to withhold the verdict.
 */
export type FindingSeverity = "blocking" | "unmatched" | "advisory";

export interface Finding {
  ruleId: string;
  kind: FindingKind;
  severity: FindingSeverity;
  /** The month, meter, clause path or interval slot the finding is about. */
  scope: string;
  message: string;
  fix: string;
  deltaMicroUsd?: MicroUsd;
  deltaKwMilli?: MilliKw;
}

/** The peak event: the interval, and which loads stacked into it. */
export interface PeakEvent {
  month: string;
  startUtc: string;
  totalKwMilli: MilliKw;
  byMeter: { meterId: string; kwMilli: MilliKw }[];
  /** True when this interval is inside the tariff's billed window (and so sets the billed peak). */
  inBillingWindow: boolean;
}

/** The bill's own printed numbers for one period, as extracted. */
export interface BillRecord {
  month: string;
  periodStart: string;
  periodEnd: string;
  printedBilledDemandKwMilli: MilliKw | null;
  printedBilledDemandProvenance: FieldProvenance;
  printedDemandRateMicroUsdPerKw: MicroUsd | null;
  printedDemandRateProvenance: FieldProvenance;
  printedRatchetLine: string | null;
  printedRatchetLineProvenance: FieldProvenance;
}

export interface MonthVerdict {
  month: string;
  meteredPeakKwMilli: MilliKw | null;
  recomputedBilledKwMilli: MilliKw | null;
  printedBilledKwMilli: MilliKw | null;
  varianceKwMilli: MilliKw | null;
  rateMicroUsdPerKw: MicroUsd | null;
  rateSource: "bill" | "tariff" | null;
  binding: BindingBasis | null;
  ratchetFloorKwMilli: MilliKw | null;
  ratchetDriverMonth: string | null;
  varianceMicroUsd: MicroUsd | null;
  blocked: boolean;
  blockingRuleIds: string[];
  note: string;
}

export interface AuditInput {
  tariff: Tariff;
  /** One series per meter. A site's true peak exists only in the sum of coincident meters. */
  meters: MeterSeries[];
  /** The bills being audited — one per month. */
  bills: BillRecord[];
  /**
   * Prior-month peaks the audit window does not contain (the standing history). Ordered most recent
   * first, ending at the month immediately before the first audited month. The engine never invents a
   * lookback entry and never shortens the window silently.
   */
  seedHistory: PeakHistoryEntry[];
}

export interface AuditReport {
  engine: { id: string; version: string };
  months: MonthVerdict[];
  ledger: RatchetLedger;
  carryOverMicroUsd: MicroUsd;
  counterfactual: Counterfactual | null;
  /** The interval that set the ratchet floor (the event worth shaving). */
  floorEvent: PeakEvent | null;
  /** The highest interval in the whole series, billed-window or not. */
  sitePeakEvent: PeakEvent | null;
  /** The highest interval the tariff does NOT bill — reported so it is clear what was excluded. */
  ignoredPeakEvent: PeakEvent | null;
  totals: {
    meteredKwMilli: MilliKw;
    billedKwMilli: MilliKw;
    intervalsRead: number;
    intervalsDeclared: number;
    monthsAudited: number;
    monthsBlocked: number;
  };
  findings: Finding[];
  /** True when ANY month is blocked: a partial answer is never presented as the audit's verdict. */
  blocked: boolean;
  verdict: "complete" | "blocked";
  labels: string[];
  provenance: {
    computedBy: "deterministic-engine";
    tariffSource: "declared-fields";
  };
  /** A deterministic CSV finding set (no clock, no randomness) an auditor can attach to a claim. */
  findingSet: string;
}
