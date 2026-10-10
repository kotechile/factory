import { describe, expect, it } from "vitest";

import {
  EXTRACTION_RECORD_EXAMPLE,
  EXTRACTION_RECORD_KEYS,
  IMPLEMENTED_RULE_IDS,
  PARSE_MAX_DOCUMENT_BYTES,
  PARSE_UPLOAD_ENDPOINT,
  SPENDPROOF_SCENARIOS,
  ExtractionUnavailableError,
  buildCoverage,
  buildExtractionPrompt,
  chargeFromDeclaredRate,
  decodeBase64Document,
  extractStructuredFields,
  formatMicros,
  labelledFields,
  parseDocumentToText,
  parseJobEndpoint,
  parseLedgerCsv,
  parseResultEndpoint,
  parseUsdToMicros,
  readExtractionPayload,
  readStructuredJsonFromModelResponse,
  reconcileCsv,
  reconcileInvoice,
  requireParseKey,
  resolveExtractionCredentials,
  roundingToleranceMicros,
  scenarioByKey,
  toInvoiceFromExtraction,
  type ExtractedInvoiceRecord,
  type ExtractionTransport,
  type ExtractionTransportRequest,
  type ExtractionTransportResponse,
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
    // fabricated field, no degraded substitute. A TEXT run needs only the model key; a DOCUMENT run
    // is where the parse key is required, and that is where the loud door now stands.
    expect(() => resolveExtractionCredentials({})).toThrow(ExtractionUnavailableError);
    const modelOnly = resolveExtractionCredentials({ GEMINI_API_KEY: "present-but-not-enough" });
    expect(modelOnly.parseKey).toBeNull();
    try {
      requireParseKey(modelOnly);
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

/** A transport stub — this file makes no network call. It records every request it is handed. */
function stubTransport(
  answer: (
    request: ExtractionTransportRequest,
    index: number,
  ) => ExtractionTransportResponse | Promise<ExtractionTransportResponse>,
): { transport: ExtractionTransport; calls: ExtractionTransportRequest[] } {
  const calls: ExtractionTransportRequest[] = [];
  const transport: ExtractionTransport = async (request) => {
    calls.push(request);
    return answer(request, calls.length - 1);
  };
  return { transport, calls };
}

function jsonResponse(body: unknown, status = 200): ExtractionTransportResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

/** The document-parse service's response at each of its three steps, measured against the live API. */
const PARSE_UPLOAD_RECEIPT = { id: "job-7", status: "PENDING", error_code: null, error_message: null };
const PARSED_MARKDOWN =
  "# Invoice\n\n| service | amount |\n| --- | --- |\n| Responses API | 180.00 |\n";
const MODEL_ANSWER = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              provider: { value: "openai", provenance: "extracted" },
              lines: [],
            }),
          },
        ],
      },
    },
  ],
};

const CREDENTIALS = { modelKey: "model", parseKey: "parse", model: "gemini-3.1-pro-preview" };

describe("SpendProof — extraction contract", () => {
  it("requires the model key, and leaves the parse key optional for a text run", () => {
    expect(() => resolveExtractionCredentials({})).toThrow(ExtractionUnavailableError);
    expect(() =>
      resolveExtractionCredentials({ SPENDPROOF_PARSE_KEY: "parse-only" }),
    ).toThrow(/SPENDPROOF_EXTRACTION_MODEL_KEY/);
    // A text run does not touch the parse service, so requiring the parse key would refuse work that
    // does not use it. The document path is where the loud door lives (requireParseKey below).
    const textOnly = resolveExtractionCredentials({ GEMINI_API_KEY: "model" });
    expect(textOnly.modelKey).toBe("model");
    expect(textOnly.parseKey).toBeNull();
    expect(() => requireParseKey(textOnly)).toThrow(/SPENDPROOF_PARSE_KEY/);
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

  it("returns pasted text as-is without calling the parse service", async () => {
    const { transport, calls } = stubTransport(() => jsonResponse({}));
    const text = await parseDocumentToText({
      document: { text: "  OpenAI LLC invoice  ", name: "provider-invoice" },
      credentials: { modelKey: "model", parseKey: null, model: "gemini-3.1-pro-preview" },
      transport,
    });
    expect(text).toBe("OpenAI LLC invoice");
    // A paid third-party call that adds nothing is a defect: zero transport calls for text input.
    expect(calls).toEqual([]);
  });

  it("walks upload -> poll -> result for a document, and feeds the model the PARSED text, never the job receipt", async () => {
    let polls = 0;
    const { transport, calls } = stubTransport((request) => {
      if (request.url === PARSE_UPLOAD_ENDPOINT) return jsonResponse(PARSE_UPLOAD_RECEIPT);
      if (request.url === parseJobEndpoint("job-7")) {
        polls += 1;
        return jsonResponse({ status: polls < 2 ? "PENDING" : "SUCCESS" });
      }
      if (request.url === parseResultEndpoint("job-7")) return jsonResponse({ markdown: PARSED_MARKDOWN });
      return jsonResponse(MODEL_ANSWER);
    });

    const parsed = await parseDocumentToText({
      document: {
        base64: Buffer.from("%PDF-1.4 invoice bytes").toString("base64"),
        name: "invoice.pdf",
        contentType: "application/pdf",
      },
      credentials: CREDENTIALS,
      transport,
      pollIntervalMs: 0,
    });

    expect(parsed).toBe(PARSED_MARKDOWN);
    expect(polls).toBe(2);

    // Step 1 is a MULTIPART FILE UPLOAD. A JSON body here is exactly the defect this guards.
    const upload = calls[0];
    expect(upload.method).toBe("POST");
    expect(upload.upload?.field).toBe("file");
    expect(upload.upload?.filename).toBe("invoice.pdf");
    expect(upload.upload?.contentType).toBe("application/pdf");
    expect(Buffer.from(upload.upload?.bytes ?? []).toString()).toBe("%PDF-1.4 invoice bytes");
    expect(upload.body).toBeUndefined();
    // …and the request carries NO content-type of its own: `fetch` sets it with the multipart boundary.
    expect(Object.keys(upload.headers)).toEqual(["Authorization"]);
    expect(calls[1].method).toBe("GET");
    expect(calls[2].url).toBe(parseJobEndpoint("job-7"));
    expect(calls[3].url).toBe(parseResultEndpoint("job-7"));

    // The model must be asked to read the invoice, not the receipt that says a job was queued.
    const record = await extractStructuredFields({
      documentText: parsed,
      credentials: CREDENTIALS,
      transport,
    });
    const modelCall = calls[calls.length - 1];
    const sent = JSON.parse(String(modelCall.body)).contents[0].parts[0].text as string;
    expect(sent).toContain("Responses API");
    expect(sent).not.toContain("PENDING");
    expect(sent).not.toContain("job-7");
    expect(record.provider.value).toBe("openai");
  });

  it("refuses a document it cannot parse instead of substituting the document's bytes for its text", async () => {
    const { transport, calls } = stubTransport((request) => {
      if (request.url === PARSE_UPLOAD_ENDPOINT) {
        return jsonResponse({ id: "job-9", status: "PENDING" });
      }
      return jsonResponse({ status: "ERROR", error_message: "the scan is corrupt" });
    });
    await expect(
      parseDocumentToText({
        document: { base64: Buffer.from("not a pdf").toString("base64"), name: "broken.pdf" },
        credentials: CREDENTIALS,
        transport,
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow(/could not read the invoice \(the scan is corrupt\)/);
    // It stopped at the job status — it never asked the model to read the raw bytes.
    expect(calls).toHaveLength(2);
  });

  it("withholds the verdict when the parse never finishes, naming the last status", async () => {
    const { transport } = stubTransport((request) =>
      request.url === PARSE_UPLOAD_ENDPOINT
        ? jsonResponse({ id: "job-11", status: "PENDING" })
        : jsonResponse({ status: "PENDING" }),
    );
    await expect(
      parseDocumentToText({
        document: { base64: Buffer.from("slow").toString("base64"), name: "slow.pdf" },
        credentials: CREDENTIALS,
        transport,
        pollIntervalMs: 0,
        maxPollAttempts: 4,
      }),
    ).rejects.toThrow(/last status PENDING after 4 polls/);
  });

  it("refuses a document when the deploy has no parse key, naming the variable", async () => {
    const { transport, calls } = stubTransport(() => jsonResponse({}));
    await expect(
      parseDocumentToText({
        document: { base64: Buffer.from("pdf").toString("base64"), name: "invoice.pdf" },
        credentials: { modelKey: "model", parseKey: null, model: "gemini-3.1-pro-preview" },
        transport,
      }),
    ).rejects.toThrow(/SPENDPROOF_PARSE_KEY or LLAMAPARSE_API_KEY/);
    expect(calls).toEqual([]);
  });

  it("refuses malformed base64 and a document above the declared ceiling — it never truncates", async () => {
    expect(() => decodeBase64Document("not*base64!")).toThrow(/not valid base64/);
    const overCeiling = Buffer.alloc(PARSE_MAX_DOCUMENT_BYTES + 1, 0x41).toString("base64");
    const { transport } = stubTransport(() => jsonResponse(PARSE_UPLOAD_RECEIPT));
    await expect(
      parseDocumentToText({
        document: { base64: overCeiling, name: "huge.pdf" },
        credentials: CREDENTIALS,
        transport,
      }),
    ).rejects.toThrow(/above the 8388608-byte ceiling/);
  });

  it("refuses a parse result that carries no text", async () => {
    const { transport } = stubTransport((request) => {
      if (request.url === PARSE_UPLOAD_ENDPOINT) return jsonResponse({ id: "job-12", status: "PENDING" });
      if (request.url === parseJobEndpoint("job-12")) return jsonResponse({ status: "SUCCESS" });
      return jsonResponse({ markdown: "   " });
    });
    await expect(
      parseDocumentToText({
        document: { base64: Buffer.from("pdf").toString("base64"), name: "empty.pdf" },
        credentials: CREDENTIALS,
        transport,
        pollIntervalMs: 0,
      }),
    ).rejects.toThrow(/returned no text for the invoice/);
  });

  it("asks the model for the exact record the parser reads, with the units spelled out", () => {
    const prompt = buildExtractionPrompt("DOCUMENT-BODY");
    // One source for the shape: every key the parser reads must be named in the prompt.
    for (const key of EXTRACTION_RECORD_KEYS) {
      expect(prompt).toContain(key.replace(/^line\./, ""));
    }
    expect(prompt).toContain("micro-USD");
    expect(prompt).toContain("ONE JSON object");
    expect(prompt).toContain('"lines"');
    // The worked example has to teach the unit conversion, or the model answers in dollars.
    expect(EXTRACTION_RECORD_EXAMPLE).toContain("270000000");
    expect(EXTRACTION_RECORD_EXAMPLE).toContain("150000");
    expect(prompt.trimEnd().endsWith("DOCUMENT-BODY")).toBe(true);
  });

  it("reads a single object, a one-record array, and an object wrapped in prose", () => {
    const record = { provider: { value: "openai", provenance: "extracted" } };
    const envelope = (text: string) =>
      JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });
    expect(readStructuredJsonFromModelResponse(envelope(JSON.stringify(record)))).toEqual(record);
    expect(readStructuredJsonFromModelResponse(envelope(JSON.stringify([record])))).toEqual(record);
    expect(
      readStructuredJsonFromModelResponse(
        envelope("Here you go:\n```json\n" + JSON.stringify(record) + "\n```"),
      ),
    ).toEqual(record);
  });

  it("refuses an array of records instead of merging them — the per-line answer this model actually gives", () => {
    const perLine = [1, 2, 3].map((n) => ({ service: { value: `line${n}`, provenance: "extracted" } }));
    const envelope = JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(perLine) }] } }],
    });
    expect(() => readStructuredJsonFromModelResponse(envelope)).toThrow(
      /returned 3 records where ONE invoice record was required/,
    );
  });

  it("refuses a non-record payload and a body that is not JSON at all", () => {
    const envelope = (text: string) =>
      JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });
    expect(() => readStructuredJsonFromModelResponse(envelope('"just a string"'))).toThrow(
      /not an invoice record/,
    );
    expect(() => readStructuredJsonFromModelResponse("not json at all")).toThrow(
      /body that is not JSON/,
    );
  });

  it("carries the model's micro-USD record into the engine unconverted, and still blocks on an unstated field", () => {
    const record = readExtractionPayload(JSON.parse(EXTRACTION_RECORD_EXAMPLE)) as ExtractedInvoiceRecord;
    expect(record.totalMicroUsd).toEqual({ value: 270_000_000, provenance: "extracted" });
    expect(record.period.value).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(record.lines[0].unitPriceMicroUsdPerThousandUnits).toEqual({
      value: 150_000,
      provenance: "extracted",
    });
    expect(record.lines[0].amountMicroUsd).toEqual({ value: 180_000_000, provenance: "extracted" });
    // The example's `sku` is deliberately null+unstated: it teaches the model that a value it cannot
    // find is `unstated`, and the engine then withholds the verdict rather than inventing a SKU.
    expect(record.lines[0].sku).toEqual({ value: null, provenance: "unstated" });
    const result = toInvoiceFromExtraction(record);
    expect(result.blocked).toBe(true);
    expect(result.findings.some((finding) => finding.scope === "line1.sku")).toBe(true);
  });
});
