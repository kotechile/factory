/**
 * SpendProof — types.
 *
 * SpendProof reconciles an AI provider's invoice against the organization's own tagged-usage
 * ledger. The invoice arrives as ONE undifferentiated line item per service/model/SKU; the buckets
 * (business unit, cost centre, feature, customer) exist only in the organization's own
 * instrumentation, so closing the books means making two records that were never meant to meet
 * agree.
 *
 * MONEY IS INTEGER MICRO-USD (1e-6 USD) EVERYWHERE. Nothing in this engine is a float at a
 * boundary: a dollar amount that reaches a report is an integer count of micro-dollars, and every
 * published figure is rounded once, at the line that prints it. A float that slips into a money
 * path is how two runs of the same invoice produce different numbers.
 *
 * There is NO clock, NO network, NO randomness and NO model in this engine (AGENTS.md rule 1). The
 * extraction layer in front of it (`./extraction.ts`) may read a document with a model; it may not
 * compute anything, and an unreadable field blocks the verdict instead of being estimated.
 */

/** An integer count of micro-dollars (1e-6 USD). */
export type MicroUsd = number;

/** The billing window the invoice covers. Both bounds are INCLUSIVE ISO dates (YYYY-MM-DD). */
export interface InvoicePeriod {
  start: string;
  end: string;
}

/**
 * One line of the provider invoice — the invoice's OWN declared numbers, as extracted.
 *
 * `unitPriceMicroUsdPerThousandUnits` is the invoice's declared rate per 1,000 billed units
 * (API providers quote per 1K or per 1M tokens; per-1K keeps the rate an integer micro-USD for
 * every rate a provider actually publishes). THE ENGINE NEVER LOOKS A RATE UP AND NEVER INVENTS
 * ONE: the only rate it knows is the one the invoice declares on its own line.
 */
export interface InvoiceLine {
  service: string;
  model: string;
  sku: string;
  /** Integer billed units (tokens, requests, GB-months) for this line. */
  quantity: number;
  /** The invoice's declared price, integer micro-USD per 1,000 units. */
  unitPriceMicroUsdPerThousandUnits: number;
  /** The amount the invoice charged for this line, integer micro-USD. */
  amountMicroUsd: MicroUsd;
}

export interface Invoice {
  provider: string;
  period: InvoicePeriod;
  currency: string;
  /** The invoice's own printed total, integer micro-USD. */
  totalMicroUsd: MicroUsd;
  lines: InvoiceLine[];
}

/**
 * One row of the organization's own tagged-usage ledger.
 *
 * `bucket` is the attribution tag. A row with no tag is NOT an error in the ledger and is NOT
 * dropped: it is the `unattributed` case, and it blocks a clean close (the invoice charged for
 * usage nobody's tag claims).
 */
export interface LedgerRow {
  /** The attribution tag (business unit / cost centre / feature / customer). null = untagged. */
  bucket: string | null;
  service: string;
  model: string;
  sku: string;
  quantity: number;
  /** ISO 8601 timestamp of the usage (a bare YYYY-MM-DD is accepted). */
  timestamp: string;
}

export interface Ledger {
  rows: LedgerRow[];
}

/**
 * The five ways a variance is explained. Every one of them is a mechanic, not a judgement:
 * rounding of a per-row/per-line amount, a usage row timestamped outside the billing window,
 * usage the ledger never logged (dropped or late), usage logged without a tag, and a rate that
 * changed mid-period.
 */
export type VarianceKind =
  | "rounding"
  | "period_boundary"
  | "missing_usage"
  | "untagged_spend"
  | "price_drift";

export type FindingKind =
  | VarianceKind
  | "unmatched"
  | "unbalanced"
  | "unreadable"
  | "unstated"
  | "out_of_scope";

/**
 * `blocking` — the verdict cannot be produced at all (an unreadable input, an invoice whose own
 *              line items do not sum to its own total, usage nobody can attribute).
 * `unmatched` — a number was produced, and this line or bucket does not reconcile.
 * `advisory`  — inside the declared rounding tolerance; reported, never a reason to withhold the
 *              close.
 */
export type FindingSeverity = "blocking" | "unmatched" | "advisory";

export interface Finding {
  ruleId: string;
  kind: FindingKind;
  severity: FindingSeverity;
  /** The line key (`service|model|sku`), a bucket name, or `invoice`. */
  scope: string;
  message: string;
  deltaMicroUsd?: MicroUsd;
  fix: string;
}

/** One attribution bucket's slice of a line. */
export interface BucketReconciliation {
  bucket: string;
  /** In-period tagged quantity claimed by this bucket. */
  ledgerQuantity: number;
  /** This bucket's declared-price recompute: its quantity × the invoice's own rate. */
  recomputedMicroUsd: MicroUsd;
  /**
   * The invoice amount allocated to this bucket by its share of the line's IN-PERIOD TAGGED
   * quantity. The invoice has no buckets of its own, so the allocation is the deterministic rule
   * that makes a per-bucket figure possible; an untagged remainder lands here as an unexplained
   * shortfall rather than disappearing.
   */
  allocatedInvoiceMicroUsd: MicroUsd;
  varianceMicroUsd: MicroUsd;
  toleranceMicroUsd: MicroUsd;
  reconciled: boolean;
  kind: FindingKind;
  /** Ledger rows in this bucket that sit outside the billing window (near a boundary). */
  boundaryQuantity: number;
}

/** One line key's reconciliation: the invoice's declared numbers vs the ledger's own usage. */
export interface LineReconciliation {
  key: string;
  service: string;
  model: string;
  sku: string;
  invoiceQuantity: number;
  invoiceAmountMicroUsd: MicroUsd;
  /** The distinct unit prices the invoice declared for this key in this period, ascending. */
  declaredUnitPrices: number[];
  /** In-period tagged ledger quantity for this key. */
  taggedQuantity: number;
  /** In-period untagged ledger quantity for this key (the `unattributed` case). */
  untaggedQuantity: number;
  /** Ledger quantity for this key timestamped outside the window but near a boundary. */
  boundaryQuantity: number;
  /** Ledger quantity for this key timestamped outside the window and NOT near a boundary. */
  outOfPeriodQuantity: number;
  /** Quantity × the declared rate. null when the invoice declared more than one rate. */
  recomputedMicroUsd: MicroUsd | null;
  /** invoice − recomputed. null when the invoice declared more than one rate. */
  varianceMicroUsd: MicroUsd | null;
  roundingToleranceMicroUsd: MicroUsd;
  toleranceMicroUsd: MicroUsd;
  kind: VarianceKind | null;
  buckets: BucketReconciliation[];
}

export interface CoverageNote {
  implementedRuleIds: string[];
  unsupportedFamilies: string[];
  note: string;
}

export interface CloseReport {
  engine: { id: string; version: string };
  provider: string;
  period: InvoicePeriod;
  currency: string;
  invoiceTotalMicroUsd: MicroUsd;
  /** Σ of the invoice's own line items — must equal the invoice total (a balancing invariant). */
  invoiceLineSumMicroUsd: MicroUsd;
  invoiceBalances: boolean;
  /** Σ recomputed from the ledger at the invoice's own declared rates. */
  recomputedTotalMicroUsd: MicroUsd;
  aggregateVarianceMicroUsd: MicroUsd;
  toleranceMicroUsd: MicroUsd;
  aggregateWithinTolerance: boolean;
  /** Untagged in-period ledger quantity across every line: the `unattributed` finding's subject. */
  untaggedQuantity: number;
  /** Untagged usage valued at the invoice's own declared rates. */
  untaggedValueMicroUsd: MicroUsd;
  lines: LineReconciliation[];
  findings: Finding[];
  /** No blocking and no unmatched finding: nothing about this period is unexplained. */
  closeReady: boolean;
  /** The rule ids that withhold the close, in report order. */
  blockers: string[];
  coverage: CoverageNote;
  /** A deterministic close pack (no clock, no randomness): the trail a reviewer can file. */
  closePack: string;
  provenance: {
    /** Every number in this report comes from the deterministic engine, never from a model. */
    computedBy: "deterministic-engine";
    /** How the invoice's declared fields reached the engine. */
    invoiceSource: "declared-fields";
  };
}

export interface ReconcileRequest {
  invoice: Invoice;
  ledger: Ledger;
  /** The declared reconciliation tolerance in basis points of the invoice total. Default 50 (0.5%). */
  toleranceBps?: number;
}
