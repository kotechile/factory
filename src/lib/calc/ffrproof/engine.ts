/**
 * The deterministic FFRProof engine.
 *
 * Five published checks, plus one terms-consistency cross-check, all integer-cents arithmetic:
 *
 *   crossFoot(report)                     — the four published SF-425 line identities, zero
 *                                            tolerance, returning BOTH sides and the difference
 *                                            (never a bare "invalid").
 *   reconcileCash(report, drawdown)       — line 10a/10b against the payment system's per-subaccount
 *                                            receipts and disbursements, drift reported to the cent.
 *   matchTest(report, awardTerms)         — required match (10i) vs provided (10j) vs remaining (10k);
 *                                            a final report with 10k > 0 is a hard finding, and
 *                                            10f/10h must be zero on a final.
 *   termsConsistency(report, awardTerms)  — the report's 10d and period end against the award's own
 *                                            authorized amount and period of performance.
 *   budgetVariance(glExport, approvedBudget, thresholdBps)
 *                                         — actual vs approved per cost category; the prior-approval
 *                                            threshold is read from the AWARD'S OWN TERMS and the
 *                                            check returns `unstated` when the terms do not state it
 *                                            (never a default). Σ(category variances) == total
 *                                            variance is enforced, not merely hoped for.
 *   periodVsCumulative(prior, current, periodSpendCents)
 *                                         — catches "reported the period, not the total" and the
 *                                            same dollar counted twice.
 *
 * No I/O, no network, no LLM, no clock: the extraction layer (`./extraction.ts`) fills declared
 * fields in front of this engine; an unreadable or unstated field blocks the check that depends on
 * it, never a guess.
 */
import { FFRProofFieldError, formatBps, formatCents, formatCentsSigned } from "./money";
import type {
  ApprovedBudget,
  AwardTerms,
  BudgetVarianceResult,
  BudgetVarianceRow,
  CashReconResult,
  Cents,
  CrossFootLine,
  CrossFootResult,
  DrawdownStatement,
  FfrAuditInput,
  FfrAuditReport,
  FfrReport,
  FfrVerdict,
  Finding,
  GlExport,
  MatchResult,
  PeriodVsCumulativeResult,
  TermsConsistencyResult,
} from "./types";

export const ENGINE_ID = "ffrproof";
export const ENGINE_VERSION = "1.0.0";

const CROSSFOOT_RULES: ReadonlyArray<{
  formLine: string;
  identity: string;
  ruleId: string;
  lhs: (r: FfrReport) => Cents;
  rhs: (r: FfrReport) => Cents;
}> = [
  {
    formLine: "10c",
    identity: "10c = 10a − 10b",
    ruleId: "ffr-crossfoot-10c",
    lhs: (r) => r.cashOnHandCents,
    rhs: (r) => r.cashReceiptsCents - r.cashDisbursementsCents,
  },
  {
    formLine: "10g",
    identity: "10g = 10e + 10f",
    ruleId: "ffr-crossfoot-10g",
    lhs: (r) => r.federalShareCents,
    rhs: (r) => r.federalExpendituresCents + r.unliquidatedObligationsCents,
  },
  {
    formLine: "10h",
    identity: "10h = 10d − 10g",
    ruleId: "ffr-crossfoot-10h",
    lhs: (r) => r.unobligatedBalanceCents,
    rhs: (r) => r.totalFederalAwardCents - r.federalShareCents,
  },
  {
    formLine: "10k",
    identity: "10k = 10i − 10j",
    ruleId: "ffr-crossfoot-10k",
    lhs: (r) => r.remainingRecipientShareCents,
    rhs: (r) => r.requiredRecipientShareCents - r.recipientShareProvidedCents,
  },
];

/**
 * The four published line identities, zero tolerance. A break returns both sides of the equation
 * plus the difference and the form line — never a bare "invalid".
 */
export function crossFoot(report: FfrReport): CrossFootResult {
  const findings: Finding[] = [];
  const lines: CrossFootLine[] = CROSSFOOT_RULES.map((rule) => {
    const lhsCents = rule.lhs(report);
    const rhsCents = rule.rhs(report);
    const differenceCents = lhsCents - rhsCents;
    const holds = differenceCents === 0;
    if (!holds) {
      findings.push({
        ruleId: rule.ruleId,
        kind: "crossfoot_break",
        severity: "blocking",
        scope: rule.formLine,
        message: `Line ${rule.formLine} does not cross-foot: the form states ${formatCents(lhsCents)} but ${rule.identity} gives ${formatCents(rhsCents)} — a difference of ${formatCentsSigned(differenceCents)}.`,
        fix: `Correct line ${rule.formLine} (or one of its inputs) so the identity ${rule.identity} holds to the cent, then re-run.`,
        deltaCents: differenceCents,
      });
    }
    return { identity: rule.identity, formLine: rule.formLine, lhsCents, rhsCents, differenceCents, holds };
  });
  return { lines, findings };
}

/**
 * Line 10a/10b against the payment system's drawdown statement, drift reported by subaccount and to
 * the cent. The statement's printed totals are the evidence; the report's figures are compared to
 * them, never the other way around.
 */
export function reconcileCash(report: FfrReport, drawdown: DrawdownStatement): CashReconResult {
  const receiptsDriftCents = report.cashReceiptsCents - drawdown.totalReceiptsCents;
  const disbursementsDriftCents = report.cashDisbursementsCents - drawdown.totalDisbursementsCents;

  const findings: Finding[] = [];
  if (receiptsDriftCents !== 0) {
    findings.push({
      ruleId: "ffr-10a-drift",
      kind: "cash_drift",
      severity: "blocking",
      scope: "10a",
      message: `Line 10a (${formatCents(report.cashReceiptsCents)}) drifts from the drawdown statement's receipts total (${formatCents(drawdown.totalReceiptsCents)}) by ${formatCentsSigned(receiptsDriftCents)}.`,
      fix: "Reconcile the drawdowns to the report: match every payment-system receipt to the ledger before the 10a figure is filed.",
      deltaCents: receiptsDriftCents,
    });
  }
  if (disbursementsDriftCents !== 0) {
    findings.push({
      ruleId: "ffr-10b-drift",
      kind: "cash_drift",
      severity: "blocking",
      scope: "10b",
      message: `Line 10b (${formatCents(report.cashDisbursementsCents)}) drifts from the drawdown statement's disbursements total (${formatCents(drawdown.totalDisbursementsCents)}) by ${formatCentsSigned(disbursementsDriftCents)}.`,
      fix: "Reconcile the drawdowns to the report: match every payment-system disbursement to the ledger before the 10b figure is filed.",
      deltaCents: disbursementsDriftCents,
    });
  }

  // The statement's own subaccounts must sum to its printed totals; a statement that does not sum is
  // an internal inconsistency worth naming (advisory, not a report defect).
  const subReceipts = drawdown.subaccounts.reduce((sum, s) => sum + s.receiptsCents, 0);
  const subDisbursements = drawdown.subaccounts.reduce((sum, s) => sum + s.disbursementsCents, 0);
  if (subReceipts !== drawdown.totalReceiptsCents) {
    findings.push({
      ruleId: "ffr-statement-subaccount-sum",
      kind: "cash_drift",
      severity: "advisory",
      scope: "drawdown",
      message: `The drawdown statement's subaccount receipts (${formatCents(subReceipts)}) do not sum to its printed receipts total (${formatCents(drawdown.totalReceiptsCents)}).`,
      fix: "Confirm the drawdown statement is complete — a missing subaccount row reads as a drift on 10a.",
      deltaCents: subReceipts - drawdown.totalReceiptsCents,
    });
  }
  if (subDisbursements !== drawdown.totalDisbursementsCents) {
    findings.push({
      ruleId: "ffr-statement-subaccount-sum",
      kind: "cash_drift",
      severity: "advisory",
      scope: "drawdown",
      message: `The drawdown statement's subaccount disbursements (${formatCents(subDisbursements)}) do not sum to its printed disbursements total (${formatCents(drawdown.totalDisbursementsCents)}).`,
      fix: "Confirm the drawdown statement is complete — a missing subaccount row reads as a drift on 10b.",
      deltaCents: subDisbursements - drawdown.totalDisbursementsCents,
    });
  }

  return {
    reportReceiptsCents: report.cashReceiptsCents,
    statementReceiptsCents: drawdown.totalReceiptsCents,
    receiptsDriftCents,
    reportDisbursementsCents: report.cashDisbursementsCents,
    statementDisbursementsCents: drawdown.totalDisbursementsCents,
    disbursementsDriftCents,
    bySubaccount: drawdown.subaccounts.map((s) => ({
      subaccount: s.subaccount,
      receiptsCents: s.receiptsCents,
      disbursementsCents: s.disbursementsCents,
    })),
    findings,
  };
}

/**
 * The recipient match: required (10i) vs provided (10j) vs remaining (10k). A final report with
 * 10k > 0 is a HARD finding, and 10f/10h must be zero on a final. The award's required match
 * percentage is reported as context, not used to recompute a dollar figure (never a guess).
 */
export function matchTest(report: FfrReport, awardTerms: AwardTerms): MatchResult {
  const findings: Finding[] = [];

  if (report.remainingRecipientShareCents > 0) {
    if (report.isFinal) {
      findings.push({
        ruleId: "ffr-match-shortfall-final",
        kind: "match_shortfall",
        severity: "blocking",
        scope: "10k",
        message: `This is the final report and ${formatCents(report.remainingRecipientShareCents)} of the required recipient share remains unprovided (10i ${formatCents(report.requiredRecipientShareCents)} − 10j ${formatCents(report.recipientShareProvidedCents)} = 10k ${formatCents(report.remainingRecipientShareCents)}). A final report may not close with a match shortfall.`,
        fix: "Provide the remaining recipient share and refile, or obtain a written match reduction from the awarding agency before the final report.",
        deltaCents: report.remainingRecipientShareCents,
      });
    } else {
      findings.push({
        ruleId: "ffr-match-shortfall",
        kind: "match_shortfall",
        severity: "unmatched",
        scope: "10k",
        message: `${formatCents(report.remainingRecipientShareCents)} of the required recipient share remains to be provided (10i ${formatCents(report.requiredRecipientShareCents)} − 10j ${formatCents(report.recipientShareProvidedCents)} = 10k ${formatCents(report.remainingRecipientShareCents)}).`,
        fix: "Track the remaining match against the reporting periods left; overstating the match is a named FFR error.",
        deltaCents: report.remainingRecipientShareCents,
      });
    }
  }

  if (report.isFinal && report.unliquidatedObligationsCents !== 0) {
    findings.push({
      ruleId: "ffr-final-unliquidated-nonzero",
      kind: "final_nonzero",
      severity: "blocking",
      scope: "10f",
      message: `The final report carries a non-zero 10f (unliquidated obligations, ${formatCents(report.unliquidatedObligationsCents)}). A final report must liquidate or de-obligate every obligation, so 10f must be zero.`,
      fix: "Liquidate or de-obligate the remaining obligations, then refile the final report with 10f = $0.00.",
      deltaCents: report.unliquidatedObligationsCents,
    });
  }
  if (report.isFinal && report.unobligatedBalanceCents !== 0) {
    findings.push({
      ruleId: "ffr-final-unobligated-nonzero",
      kind: "final_nonzero",
      severity: "blocking",
      scope: "10h",
      message: `The final report carries a non-zero 10h (unobligated balance, ${formatCents(report.unobligatedBalanceCents)}). A final report must leave no unobligated federal balance, so 10h must be zero.`,
      fix: "Return or re-obligate the unobligated balance, then refile the final report with 10h = $0.00.",
      deltaCents: report.unobligatedBalanceCents,
    });
  }

  return {
    requiredRecipientShareCents: report.requiredRecipientShareCents,
    recipientShareProvidedCents: report.recipientShareProvidedCents,
    remainingRecipientShareCents: report.remainingRecipientShareCents,
    requiredMatchPercentBps: awardTerms.requiredMatchPercentBps,
    isFinal: report.isFinal,
    findings,
  };
}

/**
 * The report's 10d and period end against the award's own terms (authorized amount, period of
 * performance). A term the reader could not resolve blocks its check instead of defaulting.
 */
export function termsConsistency(report: FfrReport, awardTerms: AwardTerms): TermsConsistencyResult {
  const findings: Finding[] = [];
  const blockedScopes: string[] = [];

  if (awardTerms.authorizedFederalAmountCents === null) {
    blockedScopes.push("authorized-amount");
  } else if (report.totalFederalAwardCents !== awardTerms.authorizedFederalAmountCents) {
    findings.push({
      ruleId: "ffr-authorized-mismatch",
      kind: "terms_mismatch",
      severity: "blocking",
      scope: "10d",
      message: `Line 10d (${formatCents(report.totalFederalAwardCents)}) does not match the authorized federal amount in the award terms (${formatCents(awardTerms.authorizedFederalAmountCents)}) — a difference of ${formatCentsSigned(report.totalFederalAwardCents - awardTerms.authorizedFederalAmountCents)}.`,
      fix: "Confirm the authorized amount against the notice of award and correct 10d; a form that disagrees with its own award terms is a named reconciliation gap.",
      deltaCents: report.totalFederalAwardCents - awardTerms.authorizedFederalAmountCents,
    });
  }

  if (awardTerms.periodOfPerformance === null) {
    blockedScopes.push("period-of-performance");
  } else {
    const { start, end } = awardTerms.periodOfPerformance;
    if (report.periodEnd < start || report.periodEnd > end) {
      findings.push({
        ruleId: "ffr-period-outside-pop",
        kind: "terms_mismatch",
        severity: "unmatched",
        scope: "periodEnd",
        message: `The reporting period end (${report.periodEnd}) falls outside the award's period of performance (${start} to ${end}).`,
        fix: "Confirm the period end against the award terms; a report filed for a period outside the award's own window will be returned.",
      });
    }
  }

  return {
    authorizedFederalAmountCents: awardTerms.authorizedFederalAmountCents,
    periodOfPerformance: awardTerms.periodOfPerformance,
    reportTotalFederalAwardCents: report.totalFederalAwardCents,
    reportPeriodEnd: report.periodEnd,
    blockedScopes,
    findings,
  };
}

/**
 * Actual vs approved per cost category, with the over/under percentage measured against the AWARD'S
 * OWN prior-approval threshold. `thresholdBps === null` means the terms do not state one, and the
 * over-threshold check returns `unstated` rather than applying a default (rule 5).
 *
 * The sum invariant is enforced HERE: Σ(category variances) must equal (total actual − total
 * approved), and a mismatch is a thrown engine defect, not a report finding.
 */
export function budgetVariance(
  glExport: GlExport,
  approvedBudget: ApprovedBudget,
  thresholdBps: number | null,
): BudgetVarianceResult {
  const approvedByCategory = new Map<string, Cents>();
  for (const line of approvedBudget.lines) {
    approvedByCategory.set(line.category, (approvedByCategory.get(line.category) ?? 0) + line.approvedCents);
  }
  const actualByCategory = new Map<string, Cents>();
  for (const line of glExport.lines) {
    actualByCategory.set(line.category, (actualByCategory.get(line.category) ?? 0) + line.actualCents);
  }

  const categories = new Set<string>([...approvedByCategory.keys(), ...actualByCategory.keys()]);
  const rows: BudgetVarianceRow[] = [];
  const findings: Finding[] = [];

  for (const category of [...categories].sort()) {
    const approvedCents = approvedByCategory.get(category) ?? 0;
    const actualCents = actualByCategory.get(category) ?? 0;
    const varianceCents = actualCents - approvedCents;

    let overThreshold: boolean | null = null;
    if (thresholdBps !== null) {
      // The percentage at which the AWARD's own terms require prior approval, in basis points.
      overThreshold = approvedCents === 0
        ? actualCents !== 0 // any spend with no approved budget exceeds any threshold
        : Math.abs(varianceCents) * 10000 > thresholdBps * approvedCents;
      if (overThreshold) {
        const pctBps = approvedCents === 0 ? null : Math.round((Math.abs(varianceCents) * 10000) / approvedCents);
        findings.push({
          ruleId: "ffr-budget-over-threshold",
          kind: "budget_over_threshold",
          severity: "unmatched",
          scope: `category:${category}`,
          message: `Cost category '${category}' is ${varianceCents > 0 ? "over" : "under"} by ${formatCentsSigned(varianceCents)} (${pctBps === null ? "no approved base" : formatBps(pctBps)} of approved ${formatCents(approvedCents)}), which exceeds the award's own prior-approval threshold of ${formatBps(thresholdBps)}.`,
          fix: "Obtain prior approval for the variance, or re-budget the category, before filing.",
          deltaCents: varianceCents,
        });
      }
    }

    rows.push({ category, approvedCents, actualCents, varianceCents, overThreshold });
  }

  const totalApprovedCents = approvedBudget.totalApprovedCents;
  const totalActualCents = glExport.totalActualCents;
  const totalVarianceCents = rows.reduce((sum, row) => sum + row.varianceCents, 0);

  // The invariant, enforced: Σ(category variances) must equal total actual − total approved.
  if (totalVarianceCents !== totalActualCents - totalApprovedCents) {
    throw new FFRProofFieldError(
      "ffr-invariant-broken",
      "budget",
      `The engine's sum invariant failed: Σ(category variances) (${totalVarianceCents}) ≠ total actual − total approved (${totalActualCents - totalApprovedCents}). This is an engine defect, not a report defect; nothing was reported.`,
    );
  }

  if (thresholdBps === null) {
    findings.push({
      ruleId: "ffr-budget-threshold-unstated",
      kind: "threshold_unstated",
      severity: "advisory",
      scope: "prior-approval-threshold",
      message: "The award terms do not state a prior-approval threshold, so the over/under check could not be applied against one. The per-category variances are reported, but none is flagged as needing prior approval.",
      fix: "Locate the prior-approval threshold in the award terms; the check returns `unstated` rather than assuming a default.",
    });
  }

  return {
    rows,
    totalApprovedCents,
    totalActualCents,
    totalVarianceCents,
    priorApprovalThresholdBps: thresholdBps,
    thresholdStated: thresholdBps !== null,
    findings,
  };
}

/**
 * Differencing consecutive filings. `periodSpendCents` is the current period's new expenditure (the
 * GL export total). Catches two named FFR errors:
 *   • "reported the period, not the total" — the cumulative box holds the period figure;
 *   • "the same dollar counted twice" — the cumulative is prior + 2× the period (the period counted twice).
 */
export function periodVsCumulative(
  priorReport: FfrReport | null,
  currentReport: FfrReport,
  periodSpendCents: Cents | null,
): PeriodVsCumulativeResult {
  if (priorReport === null) {
    return {
      priorFederalExpendituresCents: null,
      currentFederalExpendituresCents: currentReport.federalExpendituresCents,
      periodSpendCents,
      expectedCumulativeCents: null,
      deltaCents: null,
      findings: [],
    };
  }

  const prior = priorReport.federalExpendituresCents;
  const current = currentReport.federalExpendituresCents;
  const findings: Finding[] = [];

  const expected = periodSpendCents === null ? null : prior + periodSpendCents;
  const delta = expected === null ? null : current - expected;

  if (periodSpendCents !== null && current === periodSpendCents && prior > 0) {
    findings.push({
      ruleId: "ffr-period-not-cumulative",
      kind: "period_vs_cumulative",
      severity: "blocking",
      scope: "10e",
      message: `Line 10e (${formatCents(current)}) equals this period's spend (${formatCents(periodSpendCents)}) rather than the cumulative total — the prior filing already carried ${formatCents(prior)}. The period was reported instead of the total.`,
      fix: "Report the cumulative federal share (prior cumulative + this period's spend), not the period figure alone.",
      deltaCents: delta ?? undefined,
    });
  } else if (periodSpendCents !== null && delta !== null && delta === periodSpendCents) {
    findings.push({
      ruleId: "ffr-double-count",
      kind: "period_vs_cumulative",
      severity: "blocking",
      scope: "10e",
      message: `Line 10e (${formatCents(current)}) is the prior cumulative (${formatCents(prior)}) plus TWICE this period's spend (${formatCents(periodSpendCents)}) — the same period's dollars were counted twice.`,
      fix: "Deduct the duplicate period so 10e = prior cumulative + this period's spend, then refile.",
      deltaCents: periodSpendCents,
    });
  } else if (current < prior) {
    findings.push({
      ruleId: "ffr-cumulative-regressed",
      kind: "period_vs_cumulative",
      severity: "blocking",
      scope: "10e",
      message: `Line 10e (${formatCents(current)}) is less than the prior filing's cumulative (${formatCents(prior)}). A cumulative figure cannot decrease without a correction; this usually means a period was reported in place of the total.`,
      fix: "Confirm whether this is a restatement (and say so) or a period-vs-cumulative error, then refile.",
      deltaCents: current - prior,
    });
  } else if (delta !== null && delta !== 0) {
    findings.push({
      ruleId: "ffr-cumulative-drift",
      kind: "period_vs_cumulative",
      severity: "advisory",
      scope: "10e",
      message: `Line 10e (${formatCents(current)}) differs from the expected cumulative (prior ${formatCents(prior)} + period ${formatCents(periodSpendCents ?? 0)} = ${formatCents(expected ?? 0)}) by ${formatCentsSigned(delta)}.`,
      fix: "Reconcile the movement between periods: the difference should equal this period's new federal share.",
      deltaCents: delta,
    });
  }

  return {
    priorFederalExpendituresCents: prior,
    currentFederalExpendituresCents: current,
    periodSpendCents,
    expectedCumulativeCents: expected,
    deltaCents: delta,
    findings,
  };
}

function buildSummary(report: FfrAuditReport): string {
  const parts: string[] = [];
  parts.push(`FFRProof v1 pre-flight: ${report.crossFoot.lines.length} of ${CROSSFOOT_RULES.length} line identities cross-foot.`);
  const breaks = report.crossFoot.findings;
  if (breaks.length > 0) {
    parts.push(`${breaks.length} does not: ${breaks.map((f) => f.scope).join(", ")}.`);
  }
  const cashDrift = report.cashRecon.findings.filter((f) => f.ruleId === "ffr-10a-drift" || f.ruleId === "ffr-10b-drift");
  if (cashDrift.length > 0) {
    parts.push(`Cash reconciliation: ${cashDrift.map((f) => f.scope).join(" and ")} drifts from the drawdown statement.`);
  }
  if (report.match.remainingRecipientShareCents > 0) {
    parts.push(`Match: ${formatCents(report.match.remainingRecipientShareCents)} of the recipient share remains unprovided.`);
  }
  const blocking = report.findings.filter((f) => f.severity === "blocking").length;
  const total = report.findings.length;
  if (blocking > 0) {
    parts.push(`${blocking} of ${total} findings block a clean filing.`);
  } else if (total > 0) {
    parts.push(`${total} finding${total === 1 ? "" : "s"} to review before filing.`);
  } else {
    parts.push("No findings — the report cross-foots, reconciles and matches clean.");
  }
  parts.push("Nothing is filed or certified on the recipient's behalf.");
  return parts.join(" ");
}

/**
 * The full pre-flight audit. The verdict is `blocked` when any finding is blocking, `findings` when
 * there is anything to review, and `clean` only when every check passes with nothing to note.
 */
export function auditFfr(input: FfrAuditInput): FfrAuditReport {
  const crossFootResult = crossFoot(input.report);
  const cashReconResult = reconcileCash(input.report, input.drawdown);
  const matchResult = matchTest(input.report, input.awardTerms);
  const termsResult = termsConsistency(input.report, input.awardTerms);
  const budgetResult = budgetVariance(input.glExport, input.approvedBudget, input.awardTerms.priorApprovalThresholdBps);
  const periodResult = periodVsCumulative(input.priorReport, input.report, input.glExport.totalActualCents);

  const findings: Finding[] = [
    ...crossFootResult.findings,
    ...cashReconResult.findings,
    ...matchResult.findings,
    ...termsResult.findings,
    ...budgetResult.findings,
    ...periodResult.findings,
  ];

  const blockedFindingScopes = termsResult.blockedScopes;

  const verdict: FfrVerdict = findings.some((f) => f.severity === "blocking")
    ? "blocked"
    : findings.length > 0
      ? "findings"
      : "clean";

  const labels: string[] = [
    `crossFoot=${crossFootResult.lines.filter((l) => l.holds).length}/${crossFootResult.lines.length}`,
    `cashDrift=${cashReconResult.receiptsDriftCents !== 0 || cashReconResult.disbursementsDriftCents !== 0 ? "yes" : "no"}`,
    `matchRemaining=${matchResult.remainingRecipientShareCents}`,
    `threshold=${budgetResult.thresholdStated ? "stated" : "unstated"}`,
    `blockedScopes=${blockedFindingScopes.length === 0 ? "none" : blockedFindingScopes.join("+")}`,
    ...findings.map((f) => `${f.ruleId}=${f.severity}`),
  ];

  const report: FfrAuditReport = {
    engine: { id: ENGINE_ID, version: ENGINE_VERSION },
    crossFoot: crossFootResult,
    cashRecon: cashReconResult,
    match: matchResult,
    terms: termsResult,
    budget: budgetResult,
    period: periodResult,
    findings,
    blockedFindingScopes,
    verdict,
    summary: "",
    labels,
    provenance: { computedBy: "deterministic-engine" },
  };
  report.summary = buildSummary(report);
  return report;
}
