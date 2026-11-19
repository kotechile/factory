import { describe, it, expect } from "vitest";
import {
  auditFfr,
  budgetVariance,
  crossFoot,
  matchTest,
  periodVsCumulative,
  reconcileCash,
  termsConsistency,
} from "./engine";
import { formatBps, formatCents, formatCentsSigned, parseUsdToCents } from "./money";
import { parseApprovedBudgetCsv, parseGlExportCsv } from "./csv";
import { readCompositeInput } from "./read";
import { DEFAULT_SCENARIO_RECORD } from "./fixtures";
import type {
  ApprovedBudget,
  AwardTerms,
  DrawdownStatement,
  FfrAuditInput,
  FfrReport,
  GlExport,
} from "./types";

function mkReport(partial: Partial<FfrReport>): FfrReport {
  return {
    cashReceiptsCents: 9500000,
    cashDisbursementsCents: 8500000,
    cashOnHandCents: 1000000,
    totalFederalAwardCents: 10000000,
    federalExpendituresCents: 6000000,
    unliquidatedObligationsCents: 1000000,
    federalShareCents: 7000000,
    unobligatedBalanceCents: 3000000,
    requiredRecipientShareCents: 2000000,
    recipientShareProvidedCents: 2000000,
    remainingRecipientShareCents: 0,
    periodEnd: "2026-09-30",
    isFinal: false,
    ...partial,
  };
}

function mkTerms(partial: Partial<AwardTerms>): AwardTerms {
  return {
    awardId: "FA-2026-0117",
    authorizedFederalAmountCents: 10000000,
    periodOfPerformance: { start: "2025-10-01", end: "2026-09-30" },
    requiredMatchPercentBps: 2000,
    reportingFrequency: "quarterly",
    priorApprovalThresholdBps: 1000,
    agencyLineInstructions: null,
    ...partial,
  };
}

/** A drawdown statement whose subaccounts sum exactly to its printed totals. */
function mkDrawdownTotals(receiptsCents: number, disbursementsCents: number): DrawdownStatement {
  return {
    totalReceiptsCents: receiptsCents,
    totalDisbursementsCents: disbursementsCents,
    subaccounts: [{ subaccount: "10-55-1000", receiptsCents, disbursementsCents }],
  };
}

function mkGl(lines: { category: string; actualCents: number }[]): GlExport {
  return {
    lines,
    totalActualCents: lines.reduce((sum, l) => sum + l.actualCents, 0),
  };
}

function mkBudget(lines: { category: string; approvedCents: number }[]): ApprovedBudget {
  return {
    lines,
    totalApprovedCents: lines.reduce((sum, l) => sum + l.approvedCents, 0),
  };
}

function mkInput(partial: Partial<FfrAuditInput>): FfrAuditInput {
  return {
    report: mkReport({}),
    drawdown: mkDrawdownTotals(9500000, 8500000),
    awardTerms: mkTerms({}),
    glExport: mkGl([{ category: "personnel", actualCents: 6000000 }]),
    approvedBudget: mkBudget([{ category: "personnel", approvedCents: 6000000 }]),
    priorReport: null,
    ...partial,
  };
}

describe("crossFoot — the four published line identities, zero tolerance", () => {
  it("reports every line holding on a clean report", () => {
    const result = crossFoot(mkReport({}));
    expect(result.lines).toHaveLength(4);
    expect(result.lines.every((l) => l.holds)).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("returns BOTH sides and the difference on a 10c break — never a bare 'invalid'", () => {
    const result = crossFoot(mkReport({ cashOnHandCents: 999900 }));
    const tenC = result.lines.find((l) => l.formLine === "10c");
    expect(tenC?.holds).toBe(false);
    expect(tenC?.lhsCents).toBe(999900);
    expect(tenC?.rhsCents).toBe(1000000);
    expect(tenC?.differenceCents).toBe(-100);
    const finding = result.findings.find((f) => f.ruleId === "ffr-crossfoot-10c");
    expect(finding).toBeDefined();
    expect(finding?.deltaCents).toBe(-100);
    expect(finding?.message).toContain("10c");
  });

  it("flags each of the four identities by its own rule id", () => {
    const g = crossFoot(mkReport({ federalShareCents: 7000001 }));
    expect(g.findings.some((f) => f.ruleId === "ffr-crossfoot-10g")).toBe(true);
    const h = crossFoot(mkReport({ unobligatedBalanceCents: 2999999 }));
    expect(h.findings.some((f) => f.ruleId === "ffr-crossfoot-10h")).toBe(true);
    const k = crossFoot(mkReport({ remainingRecipientShareCents: 1 }));
    expect(k.findings.some((f) => f.ruleId === "ffr-crossfoot-10k")).toBe(true);
  });
});

describe("reconcileCash — 10a/10b against the drawdown statement, to the cent", () => {
  it("known-answer vector: a 10a↔statement drift of $0.04 produces exactly one named finding", () => {
    const input = mkInput({
      drawdown: mkDrawdownTotals(9499996, 8500000),
    });
    const report = auditFfr(input);
    expect(report.cashRecon.receiptsDriftCents).toBe(4);
    expect(report.cashRecon.disbursementsDriftCents).toBe(0);
    const driftFindings = report.findings.filter((f) => f.ruleId === "ffr-10a-drift");
    expect(driftFindings).toHaveLength(1);
    expect(driftFindings[0].deltaCents).toBe(4);
    expect(driftFindings[0].scope).toBe("10a");
    expect(report.findings).toHaveLength(1);
  });

  it("reports a disbursements drift by its own rule id", () => {
    const result = reconcileCash(mkReport({}), mkDrawdownTotals(9500000, 8500001));
    expect(result.disbursementsDriftCents).toBe(-1);
    expect(result.findings.some((f) => f.ruleId === "ffr-10b-drift")).toBe(true);
  });

  it("flags a statement whose subaccounts do not sum to its printed totals", () => {
    const result = reconcileCash(
      mkReport({}),
      { totalReceiptsCents: 9500000, totalDisbursementsCents: 8500000, subaccounts: [{ subaccount: "a", receiptsCents: 1, disbursementsCents: 0 }] },
    );
    expect(result.findings.some((f) => f.ruleId === "ffr-statement-subaccount-sum")).toBe(true);
  });
});

describe("matchTest — required vs provided vs remaining, and the final-report rules", () => {
  it("known-answer vector: a final report with 10k > 0 produces exactly one named finding", () => {
    const input = mkInput({
      report: mkReport({
        totalFederalAwardCents: 8000000,
        federalExpendituresCents: 8000000,
        unliquidatedObligationsCents: 0,
        federalShareCents: 8000000,
        unobligatedBalanceCents: 0,
        cashReceiptsCents: 8000000,
        cashDisbursementsCents: 8000000,
        cashOnHandCents: 0,
        requiredRecipientShareCents: 2000000,
        recipientShareProvidedCents: 1500000,
        remainingRecipientShareCents: 500000,
        isFinal: true,
      }),
      awardTerms: mkTerms({ authorizedFederalAmountCents: 8000000 }),
      drawdown: mkDrawdownTotals(8000000, 8000000),
      glExport: mkGl([{ category: "personnel", actualCents: 8000000 }]),
      approvedBudget: mkBudget([{ category: "personnel", approvedCents: 8000000 }]),
    });
    const report = auditFfr(input);
    const findings = report.findings.filter((f) => f.ruleId === "ffr-match-shortfall-final");
    expect(findings).toHaveLength(1);
    expect(findings[0].deltaCents).toBe(500000);
    expect(findings[0].scope).toBe("10k");
    expect(report.findings).toHaveLength(1);
  });

  it("known-answer vector: a final report with a non-zero 10f produces exactly one named finding", () => {
    const input = mkInput({
      report: mkReport({
        totalFederalAwardCents: 8000000,
        federalExpendituresCents: 7500000,
        unliquidatedObligationsCents: 500000,
        federalShareCents: 8000000,
        unobligatedBalanceCents: 0,
        cashReceiptsCents: 8000000,
        cashDisbursementsCents: 8000000,
        cashOnHandCents: 0,
        isFinal: true,
      }),
      awardTerms: mkTerms({ authorizedFederalAmountCents: 8000000 }),
      drawdown: mkDrawdownTotals(8000000, 8000000),
      glExport: mkGl([{ category: "personnel", actualCents: 7500000 }]),
      approvedBudget: mkBudget([{ category: "personnel", approvedCents: 7500000 }]),
    });
    const report = auditFfr(input);
    expect(report.findings.filter((f) => f.ruleId === "ffr-final-unliquidated-nonzero")).toHaveLength(1);
    expect(report.findings).toHaveLength(1);
  });

  it("a final report with a non-zero 10h is a hard finding too", () => {
    const result = matchTest(
      mkReport({ unobligatedBalanceCents: 100000, isFinal: true }),
      mkTerms({}),
    );
    expect(result.findings.some((f) => f.ruleId === "ffr-final-unobligated-nonzero")).toBe(true);
  });

  it("a non-final shortfall is reported unmatched, not blocking", () => {
    const result = matchTest(mkReport({ remainingRecipientShareCents: 500000 }), mkTerms({}));
    const finding = result.findings.find((f) => f.ruleId === "ffr-match-shortfall");
    expect(finding?.severity).toBe("unmatched");
  });
});

describe("termsConsistency — the report's 10d and period end against the award's own terms", () => {
  it("flags a 10d that disagrees with the authorized amount", () => {
    const result = termsConsistency(
      mkReport({}),
      mkTerms({ authorizedFederalAmountCents: 9900000 }),
    );
    const finding = result.findings.find((f) => f.ruleId === "ffr-authorized-mismatch");
    expect(finding).toBeDefined();
    expect(finding?.deltaCents).toBe(100000);
  });

  it("blocks the authorized-amount check when the terms do not state it", () => {
    const result = termsConsistency(mkReport({}), mkTerms({ authorizedFederalAmountCents: null }));
    expect(result.blockedScopes).toContain("authorized-amount");
    expect(result.findings).toEqual([]);
  });
});

describe("budgetVariance — actual vs approved, threshold from the award's own terms", () => {
  it("pins the sum invariant: Σ(category variances) == total variance", () => {
    const gl = mkGl([
      { category: "personnel", actualCents: 4000000 },
      { category: "equipment", actualCents: 1200000 },
    ]);
    const budget = mkBudget([
      { category: "personnel", approvedCents: 4200000 },
      { category: "equipment", approvedCents: 1200000 },
    ]);
    const result = budgetVariance(gl, budget, 1000);
    expect(result.totalVarianceCents).toBe(-200000);
    const sum = result.rows.reduce((s, r) => s + r.varianceCents, 0);
    expect(sum).toBe(result.totalVarianceCents);
    expect(result.totalVarianceCents).toBe(result.totalActualCents - result.totalApprovedCents);
  });

  it("flags a category whose variance exceeds the award's prior-approval threshold", () => {
    const gl = mkGl([{ category: "supplies", actualCents: 1200000 }]);
    const budget = mkBudget([{ category: "supplies", approvedCents: 700000 }]);
    const result = budgetVariance(gl, budget, 1000); // 10%
    const supplies = result.rows.find((r) => r.category === "supplies");
    expect(supplies?.overThreshold).toBe(true);
    expect(result.findings.some((f) => f.ruleId === "ffr-budget-over-threshold")).toBe(true);
  });

  it("returns `unstated` (never a default) when the terms do not state a threshold", () => {
    const gl = mkGl([{ category: "supplies", actualCents: 1200000 }]);
    const budget = mkBudget([{ category: "supplies", approvedCents: 700000 }]);
    const result = budgetVariance(gl, budget, null);
    expect(result.thresholdStated).toBe(false);
    expect(result.rows.every((r) => r.overThreshold === null)).toBe(true);
    expect(result.findings.some((f) => f.ruleId === "ffr-budget-threshold-unstated")).toBe(true);
  });
});

describe("periodVsCumulative — the period-vs-total and double-count errors", () => {
  it("known-answer vector: a period-vs-cumulative double count produces exactly one named finding", () => {
    const prior = mkReport({ federalExpendituresCents: 5000000, unliquidatedObligationsCents: 0, federalShareCents: 5000000 });
    const current = mkReport({
      federalExpendituresCents: 7000000,
      unliquidatedObligationsCents: 0,
      federalShareCents: 7000000,
    });
    const input = mkInput({
      report: current,
      priorReport: prior,
      glExport: mkGl([{ category: "personnel", actualCents: 1000000 }]),
      approvedBudget: mkBudget([{ category: "personnel", approvedCents: 1000000 }]),
    });
    const report = auditFfr(input);
    expect(report.period.deltaCents).toBe(1000000);
    const findings = report.findings.filter((f) => f.ruleId === "ffr-double-count");
    expect(findings).toHaveLength(1);
    expect(findings[0].deltaCents).toBe(1000000);
    expect(report.findings).toHaveLength(1);
  });

  it("catches 'reported the period, not the total'", () => {
    const result = periodVsCumulative(
      mkReport({ federalExpendituresCents: 5000000, unliquidatedObligationsCents: 0, federalShareCents: 5000000 }),
      mkReport({ federalExpendituresCents: 1000000, unliquidatedObligationsCents: 0, federalShareCents: 1000000 }),
      1000000,
    );
    expect(result.findings.some((f) => f.ruleId === "ffr-period-not-cumulative")).toBe(true);
  });

  it("catches a cumulative that regressed", () => {
    const result = periodVsCumulative(
      mkReport({ federalExpendituresCents: 5000000, unliquidatedObligationsCents: 0, federalShareCents: 5000000 }),
      mkReport({ federalExpendituresCents: 4000000, unliquidatedObligationsCents: 0, federalShareCents: 4000000 }),
      1000000,
    );
    expect(result.findings.some((f) => f.ruleId === "ffr-cumulative-regressed")).toBe(true);
  });

  it("returns no findings when there is no prior filing", () => {
    const result = periodVsCumulative(null, mkReport({}), 1000000);
    expect(result.findings).toEqual([]);
  });
});

describe("the demo scenario — declared composite, deterministic, no model", () => {
  it("reads the composite and reports the match shortfall, the $0.04 drift and the unstated threshold", () => {
    const composite = readCompositeInput(DEFAULT_SCENARIO_RECORD);
    const report = auditFfr({
      report: composite.report,
      drawdown: composite.drawdown,
      awardTerms: composite.awardTerms,
      glExport: composite.glExport,
      approvedBudget: composite.approvedBudget,
      priorReport: composite.priorReport,
    });
    expect(report.crossFoot.lines.every((l) => l.holds)).toBe(true);
    expect(report.findings.some((f) => f.ruleId === "ffr-10a-drift")).toBe(true);
    expect(report.findings.some((f) => f.ruleId === "ffr-match-shortfall")).toBe(true);
    expect(report.findings.some((f) => f.ruleId === "ffr-budget-threshold-unstated")).toBe(true);
    expect(report.cashRecon.receiptsDriftCents).toBe(4);
    expect(report.match.remainingRecipientShareCents).toBe(500000);
    expect(report.verdict).toBe("blocked");
  });
});

describe("money — integer arithmetic at every boundary", () => {
  it("parses dollars to cents exactly and formats without a float", () => {
    expect(parseUsdToCents("$94,999.96", "x")).toBe(9499996);
    expect(parseUsdToCents("120.50", "x")).toBe(12050);
    expect(() => parseUsdToCents("12.005", "x")).toThrow(/finer than the cent/);
    expect(formatCents(9499996)).toBe("$94,999.96");
    expect(formatCents(-4)).toBe("-$0.04");
    expect(formatCentsSigned(4)).toBe("+$0.04");
    expect(formatBps(2000)).toBe("20.00%");
    expect(formatBps(1000)).toBe("10.00%");
  });

  it("parses the GL export and approved budget CSVs deterministically", () => {
    const gl = parseGlExportCsv("category,actual_usd\npersonnel,40000.00\ntravel,5000.00");
    expect(gl.glExport.totalActualCents).toBe(4500000);
    const budget = parseApprovedBudgetCsv("category,approved_usd\npersonnel,42000.00");
    expect(budget.approvedBudget.totalApprovedCents).toBe(4200000);
    expect(() => parseGlExportCsv("wrong,actual_usd\nx,1.00")).toThrow(/missing the column/);
  });
});
