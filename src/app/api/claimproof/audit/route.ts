import { NextRequest, NextResponse } from "next/server";
import {
  auditClaim,
  ClaimProofExtractionUnavailableError,
  ClaimProofFieldError,
  extractClaim,
  readClaimRecord,
  resolveExtractionCredentials,
  scheduleBySlug,
  type ExtractionCredentials,
  type ExtractionTransport,
  type SourceDocument,
} from "@/lib/calc/claimproof";

/**
 * ClaimProof — the warranty-labour short-payment audit endpoint.
 *
 * Accepts the two documents EITHER as declared fields (`declared`, the deterministic path that needs
 * no model) OR as documents (`claimText`/`claimBase64` + `remittanceText`/`remittanceBase64`, the
 * extraction path). The schedule selector `scheduleSlug` names the vendored schedule.
 *
 * Status codes: 400 `claimproof-document-missing` when no input is supplied (also the documented
 * side-effect-free probe: POST {} answers 400); 400 `cp-schedule-unknown` for a non-vendored
 * schedule; 503 `claimproof-extraction-unavailable` when the document path runs on a deploy with no
 * model key (never Gemini — retired 2026-11-02); 422 when a document cannot be read as declared
 * fields; 200 with `blocked` otherwise. Writes NOTHING — no telemetry on any path.
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

function unavailable(error: ClaimProofExtractionUnavailableError) {
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

function resolveDocuments(body: Record<string, unknown>): {
  kind: "none" | "declared" | "documents";
  declared?: Record<string, unknown>;
  claim?: SourceDocument;
  remittance?: SourceDocument;
  error?: { ruleId: string; message: string };
} {
  const declared = body.declared;
  if (declared && typeof declared === "object" && !Array.isArray(declared)) {
    return { kind: "declared", declared: declared as Record<string, unknown> };
  }

  const claimText = textOrEmpty(body.claimText);
  const claimBase64 = textOrEmpty(body.claimBase64);
  const remittanceText = textOrEmpty(body.remittanceText);
  const remittanceBase64 = textOrEmpty(body.remittanceBase64);

  if (!claimText && !claimBase64 && !remittanceText && !remittanceBase64) {
    return {
      kind: "none",
      error: {
        ruleId: "claimproof-document-missing",
        message:
          "No document was supplied. Send `declared` (the claim + payment as declared fields) or the two documents (`claimText`/`claimBase64` + `remittanceText`/`remittanceBase64`). Nothing was audited.",
      },
    };
  }
  if ((claimText && claimBase64) || (remittanceText && remittanceBase64)) {
    return {
      kind: "documents",
      error: {
        ruleId: "cp-document-ambiguous",
        message: "Supply EITHER text OR base64 for each document, not both. Nothing was audited.",
      },
    };
  }
  if ((!claimText && !claimBase64) || (!remittanceText && !remittanceBase64)) {
    return {
      kind: "documents",
      error: {
        ruleId: "claimproof-document-missing",
        message:
          "Both documents are required: the filed claim and the remittance / payment advice. Nothing was audited.",
      },
    };
  }

  const claim: SourceDocument = claimText
    ? { text: claimText, name: "filed-claim" }
    : {
        base64: claimBase64,
        name: textOrEmpty(body.claimName) || "filed-claim.pdf",
        contentType: textOrEmpty(body.claimMimeType) || "application/pdf",
      };
  const remittance: SourceDocument = remittanceText
    ? { text: remittanceText, name: "remittance" }
    : {
        base64: remittanceBase64,
        name: textOrEmpty(body.remittanceName) || "remittance.pdf",
        contentType: textOrEmpty(body.remittanceMimeType) || "application/pdf",
      };

  return { kind: "documents", claim, remittance };
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "The request body is not JSON. Nothing was audited.", ruleId: "claimproof-document-missing" },
      { status: 400 },
    );
  }

  const documents = resolveDocuments(body);
  if (documents.error) {
    return NextResponse.json(
      { error: documents.error.message, ruleId: documents.error.ruleId },
      { status: 400 },
    );
  }

  const scheduleSlug = textOrEmpty(body.scheduleSlug);
  if (!scheduleSlug) {
    return NextResponse.json(
      {
        error: "`scheduleSlug` is required: name the vendored schedule to audit against (e.g. `truemfg@2022-06`). Nothing was audited.",
        ruleId: "cp-schedule-missing",
        fieldPath: "scheduleSlug",
      },
      { status: 400 },
    );
  }

  let schedule;
  try {
    schedule = scheduleBySlug(scheduleSlug);
  } catch (error) {
    if (error instanceof ClaimProofFieldError) {
      return NextResponse.json(
        { error: error.message, ruleId: error.ruleId, fieldPath: error.fieldPath },
        { status: 400 },
      );
    }
    throw error;
  }

  if (documents.kind === "declared") {
    const record = readClaimRecord(documents.declared);
    if (record.blocked) {
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: "The declared fields could not be read into a claim; the audit is withheld.",
          ruleId: record.findings[0]?.ruleId ?? "cp-extraction-unstated",
          findings: record.findings,
          labels: record.labels,
        },
        { status: 422 },
      );
    }
    const claim = { ...record.claim, oemSlug: scheduleSlug };
    const report = auditClaim(claim, schedule, record.payment);
    return NextResponse.json({
      ok: true,
      blocked: report.blockedLineCount > 0 || report.staleSchedule,
      data: {
        report,
        labels: record.labels,
        note: "Every figure was computed by the deterministic engine; declared fields were read, never derived.",
      },
    });
  }

  // Document path: the model reads the two documents into the declared field set.
  let credentials: ExtractionCredentials;
  try {
    credentials = resolveExtractionCredentials();
  } catch (error) {
    if (error instanceof ClaimProofExtractionUnavailableError) return unavailable(error);
    throw error;
  }

  for (const [name, value] of [
    ["claimBase64", body.claimBase64],
    ["remittanceBase64", body.remittanceBase64],
  ] as const) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text.length > MAX_DOCUMENT_BASE64_CHARS) {
      return NextResponse.json(
        {
          error: `\`${name}\` is ${text.length} characters, above the ${MAX_DOCUMENT_BASE64_CHARS}-character ceiling this route accepts. It was NOT truncated. Nothing was audited.`,
          ruleId: "cp-document-too-large",
          fieldPath: name,
        },
        { status: 400 },
      );
    }
  }

  try {
    const extracted = await extractClaim({
      documents: {
        claim: documents.claim as SourceDocument,
        remittance: documents.remittance as SourceDocument,
      },
      schedule,
      credentials,
      transport: serviceExtractionTransport,
    });

    if (extracted.blocked) {
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: "The documents could not be read as declared fields; the audit is withheld.",
          ruleId: extracted.findings[0]?.ruleId ?? "cp-extraction-unstated",
          findings: extracted.findings,
          labels: extracted.labels,
        },
        { status: 422 },
      );
    }

    const claim = { ...extracted.claim, oemSlug: scheduleSlug };
    const report = auditClaim(claim, schedule, extracted.payment);
    return NextResponse.json({
      ok: true,
      blocked: report.blockedLineCount > 0 || report.staleSchedule,
      data: {
        report,
        labels: extracted.labels,
        note: "Every figure was computed by the deterministic engine; the reader filled declared fields only and an unreadable field blocked the run.",
      },
    });
  } catch (error) {
    if (error instanceof ClaimProofExtractionUnavailableError) return unavailable(error);
    if (error instanceof ClaimProofFieldError) {
      return NextResponse.json(
        { error: error.message, ruleId: error.ruleId, fieldPath: error.fieldPath },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ClaimProof audit failed" },
      { status: 500 },
    );
  }
}
