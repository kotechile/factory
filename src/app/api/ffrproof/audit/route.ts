import { NextRequest, NextResponse } from "next/server";
import {
  FFRProofExtractionUnavailableError,
  FFRProofFieldError,
  auditFfr,
  extractAwardTerms,
  extractDrawdown,
  parseApprovedBudgetCsv,
  parseGlExportCsv,
  readCompositeInput,
  readReport,
  resolveExtractionCredentials,
  toAuditInput,
  type ExtractionCredentials,
  type ExtractionTransport,
  type SourceDocument,
} from "@/lib/calc/ffrproof";

/**
 * FFRProof — the SF-425 federal financial report pre-flight audit endpoint.
 *
 * Accepts the inputs EITHER as a declared composite (`declared` — the deterministic path that needs
 * no model) OR as the two documents (`awardTermsText`/`awardTermsBase64` + `drawdownText`/
 * `drawdownBase64`) plus the declared report and the GL/budget CSVs. The report, GL export and
 * approved budget are ALWAYS caller-declared (the GL export is parsed deterministically from CSV,
 * never by a model); only the award terms and the drawdown statement are read by the extraction
 * layer.
 *
 * Status codes: 400 `ffrproof-documents-missing` when no input is supplied (also the documented
 * side-effect-free probe: POST {} answers 400); 503 `ffrproof-extraction-unavailable` when the
 * document path runs on a deploy with no model key (never Gemini — retired 2026-11-02); 422 when a
 * document cannot be read as declared fields; 200 with the report otherwise. Writes NOTHING — no
 * telemetry on any path.
 */
const MAX_DOCUMENT_BASE64_CHARS = 12 * 1024 * 1024;

const serviceExtractionTransport: ExtractionTransport = async (request) => {
  const init: RequestInit = { method: request.method, headers: request.headers };
  if (request.upload) {
    const source = request.upload.bytes;
    const arrayBuffer = new ArrayBuffer(source.byteLength);
    new Uint8Array(arrayBuffer).set(source);
    const form = new FormData();
    form.append(
      request.upload.field,
      new Blob([arrayBuffer], { type: request.upload.contentType }),
      request.upload.filename,
    );
    init.body = form;
  } else if (request.body !== undefined) {
    init.body = request.body;
  }
  const response = await fetch(request.url, init);
  return { ok: response.ok, status: response.status, text: () => response.text() };
};

function unavailable(error: FFRProofExtractionUnavailableError) {
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      ruleId: error.ruleId,
      missing: error.missing,
      note: "This is the deploy's configuration, not the request's: the key is the owner's action and no approval covers a credential.",
    },
    { status: 503 },
  );
}

function textOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "The request body is not JSON. Nothing was audited.", ruleId: "ffrproof-documents-missing" },
      { status: 400 },
    );
  }

  // Declared path: the full composite (report + declared award terms + declared drawdown + GL/budget
  // CSVs). Deterministic, no model key.
  const declared = body.declared;
  if (declared && typeof declared === "object" && !Array.isArray(declared)) {
    try {
      const composite = readCompositeInput(declared);
      const report = auditFfr(toAuditInput(composite));
      return NextResponse.json({
        ok: true,
        blocked: report.verdict === "blocked",
        data: {
          report,
          labels: composite.labels,
          note: "Every figure was computed by the deterministic engine; declared fields were read, never derived.",
        },
      });
    } catch (error) {
      if (error instanceof FFRProofFieldError) {
        return NextResponse.json(
          { error: error.message, ruleId: error.ruleId, fieldPath: error.fieldPath },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  // Document path: award terms + drawdown statement are read by the model.
  const awardTermsText = textOrEmpty(body.awardTermsText);
  const awardTermsBase64 = textOrEmpty(body.awardTermsBase64);
  const drawdownText = textOrEmpty(body.drawdownText);
  const drawdownBase64 = textOrEmpty(body.drawdownBase64);

  const hasAnyDocument = awardTermsText || awardTermsBase64 || drawdownText || drawdownBase64;
  if (!hasAnyDocument) {
    return NextResponse.json(
      {
        error:
          "No input was supplied. Send `declared` (the full composite as declared fields) or the documents (`awardTermsText`/`awardTermsBase64` + `drawdownText`/`drawdownBase64`) plus `report`, `glCsv` and `budgetCsv`. Nothing was audited.",
        ruleId: "ffrproof-documents-missing",
      },
      { status: 400 },
    );
  }
  if ((awardTermsText && awardTermsBase64) || (drawdownText && drawdownBase64)) {
    return NextResponse.json(
      {
        error: "Supply EITHER text OR base64 for each document, not both. Nothing was audited.",
        ruleId: "ffr-document-ambiguous",
      },
      { status: 400 },
    );
  }
  if (!awardTermsText && !awardTermsBase64) {
    return NextResponse.json(
      { error: "The award terms / notice of award is required. Nothing was audited.", ruleId: "ffrproof-documents-missing" },
      { status: 400 },
    );
  }
  if (!drawdownText && !drawdownBase64) {
    return NextResponse.json(
      { error: "The drawdown statement is required. Nothing was audited.", ruleId: "ffrproof-documents-missing" },
      { status: 400 },
    );
  }

  for (const [name, value] of [
    ["awardTermsBase64", body.awardTermsBase64],
    ["drawdownBase64", body.drawdownBase64],
  ] as const) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text.length > MAX_DOCUMENT_BASE64_CHARS) {
      return NextResponse.json(
        {
          error: `\`${name}\` is ${text.length} characters, above the ${MAX_DOCUMENT_BASE64_CHARS}-character ceiling this route accepts. It was NOT truncated. Nothing was audited.`,
          ruleId: "ffr-document-too-large",
          fieldPath: name,
        },
        { status: 400 },
      );
    }
  }

  const glCsv = textOrEmpty(body.glCsv);
  const budgetCsv = textOrEmpty(body.budgetCsv);
  if (!glCsv || !budgetCsv) {
    return NextResponse.json(
      {
        error: "The GL export (`glCsv`) and the approved budget (`budgetCsv`) are required. Nothing was audited.",
        ruleId: !glCsv ? "ffrproof-documents-missing" : "ffrproof-documents-missing",
        fieldPath: !glCsv ? "glCsv" : "budgetCsv",
      },
      { status: 400 },
    );
  }

  let credentials: ExtractionCredentials;
  try {
    credentials = resolveExtractionCredentials();
  } catch (error) {
    if (error instanceof FFRProofExtractionUnavailableError) return unavailable(error);
    throw error;
  }

  const awardTermsDoc: SourceDocument = awardTermsText
    ? { text: awardTermsText, name: "award-terms" }
    : {
        base64: awardTermsBase64,
        name: textOrEmpty(body.awardTermsName) || "award-terms.pdf",
        contentType: textOrEmpty(body.awardTermsMimeType) || "application/pdf",
      };
  const drawdownDoc: SourceDocument = drawdownText
    ? { text: drawdownText, name: "drawdown-statement" }
    : {
        base64: drawdownBase64,
        name: textOrEmpty(body.drawdownName) || "drawdown-statement.pdf",
        contentType: textOrEmpty(body.drawdownMimeType) || "application/pdf",
      };

  try {
    const [awardRecord, drawdownRecord] = await Promise.all([
      extractAwardTerms({ document: awardTermsDoc, credentials, transport: serviceExtractionTransport }),
      extractDrawdown({ document: drawdownDoc, credentials, transport: serviceExtractionTransport }),
    ]);

    if (awardRecord.blocked || drawdownRecord.blocked) {
      const findings = [...awardRecord.findings, ...drawdownRecord.findings];
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: "The documents could not be read as declared fields; the audit is withheld.",
          ruleId: findings[0]?.ruleId ?? "ffr-extraction-unstated",
          findings,
          labels: [...awardRecord.labels, ...drawdownRecord.labels],
        },
        { status: 422 },
      );
    }

    const report = auditFfr({
      report: readReport(body.report),
      drawdown: drawdownRecord.drawdown,
      awardTerms: awardRecord.awardTerms,
      glExport: parseGlExportCsv(glCsv).glExport,
      approvedBudget: parseApprovedBudgetCsv(budgetCsv).approvedBudget,
      priorReport: body.priorReport === null || body.priorReport === undefined ? null : readReport(body.priorReport),
    });

    return NextResponse.json({
      ok: true,
      blocked: report.verdict === "blocked",
      data: {
        report,
        labels: [...awardRecord.labels, ...drawdownRecord.labels],
        note: "Every figure was computed by the deterministic engine; the reader filled declared fields only and an unreadable field blocked the run.",
      },
    });
  } catch (error) {
    if (error instanceof FFRProofExtractionUnavailableError) return unavailable(error);
    if (error instanceof FFRProofFieldError) {
      return NextResponse.json(
        { error: error.message, ruleId: error.ruleId, fieldPath: error.fieldPath },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "FFRProof audit failed" },
      { status: 500 },
    );
  }
}
