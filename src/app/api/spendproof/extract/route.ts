import { NextRequest, NextResponse } from "next/server";
import {
  DECLARED_FIELD_SET,
  ExtractionUnavailableError,
  SpendProofFieldError,
  extractStructuredFields,
  labelledFields,
  parseDocumentToText,
  parseLedgerCsv,
  reconcileInvoice,
  resolveExtractionCredentials,
  toInvoiceFromExtraction,
  type ExtractedInvoiceRecord,
  type ExtractionCredentials,
  type ExtractionTransport,
} from "@/lib/calc/spendproof";

/**
 * SpendProof — the extraction endpoint (the free preview's "read my invoice" half).
 *
 * This route is where the model lives, and it is the ONLY place the extraction keys are read: they
 * are resolved server-side from the deploy env and never reach the browser (no new secret surface,
 * `context/tech_stack_capabilities.md` §2.5).
 *
 * It accepts the invoice EITHER as text (`documentText` — what the page's paste box sends) OR as a
 * document (`documentBase64` + `documentName` — a PDF or a scan the page read off the file picker).
 * The text path makes no parse call and needs no parse key; the document path goes through the
 * document-parse service's three-step flow and, without a key, refuses loudly by name (AGENTS.md
 * rule 5). `POST` answers 503 when the deploy carries no model key, 400 on a malformed request, 502
 * when a service refuses, and 422 when the reading itself withholds the verdict.
 *
 * Writes NOTHING: no telemetry and no usage row, on any path, so probing it cannot pollute a metric.
 */
/** The declared ceiling on the base64 the route will accept, mirroring the parse layer's 8 MiB. */
const MAX_DOCUMENT_BASE64_CHARS = 12 * 1024 * 1024;

const serviceExtractionTransport: ExtractionTransport = async (request) => {
  const init: RequestInit = { method: request.method, headers: request.headers };
  if (request.upload) {
    // Multipart, and Content-Type is deliberately absent from the headers: `fetch` must add it so the
    // multipart boundary matches the body. Setting it by hand is how a file upload silently 400s.
    // The bytes are copied into a plain ArrayBuffer so the Blob part is exactly the document's bytes.
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
    // The owner's action, not the build's: the deploy needs a model key.
    return NextResponse.json(resolved.body, { status: 503 });
  }

  try {
    const body = (await req.json()) as {
      documentText?: unknown;
      documentBase64?: unknown;
      documentName?: unknown;
      documentMimeType?: unknown;
      ledger?: unknown;
      tolerance_bps?: unknown;
    };

    const documentText =
      typeof body.documentText === "string" && body.documentText.trim()
        ? body.documentText
        : null;
    const documentBase64 =
      typeof body.documentBase64 === "string" && body.documentBase64.trim()
        ? body.documentBase64
        : null;

    if (documentText === null && documentBase64 === null) {
      return NextResponse.json(
        {
          error:
            "Supply the invoice: `documentText` (its text) or `documentBase64` (a PDF or scan, base64). Nothing was extracted.",
          ruleId: "sp-document-missing",
          fieldPath: "documentText",
        },
        { status: 400 },
      );
    }
    if (documentText !== null && documentBase64 !== null) {
      // Ambiguous, not merged: picking one silently would read a different document than the caller sent.
      return NextResponse.json(
        {
          error:
            "Supply EITHER `documentText` OR `documentBase64`, not both. Nothing was extracted.",
          ruleId: "sp-document-ambiguous",
          fieldPath: "documentText",
        },
        { status: 400 },
      );
    }
    if (documentBase64 !== null && documentBase64.length > MAX_DOCUMENT_BASE64_CHARS) {
      return NextResponse.json(
        {
          error: `\`documentBase64\` is ${documentBase64.length} characters, above the ${MAX_DOCUMENT_BASE64_CHARS}-character ceiling this route accepts. It was NOT truncated. Nothing was extracted.`,
          ruleId: "sp-document-too-large",
          fieldPath: "documentBase64",
        },
        { status: 400 },
      );
    }

    const documentName =
      typeof body.documentName === "string" && body.documentName.trim()
        ? body.documentName.trim()
        : "provider-invoice";
    const documentMimeType =
      typeof body.documentMimeType === "string" && body.documentMimeType.trim()
        ? body.documentMimeType.trim()
        : "application/pdf";

    let record: ExtractedInvoiceRecord;
    try {
      const parsedText = await parseDocumentToText({
        document:
          documentText !== null
            ? { text: documentText, name: documentName }
            : { base64: documentBase64 as string, name: documentName, contentType: documentMimeType },
        credentials: resolved.credentials,
        transport: serviceExtractionTransport,
      });
      record = await extractStructuredFields({
        documentText: parsedText,
        credentials: resolved.credentials,
        transport: serviceExtractionTransport,
      });
    } catch (extractionError) {
      // A missing CREDENTIAL is the owner's action (503, naming the variable); a service refusal is
      // this request's failure (502). Neither is ever a partially-read invoice.
      if (extractionError instanceof ExtractionUnavailableError) {
        return NextResponse.json(
          {
            error: extractionError.message,
            code: extractionError.code,
            ruleId: extractionError.ruleId,
            missing: extractionError.missing,
            declaredFields: [...DECLARED_FIELD_SET],
          },
          { status: 503 },
        );
      }
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
