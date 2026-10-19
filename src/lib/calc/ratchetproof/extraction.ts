/**
 * The extraction layer — IN FRONT of the engine, and extraction ONLY.
 *
 * A tariff and a set of bills arrive as PDFs. A document-parsing service turns them into text; a model
 * reads that text and fills the DECLARED FIELD SET below. That is the whole job. It never computes a
 * demand figure, never prices a carry-over, never decides a verdict, and never fills a gap.
 *
 * Rules enforced here (AGENTS.md rule 1, `context/tech_stack_capabilities.md` §2):
 *   1. EXTRACTION IS DECLARED. Every field carries `extracted|unreadable|unstated`, plus the page and
 *      the verbatim quote it was read from.
 *   2. FAILURE IS LOUD. A clause the reader cannot resolve is `unstated` and BLOCKS that month; a
 *      region it could not read withholds the whole run. There is no default and no estimate.
 *   3. THE NUMBER UNDER AUDIT IS NEVER DERIVED. If a bill does not print its billed demand, the reader
 *      does NOT recompute it from the tariff — the printed figure is the evidence being audited.
 *   4. NO NEW SECRET SURFACE. Keys are read from the deploy env, server-side only, and their absence is
 *      a 503 naming the variable. Nothing here is ever shipped to the browser.
 *   5. THE PARSE CONTRACT IS THE SERVICE'S REAL ONE: multipart upload → poll the job → fetch the
 *      markdown result. The upload response is a RECEIPT, not the document's text.
 */
import { parseScaledDecimal } from "./money";
import { parseTariffJson } from "./csv";
import type { BillRecord, Finding, Tariff } from "./types";

/** The declared tariff field set — the only things a reader may produce. */
export const DECLARED_TARIFF_FIELDS = [
  "utility",
  "schedule",
  "voltageClass",
  "demandRates",
  "ratchetPercent",
  "ratchetLookbackMonths",
  "billingWindow",
  "intervalMinutes",
  "contractMinimumKw",
] as const;

/** The declared bill field set. */
export const DECLARED_BILL_FIELDS = [
  "month",
  "periodStart",
  "periodEnd",
  "printedBilledDemandKw",
  "printedDemandRateUsdPerKw",
  "printedRatchetLine",
] as const;

export const EXTRACTION_ENV = {
  modelKey: ["RATCHETPROOF_EXTRACTION_MODEL_KEY", "GEMINI_API_KEY"],
  parseKey: ["RATCHETPROOF_PARSE_KEY", "LLAMAPARSE_API_KEY"],
  model: ["RATCHETPROOF_EXTRACTION_MODEL"],
} as const;

export const EXTRACTION_MODEL_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";
export const DEFAULT_EXTRACTION_MODEL = "gemini-3.1-pro-preview";

export const PARSE_ENDPOINT_BASE = "https://api.cloud.llamaindex.ai/api/parsing";
export const PARSE_UPLOAD_ENDPOINT = `${PARSE_ENDPOINT_BASE}/upload`;
export const parseJobEndpoint = (jobId: string): string =>
  `${PARSE_ENDPOINT_BASE}/job/${encodeURIComponent(jobId)}`;
export const parseResultEndpoint = (jobId: string): string =>
  `${parseJobEndpoint(jobId)}/result/markdown`;
export const PARSE_MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const PARSE_POLL_INTERVAL_MS = 1_500;
export const PARSE_POLL_MAX_ATTEMPTS = 40;

export interface ExtractionCredentials {
  modelKey: string;
  parseKey: string | null;
  model: string;
}

/** The loud failure when the deploy cannot extract. This is the owner's action, not a build defect. */
export class RatchetProofExtractionUnavailableError extends Error {
  readonly code = "rp-extraction-unavailable";
  readonly ruleId = "rp-extraction-unavailable";
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `RatchetProof cannot read the documents: the deploy has no ${missing.join(" and no ")}. ` +
        "Set the key in the deploy environment (server-side only) and re-run; nothing was extracted, " +
        "nothing was estimated and nothing was audited.",
    );
    this.name = "RatchetProofExtractionUnavailableError";
    this.missing = missing;
  }
}

function firstDefined(
  env: Record<string, string | undefined>,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

export function resolveExtractionCredentials(
  env: Record<string, string | undefined> = process.env,
): ExtractionCredentials {
  const modelKey = firstDefined(env, EXTRACTION_ENV.modelKey);
  const parseKey = firstDefined(env, EXTRACTION_ENV.parseKey);
  if (!modelKey) throw new RatchetProofExtractionUnavailableError([EXTRACTION_ENV.modelKey.join(" or ")]);
  return {
    modelKey,
    parseKey,
    model: firstDefined(env, EXTRACTION_ENV.model) ?? DEFAULT_EXTRACTION_MODEL,
  };
}

/** The loud door on the document path: a PDF needs the parse service. */
export function requireParseKey(credentials: ExtractionCredentials): string {
  if (!credentials.parseKey) {
    throw new RatchetProofExtractionUnavailableError([EXTRACTION_ENV.parseKey.join(" or ")]);
  }
  return credentials.parseKey;
}

export interface ExtractionTransportRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  upload?: { field: string; filename: string; contentType: string; bytes: Uint8Array };
}

export interface ExtractionTransportResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export type ExtractionTransport = (
  request: ExtractionTransportRequest,
) => Promise<ExtractionTransportResponse>;

export interface SourceDocument {
  text?: string;
  base64?: string;
  name: string;
  contentType?: string;
}

export function decodeBase64Document(base64: string): Uint8Array {
  const comma = base64.startsWith("data:") ? base64.indexOf(",") : -1;
  const cleaned = (comma === -1 ? base64 : base64.slice(comma + 1)).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw new Error(
      "The document was not valid base64, so nothing was read. Nothing was extracted and nothing was audited.",
    );
  }
  return new Uint8Array(Buffer.from(cleaned, "base64"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function readParseJobId(body: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "The document-parse service returned an upload response that is not JSON. Nothing was extracted and nothing was audited.",
    );
  }
  const id = (payload as { id?: unknown }).id;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(
      "The document-parse service accepted the upload but returned no job id. Nothing was extracted and nothing was audited.",
    );
  }
  return id.trim();
}

export function readParseJobStatus(body: string): { status: string; errorMessage: string | null } {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "The document-parse service reported a job status that is not JSON. Nothing was extracted and nothing was audited.",
    );
  }
  const job = (payload ?? {}) as { status?: unknown; error_message?: unknown };
  return {
    status: typeof job.status === "string" && job.status.trim() ? job.status.trim() : "UNKNOWN",
    errorMessage:
      typeof job.error_message === "string" && job.error_message.trim()
        ? job.error_message.trim()
        : null,
  };
}

export function readParseMarkdownResult(body: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "The document-parse service returned a result that is not JSON. Nothing was extracted and nothing was audited.",
    );
  }
  const markdown = (payload as { markdown?: unknown }).markdown;
  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new Error(
      "The document-parse service returned no text for the document. Nothing was extracted and nothing was audited.",
    );
  }
  return markdown;
}

/** Text passes straight through (no paid call); a PDF goes upload → poll → markdown. */
export async function parseDocumentToText(input: {
  document: SourceDocument;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}): Promise<string> {
  const { document } = input;
  if (document.text !== undefined) {
    const text = document.text.trim();
    if (!text) {
      throw new Error(
        "The document is empty. Nothing was extracted and nothing was audited.",
      );
    }
    return text;
  }
  if (document.base64 === undefined) {
    throw new Error(
      "No document was supplied: neither text nor base64 bytes. Nothing was extracted and nothing was audited.",
    );
  }

  const parseKey = requireParseKey(input.credentials);
  const bytes = decodeBase64Document(document.base64);
  if (bytes.byteLength === 0) {
    throw new Error(
      "The document decoded to zero bytes. Nothing was extracted and nothing was audited.",
    );
  }
  if (bytes.byteLength > PARSE_MAX_DOCUMENT_BYTES) {
    throw new Error(
      `The document is ${bytes.byteLength} bytes, above the ${PARSE_MAX_DOCUMENT_BYTES}-byte ceiling this route accepts. It was NOT truncated and nothing was extracted.`,
    );
  }
  const authHeaders = { Authorization: `Bearer ${parseKey}` };

  const upload = await input.transport({
    url: PARSE_UPLOAD_ENDPOINT,
    method: "POST",
    headers: authHeaders,
    upload: {
      field: "file",
      filename: document.name,
      contentType: document.contentType ?? "application/octet-stream",
      bytes,
    },
  });
  if (!upload.ok) {
    throw new Error(
      `The document-parse service rejected the upload (HTTP ${upload.status}). Nothing was extracted and nothing was audited.`,
    );
  }
  const jobId = readParseJobId(await upload.text());

  const attempts = input.maxPollAttempts ?? PARSE_POLL_MAX_ATTEMPTS;
  const interval = input.pollIntervalMs ?? PARSE_POLL_INTERVAL_MS;
  let status = "PENDING";
  let errorMessage: string | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const poll = await input.transport({
      url: parseJobEndpoint(jobId),
      method: "GET",
      headers: authHeaders,
    });
    if (!poll.ok) {
      throw new Error(
        `The document-parse service could not report the job status (HTTP ${poll.status}). Nothing was extracted and nothing was audited.`,
      );
    }
    const job = readParseJobStatus(await poll.text());
    status = job.status;
    errorMessage = job.errorMessage;
    if (status === "SUCCESS" || status === "ERROR") break;
    if (attempt < attempts) await sleep(interval);
  }
  if (status === "ERROR") {
    throw new Error(
      `The document-parse service could not read the document (${errorMessage ?? "no reason given"}). Nothing was extracted and nothing was audited.`,
    );
  }
  if (status !== "SUCCESS") {
    throw new Error(
      `The document-parse service did not finish reading the document (last status ${status} after ${attempts} polls). Nothing was extracted and nothing was audited.`,
    );
  }

  const result = await input.transport({
    url: parseResultEndpoint(jobId),
    method: "GET",
    headers: authHeaders,
  });
  if (!result.ok) {
    throw new Error(
      `The document-parse service produced no result (HTTP ${result.status}). Nothing was extracted and nothing was audited.`,
    );
  }
  return readParseMarkdownResult(await result.text());
}

/**
 * The ONE tariff record the extraction must return. `parseTariffJson` reads it, the prompt is rendered
 * from the same key list, and the test asserts they still agree.
 */
export const TARIFF_RECORD_KEYS = [
  "utility",
  "schedule",
  "voltageClass",
  "demandRates",
  "demandRates[].season",
  "demandRates[].voltageClass",
  "demandRates[].rateUsdPerKw",
  "ratchetPercent",
  "ratchetLookbackMonths",
  "billingWindow",
  "billingWindow.days",
  "billingWindow.startMinute",
  "billingWindow.endMinute",
  "billingWindow.utcOffsetMinutes",
  "intervalMinutes",
  "contractMinimumKw",
  "unreadableRegions",
] as const;

export const BILL_RECORD_KEYS = [
  "bills[].month",
  "bills[].periodStart",
  "bills[].periodEnd",
  "bills[].printedBilledDemandKw",
  "bills[].printedDemandRateUsdPerKw",
  "bills[].printedRatchetLine",
  "unreadableRegions",
] as const;

export const TARIFF_RECORD_EXAMPLE = `{
  "utility":       { "value": "Pacific Grid & Electric", "provenance": "extracted", "page": 1, "quote": "SCHEDULE C-3 DEMAND" },
  "schedule":      { "value": "C-3", "provenance": "extracted", "page": 1, "quote": "Schedule C-3" },
  "voltageClass":  { "value": "Secondary", "provenance": "extracted", "page": 1, "quote": "Secondary voltage service" },
  "demandRates":   { "value": [ { "season": "summer", "voltageClass": "Secondary", "rateUsdPerKw": "15.00", "page": 3 } ], "provenance": "extracted", "page": 3, "quote": "Demand charge: $15.00 per kW" },
  "ratchetPercent":        { "value": 75, "provenance": "extracted", "page": 2, "quote": "or 75% of the highest maximum demand" },
  "ratchetLookbackMonths": { "value": 3, "provenance": "extracted", "page": 2, "quote": "during the preceding 3 months" },
  "billingWindow": { "value": { "days": [1,2,3,4,5], "startMinute": 480, "endMinute": 1200, "utcOffsetMinutes": 0 }, "provenance": "extracted", "page": 2, "quote": "Monday through Friday, 8:00 a.m. to 8:00 p.m." },
  "intervalMinutes":    { "value": 30, "provenance": "extracted", "page": 2, "quote": "successive 30-minute intervals" },
  "contractMinimumKw":  { "value": 400, "provenance": "extracted", "page": 2, "quote": "Minimum contract demand: 400 kW" },
  "unreadableRegions": []
}`;

const FIELD_RULES = [
  "Every leaf field is an object of the form { \"value\": …, \"provenance\": …, \"page\": …, \"quote\": … },",
  "where provenance is exactly one of:",
  '  "extracted" — the value is legible on the document;',
  '  "unreadable" — the region could not be read (scan, redaction, corruption);',
  '  "unstated" — the document is legible but does not state the value.',
  'Set "value" to null for anything that is not "extracted".',
  "\"page\" is the 1-based page number; \"quote\" is the verbatim text the value was read from.",
  "DO NOT compute, estimate, infer or default any number. If the tariff does not state the ratchet",
  "percentage, that field is \"unstated\" — never 0. If it does not state the interval length, that",
  'field is "unstated" — never 15 or 30 by convention.',
];

/** The tariff extraction prompt: read the document into the record above, never guess. */
export function buildTariffExtractionPrompt(documentText: string): string {
  return [
    "You are reading ONE electric utility tariff (rate schedule) document.",
    "",
    "Return ONE JSON object with exactly this shape (the numbers here are an example, not this tariff's):",
    TARIFF_RECORD_EXAMPLE,
    "",
    ...FIELD_RULES,
    "",
    "`demandRates` is an array: one entry per season × voltage class the demand charge prices.",
    "`rateUsdPerKw` is the printed dollars per kW (a string like \"15.00\" is fine).",
    "`billingWindow.days` uses 0 = Sunday … 6 = Saturday. `startMinute`/`endMinute` are minutes after",
    "local midnight (1440 = end of day); `utcOffsetMinutes` is the offset the tariff's clock runs on",
    "(e.g. −480). If the tariff states the window in a named timezone only, use its standard offset and",
    "quote the clause.",
    "",
    `The declared fields a reader may fill are: ${DECLARED_TARIFF_FIELDS.join(", ")}.`,
    `The record's keys are exactly: ${TARIFF_RECORD_KEYS.join(", ")}.`,
    "List every region you could not read in \"unreadableRegions\".",
    "",
    "Document text:",
    documentText,
  ].join("\n");
}

/** The bills prompt: one record per bill, the bill's own printed figures only. */
export function buildBillsExtractionPrompt(documentText: string, billCount: number): string {
  return [
    `You are reading ${billCount} electric bill${billCount === 1 ? "" : "s"} from one commercial account.`,
    "",
    "Return ONE JSON object:",
    '{ "bills": [ { "month": {"value":"2026-01","provenance":"extracted","page":1,"quote":"..."}, ... } ], "unreadableRegions": [] }',
    "",
    ...FIELD_RULES,
    "",
    "Each bill record has exactly these fields:",
    "  month                      — the billing month as YYYY-MM",
    "  periodStart / periodEnd    — the billing period as YYYY-MM-DD",
    "  printedBilledDemandKw      — the billed demand the bill PRINTS (kW). Never recompute it.",
    "  printedDemandRateUsdPerKw  — the demand rate the bill prints, dollars per kW.",
    "  printedRatchetLine         — the ratchet / billed-demand explanation line, verbatim.",
    "",
    `The declared fields a reader may fill are: ${DECLARED_BILL_FIELDS.join(", ")}.`,
    `The record's keys are exactly: ${BILL_RECORD_KEYS.join(", ")}.`,
    "NEVER derive `printedBilledDemandKw` from the tariff, the interval data, or the amount ÷ rate.",
    "The printed figure is the evidence under audit; a derived one would be the reader inventing it.",
    "",
    "Document text:",
    documentText,
  ].join("\n");
}

function parseJsonEnvelope(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(
      "The extraction model did not return a JSON object. Nothing was extracted and nothing was audited.",
    );
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    throw new Error(
      `The extraction model returned text that is not valid JSON (${error instanceof Error ? error.message : "parse failure"}). Nothing was extracted and nothing was audited.`,
    );
  }
}

/** Pulls the model's text out of a Gemini generateContent envelope. */
export function readStructuredJsonFromModelResponse(rawBody: string): unknown {
  let envelope: unknown;
  try {
    envelope = JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      `The extraction model returned a body that is not JSON (${error instanceof Error ? error.message : "parse failure"}). Nothing was extracted and nothing was audited.`,
    );
  }
  const candidates = (envelope as { candidates?: unknown }).candidates;
  const first = Array.isArray(candidates) ? (candidates[0] as Record<string, unknown>) : null;
  const parts = (first?.content as { parts?: unknown } | undefined)?.parts;
  const text = Array.isArray(parts)
    ? parts
        .filter((part) => (part as { thought?: unknown }).thought !== true)
        .map((part) => (part as { text?: unknown }).text)
        .filter((value): value is string => typeof value === "string")
        .join("")
    : "";
  if (!text.trim()) {
    throw new Error(
      "The extraction model returned no text. Nothing was extracted and nothing was audited.",
    );
  }
  return parseJsonEnvelope(text);
}

async function callModel(input: {
  prompt: string;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<unknown> {
  const response = await input.transport({
    url: `${EXTRACTION_MODEL_ENDPOINT}/${input.credentials.model}:generateContent`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.credentials.modelKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `The extraction model rejected the document (HTTP ${response.status}). Nothing was extracted and nothing was audited.`,
    );
  }
  return readStructuredJsonFromModelResponse(await response.text());
}

/** Reads a tariff payload into the engine's declared tariff. A malformed field fails loudly. */
export function readTariffPayload(payload: unknown): {
  tariff: Tariff;
  unreadableRegions: string[];
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const unreadableRegions = Array.isArray(root.unreadableRegions)
    ? root.unreadableRegions.filter((region): region is string => typeof region === "string")
    : [];
  return {
    tariff: parseTariffJson(JSON.stringify(root)),
    unreadableRegions,
  };
}

interface RawField {
  value?: unknown;
  provenance?: unknown;
  page?: unknown;
  quote?: unknown;
}

function labelOf(raw: unknown): { value: unknown; provenance: "extracted" | "unreadable" | "unstated" } {
  const field = (raw ?? {}) as RawField;
  const provenance =
    field.provenance === "extracted" ||
    field.provenance === "unreadable" ||
    field.provenance === "unstated"
      ? field.provenance
      : "unstated";
  return { value: field.value, provenance };
}

function stringOf(raw: unknown): string | null {
  const { value, provenance } = labelOf(raw);
  if (provenance !== "extracted" || typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

function numberText(raw: unknown): string | null {
  const { value, provenance } = labelOf(raw);
  if (provenance !== "extracted") return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

/** Normalizes the bills payload; a figure the bill does not print stays null (`unstated`). */
export function readBillsPayload(payload: unknown): {
  bills: BillRecord[];
  unreadableRegions: string[];
} {
  const root = (payload ?? {}) as Record<string, unknown>;
  const rawBills = Array.isArray(root.bills) ? root.bills : [];
  const unreadableRegions = Array.isArray(root.unreadableRegions)
    ? root.unreadableRegions.filter((region): region is string => typeof region === "string")
    : [];
  const bills: BillRecord[] = rawBills.map((raw) => {
    const bill = (raw ?? {}) as Record<string, unknown>;
    const month = stringOf(bill.month);
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new Error(
        `A bill record could not be read into a YYYY-MM billing month (received ${JSON.stringify(month)}). Nothing was extracted and nothing was audited.`,
      );
    }
    const demand = numberText(bill.printedBilledDemandKw);
    const rate = numberText(bill.printedDemandRateUsdPerKw);
    const demandLabel = labelOf(bill.printedBilledDemandKw);
    const rateLabel = labelOf(bill.printedDemandRateUsdPerKw);
    const ratchetLine = stringOf(bill.printedRatchetLine);
    const ratchetLabel = labelOf(bill.printedRatchetLine);
    return {
      month,
      periodStart: stringOf(bill.periodStart) ?? "",
      periodEnd: stringOf(bill.periodEnd) ?? "",
      printedBilledDemandKwMilli:
        demand === null
          ? null
          : parseScaledDecimal(demand, 1000, `bill.${month}.printedBilledDemandKw`),
      printedBilledDemandProvenance:
        demand === null
          ? demandLabel.provenance === "extracted"
            ? "unreadable"
            : demandLabel.provenance
          : "extracted",
      printedDemandRateMicroUsdPerKw:
        rate === null ? null : parseScaledDecimal(rate, 1_000_000, `bill.${month}.demandRate`),
      printedDemandRateProvenance:
        rate === null
          ? rateLabel.provenance === "extracted"
            ? "unreadable"
            : rateLabel.provenance
          : "extracted",
      printedRatchetLine: ratchetLine,
      printedRatchetLineProvenance:
        ratchetLine === null
          ? ratchetLabel.provenance === "extracted"
            ? "unreadable"
            : ratchetLabel.provenance
          : "extracted",
    };
  });
  return { bills, unreadableRegions };
}

/** Extracts the tariff record from a document (text, or a PDF through the parse service). */
export async function extractTariff(input: {
  document: SourceDocument;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<{ tariff: Tariff; unreadableRegions: string[]; labels: string[] }> {
  const text = await parseDocumentToText(input);
  const payload = await callModel({
    prompt: buildTariffExtractionPrompt(text),
    credentials: input.credentials,
    transport: input.transport,
  });
  const record = readTariffPayload(payload);
  return {
    ...record,
    labels: labelledTariffFields(record.tariff).concat(
      record.unreadableRegions.map((region) => `unreadable:${region}`),
    ),
  };
}

/** Extracts the bills record from a document. */
export async function extractBills(input: {
  document: SourceDocument;
  billCount: number;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<{ bills: BillRecord[]; unreadableRegions: string[]; labels: string[] }> {
  const text = await parseDocumentToText(input);
  const payload = await callModel({
    prompt: buildBillsExtractionPrompt(text, input.billCount),
    credentials: input.credentials,
    transport: input.transport,
  });
  const record = readBillsPayload(payload);
  return {
    ...record,
    labels: labelledBillFields(record.bills).concat(
      record.unreadableRegions.map((region) => `unreadable:${region}`),
    ),
  };
}

/** `field=provenance` for every declared tariff field — printed on the page AND filed. */
export function labelledTariffFields(tariff: Tariff): string[] {
  return [
    `tariff.utility=${tariff.utility.provenance}`,
    `tariff.schedule=${tariff.schedule.provenance}`,
    `tariff.voltageClass=${tariff.voltageClass.provenance}`,
    `tariff.demandRates=${tariff.demandRates.provenance}`,
    `tariff.ratchetPercent=${tariff.ratchetPercent.provenance}`,
    `tariff.ratchetLookbackMonths=${tariff.ratchetLookbackMonths.provenance}`,
    `tariff.billingWindow=${tariff.billingWindow.provenance}`,
    `tariff.intervalMinutes=${tariff.intervalMinutes.provenance}`,
    `tariff.contractMinimumKw=${tariff.contractMinimumKw.provenance}`,
  ];
}

export function labelledBillFields(bills: BillRecord[]): string[] {
  return bills.flatMap((bill) => [
    `bill.${bill.month}.printedBilledDemand=${bill.printedBilledDemandProvenance}`,
    `bill.${bill.month}.printedDemandRate=${bill.printedDemandRateProvenance}`,
    `bill.${bill.month}.printedRatchetLine=${bill.printedRatchetLineProvenance}`,
  ]);
}

/** The blocking finding for a region the reader could not resolve. */
export function unreadableRegionFindings(regions: string[]): Finding[] {
  return regions.map((region) => ({
    ruleId: "rp-tariff-unreadable",
    kind: "tariff_unreadable",
    severity: "blocking",
    scope: region,
    message: `The document has an unreadable region (${region}). The audit is withheld rather than computed against a partial document.`,
    fix: "Re-supply a legible copy of that page, or the utility's own rate sheet / bill PDF, and re-run.",
  }));
}
