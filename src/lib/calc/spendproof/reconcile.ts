/**
 * SpendProof — the deterministic reconciliation core.
 *
 * Input: the provider invoice's DECLARED lines (the invoice's own numbers, extracted) plus the
 * organization's own tagged-usage ledger. Output: a close-ready variance report — per line, per
 * attribution bucket, with the balancing invariants asserted and every discrepancy classified.
 *
 * No clock, no network, no randomness, no model. Two runs of the same request on different machines
 * produce byte-identical output, which is what makes the report auditable after the fact.
 */
import { buildCoverage } from "./coverage";
import {
  chargeFromDeclaredRate,
  declaredToleranceMicros,
  formatMicros,
  formatMicrosSigned,
  formatRatePerThousand,
  roundingToleranceMicros,
  SpendProofFieldError,
  UNITS_PER_RATE_DENOMINATOR,
} from "./money";
import { csvRow } from "./csv";
import { isoDay, nearPeriodBoundary, withinPeriod } from "./dates";
import { buildDeclaredRateCard, lineKey } from "./rateCard";
import { classifyVariance, VARIANCE_RULE } from "./variance";
import type {
  BucketReconciliation,
  CloseReport,
  Finding,
  FindingSeverity,
  InvoiceLine,
  LedgerRow,
  LineReconciliation,
  MicroUsd,
  ReconcileRequest,
  VarianceKind,
} from "./types";

export const ENGINE_METADATA = {
  id: "spendproof_reconcile_ai_invoice",
  version: "1.0.0",
  name: "SpendProof — AI provider invoice ↔ tagged-usage reconciliation",
  description:
    "Reconciles an AI provider invoice against the organization's own tagged-usage ledger: every line is recomputed at the rate the invoice itself declares, each variance is classified as rounding, a period-boundary overlap, missing or late usage, untagged spend or a mid-period rate change, and a clean close is withheld whenever a bucket does not reconcile or usage cannot be attributed.",
} as const;

/** The declared reconciliation tolerance, in basis points of the amount being reconciled. */
export const DEFAULT_TOLERANCE_BPS = 50;

interface LedgerBuckets {
  tagged: Map<string, { quantity: number; rows: number }>;
  taggedQuantity: number;
  taggedRows: number;
  untaggedQuantity: number;
  untaggedRows: number;
  boundaryQuantity: number;
  boundaryRows: number;
  outOfPeriodQuantity: number;
}

/**
 * Buckets the ledger per reconciliation unit. A row is in-period (counted in the recompute), near a
 * period edge (reported as a boundary overlap, NOT counted), or out of period (reported, not
 * counted) — the last two are never silently folded into the reconciliation.
 */
function classifyLedgerRows(
  rows: readonly LedgerRow[],
  period: { start: string; end: string },
): Map<string, LedgerBuckets> {
  const byKey = new Map<string, LedgerBuckets>();

  rows.forEach((row, position) => {
    const day = isoDay(row.timestamp, `ledger[${position + 1}].timestamp`);
    const key = lineKey(row);
    let buckets = byKey.get(key);
    if (!buckets) {
      buckets = {
        tagged: new Map(),
        taggedQuantity: 0,
        taggedRows: 0,
        untaggedQuantity: 0,
        untaggedRows: 0,
        boundaryQuantity: 0,
        boundaryRows: 0,
        outOfPeriodQuantity: 0,
      };
      byKey.set(key, buckets);
    }

    if (withinPeriod(day, period)) {
      if (row.bucket === null) {
        buckets.untaggedQuantity += row.quantity;
        buckets.untaggedRows += 1;
        return;
      }
      const existing = buckets.tagged.get(row.bucket) ?? { quantity: 0, rows: 0 };
      existing.quantity += row.quantity;
      existing.rows += 1;
      buckets.tagged.set(row.bucket, existing);
      buckets.taggedQuantity += row.quantity;
      buckets.taggedRows += 1;
      return;
    }

    if (nearPeriodBoundary(day, period)) {
      buckets.boundaryQuantity += row.quantity;
      buckets.boundaryRows += 1;
      return;
    }
    buckets.outOfPeriodQuantity += row.quantity;
  });

  return byKey;
}

function findingSeverityRank(severity: FindingSeverity): number {
  return severity === "blocking" ? 0 : severity === "unmatched" ? 1 : 2;
}

/** The deterministic close pack: no clock and no randomness, so two runs are byte-identical. */
export function buildClosePack(report: Omit<CloseReport, "closePack">): string {
  const lines: string[] = [];
  lines.push(
    [
      "record_type",
      "scope",
      "detail",
      "bucket",
      "service",
      "model",
      "sku",
      "quantity",
      "rate_usd_per_1k",
      "invoice_usd",
      "recomputed_usd",
      "variance_usd",
      "classification",
      "fix",
    ].join(","),
  );

  const summary: [string, string][] = [
    ["engine", `${ENGINE_METADATA.id} v${ENGINE_METADATA.version}`],
    ["provider", report.provider],
    ["period", `${report.period.start}..${report.period.end}`],
    ["currency", report.currency],
    ["invoice_total_usd", formatMicros(report.invoiceTotalMicroUsd)],
    ["invoice_line_sum_usd", formatMicros(report.invoiceLineSumMicroUsd)],
    ["invoice_balances", String(report.invoiceBalances)],
    ["recomputed_total_usd", formatMicros(report.recomputedTotalMicroUsd)],
    ["aggregate_variance_usd", formatMicrosSigned(report.aggregateVarianceMicroUsd)],
    ["declared_tolerance_usd", formatMicros(report.toleranceMicroUsd)],
    ["untagged_quantity", String(report.untaggedQuantity)],
    ["untagged_value_usd", formatMicros(report.untaggedValueMicroUsd)],
    ["close_ready", String(report.closeReady)],
    ["blockers", report.blockers.length > 0 ? report.blockers.join(" ") : "none"],
    ["numbers_source", "deterministic engine (the invoice is read as declared fields; the model computes nothing)"],
  ];
  for (const [name, value] of summary) {
    lines.push(csvRow(["summary", name, value, "", "", "", "", "", "", "", "", "", "", ""]));
  }

  for (const line of report.lines) {
    const declaredRate =
      line.declaredUnitPrices.length === 1 ? line.declaredUnitPrices[0] : null;
    for (const bucket of line.buckets) {
      lines.push(
        csvRow([
          "bucket",
          line.key,
          "",
          bucket.bucket,
          line.service,
          line.model,
          line.sku,
          String(bucket.ledgerQuantity),
          declaredRate === null ? "" : String(declaredRate / 1_000_000),
          formatMicros(bucket.allocatedInvoiceMicroUsd),
          formatMicros(bucket.recomputedMicroUsd),
          formatMicrosSigned(bucket.varianceMicroUsd),
          bucket.reconciled ? "reconciled" : "unmatched",
          bucket.reconciled
            ? ""
            : "Re-check the tagged usage rows for this bucket inside the period; the invoice charges more (or less) than the tagged ledger explains.",
        ]),
      );
    }
  }

  for (const finding of report.findings) {
    lines.push(
      csvRow([
        "finding",
        finding.ruleId,
        finding.message,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        finding.deltaMicroUsd === undefined ? "" : formatMicrosSigned(finding.deltaMicroUsd),
        finding.kind,
        finding.fix,
      ]),
    );
  }

  return `${lines.join("\n")}\n`;
}

/** True when a quantity at a declared rate covers a money gap (used by the classification input). */
function valueAtRate(quantity: number, rateMicroUsdPerThousand: number | null): MicroUsd {
  if (rateMicroUsdPerThousand === null) return 0;
  return Math.round((quantity * rateMicroUsdPerThousand) / UNITS_PER_RATE_DENOMINATOR);
}

export function reconcileInvoice(request: ReconcileRequest): CloseReport {
  const toleranceBps = request.toleranceBps ?? DEFAULT_TOLERANCE_BPS;
  const { invoice } = request;

  const period = {
    start: isoDay(invoice.period.start, "invoice.period.start"),
    end: isoDay(invoice.period.end, "invoice.period.end"),
  };
  if (period.end < period.start) {
    throw new SpendProofFieldError(
      "sp-field-invalid",
      "invoice.period",
      "The invoice's period end is before its start. Nothing was reconciled.",
    );
  }
  if (!invoice.provider.trim()) {
    throw new SpendProofFieldError(
      "sp-field-missing",
      "invoice.provider",
      "The invoice names no provider; the reconciliation has nothing to attribute the document to. Nothing was reconciled.",
    );
  }

  const findings: Finding[] = [];
  const lines: LineReconciliation[] = [];

  // --- Invariant 1: the invoice's own line items must sum to its own printed total -------------
  const invoiceLineSumMicroUsd = invoice.lines.reduce((total, line) => total + line.amountMicroUsd, 0);
  const invoiceBalances = invoiceLineSumMicroUsd === invoice.totalMicroUsd;
  if (!invoiceBalances) {
    findings.push({
      ruleId: "sp-invoice-unbalanced",
      kind: "unbalanced",
      severity: "blocking",
      scope: "invoice",
      message: `The invoice's own line items sum to ${formatMicros(invoiceLineSumMicroUsd)} but the invoice prints ${formatMicros(invoice.totalMicroUsd)}. The document contradicts itself, so no reconciliation of it can be trusted.`,
      deltaMicroUsd: invoice.totalMicroUsd - invoiceLineSumMicroUsd,
      fix: "Re-read the invoice: the line items or the total were mis-extracted, or the invoice carries a tax/discount line this period that is not a usage line. Nothing is guessed.",
    });
  }

  const rateGroups = buildDeclaredRateCard(invoice.lines);
  const ledgerByKey = classifyLedgerRows(request.ledger.rows, period);
  const invoiceKeys = new Set(rateGroups.map((group) => group.key));

  // --- Ledger rows the invoice never bills: reported, never silently dropped -------------------
  for (const [key, buckets] of ledgerByKey) {
    if (invoiceKeys.has(key)) continue;
    const quantity = buckets.taggedQuantity + buckets.untaggedQuantity + buckets.boundaryQuantity + buckets.outOfPeriodQuantity;
    if (quantity === 0) continue;
    findings.push({
      ruleId: "sp-ledger-orphan",
      kind: "out_of_scope",
      severity: "advisory",
      scope: key,
      message: `The ledger logs ${quantity.toLocaleString("en-US")} units for ${key}, which the invoice does not bill in this period.`,
      fix: "Confirm this usage was billed in another period (or is a free/included tier) before treating the invoice as complete.",
    });
  }

  let recomputedTotalMicroUsd = 0;
  let lineRoundingToleranceMicroUsd = 0;
  let varianceAcrossComputedLines = 0;
  let untaggedQuantity = 0;
  let untaggedValueMicroUsd = 0;

  for (const group of rateGroups) {
    const buckets = ledgerByKey.get(group.key);
    const tagged = buckets?.tagged ?? new Map<string, { quantity: number; rows: number }>();
    const taggedQuantity = buckets?.taggedQuantity ?? 0;
    const taggedRows = buckets?.taggedRows ?? 0;
    const untaggedRowsForLine = buckets?.untaggedRows ?? 0;
    const boundaryRows = buckets?.boundaryRows ?? 0;
    const untaggedForLine = buckets?.untaggedQuantity ?? 0;
    const boundaryForLine = buckets?.boundaryQuantity ?? 0;
    const outOfPeriodForLine = buckets?.outOfPeriodQuantity ?? 0;
    const rate = group.unitPriceMicroUsdPerThousandUnits;
    const hasMultipleDeclaredPrices = group.unitPrices.length > 1;

    const contributingRows = taggedRows + untaggedRowsForLine + boundaryRows;
    const roundingTolerance = roundingToleranceMicros(contributingRows);
    const tolerance = Math.max(
      roundingTolerance,
      declaredToleranceMicros(group.amountMicroUsd, toleranceBps),
    );

    const recomputed =
      rate === null ? null : chargeFromDeclaredRate(taggedQuantity, rate, `${group.key}.quantity`);
    const untaggedValue = valueAtRate(untaggedForLine, rate);
    const boundaryValue = valueAtRate(boundaryForLine, rate);

    const verdict = classifyVariance({
      invoiceAmountMicroUsd: group.amountMicroUsd,
      recomputedMicroUsd: recomputed,
      untaggedQuantity: untaggedForLine,
      untaggedValueMicroUsd: untaggedValue,
      boundaryQuantity: boundaryForLine,
      boundaryValueMicroUsd: boundaryValue,
      roundingToleranceMicroUsd: roundingTolerance,
      hasMultipleDeclaredPrices,
    });

    untaggedQuantity += untaggedForLine;
    untaggedValueMicroUsd += untaggedValue;
    lineRoundingToleranceMicroUsd += roundingTolerance;
    if (recomputed !== null) {
      recomputedTotalMicroUsd += recomputed;
      varianceAcrossComputedLines += verdict.varianceMicroUsd ?? 0;
    }

    // --- buckets -------------------------------------------------------------------------------
    const bucketRows: BucketReconciliation[] = [];
    if (rate !== null) {
      for (const [bucketName, entry] of tagged) {
        const bucketRecomputed = chargeFromDeclaredRate(
          entry.quantity,
          rate,
          `${group.key}.${bucketName}.quantity`,
        );
        // The invoice has no buckets of its own, so its amount is allocated across the tagged
        // buckets by tagged-quantity share. An untagged remainder therefore lands here as a real
        // shortfall instead of disappearing from the report.
        const allocated =
          taggedQuantity === 0
            ? 0
            : Math.round((group.amountMicroUsd * entry.quantity) / taggedQuantity);
        const bucketTolerance = Math.max(
          roundingToleranceMicros(entry.rows),
          declaredToleranceMicros(allocated, toleranceBps),
        );
        const bucketVariance = allocated - bucketRecomputed;
        const reconciled = Math.abs(bucketVariance) <= bucketTolerance;
        bucketRows.push({
          bucket: bucketName,
          ledgerQuantity: entry.quantity,
          recomputedMicroUsd: bucketRecomputed,
          allocatedInvoiceMicroUsd: allocated,
          varianceMicroUsd: bucketVariance,
          toleranceMicroUsd: bucketTolerance,
          reconciled,
          kind: reconciled ? verdict.kind : "unmatched",
          boundaryQuantity: 0,
        });
      }
    }
    bucketRows.sort((a, b) => a.bucket.localeCompare(b.bucket));

    lines.push({
      key: group.key,
      service: group.service,
      model: group.model,
      sku: group.sku,
      invoiceQuantity: group.quantity,
      invoiceAmountMicroUsd: group.amountMicroUsd,
      declaredUnitPrices: [...group.unitPrices],
      taggedQuantity,
      untaggedQuantity: untaggedForLine,
      boundaryQuantity: boundaryForLine,
      outOfPeriodQuantity: outOfPeriodForLine,
      recomputedMicroUsd: recomputed,
      varianceMicroUsd: verdict.varianceMicroUsd,
      roundingToleranceMicroUsd: roundingTolerance,
      toleranceMicroUsd: tolerance,
      kind: verdict.kind,
      buckets: bucketRows,
    });

    // --- findings ------------------------------------------------------------------------------
    const varianceIsZero = verdict.varianceMicroUsd === 0;
    if (verdict.kind === "rounding" && varianceIsZero) {
      // Exactly on the declared rate: nothing to report (a clean pair produces ZERO findings).
    } else {
      const rule = VARIANCE_RULE[verdict.kind];
      findings.push({
        ruleId: rule.ruleId,
        kind: verdict.kind,
        severity:
          verdict.kind === "untagged_spend" || untaggedForLine > 0 ? "blocking" : rule.severity,
        scope: group.key,
        message: describeVariance(verdict.kind, {
          line: group,
          variance: verdict.varianceMicroUsd,
          taggedQuantity,
          untaggedQuantity: untaggedForLine,
          untaggedValue,
          boundaryQuantity: boundaryForLine,
          boundaryValue,
          outOfPeriodQuantity: outOfPeriodForLine,
          declaredUnitPrices: group.unitPrices,
        }),
        ...(verdict.varianceMicroUsd === null
          ? {}
          : { deltaMicroUsd: verdict.varianceMicroUsd }),
        fix: varianceFix(verdict.kind),
      });
    }

    // Untagged usage blocks a clean close on its own terms, even when the line happens to
    // reconcile: the invoice charged for usage that no tag claims (rule 5).
    if (untaggedForLine > 0 && verdict.kind !== "untagged_spend") {
      findings.push({
        ruleId: "sp-untagged-spend",
        kind: "untagged_spend",
        severity: "blocking",
        scope: group.key,
        message: `${untaggedForLine.toLocaleString("en-US")} units (${formatMicros(untaggedValue)} at the declared rate) in the ledger carry no attribution tag, so no bucket can claim that share of the invoice.`,
        deltaMicroUsd: untaggedValue,
        fix: "Attach the missing tags at the call site (business unit / cost centre / feature) and re-export the ledger; until then this period cannot be closed cleanly.",
      });
    }

    for (const bucket of bucketRows) {
      if (bucket.reconciled) continue;
      findings.push({
        ruleId: "sp-bucket-unmatched",
        kind: "unmatched",
        severity: "unmatched",
        scope: `${group.key} · ${bucket.bucket}`,
        message: `Bucket '${bucket.bucket}' is allocated ${formatMicros(bucket.allocatedInvoiceMicroUsd)} of the invoice (its share of the tagged usage) but its own usage recomputes to ${formatMicros(bucket.recomputedMicroUsd)} at the declared rate — ${formatMicrosSigned(bucket.varianceMicroUsd)}, outside the ${formatMicros(bucket.toleranceMicroUsd)} declared tolerance. This bucket does not reconcile.`,
        deltaMicroUsd: bucket.varianceMicroUsd,
        fix: "Re-check this bucket's tagged rows inside the period (dropped/late rows, rows tagged to the wrong bucket, or usage logged without a tag) before closing.",
      });
    }
  }

  // --- Invariant 2: Σ recomputed ≈ the invoice total within the declared tolerance -------------
  const toleranceMicroUsd = Math.max(
    lineRoundingToleranceMicroUsd,
    declaredToleranceMicros(invoiceLineSumMicroUsd, toleranceBps),
  );
  const aggregateWithinTolerance = Math.abs(varianceAcrossComputedLines) <= toleranceMicroUsd;
  const everyLineIndividuallyReconciled = lines.every((line) => {
    if (line.recomputedMicroUsd === null) return false;
    return Math.abs(line.varianceMicroUsd ?? 0) <= line.toleranceMicroUsd;
  });
  if (!aggregateWithinTolerance && everyLineIndividuallyReconciled) {
    findings.push({
      ruleId: "sp-aggregate-unreconciled",
      kind: "unmatched",
      severity: "unmatched",
      scope: "invoice",
      message: `Every line reconciled inside its own tolerance, but the total is ${formatMicrosSigned(varianceAcrossComputedLines)} off the invoice — outside the ${formatMicros(toleranceMicroUsd)} declared aggregate tolerance.`,
      deltaMicroUsd: varianceAcrossComputedLines,
      fix: "Treat the aggregate drift as a data-collection problem: tighten the per-line tags or the period alignment before closing.",
    });
  }

  findings.sort((a, b) => {
    const rank = findingSeverityRank(a.severity) - findingSeverityRank(b.severity);
    if (rank !== 0) return rank;
    return a.ruleId.localeCompare(b.ruleId);
  });

  const blockers = [...new Set(
    findings
      .filter((finding) => finding.severity !== "advisory")
      .map((finding) => finding.ruleId),
  )];
  const closeReady = blockers.length === 0;

  const report: Omit<CloseReport, "closePack"> = {
    engine: { id: ENGINE_METADATA.id, version: ENGINE_METADATA.version },
    provider: invoice.provider,
    period,
    currency: invoice.currency,
    invoiceTotalMicroUsd: invoice.totalMicroUsd,
    invoiceLineSumMicroUsd,
    invoiceBalances,
    recomputedTotalMicroUsd,
    aggregateVarianceMicroUsd: varianceAcrossComputedLines,
    toleranceMicroUsd,
    aggregateWithinTolerance,
    untaggedQuantity,
    untaggedValueMicroUsd,
    lines,
    findings,
    closeReady,
    blockers,
    coverage: buildCoverage(),
    provenance: { computedBy: "deterministic-engine", invoiceSource: "declared-fields" },
  };

  return { ...report, closePack: buildClosePack(report) };
}

interface ExplainInput {
  line: { quantity: number; amountMicroUsd: number; unitPrices: number[] };
  variance: MicroUsd | null;
  taggedQuantity: number;
  untaggedQuantity: number;
  untaggedValue: MicroUsd;
  boundaryQuantity: number;
  boundaryValue: MicroUsd;
  outOfPeriodQuantity: number;
  declaredUnitPrices: number[];
}

function describeVariance(kind: VarianceKind, input: ExplainInput): string {
  const invoicePart = `the invoice charges ${formatMicros(input.line.amountMicroUsd)} for ${input.line.quantity.toLocaleString("en-US")} units`;
  switch (kind) {
    case "price_drift":
      return `${invoicePart} but declares ${input.declaredUnitPrices.length} different unit prices in this period (${input.declaredUnitPrices.map((price) => formatRatePerThousand(price)).join(" then ")}), so the ledger cannot be recomputed at a single rate. NO VARIANCE IS COMPUTED — reporting one would invent a number by picking one of the two rates.`;
    case "rounding":
      return `${invoicePart} and the ledger-derived recompute differs by ${formatMicrosSigned(input.variance ?? 0)} — inside the per-row cent rounding tolerance.`;
    case "untagged_spend":
      return `${invoicePart}; the tagged ledger accounts for ${formatMicros(input.line.amountMicroUsd - (input.variance ?? 0))} and the ${input.untaggedQuantity.toLocaleString("en-US")} untagged units in the period are worth ${formatMicros(input.untaggedValue)} at the declared rate — the gap is unattributable usage.`;
    case "period_boundary":
      return `${invoicePart}; the in-period tagged ledger recomputes to ${formatMicros(input.line.amountMicroUsd - (input.variance ?? 0))}, and ${input.boundaryQuantity.toLocaleString("en-US")} units (${formatMicros(input.boundaryValue)} at the declared rate) are timestamped just outside the billing window — a period-boundary overlap, not a rate or usage error.`;
    case "missing_usage":
      return `${invoicePart}; the tagged in-period ledger recomputes to ${formatMicros(input.line.amountMicroUsd - (input.variance ?? 0))} (${formatMicrosSigned(input.variance ?? 0)}), and no untagged or boundary usage explains the gap — usage is missing from the ledger${input.outOfPeriodQuantity > 0 ? ` (and a further ${input.outOfPeriodQuantity.toLocaleString("en-US")} units sit outside the window entirely)` : ""}.`;
  }
}

function varianceFix(kind: VarianceKind): string {
  switch (kind) {
    case "price_drift":
      return "Get the provider's rate-change notice for the period and split the ledger by the dates each rate applied; that is the only way to reconcile a mid-period change.";
    case "rounding":
      return "Nothing to fix: the difference is per-row cent rounding, inside the declared tolerance.";
    case "untagged_spend":
      return "Attach the missing tags at the call site (business unit / cost centre / feature) and re-export the ledger, then re-run the close.";
    case "period_boundary":
      return "Align the ledger export and the invoice window to the same timezone/boundary (or bill the boundary rows in their own period), then re-run.";
    case "missing_usage":
      return "Find the usage rows the ledger never logged (a dropped batch, an exporter that failed, a service that logs late) and re-export; do not adjust the invoice.";
  }
}

/** A one-line verdict for a surface: what withholds the close, or that nothing does. */
export function summarizeReport(report: CloseReport): string {
  if (report.closeReady) {
    return `Close-ready: the ledger recomputes to ${formatMicros(report.recomputedTotalMicroUsd)} against an invoice of ${formatMicros(report.invoiceTotalMicroUsd)}, with no unattributed usage and no unmatched bucket.`;
  }
  return `Not close-ready — ${report.blockers.length} rule${report.blockers.length === 1 ? "" : "s"} withhold the close: ${report.blockers.join(", ")}.`;
}

/** Re-exported for callers that only need a line's identity. */
export { lineKey };

/** Convenience: the invoice lines a caller gets back from the extraction layer are validated here. */
export function assertInvoiceLines(lines: readonly InvoiceLine[]): void {
  if (lines.length === 0) {
    throw new SpendProofFieldError(
      "sp-field-missing",
      "invoice.lines",
      "The invoice carries no line items. Nothing was reconciled.",
    );
  }
}
