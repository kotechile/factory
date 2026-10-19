import { NextRequest, NextResponse } from "next/server";
import {
  RatchetProofExtractionUnavailableError,
  RatchetProofFieldError,
  auditDemandBilling,
  extractBills,
  extractTariff,
  parseBillsCsv,
  parseIntervalFile,
  parseTariffJson,
  resolveExtractionCredentials,
  unreadableRegionFindings,
  type BillRecord,
  type ExtractionTransport,
  type Finding,
  type PeakHistoryEntry,
  type Tariff,
} from "@/lib/calc/ratchetproof";

/**
 * RatchetProof — the document audit endpoint.
 *
 * This route is where the model lives, and it is the ONLY place the extraction keys are read: they are
 * resolved server-side from the deploy env and never reach the browser.
 *
 * It accepts the tariff and the bills EITHER as text (what the page's paste boxes send) OR as documents
 * (`*Base64` + a file name). The text path makes no parse call and needs no parse key; a document path
 * goes through the parse service's upload → poll → markdown flow and, without a key, refuses loudly by
 * name (AGENTS.md rule 5). Interval data is always text (CSV or Green Button XML) — it is the meter's
 * own export, not a document to read.
 *
 * Status codes: 503 when the deploy carries no model key (or no parse key on a document path), 400 on
 * a malformed request or an interval file the engine refuses, 422 when a document could not be read as
 * declared fields. A month blocked by an unstated clause is a 200 with `blocked: true`: the report IS
 * the deliverable, and it says which month is withheld and why.
 *
 * Writes NOTHING: no telemetry and no usage row on any path, so probing it cannot pollute a metric.
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

function unavailable(error: RatchetProofExtractionUnavailableError) {
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

export async function POST(req: NextRequest) {
  let credentials;
  try {
    credentials = resolveExtractionCredentials();
  } catch (error) {
    if (error instanceof RatchetProofExtractionUnavailableError) return unavailable(error);
    throw error;
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const intervalText = typeof body.intervalText === "string" ? body.intervalText.trim() : "";
    if (!intervalText) {
      return NextResponse.json(
        {
          error:
            "Supply the interval data as `intervalText` (the meter export's CSV or Green Button XML). Nothing was audited.",
          ruleId: "rp-intervals-empty",
          fieldPath: "intervalText",
        },
        { status: 400 },
      );
    }

    const tariffText = typeof body.tariffText === "string" ? body.tariffText.trim() : "";
    const tariffBase64 = typeof body.tariffBase64 === "string" ? body.tariffBase64.trim() : "";
    if (tariffText && tariffBase64) {
      return NextResponse.json(
        {
          error: "Supply EITHER `tariffText` OR `tariffBase64`, not both. Nothing was audited.",
          ruleId: "rp-document-ambiguous",
          fieldPath: "tariffText",
        },
        { status: 400 },
      );
    }
    if (!tariffText && !tariffBase64) {
      return NextResponse.json(
        {
          error:
            "Supply the tariff as `tariffText` (a declared JSON clause set) or `tariffBase64` (the tariff PDF). Nothing was audited.",
          ruleId: "rp-tariff-missing",
          fieldPath: "tariffText",
        },
        { status: 400 },
      );
    }
    for (const [name, value] of [
      ["tariffBase64", tariffBase64],
      ["billsBase64", typeof body.billsBase64 === "string" ? body.billsBase64.trim() : ""],
    ] as const) {
      if (value.length > MAX_DOCUMENT_BASE64_CHARS) {
        return NextResponse.json(
          {
            error: `\`${name}\` is ${value.length} characters, above the ${MAX_DOCUMENT_BASE64_CHARS}-character ceiling this route accepts. It was NOT truncated. Nothing was audited.`,
            ruleId: "rp-document-too-large",
            fieldPath: name,
          },
          { status: 400 },
        );
      }
    }

    const labels: string[] = [];
    const blockingFindings: Finding[] = [];

    let tariff: Tariff;
    if (tariffText) {
      tariff = parseTariffJson(tariffText);
    } else {
      const extracted = await extractTariff({
        document: {
          base64: tariffBase64,
          name: typeof body.tariffName === "string" && body.tariffName.trim() ? body.tariffName.trim() : "tariff.pdf",
          contentType:
            typeof body.tariffMimeType === "string" && body.tariffMimeType.trim()
              ? body.tariffMimeType.trim()
              : "application/pdf",
        },
        credentials,
        transport: serviceExtractionTransport,
      });
      tariff = extracted.tariff;
      labels.push(...extracted.labels);
      blockingFindings.push(...unreadableRegionFindings(extracted.unreadableRegions));
    }

    const billsText = typeof body.billsText === "string" ? body.billsText.trim() : "";
    const billsBase64 = typeof body.billsBase64 === "string" ? body.billsBase64.trim() : "";
    if (billsText && billsBase64) {
      return NextResponse.json(
        {
          error: "Supply EITHER `billsText` OR `billsBase64`, not both. Nothing was audited.",
          ruleId: "rp-document-ambiguous",
          fieldPath: "billsText",
        },
        { status: 400 },
      );
    }
    let bills: BillRecord[];
    if (billsText) {
      bills = parseBillsCsv(billsText);
    } else if (billsBase64) {
      const billCount = Array.isArray(body.billMonths) ? body.billMonths.length : 12;
      const extracted = await extractBills({
        document: {
          base64: billsBase64,
          name: typeof body.billsName === "string" && body.billsName.trim() ? body.billsName.trim() : "bills.pdf",
          contentType:
            typeof body.billsMimeType === "string" && body.billsMimeType.trim()
              ? body.billsMimeType.trim()
              : "application/pdf",
        },
        billCount,
        credentials,
        transport: serviceExtractionTransport,
      });
      bills = extracted.bills;
      labels.push(...extracted.labels);
      blockingFindings.push(...unreadableRegionFindings(extracted.unreadableRegions));
    } else {
      return NextResponse.json(
        {
          error:
            "Supply the bills as `billsText` (the bill figures as CSV) or `billsBase64` (the bill PDFs). Nothing was audited.",
          ruleId: "rp-bill-missing",
          fieldPath: "billsText",
        },
        { status: 400 },
      );
    }

    if (blockingFindings.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error: "The documents could not be read as declared fields; the audit is withheld.",
          ruleId: blockingFindings[0]?.ruleId,
          findings: blockingFindings,
          labels,
        },
        { status: 422 },
      );
    }

    const parsed = parseIntervalFile(intervalText);
    const seedHistory = Array.isArray(body.seedHistory)
      ? (body.seedHistory as PeakHistoryEntry[])
      : [];

    const report = auditDemandBilling({
      tariff,
      meters: parsed.meters,
      bills,
      seedHistory,
    });

    return NextResponse.json({
      ok: true,
      blocked: report.blocked,
      data: {
        report,
        labels: [...labels, ...report.labels],
        format: parsed.format,
        unmappedColumns: parsed.unmappedColumns,
        note: "Every number in this report was computed by the deterministic engine. The reader filled declared fields only; a field it could not read blocked the month it affects.",
      },
    });
  } catch (error) {
    if (error instanceof RatchetProofExtractionUnavailableError) return unavailable(error);
    if (error instanceof RatchetProofFieldError) {
      return NextResponse.json(
        { error: error.message, ruleId: error.ruleId, fieldPath: error.fieldPath },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "RatchetProof audit failed",
      },
      { status: 500 },
    );
  }
}
