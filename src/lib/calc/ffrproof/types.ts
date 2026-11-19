/**
 * FFRProof — types.
 *
 * A federal grant recipient assembles the SF-425 (Federal Financial Report) from three sources that
 * disagree: the general ledger, the federal payment system's drawdown statement, and the award
 * terms. FFRProof cross-foots the form's four published line identities, reconciles line 10a to the
 * drawdown record, tests the recipient match, checks the budget variance against the award's own
 * prior-approval threshold, and catches period-vs-cumulative and double-counted dollars.
 *
 * UNITS: money is an integer count of CENTS (1 USD = 100) at every boundary. Percentages are
 * integer BASIS POINTS (1% = 100). No float ever appears in a reported dollar figure.
 *
 * There is NO clock, NO network, NO randomness and NO model in this folder. The extraction layer
 * (`./extraction.ts`) may read the award terms and the drawdown statement with a model; it may not
 * compute anything, and a field it cannot read is `unstated` and blocks the check that depends on it.
 */

/** An integer count of cents (1 USD = 100). */
export type Cents = number;

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

/**
 * The SF-425 worksheet (lines 10a–10k), as declared by the human who assembled it. These are NOT
 * extracted: the worksheet is the evidence under audit, and every line is required.
 */
export interface FfrReport {
  /** 10a — cash receipts this period. */
  cashReceiptsCents: Cents;
  /** 10b — cash disbursements this period. */
  cashDisbursementsCents: Cents;
  /** 10c — cash on hand at period end. Identity: 10c = 10a − 10b. */
  cashOnHandCents: Cents;
  /** 10d — total federal funds authorized. */
  totalFederalAwardCents: Cents;
  /** 10e — federal share of expenditures. */
  federalExpendituresCents: Cents;
  /** 10f — federal share of unliquidated obligations. */
  unliquidatedObligationsCents: Cents;
  /** 10g — total federal share. Identity: 10g = 10e + 10f. */
  federalShareCents: Cents;
  /** 10h — unobligated balance of federal funds. Identity: 10h = 10d − 10g. */
  unobligatedBalanceCents: Cents;
  /** 10i — recipient share required (the match). */
  requiredRecipientShareCents: Cents;
  /** 10j — recipient share of expenditures. */
  recipientShareProvidedCents: Cents;
  /** 10k — remaining recipient share to be provided. Identity: 10k = 10i − 10j. */
  remainingRecipientShareCents: Cents;
  /** ISO date (YYYY-MM-DD) the reporting period ends. */
  periodEnd: string;
  /** True when this is the final report for the award. */
  isFinal: boolean;
}

/** One subaccount of the federal payment system's drawdown statement. */
export interface DrawdownSubaccount {
  subaccount: string;
  receiptsCents: Cents;
  disbursementsCents: Cents;
}

/** The payment system's drawdown statement — the evidence line 10a/10b is reconciled against. */
export interface DrawdownStatement {
  /** The statement's own printed receipts total. */
  totalReceiptsCents: Cents;
  /** The statement's own printed disbursements total. */
  totalDisbursementsCents: Cents;
  subaccounts: DrawdownSubaccount[];
}

/**
 * The award terms / notice of award, per filing (NEVER a shared rule table — a maintained table
 * would let a stale Uniform Guidance produce a wrong number). A field the reader cannot resolve is
 * `null` (unstated) and blocks the check that depends on it.
 */
export interface AwardTerms {
  awardId: string | null;
  /** The authorized federal amount from the notice of award; null = unstated. */
  authorizedFederalAmountCents: Cents | null;
  /** The period of performance; null = unstated. */
  periodOfPerformance: { start: string; end: string } | null;
  /** The required recipient match, in basis points (20.00% = 2000); null = unstated. */
  requiredMatchPercentBps: number | null;
  /** "quarterly" | "semi-annual" | "annual" | a free-text cadence; null = unstated. */
  reportingFrequency: string | null;
  /**
   * The prior-approval threshold, in basis points (10% = 1000): the over/under percentage at which
   * the award's own terms require the recipient to obtain prior approval. null = the terms do not
   * state one, and the over-threshold check returns `unstated` rather than applying a default.
   */
  priorApprovalThresholdBps: number | null;
  /** Agency-specific line instructions, verbatim or summarized; null = none/unstated. */
  agencyLineInstructions: string | null;
}

/** One line of the GL export — parsed deterministically from CSV, never by a model. */
export interface GlLine {
  category: string;
  actualCents: Cents;
}

export interface GlExport {
  lines: GlLine[];
  /** Σ line actuals — the current period's spend, feeding the period-vs-cumulative check. */
  totalActualCents: Cents;
}

export interface BudgetLine {
  category: string;
  approvedCents: Cents;
}

export interface ApprovedBudget {
  lines: BudgetLine[];
  totalApprovedCents: Cents;
}

export type FindingSeverity = "blocking" | "unmatched" | "advisory";

export type FindingKind =
  | "crossfoot_break"
  | "cash_drift"
  | "match_shortfall"
  | "final_nonzero"
  | "terms_mismatch"
  | "budget_over_threshold"
  | "threshold_unstated"
  | "period_vs_cumulative";

export interface Finding {
  ruleId: string;
  kind: FindingKind;
  severity: FindingSeverity;
  scope: string;
  message: string;
  fix: string;
  deltaCents?: Cents;
}

/** One of the four cross-foot identities, with BOTH sides of the equation and the difference. */
export interface CrossFootLine {
  /** The identity as written, e.g. "10c = 10a − 10b". */
  identity: string;
  formLine: string;
  /** The left-hand side as filed on the form. */
  lhsCents: Cents;
  /** The right-hand side re-derived from the form's own inputs. */
  rhsCents: Cents;
  /** lhs − rhs; 0 means the line cross-foots. */
  differenceCents: Cents;
  holds: boolean;
}

export interface CrossFootResult {
  lines: CrossFootLine[];
  findings: Finding[];
}

export interface CashReconResult {
  reportReceiptsCents: Cents;
  statementReceiptsCents: Cents;
  receiptsDriftCents: Cents;
  reportDisbursementsCents: Cents;
  statementDisbursementsCents: Cents;
  disbursementsDriftCents: Cents;
  bySubaccount: {
    subaccount: string;
    receiptsCents: Cents;
    disbursementsCents: Cents;
  }[];
  findings: Finding[];
}

export interface MatchResult {
  requiredRecipientShareCents: Cents;
  recipientShareProvidedCents: Cents;
  remainingRecipientShareCents: Cents;
  requiredMatchPercentBps: number | null;
  isFinal: boolean;
  findings: Finding[];
}

export interface BudgetVarianceRow {
  category: string;
  approvedCents: Cents;
  actualCents: Cents;
  varianceCents: Cents;
  /** True when the variance exceeds the award's own prior-approval threshold; null = unstated. */
  overThreshold: boolean | null;
}

export interface BudgetVarianceResult {
  rows: BudgetVarianceRow[];
  totalApprovedCents: Cents;
  totalActualCents: Cents;
  /** Σ(category variances) — enforced equal to (totalActual − totalApproved). */
  totalVarianceCents: Cents;
  priorApprovalThresholdBps: number | null;
  thresholdStated: boolean;
  findings: Finding[];
}

export interface PeriodVsCumulativeResult {
  priorFederalExpendituresCents: Cents | null;
  currentFederalExpendituresCents: Cents;
  periodSpendCents: Cents | null;
  expectedCumulativeCents: Cents | null;
  deltaCents: Cents | null;
  findings: Finding[];
}

/** A cross-check that the report's 10d and period end agree with the award's own terms. */
export interface TermsConsistencyResult {
  authorizedFederalAmountCents: Cents | null;
  periodOfPerformance: { start: string; end: string } | null;
  reportTotalFederalAwardCents: Cents;
  reportPeriodEnd: string;
  /** Checks that could not run because the award terms do not state the field. */
  blockedScopes: string[];
  findings: Finding[];
}

export type FfrVerdict = "clean" | "findings" | "blocked";

export interface FfrAuditReport {
  engine: { id: string; version: string };
  crossFoot: CrossFootResult;
  cashRecon: CashReconResult;
  match: MatchResult;
  terms: TermsConsistencyResult;
  budget: BudgetVarianceResult;
  period: PeriodVsCumulativeResult;
  findings: Finding[];
  /** The checks a field being `unstated` blocked, so the UI can show what did NOT run. */
  blockedFindingScopes: string[];
  verdict: FfrVerdict;
  /** A deterministic plain-English summary (no clock, no randomness). */
  summary: string;
  labels: string[];
  provenance: { computedBy: "deterministic-engine" };
}

export interface FfrAuditInput {
  report: FfrReport;
  drawdown: DrawdownStatement;
  awardTerms: AwardTerms;
  glExport: GlExport;
  approvedBudget: ApprovedBudget;
  priorReport: FfrReport | null;
}
