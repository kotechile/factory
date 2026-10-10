import { describe, expect, it } from "vitest";

import {
  IMPLEMENTED_RULE_IDS,
  SPENDPROOF_SCENARIOS,
  ExtractionUnavailableError,
  buildCoverage,
  chargeFromDeclaredRate,
  formatMicros,
  labelledFields,
  parseLedgerCsv,
  parseUsdToMicros,
  readExtractionPayload,
  reconcileCsv,
  reconcileInvoice,
  resolveExtractionCredentials,
  roundingToleranceMicros,
  scenarioByKey,
  toInvoiceFromExtraction,
  type ExtractedInvoiceRecord,
  type ScenarioKey,
} from "./index";

/**
 * Known-answer vectors for the SpendProof reconciliation.
 *
 * The five the PRD names, in order: a clean pair produces ZERO findings; a mid-period rate change is
 * price drift and never a manufactured variance; a dropped run of usage rows undershoots and reports
 * the bucket unmatched; an untagged batch yields an `unattributed` finding that blocks the close; an
 * unreadable invoice region blocks rather than guesses.
 *
 * The first four run through `reconcileCsv` on the SAME fixtures the page ships, so a worked example
 * cannot drift from the vector it demonstrates. The fifth is the extraction layer's, and it is
 * asserted as the LOUD FAILURE it is — there is no stubbed key anywhere in this file.
 */

function scenario(key: ScenarioKey) {
  const found = scenarioByKey(key);
  if (!found) throw new Error(`missing scenario ${key}`);
  return found;
}

describe("SpendProof — the PRD's five vectors", () => {
  it("vector 1: a clean invoice/ledger pair produces ZERO findings and closes", () => {
    const clean = scenario("clean");
    const { report, unmappedColumns } = reconcileCsv({
      invoiceCsv: clean.invoiceCsv,
      ledgerCsv: clean.ledgerCsv,
    });

    expect(report.findings).toEqual([]);
    expect(report.closeReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.invoiceBalances).toBe(true);
    expect(report.invoiceLineSumMicroUsd).toBe(report.invoiceTotalMicroUsd);
    expect(report.recomputedTotalMicroUsd).toBe(report.invoiceTotalMicroUsd);
    expect(report.aggregateVarianceMicroUsd).toBe(0);
    expect(report.aggregateWithinTolerance).toBe(true);
    expect(report.untaggedQuantity).toBe(0);
    expect(report.lines).toHaveLength(1);
    expect(report.lines[0].taggedQuantity).toBe(1_000_000);
    expect(report.lines[0].buckets.map((bucket) => bucket.bucket)).toEqual(["payments"]);
    expect(report.lines[0].buckets[0].reconciled).toBe(true);
    expect(unmappedColumns.invoice).toEqual([]);
    expect(unmappedColumns.ledger).toEqual([]);
  });

  it("vector 2: a mid-period rate change is price drift, not a manufactured variance", () => {
    const drift = scenario("price-drift");
    const { report } = reconcileCsv({ invoiceCsv: drift.invoiceCsv, ledgerCsv: drift.ledgerCsv });

    const ruleIds = report.findings.map((finding) => finding.ruleId);
    expect(ruleIds).toContain("sp-price-drift");
    // The phantom variance this product exists to prevent: no missing-usage, no boundary, no
    // unmatched bucket may be reported for a two-rate period.
    expect(ruleIds).not.toContain("sp-missing-usage");
    expect(ruleIds).not.toContain("sp-period-overlap");
    expect(ruleIds).not.toContain("sp-bucket-unmatched");
    expect(ruleIds).not.toContain("sp-aggregate-unreconciled");
    expect(report.findings).toHaveLength(1);

    const line = report.lines[0];
    expect(line.kind).toBe("price_drift");
    // No single-rate recompute exists, so NO variance number is published at all.
    expect(line.recomputedMicroUsd).toBeNull();
    expect(line.varianceMicroUsd).toBeNull();
    expect(line.declaredUnitPrices).toEqual([2_500, 3_000]);
    // Buckets cannot be attributed without one rate — so none is invented.
    expect(line.buckets).toEqual([]);
    expect(report.closeReady).toBe(false);
    expect(report.blockers).toEqual(["sp-price-drift"]);
  });

  it("vector 3: a dropped run of usage rows undershoots and reports the bucket unmatched", () => {
    const dropped = scenario("dropped-usage");
    const { report } = reconcileCsv({
      invoiceCsv: dropped.invoiceCsv,
      ledgerCsv: dropped.ledgerCsv,
    });

    const missing = report.findings.find((finding) => finding.ruleId === "sp-missing-usage");
    expect(missing).toBeDefined();
    expect(missing?.kind).toBe("missing_usage");
    expect(missing?.severity).toBe("unmatched");
    expect(missing?.deltaMicroUsd).toBe(300_000); // $0.30 on a $3.00 line

    const bucketFinding = report.findings.find((finding) => finding.ruleId === "sp-bucket-unmatched");
    expect(bucketFinding?.scope).toContain("payments");
    expect(report.lines[0].buckets[0].reconciled).toBe(false);
    expect(report.lines[0].buckets[0].varianceMicroUsd).toBe(300_000);
    // The rate is NOT blamed: the engine recomputed at the invoice's own declared price.
    expect(report.lines[0].declaredUnitPrices).toEqual([3_000]);
    expect(report.lines[0].recomputedMicroUsd).toBe(2_700_000);
    expect(report.closeReady).toBe(false);
    expect(report.blockers).toEqual(["sp-bucket-unmatched", "sp-missing-usage"]);
  });

  it("vector 4: an untagged batch yields an unattributed finding that blocks a pass", () => {
    const untagged = scenario("untagged-batch");
    const { report } = reconcileCsv({
      invoiceCsv: untagged.invoiceCsv,
      ledgerCsv: untagged.ledgerCsv,
    });

    const finding = report.findings.find((candidate) => candidate.ruleId === "sp-untagged-spend");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("blocking");
    expect(finding?.kind).toBe("untagged_spend");
    expect(report.untaggedQuantity).toBe(100_000);
    expect(report.untaggedValueMicroUsd).toBe(300_000);
    expect(report.lines[0].kind).toBe("untagged_spend");
    expect(report.closeReady).toBe(false);
    expect(report.blockers).toContain("sp-untagged-spend");
    expect(report.closePack).toContain("untagged_quantity,100000");
  });

  it("vector 5: an unreadable invoice region blocks the verdict — it is never guessed", () => {
    // (a) The deploy has no key: the extraction refuses loudly, naming the variables. No stub, no
    // fabricated field, no degraded substitute.
    expect(() => resolveExtractionCredentials({})).toThrow(ExtractionUnavailableError);
    try {
      resolveExtractionCredentials({ GEMINI_API_KEY: "present-but-not-enough" });
      throw new Error("expected the missing document-parse key to be named");
    } catch (error) {
      expect(error).toBeInstanceOf(ExtractionUnavailableError);
      expect((error as ExtractionUnavailableError).missing[0]).toContain("SPENDPROOF_PARSE_KEY");
      expect((error as ExtractionUnavailableError).message).toContain("nothing was extracted");
    }

    // (b) Both credentials present: they resolve, and the model that reads the document still
    // computes nothing (the network step is injected, never stubbed into a fake extraction).
    const credentials = resolveExtractionCredentials({
      SPENDPROOF_EXTRACTION_MODEL_KEY: "model-key",
      SPENDPROOF_PARSE_KEY: "parse-key",
    });
    expect(credentials.modelKey).toBe("model-key");
    expect(credentials.parseKey).toBe("parse-key");

    // (c) A record with an unreadable region: blocked, no invoice reaches the engine.
    const unreadable = readExtractionPayload({
      provider: { value: "openai", provenance: "extracted" },
      period: { value: { start: "2026-09-01", end: "2026-09-30" }, provenance: "extracted" },
      currency: { value: "USD", provenance: "extracted" },
      totalMicroUsd: { value: 3_000_000, provenance: "extracted" },
      unreadableRegions: ["page 1, the line-item table"],
      lines: [
        {
          service: { value: "chat.completions", provenance: "extracted" },
          model: { value: "gpt-4o", provenance: "extracted" },
          sku: { value: "gpt-4o-input", provenance: "extracted" },
          quantity: { value: 1_000_000, provenance: "unreadable" },
          unitPriceMicroUsdPerThousandUnits: { value: 3_000, provenance: "unreadable" },
          amountMicroUsd: { value: 3_000_000, provenance: "extracted" },
        },
      ],
    });
    const unreadableResult = toInvoiceFromExtraction(unreadable);
    expect(unreadableResult.blocked).toBe(true);
    expect(unreadableResult.invoice).toBeNull();
    expect(unreadableResult.findings.some((finding) => finding.ruleId === "sp-extraction-unreadable")).toBe(true);
    expect(unreadableResult.findings.every((finding) => finding.severity === "blocking")).toBe(true);
  });

  it("vector 5b: an unstated amount blocks instead of being derived from quantity × unit price", () => {
    const record = readExtractionPayload({
      provider: { value: "openai", provenance: "extracted" },
      period: { value: { start: "2026-09-01", end: "2026-09-30" }, provenance: "extracted" },
      currency: { value: "USD", provenance: "extracted" },
      totalMicroUsd: { value: null, provenance: "unstated" },
      lines: [
        {
          service: { value: "chat.completions", provenance: "extracted" },
          model: { value: "gpt-4o", provenance: "extracted" },
          sku: { value: "gpt-4o-input", provenance: "extracted" },
          quantity: { value: 1_000_000, provenance: "extracted" },
          unitPriceMicroUsdPerThousandUnits: { value: 3_000, provenance: "extracted" },
          amountMicroUsd: { value: null, provenance: "unstated" },
        },
      ],
    });

    const result = toInvoiceFromExtraction(record);
    expect(result.blocked).toBe(true);
    // The quantity and the unit price are legible, and the engine STILL refuses to multiply them:
    // the amount is the number under audit, so deriving it would fabricate the evidence.
    expect(result.invoice).toBeNull();
    expect(
      result.findings.some(
        (finding) =>
          finding.ruleId === "sp-extraction-unstated" && finding.scope === "line1.amount",
      ),
    ).toBe(true);
    expect(result.findings.some((finding) => finding.scope === "totalMicroUsd")).toBe(true);
  });

  it("labels every extracted field, so a reader never has to guess the provenance", () => {
    const record = readExtractionPayload({
      provider: { value: "openai", provenance: "extracted" },
      period: { value: { start: "2026-09-01", end: "2026-09-30" }, provenance: "extracted" },
      currency: { value: "USD", provenance: "extracted" },
      totalMicroUsd: { value: 3_000_000, provenance: "extracted" },
      lines: [
        {
          service: { value: "chat.completions", provenance: "extracted" },
          model: { value: "gpt-4o", provenance: "extracted" },
          sku: { value: "gpt-4o-input", provenance: "extracted" },
          quantity: { value: 1_000_000, provenance: "extracted" },
          unitPriceMicroUsdPerThousandUnits: { value: 3_000, provenance: "extracted" },
          amountMicroUsd: { value: 3_000_000, provenance: "extracted" },
        },
      ],
    });

    const labels = labelledFields(record);
    expect(labels).toContain("provider=extracted");
    expect(labels).toContain("line1.quantity=extracted");
    expect(labels).toContain("line1.unit_price=extracted");
    expect(labels).toContain("line1.amount=extracted");
    // A field the reader claims to have extracted but left blank is NOT `extracted`.
    const hollow = readExtractionPayload({
      provider: { value: "", provenance: "extracted" },
    });
    expect(hollow.provider.provenance).toBe("unstated");
    const result = toInvoiceFromExtraction(hollow);
    expect(result.blocked).toBe(true);
  });
});

describe("SpendProof — the declared balancing invariants", () => {
  it("refuses an invoice whose own line items do not sum to its own printed total", () => {
    const unbalanced = reconcileInvoice({
      invoice: {
        provider: "openai",
        period: { start: "2026-09-01", end: "2026-09-30" },
        currency: "USD",
        totalMicroUsd: 3_000_000,
        lines: [
          {
            service: "chat.completions",
            model: "gpt-4o",
            sku: "gpt-4o-input",
            quantity: 600_000,
            unitPriceMicroUsdPerThousandUnits: 3_000,
            amountMicroUsd: 1_800_000,
          },
        ],
      },
      ledger: {
        rows: [
          {
            bucket: "payments",
            service: "chat.completions",
            model: "gpt-4o",
            sku: "gpt-4o-input",
            quantity: 600_000,
            timestamp: "2026-09-10T12:00:00Z",
          },
        ],
      },
    });

    const finding = unbalanced.findings.find((candidate) => candidate.ruleId === "sp-invoice-unbalanced");
    expect(finding?.severity).toBe("blocking");
    expect(finding?.deltaMicroUsd).toBe(1_200_000);
    expect(unbalanced.invoiceBalances).toBe(false);
    expect(unbalanced.closeReady).toBe(false);
  });

  it("classifies usage near a period edge as a boundary overlap, not lost usage", () => {
    const boundary = scenario("period-boundary");
    const { report } = reconcileCsv({
      invoiceCsv: boundary.invoiceCsv,
      ledgerCsv: boundary.ledgerCsv,
    });

    const ruleIds = report.findings.map((finding) => finding.ruleId);
    expect(ruleIds).toContain("sp-period-overlap");
    expect(ruleIds).not.toContain("sp-missing-usage");
    expect(report.lines[0].kind).toBe("period_boundary");
    expect(report.lines[0].boundaryQuantity).toBe(300_000);
    expect(report.lines[0].taggedQuantity).toBe(700_000);
  });

  it("treats a non-zero difference inside the per-row cent tolerance as rounding, and still closes", () => {
    // The provider rounded the line up a cent; two contributing rows means a cent is inside the
    // declared rounding tolerance. Reported, never a reason to withhold the close.
    const { report } = reconcileCsv({
      invoiceCsv: [
        "provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd",
        "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,1000000,0.003,3.01,3.01",
      ].join("\n"),
      ledgerCsv: [
        "bucket,service,model,sku,quantity,timestamp",
        "payments,chat.completions,gpt-4o,gpt-4o-input,600000,2026-09-10T12:00:00Z",
        "payments,chat.completions,gpt-4o,gpt-4o-input,400000,2026-09-20T12:00:00Z",
      ].join("\n"),
    });

    expect(report.lines[0].kind).toBe("rounding");
    expect(report.lines[0].varianceMicroUsd).toBe(10_000);
    expect(report.lines[0].buckets.every((bucket) => bucket.reconciled)).toBe(true);
    expect(report.findings.map((finding) => finding.ruleId)).toEqual(["sp-rounding-drift"]);
    expect(report.findings[0].severity).toBe("advisory");
    expect(report.closeReady).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("reports ledger usage the invoice never bills rather than dropping it", () => {
    const { report } = reconcileCsv({
      invoiceCsv: [
        "provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd",
        "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,1000000,0.003,3.00,3.00",
      ].join("\n"),
      ledgerCsv: [
        "bucket,service,model,sku,quantity,timestamp",
        "payments,chat.completions,gpt-4o,gpt-4o-input,1000000,2026-09-10T12:00:00Z",
        "payments,embeddings,text-embedding-3-small,embed-input,500000,2026-09-12T12:00:00Z",
      ].join("\n"),
    });

    const orphan = report.findings.find((finding) => finding.ruleId === "sp-ledger-orphan");
    expect(orphan?.severity).toBe("advisory");
    expect(orphan?.scope).toContain("text-embedding-3-small");
    expect(report.closeReady).toBe(true);
  });

  it("refuses a file it cannot read, naming the column and the row — never a partial reconcile", () => {
    expect(() =>
      reconcileCsv({
        invoiceCsv: [
          "provider,period_start,period_end,service,model,sku,quantity,unit_price_usd_per_thousand,amount_usd,invoice_total_usd",
          "openai,2026-09-01,2026-09-30,chat.completions,gpt-4o,gpt-4o-input,1000000,0.003,,3.00",
        ].join("\n"),
        ledgerCsv: "bucket,service,model,sku,quantity,timestamp",
      }),
    ).toThrow(/amount_usd/);

    expect(() => parseLedgerCsv("bucket,qty,timestamp\npayments,1000,2026-09-10")).toThrow(
      /missing the column/,
    );
  });

  it("is deterministic: two runs publish byte-identical close packs", () => {
    const clean = scenario("clean");
    const first = reconcileCsv({ invoiceCsv: clean.invoiceCsv, ledgerCsv: clean.ledgerCsv });
    const second = reconcileCsv({ invoiceCsv: clean.invoiceCsv, ledgerCsv: clean.ledgerCsv });
    expect(first.report.closePack).toBe(second.report.closePack);
    expect(first.report.closePack).not.toMatch(/\d{4}-\d{2}-\d{2}T/); // no clock in the artifact
    expect(first.report.provenance.computedBy).toBe("deterministic-engine");
  });

  it("publishes every rule id it can emit in its coverage statement", () => {
    const emitted = new Set<string>();
    for (const entry of SPENDPROOF_SCENARIOS) {
      const { report } = reconcileCsv({ invoiceCsv: entry.invoiceCsv, ledgerCsv: entry.ledgerCsv });
      report.findings.forEach((finding) => emitted.add(finding.ruleId));
    }
    emitted.add("sp-invoice-unbalanced");
    emitted.add("sp-ledger-orphan");
    for (const ruleId of emitted) {
      expect(IMPLEMENTED_RULE_IDS, `${ruleId} is emitted but not declared`).toContain(ruleId);
    }
    expect(buildCoverage().unsupportedFamilies.length).toBeGreaterThan(0);
  });
});

describe("SpendProof — money and rate arithmetic", () => {
  it("parses USD strings into exact micro-USD", () => {
    expect(parseUsdToMicros("3.00", "x")).toBe(3_000_000);
    expect(parseUsdToMicros("$1,234.56", "x")).toBe(1_234_560_000);
    expect(parseUsdToMicros("0.003", "x")).toBe(3_000);
    expect(parseUsdToMicros("-0.30", "x")).toBe(-300_000);
    expect(() => parseUsdToMicros("3 dollars", "amount_usd")).toThrow(/amount_usd/);
  });

  it("recomputes a line only from the rate the invoice itself declares", () => {
    expect(chargeFromDeclaredRate(1_000_000, 3_000, "x")).toBe(3_000_000);
    expect(chargeFromDeclaredRate(900_000, 3_000, "x")).toBe(2_700_000);
    expect(chargeFromDeclaredRate(400_000, 2_500, "x")).toBe(1_000_000);
    expect(() => chargeFromDeclaredRate(Number.MAX_SAFE_INTEGER, 3_000, "line.amount")).toThrow(
      /exact-integer range/,
    );
  });

  it("states its tolerances in the open", () => {
    expect(roundingToleranceMicros(2)).toBe(10_000); // half a cent per contributing ledger row
  });

  it("formats money once, at the point of display", () => {
    expect(formatMicros(3_000_000)).toBe("$3.00");
    expect(formatMicros(300_000)).toBe("$0.30");
    expect(formatMicros(-300_000)).toBe("-$0.30");
    expect(formatMicros(1_234_560_000)).toBe("$1,234.56");
  });
});

describe("SpendProof — extraction contract", () => {
  it("declares the field set and refuses to resolve half a credential pair", () => {
    expect(() => resolveExtractionCredentials({})).toThrow(ExtractionUnavailableError);
    expect(() =>
      resolveExtractionCredentials({ SPENDPROOF_PARSE_KEY: "parse-only" }),
    ).toThrow(/SPENDPROOF_EXTRACTION_MODEL_KEY/);
    const resolved = resolveExtractionCredentials({
      GEMINI_API_KEY: "model",
      LLAMAPARSE_API_KEY: "parse",
    });
    expect(resolved.modelKey).toBe("model");
    expect(resolved.parseKey).toBe("parse");
  });

  it("carries provenance per field so a blocked record is never a partial invoice", () => {
    const record = readExtractionPayload({
      provider: { value: "openai", provenance: "extracted" },
      lines: [],
    }) as ExtractedInvoiceRecord;
    expect(record.lines).toEqual([]);
    const result = toInvoiceFromExtraction(record);
    expect(result.blocked).toBe(true);
    expect(result.invoice).toBeNull();
  });
});
