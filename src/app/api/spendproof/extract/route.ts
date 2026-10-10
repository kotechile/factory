import { NextRequest, NextResponse } from "next/server";
import {
  DECLARED_FIELD_SET,
  ExtractionUnavailableError,
  SpendProofFieldError,
  extractStructuredFields,
  labelledFields,
  parseDocumentText,
  parseLedgerCsv,
  reconcileInvoice,
  resolveExtractionCredentials,
  toInvoiceFromExtraction,
  type ExtractedInvoiceRecord,
  type ExtractionCredentials,
  type ExtractionTransport,
} from "@/lib/calc/spendproof";

/**
 * SpendProof — the extraction endpoint (the free preview's "read my PDF invoice" half).
 *
 * This route is where the model lives, and it is the ONLY place the extraction keys are read: they
 * are resolved server-side from the deploy env and never reach the browser (no new secret surface,
 * `context/tech_stack_capabilities.md` §2.5).
 *
 * The deploy carries no model key and no document-parse key until the owner adds one, so the live
 * behaviour today is the explicit 503 below — the loud door, not a stub: no fabricated field, no
 * degraded substitute (AGENTS.md rule 5). The deterministic reconciliation never depends on it: the
 * browser preview reconciles the provider's own line-item export with the engine running locally.
 *
 * Writes NOTHING: no telemetry and no usage row, on any path, so probing it cannot pollute a metric.
 */
const serviceExtractionTransport: ExtractionTransport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  return { ok: response.ok, status: response.status, text: () => response.text() };
};

function resolveCredentials():
  | { ok: true; credentials: ExtractionCredentials }
  | { ok: false; body: Record<string, unknown> } {
  try {
    return { ok: true, credentials: resolveExtractionCredentials() };
  } catch (error) {
    if (!(error instanceof ExtractionUnavailableError)) throw error;
    return {
      ok: false,
      body: {
        error: error.message,
        code: error.code,
        ruleId: error.ruleId,
        missing: error.missing,
        declaredFields: [...DECLARED_FIELD_SET],
      },
    };
  }
}

export async function POST(req: NextRequest) {
  const resolved = resolveCredentials();
  if (!resolved.ok) {
    // The owner's action, not the build's: the deploy needs a model key and a document-parse key.
    return NextResponse.json(resolved.body, { status: 503 });
  }

  try {
    const body = (await req.json()) as {
      documentText?: unknown;
      documentName?: unknown;
      ledger?: unknown;
      tolerance_bps?: unknown;
    };

    const documentText =
      typeof body.documentText === "string" && body.documentText.trim()
        ? body.documentText
        : null;
    if (!documentText) {
      return NextResponse.json(
        {
          error:
            "`documentText` is required and must be the invoice document's text. Nothing was extracted.",
          ruleId: "sp-field-missing",
          fieldPath: "documentText",
        },
        { status: 400 },
      );
    }

    const documentName =
      typeof body.documentName === "string" && body.documentName.trim()
        ? body.documentName.trim()
        : "provider-invoice";

    let record: ExtractedInvoiceRecord;
    try {
      const parsedText = await parseDocumentText({
        documentText,
        documentName,
        credentials: resolved.credentials,
        transport: serviceExtractionTransport,
      });
      record = await extractStructuredFields({
        documentText: parsedText,
        credentials: resolved.credentials,
        transport: serviceExtractionTransport,
      });
    } catch (extractionError) {
      return NextResponse.json(
        {
          error:
            extractionError instanceof Error
              ? extractionError.message
              : "The extraction failed.",
          ruleId: "sp-extraction-unavailable",
        },
        { status: 502 },
      );
    }

    const extracted = toInvoiceFromExtraction(record);
    const labels = labelledFields(record);

    if (extracted.blocked || !extracted.invoice) {
      // 422, not a partial invoice: an unreadable region or an unstated field withholds the verdict.
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: "The invoice could not be read as declared fields; the verdict is withheld.",
          ruleId: extracted.findings[0]?.ruleId,
          findings: extracted.findings,
          labels,
        },
        { status: 422 },
      );
    }

    if (typeof body.ledger === "string" && body.ledger.trim()) {
      const ledgerIngest = parseLedgerCsv(body.ledger);
      const report = reconcileInvoice({
        invoice: extracted.invoice,
        ledger: ledgerIngest.ledger,
        ...(typeof body.tolerance_bps === "number" ? { toleranceBps: body.tolerance_bps } : {}),
      });
      return NextResponse.json({ ok: true, blocked: false, data: { report, labels } });
    }

    return NextResponse.json({
      ok: true,
      blocked: false,
      data: {
        labels,
        declaredFields: [...DECLARED_FIELD_SET],
        unreadableRegions: record.unreadableRegions,
        note: "Read as declared fields. Supply a ledger to reconcile this invoice against your tagged usage.",
      },
    });
  } catch (error) {
    if (error instanceof SpendProofFieldError) {
      return NextResponse.json(
        { error: error.message, ruleId: error.ruleId, fieldPath: error.fieldPath },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SpendProof extraction failed" },
      { status: 500 },
    );
  }
}
