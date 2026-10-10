/**
 * The extraction layer — IN FRONT of the engine, and extraction ONLY.
 *
 * The invoice arrives as a PDF, a scan or an HTML export. A document-parsing service turns it into
 * text; an LLM reads that text and fills the DECLARED FIELD SET below. That is the whole job: the
 * model reads a document into the structured record the deterministic engine then computes on. It
 * never computes a figure, never decides a verdict, and never fills a gap.
 *
 * The rules this module enforces (AGENTS.md rule 1, `context/tech_stack_capabilities.md` §2):
 *  1. EXTRACTION IS DECLARED. Every field carries its provenance (`extracted` / `unreadable` /
 *     `unstated`), the page and the artifact print it, and `labelledFields()` produces those labels.
 *  2. EXTRACTION FAILURE IS LOUD. An unsure field or an unreadable region BLOCKS the verdict. There
 *     is no default, no estimate and no "close enough" — and the engine never sees a blocked record.
 *  3. THE NUMBER UNDER AUDIT IS NEVER DERIVED. If the invoice's own printed `amount` is `unstated`,
 *     this module does NOT multiply quantity by unit price to fill it: the amount is the thing being
 *     audited, so computing it would fabricate the evidence.
 *  4. NO NEW SECRET SURFACE. The document-parse key and the model key are read from the deploy env
 *     (server-side only) and are never shipped to the browser; when they are absent the extraction
 *     fails loudly with the variable names instead of degrading to a substitute.
 *  5. THE PARSE CONTRACT IS A THREE-STEP FLOW, MEASURED. Upload (multipart `file`) -> poll the job ->
 *     fetch `/result/markdown`. The upload response is a JOB RECEIPT, never the document's text; see
 *     the constant block below for the endpoints and the live-measured responses.
 */
import type { Finding, Invoice, InvoiceLine, InvoicePeriod } from "./types";

/** The declared field set the extraction fills — the only things a reader may produce. */
export const DECLARED_FIELD_SET = [
  "provider",
  "period",
  "service",
  "model",
  "quantity",
  "unit_price",
  "amount",
  "sku",
] as const;

export type DeclaredField = (typeof DECLARED_FIELD_SET)[number];

/**
 * `extracted` — the field was read off the document.
 * `unreadable` — the region could not be read (a scan, a redaction, a corrupted page).
 * `unstated`   — the document is legible but does not state the field.
 * The last two BLOCK the verdict; they are not a softer kind of `extracted`.
 */
export type FieldProvenance = "extracted" | "unreadable" | "unstated";

export interface ExtractedField<T> {
  value: T | null;
  provenance: FieldProvenance;
}

export interface ExtractedInvoiceLine {
  service: ExtractedField<string>;
  model: ExtractedField<string>;
  sku: ExtractedField<string>;
  quantity: ExtractedField<number>;
  unitPriceMicroUsdPerThousandUnits: ExtractedField<number>;
  amountMicroUsd: ExtractedField<number>;
}

export interface ExtractedInvoiceRecord {
  provider: ExtractedField<string>;
  period: ExtractedField<InvoicePeriod>;
  currency: ExtractedField<string>;
  totalMicroUsd: ExtractedField<number>;
  lines: ExtractedInvoiceLine[];
  /** Regions of the document the parse/read could not resolve, in document order. */
  unreadableRegions: string[];
}

/** The env vars that may carry the two credentials, in precedence order. */
export const EXTRACTION_ENV = {
  modelKey: ["SPENDPROOF_EXTRACTION_MODEL_KEY", "GEMINI_API_KEY"],
  parseKey: ["SPENDPROOF_PARSE_KEY", "LLAMAPARSE_API_KEY"],
  model: ["SPENDPROOF_EXTRACTION_MODEL"],
} as const;

/** The model endpoint the structured extraction posts to (the provider is swappable via env). */
export const EXTRACTION_MODEL_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

export interface ExtractionCredentials {
  modelKey: string;
  /** Null when the deploy carries no document-parse key: text input needs none. */
  parseKey: string | null;
  model: string;
}

export const DEFAULT_EXTRACTION_MODEL = "gemini-3.1-pro-preview";

/**
 * The loud failure when the deploy cannot extract.
 *
 * SpendProof is the factory's first LLM/parse-backed product, and the deploy env carries no model
 * and no document-parse key until the owner adds one. The code reads the key from the env and fails
 * here — with the variable names — rather than stubbing, fabricating a field or falling back to a
 * degraded path (AGENTS.md rule 5). No approval ever covers a credential: this is the owner's action.
 */
export class ExtractionUnavailableError extends Error {
  readonly code = "sp-extraction-unavailable";
  readonly ruleId = "sp-extraction-unavailable";
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `SpendProof cannot read the invoice document: the deploy has no ${missing.join(" and no ")}. ` +
        "Set the key in the deploy environment (server-side only) and re-run; nothing was extracted, " +
        "nothing was estimated and nothing was reconciled.",
    );
    this.name = "ExtractionUnavailableError";
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

/**
 * Resolves the extraction credentials from an environment map.
 *
 * The MODEL key is required — nothing can be read without it, so its absence is a loud refusal
 * naming both accepted variable names. The document-parse key is OPTIONAL and resolves to `null`
 * when absent, because a pasted invoice text needs no parse service: requiring it would refuse a
 * run that does not use it. The path that REALLY needs one calls `requireParseKey`, which is the
 * loud door there.
 */
export function resolveExtractionCredentials(
  env: Record<string, string | undefined> = process.env,
): ExtractionCredentials {
  const modelKey = firstDefined(env, EXTRACTION_ENV.modelKey);
  const parseKey = firstDefined(env, EXTRACTION_ENV.parseKey);
  if (!modelKey) throw new ExtractionUnavailableError([EXTRACTION_ENV.modelKey.join(" or ")]);
  return {
    modelKey,
    parseKey,
    model: firstDefined(env, EXTRACTION_ENV.model) ?? DEFAULT_EXTRACTION_MODEL,
  };
}

/**
 * The loud door on the document path: a document has to be read and the deploy has no parse key.
 * Throws rather than falling back to "treat the bytes as text" — that fallback is the defect this
 * function exists to prevent (a PDF's bytes are not the invoice's text).
 */
export function requireParseKey(credentials: ExtractionCredentials): string {
  if (!credentials.parseKey) {
    throw new ExtractionUnavailableError([EXTRACTION_ENV.parseKey.join(" or ")]);
  }
  return credentials.parseKey;
}

export interface ExtractionTransportRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  /** A JSON request body — the model call. */
  body?: string;
  /**
   * A multipart file upload — the document-parse service.
   *
   * It MUST be multipart: the parse service does not accept a JSON body carrying the document (it
   * answers HTTP 400 naming the three things it does accept — `file`, `input_url`, `input_s3_path`).
   * A JSON body here is the defect this field exists to make impossible.
   */
  upload?: {
    field: string;
    filename: string;
    contentType: string;
    bytes: Uint8Array;
  };
}

export interface ExtractionTransportResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

/**
 * The network boundary, injected. The engine folder holds no `fetch`: the route supplies the
 * transport, so the extraction contract stays fixture-testable and the model call sits on the
 * correct side of the boundary (context/tech_stack_capabilities.md §1).
 */
export type ExtractionTransport = (
  request: ExtractionTransportRequest,
) => Promise<ExtractionTransportResponse>;

/**
 * The document-parse service. Its contract is a THREE-step flow, measured against the live API — not
 * one call, and never a JSON body:
 *
 *   1. `POST /upload` (multipart, field `file`) -> `{ "id": "<job>", "status": "PENDING" }`
 *   2. `GET  /job/<job>`                        -> `{"status":"PENDING"}` … `{"status":"SUCCESS"}`
 *   3. `GET  /job/<job>/result/markdown`        -> `{ "markdown": "<the document's text>" }`
 *
 * The upload response is a JOB RECEIPT. Treating it as the document's text is the trap: the model
 * would then be asked to read `{"id":…,"status":"PENDING"}` instead of an invoice, and every field
 * would come back `unstated`. `markdown` is fetched (not `text`) because an invoice's line items are
 * a table, and the markdown result preserves it.
 */
export const PARSE_ENDPOINT_BASE = "https://api.cloud.llamaindex.ai/api/parsing";
export const PARSE_UPLOAD_ENDPOINT = `${PARSE_ENDPOINT_BASE}/upload`;
export const parseJobEndpoint = (jobId: string): string =>
  `${PARSE_ENDPOINT_BASE}/job/${encodeURIComponent(jobId)}`;
export const parseResultEndpoint = (jobId: string): string =>
  `${parseJobEndpoint(jobId)}/result/markdown`;

/** Declared ceiling on a document sent for parsing. Above it the route refuses — it never truncates. */
export const PARSE_MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const PARSE_POLL_INTERVAL_MS = 1500;
export const PARSE_POLL_MAX_ATTEMPTS = 40;

/** What the caller has: the invoice's text, or the document's bytes as base64. Exactly one. */
export interface InvoiceDocument {
  text?: string;
  base64?: string;
  name: string;
  contentType?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Decodes the caller's base64 document (a `data:` URL is accepted), refusing anything malformed. */
export function decodeBase64Document(base64: string): Uint8Array {
  const comma = base64.startsWith("data:") ? base64.indexOf(",") : -1;
  const cleaned = (comma === -1 ? base64 : base64.slice(comma + 1)).replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw new Error(
      "The invoice document was not valid base64, so nothing was read. Nothing was extracted and nothing was reconciled.",
    );
  }
  return new Uint8Array(Buffer.from(cleaned, "base64"));
}

/** Step 1's response: the job id, or a loud failure. */
export function readParseJobId(body: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "The document-parse service returned an upload response that is not JSON. Nothing was extracted and nothing was reconciled.",
    );
  }
  const id = (payload as { id?: unknown }).id;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(
      "The document-parse service accepted the upload but returned no job id. Nothing was extracted and nothing was reconciled.",
    );
  }
  return id.trim();
}

/** Step 2's response: the job's status and, on failure, the service's own reason. */
export function readParseJobStatus(body: string): { status: string; errorMessage: string | null } {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "The document-parse service reported a job status that is not JSON. Nothing was extracted and nothing was reconciled.",
    );
  }
  const job = (payload ?? {}) as { status?: unknown; error_message?: unknown };
  const status = typeof job.status === "string" && job.status.trim() ? job.status.trim() : "UNKNOWN";
  const errorMessage =
    typeof job.error_message === "string" && job.error_message.trim() ? job.error_message.trim() : null;
  return { status, errorMessage };
}

/** Step 3's response: the document's text, or a loud failure. */
export function readParseMarkdownResult(body: string): string {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(
      "The document-parse service returned a result that is not JSON. Nothing was extracted and nothing was reconciled.",
    );
  }
  const markdown = (payload as { markdown?: unknown }).markdown;
  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new Error(
      "The document-parse service returned no text for the invoice. Nothing was extracted and nothing was reconciled.",
    );
  }
  return markdown;
}

/**
 * Step 1 — turn whatever the caller supplied into the invoice's text, or throw loudly.
 *
 * Text input is returned as-is and the parse service is NOT called: a paid third-party call that
 * adds nothing is a defect, not a safety net, and it is also why a text run needs no parse key.
 * A document (a PDF, a scan) goes through the three-step flow above; the job is polled to a bounded
 * deadline, and a job that fails or never finishes withholds the verdict instead of guessing.
 */
export async function parseDocumentToText(input: {
  document: InvoiceDocument;
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
        "The invoice document is empty. Nothing was extracted and nothing was reconciled.",
      );
    }
    return text;
  }

  if (document.base64 === undefined) {
    throw new Error(
      "No invoice document was supplied: neither `documentText` nor `documentBase64` was provided. Nothing was extracted and nothing was reconciled.",
    );
  }

  const parseKey = requireParseKey(input.credentials);
  const bytes = decodeBase64Document(document.base64);
  if (bytes.byteLength === 0) {
    throw new Error(
      "The invoice document decoded to zero bytes. Nothing was extracted and nothing was reconciled.",
    );
  }
  if (bytes.byteLength > PARSE_MAX_DOCUMENT_BYTES) {
    throw new Error(
      `The invoice document is ${bytes.byteLength} bytes, above the ${PARSE_MAX_DOCUMENT_BYTES}-byte ceiling this route accepts. It was NOT truncated and nothing was extracted.`,
    );
  }

  const authHeaders = { Authorization: `Bearer ${parseKey}` };

  // Step 1 — upload. The response is a receipt, not the document's text.
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
      `The document-parse service rejected the invoice upload (HTTP ${upload.status}). Nothing was extracted and nothing was reconciled.`,
    );
  }
  const jobId = readParseJobId(await upload.text());

  // Step 2 — poll to SUCCESS/ERROR, bounded. A parse that never finishes is an explicit failure.
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
        `The document-parse service could not report the job status (HTTP ${poll.status}). Nothing was extracted and nothing was reconciled.`,
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
      `The document-parse service could not read the invoice (${errorMessage ?? "no reason given"}). Nothing was extracted and nothing was reconciled.`,
    );
  }
  if (status !== "SUCCESS") {
    throw new Error(
      `The document-parse service did not finish reading the invoice (last status ${status} after ${attempts} polls). Nothing was extracted and nothing was reconciled.`,
    );
  }

  // Step 3 — fetch the parsed text.
  const result = await input.transport({
    url: parseResultEndpoint(jobId),
    method: "GET",
    headers: authHeaders,
  });
  if (!result.ok) {
    throw new Error(
      `The document-parse service produced no result for the invoice (HTTP ${result.status}). Nothing was extracted and nothing was reconciled.`,
    );
  }
  return readParseMarkdownResult(await result.text());
}

/**
 * The ONE JSON object the extraction must return: the engine's own `Invoice` record, every leaf
 * labelled, and every money field an INTEGER COUNT OF MICRO-USD (1 USD = 1,000,000 micro-USD).
 *
 * This is a single source. `buildExtractionPrompt` renders it, `readExtractionPayload` reads it, and
 * `spendproof.test.ts` asserts the prompt still names every key — because the defect this replaces
 * was exactly a drift between the two: the prompt asked for a flat per-line field list
 * (`service, model, quantity, unit_price, amount`) while the parser expected this record, so the
 * model answered with ONE OBJECT PER LINE, the parser's brace-slice produced invalid JSON, and the
 * line amounts came back as dollar strings in a schema that reads integer micro-USD.
 */
export const EXTRACTION_RECORD_KEYS = [
  "provider",
  "period",
  "currency",
  "totalMicroUsd",
  "lines",
  "line.service",
  "line.model",
  "line.sku",
  "line.quantity",
  "line.unitPriceMicroUsdPerThousandUnits",
  "line.amountMicroUsd",
  "unreadableRegions",
] as const;

/** The worked example in the prompt. Its numbers are internally consistent, so they teach the units. */
export const EXTRACTION_RECORD_EXAMPLE = `{
  "provider":       { "value": "OpenAI", "provenance": "extracted" },
  "period":         { "value": { "start": "2026-09-01", "end": "2026-09-30" }, "provenance": "extracted" },
  "currency":       { "value": "USD", "provenance": "extracted" },
  "totalMicroUsd":  { "value": 270000000, "provenance": "extracted" },
  "lines": [
    {
      "service":                           { "value": "Responses API", "provenance": "extracted" },
      "model":                             { "value": "gpt-5", "provenance": "extracted" },
      "sku":                               { "value": null, "provenance": "unstated" },
      "quantity":                          { "value": 1200000, "provenance": "extracted" },
      "unitPriceMicroUsdPerThousandUnits": { "value": 150000, "provenance": "extracted" },
      "amountMicroUsd":                    { "value": 180000000, "provenance": "extracted" }
    }
  ],
  "unreadableRegions": []
}`;

/**
 * The structured-extraction prompt: read the document into the record above, mark what you cannot
 * read, never guess, and never convert a unit by hand.
 */
export function buildExtractionPrompt(documentText: string): string {
  return [
    "You are reading ONE AI provider invoice.",
    "",
    "Return ONE JSON object — NOT an array, and NOT one object per line item. Every invoice line goes",
    'inside the single "lines" array of that one object.',
    "",
    "Every leaf field is an object of the form { \"value\": …, \"provenance\": … }, where provenance is",
    "exactly one of:",
    '  "extracted" — the value is legible on the document;',
    '  "unreadable" — the region could not be read (scan, redaction, corruption);',
    '  "unstated" — the document is legible but does not state the field.',
    'Set "value" to null for anything that is not "extracted".',
    "",
    "ALL MONEY IS AN INTEGER COUNT OF MICRO-USD: 1 USD = 1,000,000 micro-USD (so $270.00 is",
    "270000000, and $0.15 is 150000). Never emit a decimal, a dollar string or a thousands separator",
    "in a money field. `quantity` is an integer count of billed units. The invoice's declared rate goes",
    "in `unitPriceMicroUsdPerThousandUnits` — micro-USD per 1,000 units.",
    "",
    "Return exactly this shape (the numbers here are an example, not this invoice's):",
    EXTRACTION_RECORD_EXAMPLE,
    "",
    `The declared fields a reader may fill are: ${DECLARED_FIELD_SET.join(", ")}.`,
    "",
    "DO NOT compute, estimate, infer or default any number. If the invoice does not print a line's",
    "amount, that field is \"unstated\" — do not multiply quantity by unit price to fill it. If the",
    "invoice does not print its total, \"totalMicroUsd\" is \"unstated\". List every region you could not",
    "read in \"unreadableRegions\".",
    "",
    "Document text:",
    documentText,
  ].join("\n");
}

interface RawExtractedField {
  value?: unknown;
  provenance?: unknown;
}

function readField<T>(
  raw: unknown,
  parse: (value: unknown) => T | null,
): ExtractedField<T> {
  const candidate = (raw ?? {}) as RawExtractedField;
  const provenance: FieldProvenance =
    candidate.provenance === "extracted" ||
    candidate.provenance === "unreadable" ||
    candidate.provenance === "unstated"
      ? candidate.provenance
      : "unstated";
  if (provenance !== "extracted") return { value: null, provenance };
  const value = parse(candidate.value);
  // A field the reader claims it extracted but did not fill is not `extracted`: it is unstated.
  return value === null ? { value: null, provenance: "unstated" } : { value, provenance };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function asPeriod(value: unknown): InvoicePeriod | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { start?: unknown; end?: unknown };
  const start = asString(candidate.start);
  const end = asString(candidate.end);
  return start && end ? { start, end } : null;
}

/** Normalizes an untrusted extraction payload into the declared record. Never invents a value. */
export function readExtractionPayload(payload: unknown): ExtractedInvoiceRecord {
  const root = (payload ?? {}) as Record<string, unknown>;
  const rawLines = Array.isArray(root.lines) ? root.lines : [];
  const unreadableRegions = Array.isArray(root.unreadableRegions)
    ? root.unreadableRegions.filter((region): region is string => typeof region === "string")
    : [];

  return {
    provider: readField<string>(root.provider, asString),
    period: readField<InvoicePeriod>(root.period, asPeriod),
    currency: readField<string>(root.currency, asString),
    totalMicroUsd: readField<number>(root.totalMicroUsd, asNumber),
    lines: rawLines.map((raw) => {
      const line = (raw ?? {}) as Record<string, unknown>;
      return {
        service: readField<string>(line.service, asString),
        model: readField<string>(line.model, asString),
        sku: readField<string>(line.sku, asString),
        quantity: readField<number>(line.quantity, asNumber),
        unitPriceMicroUsdPerThousandUnits: readField<number>(
          line.unitPriceMicroUsdPerThousandUnits,
          asNumber,
        ),
        amountMicroUsd: readField<number>(line.amountMicroUsd, asNumber),
      };
    }),
    unreadableRegions,
  };
}

/** The `extracted`/`unreadable`/`unstated` label for every field — printed on the page AND filed. */
export function labelledFields(record: ExtractedInvoiceRecord): string[] {
  const labels: string[] = [];
  const push = (name: string, field: ExtractedField<unknown>) => {
    labels.push(`${name}=${field.provenance}`);
  };
  push("provider", record.provider);
  push("period", record.period);
  push("currency", record.currency);
  push("amount", record.totalMicroUsd);
  record.lines.forEach((line, index) => {
    const position = index + 1;
    push(`line${position}.service`, line.service);
    push(`line${position}.model`, line.model);
    push(`line${position}.sku`, line.sku);
    push(`line${position}.quantity`, line.quantity);
    push(`line${position}.unit_price`, line.unitPriceMicroUsdPerThousandUnits);
    push(`line${position}.amount`, line.amountMicroUsd);
  });
  return labels;
}

export interface ExtractedInvoiceReadResult {
  /** The engine-ready invoice, or null when the extraction blocked the verdict. */
  invoice: Invoice | null;
  findings: Finding[];
  /** True when a blocking finding withholds the reconciliation entirely. */
  blocked: boolean;
  labels: string[];
}

function blockingFieldFinding(
  fieldPath: string,
  provenance: "unreadable" | "unstated",
  detail: string,
): Finding {
  const ruleId = provenance === "unreadable" ? "sp-extraction-unreadable" : "sp-extraction-unstated";
  return {
    ruleId,
    kind: provenance,
    severity: "blocking",
    scope: fieldPath,
    message:
      provenance === "unreadable"
        ? `\`${fieldPath}\` is unreadable on the invoice (${detail}). The verdict is withheld: an unreadable region is never inferred from the rest of the document.`
        : `\`${fieldPath}\` is not stated on the invoice (${detail}). The verdict is withheld: a missing declared value is never estimated, and the amount under audit is never derived from quantity × unit price.`,
    fix:
      provenance === "unreadable"
        ? "Re-supply a legible copy of that region of the invoice (or the provider's CSV/API export) and re-run."
        : "Supply the missing declared field from the provider's own export or statement; nothing is filled in for you.",
  };
}

/**
 * Turns an extraction record into the engine's input — or refuses, with the blocking findings named.
 *
 * Every non-`extracted` field, and every unreadable region, withholds the verdict. That is the whole
 * point of the layer: the engine computes on what the invoice DECLARES, and a document that does not
 * declare something is a finding, not a guess.
 */
export function toInvoiceFromExtraction(record: ExtractedInvoiceRecord): ExtractedInvoiceReadResult {
  const findings: Finding[] = [];
  const labels = labelledFields(record);

  const requireExtracted = <T>(
    fieldPath: string,
    field: ExtractedField<T>,
  ): T | null => {
    if (field.provenance === "extracted" && field.value !== null) return field.value;
    findings.push(
      blockingFieldFinding(
        fieldPath,
        field.provenance === "unreadable" ? "unreadable" : "unstated",
        field.provenance === "unreadable" ? "the region did not parse" : "the document is legible but silent",
      ),
    );
    return null;
  };

  for (const region of record.unreadableRegions) {
    findings.push({
      ruleId: "sp-extraction-unreadable",
      kind: "unreadable",
      severity: "blocking",
      scope: region,
      message: `The invoice has an unreadable region (${region}). The verdict is withheld rather than reconciled against a partial document.`,
      fix: "Re-supply a legible copy of that region, or the provider's CSV/API export for the period, and re-run.",
    });
  }

  const provider = requireExtracted("provider", record.provider);
  const period = requireExtracted("period", record.period);
  const currency = requireExtracted("currency", record.currency);
  const totalMicroUsd = requireExtracted("totalMicroUsd", record.totalMicroUsd);

  if (record.lines.length === 0) {
    findings.push({
      ruleId: "sp-extraction-unstated",
      kind: "unstated",
      severity: "blocking",
      scope: "lines",
      message: "The extraction returned no line items for the invoice. The verdict is withheld.",
      fix: "Re-run the extraction against the invoice's line-item table, or supply the provider's line-item export.",
    });
  }

  const lines: InvoiceLine[] = [];
  record.lines.forEach((line, index) => {
    const position = index + 1;
    const lineProvider = {
      service: requireExtracted(`line${position}.service`, line.service),
      model: requireExtracted(`line${position}.model`, line.model),
      sku: requireExtracted(`line${position}.sku`, line.sku),
      quantity: requireExtracted(`line${position}.quantity`, line.quantity),
      unitPrice: requireExtracted(
        `line${position}.unit_price`,
        line.unitPriceMicroUsdPerThousandUnits,
      ),
      amount: requireExtracted(`line${position}.amount`, line.amountMicroUsd),
    };
    if (
      lineProvider.service === null ||
      lineProvider.model === null ||
      lineProvider.sku === null ||
      lineProvider.quantity === null ||
      lineProvider.unitPrice === null ||
      lineProvider.amount === null
    ) {
      return;
    }
    lines.push({
      service: lineProvider.service,
      model: lineProvider.model,
      sku: lineProvider.sku,
      quantity: lineProvider.quantity,
      unitPriceMicroUsdPerThousandUnits: lineProvider.unitPrice,
      amountMicroUsd: lineProvider.amount,
    });
  });

  const blocked = findings.length > 0;
  if (blocked || provider === null || period === null || currency === null || totalMicroUsd === null) {
    return { invoice: null, findings, blocked: true, labels };
  }

  return {
    invoice: { provider, period, currency, totalMicroUsd, lines },
    findings,
    blocked: false,
    labels,
  };
}

/**
 * Pulls the JSON record out of a model response body, or throws loudly.
 *
 * The schema asks for ONE object, so the payload is read AS JSON FIRST — the earlier version sliced
 * from the first `{` to the last `}`, which silently fabricates invalid JSON out of any other shape
 * (`{"a":…},{"b":…}` — the top-level array this model actually returns when it answers per line).
 * A payload that is not a single record is refused with its shape named; records are never merged,
 * because merging them would be the reader inventing the invoice.
 */
export function readStructuredJsonFromModelResponse(rawBody: string): unknown {
  let envelope: unknown;
  try {
    envelope = JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      `The extraction model returned a body that is not JSON (${error instanceof Error ? error.message : "parse failure"}). Nothing was extracted and nothing was reconciled.`,
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
      "The extraction model returned no text for the invoice. Nothing was extracted and nothing was reconciled.",
    );
  }

  const asJson = tryParseJson(text);
  if (asJson.ok) {
    const value = asJson.value;
    if (isPlainObject(value)) return value;
    if (Array.isArray(value) && value.length === 1 && isPlainObject(value[0])) return value[0];
    if (Array.isArray(value)) {
      throw new Error(
        `The extraction model returned ${value.length} records where ONE invoice record was required (one object per line instead of one object with a "lines" array). They are NOT merged and nothing was extracted.`,
      );
    }
    throw new Error(
      "The extraction model returned a JSON value that is not an invoice record. Nothing was extracted and nothing was reconciled.",
    );
  }

  // A response wrapped in prose or a code fence: take the outermost object, which is the only slice
  // that can be read without inventing structure.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const sliced = tryParseJson(text.slice(start, end + 1));
    if (sliced.ok && isPlainObject(sliced.value)) return sliced.value;
  }
  throw new Error(
    `The extraction model did not return a JSON object (${text.trim().slice(0, 120)}…). Nothing was extracted and nothing was reconciled.`,
  );
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Step 2 — the LLM structured extraction.
 *
 * The model reads the parsed text and fills the declared field set. It runs with temperature 0, and
 * whatever it returns is normalized by `readExtractionPayload`, which downgrades any field it cannot
 * fill to `unstated`. A response that cannot be parsed is an explicit error, never an empty record.
 */
export async function extractStructuredFields(input: {
  documentText: string;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<ExtractedInvoiceRecord> {
  const response = await input.transport({
    url: `${EXTRACTION_MODEL_ENDPOINT}/${input.credentials.model}:generateContent`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.credentials.modelKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildExtractionPrompt(input.documentText) }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    throw new Error(
      `The extraction model rejected the invoice (HTTP ${response.status}). Nothing was extracted and nothing was reconciled.`,
    );
  }
  return readExtractionPayload(readStructuredJsonFromModelResponse(await response.text()));
}
