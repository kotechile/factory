/**
 * The extraction layer — IN FRONT of the engine, and extraction ONLY.
 *
 * Two documents arrive: the award terms / notice of award and the federal payment system's drawdown
 * statement. A document-parsing service turns each into text; a model reads them and fills the
 * DECLARED FIELD SETS below. That is the whole job. It never computes a line identity, never
 * reconciles a dollar, never decides a verdict, and never fills a gap.
 *
 * The GL export and the approved budget are parsed deterministically (`./csv.ts`), never by a model.
 *
 * Rules enforced here (AGENTS.md rule 1, `context/tech_stack_capabilities.md` §2):
 *   1. EXTRACTION IS DECLARED. Every field carries `extracted|unreadable|unstated`, plus the page
 *      and the verbatim quote it was read from.
 *   2. FAILURE IS LOUD. A field the reader cannot resolve is `unstated` and BLOCKS the check that
 *      depends on it; an unreadable region withholds the whole run. There is no default and no
 *      estimate — the prior-approval threshold in particular is `unstated` when the terms do not
 *      state one, never a default percentage.
 *   3. THE NUMBER UNDER AUDIT IS NEVER DERIVED. If the statement does not print a subaccount
 *      total, the reader does NOT sum its rows to invent one — the printed total is the evidence.
 *   4. NO NEW SECRET SURFACE. Keys are read from the deploy env, server-side only, and their absence
 *      is a 503 naming the variable (never Gemini — retired 2026-11-02).
 */
import { formatBps } from "./money";
import type {
  AwardTerms,
  Declared,
  DrawdownStatement,
  DrawdownSubaccount,
  FieldProvenance,
  Finding,
} from "./types";

/** The declared field sets the extraction fills — the only things a reader may produce. */
export const DECLARED_AWARD_FIELDS = [
  "awardId",
  "authorizedFederalAmountCents",
  "periodOfPerformance.start",
  "periodOfPerformance.end",
  "requiredMatchPercentBps",
  "reportingFrequency",
  "priorApprovalThresholdBps",
  "agencyLineInstructions",
] as const;

export const DECLARED_DRAWDOWN_FIELDS = [
  "totalReceiptsCents",
  "totalDisbursementsCents",
  "subaccounts[].subaccount",
  "subaccounts[].receiptsCents",
  "subaccounts[].disbursementsCents",
] as const;

export const EXTRACTION_ENV = {
  modelKey: ["FFRPROOF_EXTRACTION_MODEL_KEY", "DEEPSEEK_API_KEY"],
  parseKey: ["FFRPROOF_PARSE_KEY", "LLAMAPARSE_API_KEY"],
  model: ["FFRPROOF_EXTRACTION_MODEL"],
} as const;

export const EXTRACTION_MODEL_ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
export const DEFAULT_EXTRACTION_MODEL = "deepseek-v4-pro";

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
export class FFRProofExtractionUnavailableError extends Error {
  readonly code = "ffrproof-extraction-unavailable";
  readonly ruleId = "ffrproof-extraction-unavailable";
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `FFRProof cannot read the award terms and drawdown statement: the deploy has no ${missing.join(
        " and no ",
      )}. Set the key in the deploy environment (server-side only) and re-run; nothing was extracted, nothing was estimated and nothing was audited.`,
    );
    this.name = "FFRProofExtractionUnavailableError";
    this.missing = missing;
  }
}

function firstDefined(env: Record<string, string | undefined>, names: readonly string[]): string | null {
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
  if (!modelKey) {
    throw new FFRProofExtractionUnavailableError([EXTRACTION_ENV.modelKey.join(" or ")]);
  }
  return {
    modelKey,
    parseKey,
    model: firstDefined(env, EXTRACTION_ENV.model) ?? DEFAULT_EXTRACTION_MODEL,
  };
}

/** The loud door on the document path: a PDF needs the parse service. */
export function requireParseKey(credentials: ExtractionCredentials): string {
  if (!credentials.parseKey) {
    throw new FFRProofExtractionUnavailableError([EXTRACTION_ENV.parseKey.join(" or ")]);
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
      typeof job.error_message === "string" && job.error_message.trim() ? job.error_message.trim() : null,
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
      throw new Error("The document is empty. Nothing was extracted and nothing was audited.");
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
    throw new Error("The document decoded to zero bytes. Nothing was extracted and nothing was audited.");
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

const AWARD_RECORD_EXAMPLE = `{
  "awardId": { "value": "FA-2026-0117", "provenance": "extracted", "page": 1, "quote": "Award No. FA-2026-0117" },
  "authorizedFederalAmountCents": { "value": 10000000, "provenance": "extracted", "page": 1, "quote": "Total federal funds authorized: $100,000.00" },
  "periodOfPerformance": {
    "start": { "value": "2025-10-01", "provenance": "extracted", "page": 1, "quote": "Period of performance: October 1, 2025" },
    "end": { "value": "2026-09-30", "provenance": "extracted", "page": 1, "quote": "through September 30, 2026" }
  },
  "requiredMatchPercentBps": { "value": 2000, "provenance": "extracted", "page": 2, "quote": "Recipient cost share: 20% of total project costs" },
  "reportingFrequency": { "value": "quarterly", "provenance": "extracted", "page": 3, "quote": "Financial reports are due quarterly" },
  "priorApprovalThresholdBps": { "value": null, "provenance": "unstated", "page": null, "quote": null },
  "agencyLineInstructions": { "value": null, "provenance": "unstated", "page": null, "quote": null },
  "unreadableRegions": []
}`;

const DRAWDOWN_RECORD_EXAMPLE = `{
  "totalReceiptsCents": { "value": 9499996, "provenance": "extracted", "page": 1, "quote": "Total receipts: $94,999.96" },
  "totalDisbursementsCents": { "value": 8500000, "provenance": "extracted", "page": 1, "quote": "Total disbursements: $85,000.00" },
  "subaccounts": [
    {
      "subaccount": { "value": "10-55-1000", "provenance": "extracted", "page": 1, "quote": "Subaccount 10-55-1000" },
      "receiptsCents": { "value": 6000000, "provenance": "extracted", "page": 1, "quote": "Receipts $60,000.00" },
      "disbursementsCents": { "value": 5500000, "provenance": "extracted", "page": 1, "quote": "Disbursements $55,000.00" }
    }
  ],
  "unreadableRegions": []
}`;

const FIELD_RULES = [
  "Every leaf field is an object of the form { \"value\": …, \"provenance\": …, \"page\": …, \"quote\": … },",
  "where provenance is exactly one of:",
  '  "extracted" — the value is legible on the document;',
  '  "unreadable" — the region could not be read (scan, redaction, corruption);',
  '  "unstated" — the document is legible but does not state the value.',
  'Set "value" to null for anything that is not "extracted" (and set "page" and "quote" to null too).',
  "\"page\" is the 1-based page number; \"quote\" is the verbatim text the value was read from.",
  "ALL MONEY IS AN INTEGER COUNT OF CENTS (1 USD = 100 cents): $100,000.00 is 10000000, $94,999.96 is 9499996.",
  "ALL PERCENTAGES ARE AN INTEGER COUNT OF BASIS POINTS (1% = 100 bps): 20% is 2000, 10% is 1000, 2.5% is 250.",
  "Never emit a decimal, a dollar sign or a thousands separator in a money or percentage field.",
  "DO NOT compute, estimate, infer or default any number. If a document does not state a value,",
  "that field is \"unstated\" — never 0 by convention. In particular, NEVER sum subaccount rows to",
  "invent a total the statement does not print: the printed total is the evidence under audit.",
];

/** The award-terms extraction prompt: read the award terms / notice of award, never guess. */
export function buildAwardExtractionPrompt(documentText: string): string {
  return [
    "You are reading ONE document: an award terms / notice of award for a federal grant.",
    "",
    "Return ONE JSON object with exactly this shape (the numbers here are an example, not this award's):",
    AWARD_RECORD_EXAMPLE,
    "",
    ...FIELD_RULES,
    "",
    "The reporting frequency is one of \"quarterly\", \"semi-annual\", \"annual\" or the verbatim cadence.",
    "The prior-approval threshold is the over/under percentage at which the award's own terms require",
    "prior approval. If the terms do not state one, mark it \"unstated\" — NEVER apply a default.",
    "The agency line instructions are any agency-specific instructions about how to fill the SF-425;",
    "mark them \"unstated\" when the terms carry none.",
    "",
    `The declared fields a reader may fill are: ${DECLARED_AWARD_FIELDS.join(", ")}.`,
    "",
    "Document text:",
    documentText,
  ].join("\n");
}

/** The drawdown-statement extraction prompt: read the payment system statement, never guess. */
export function buildDrawdownExtractionPrompt(documentText: string): string {
  return [
    "You are reading ONE document: a federal payment system drawdown statement for a grant subaccount.",
    "",
    "Return ONE JSON object with exactly this shape (the numbers here are an example, not this statement's):",
    DRAWDOWN_RECORD_EXAMPLE,
    "",
    ...FIELD_RULES,
    "",
    "\"subaccounts\" is an array with one entry per subaccount the statement lists.",
    "The totals are the statement's own PRINTED totals; do not sum the rows to produce them.",
    "",
    `The declared fields a reader may fill are: ${DECLARED_DRAWDOWN_FIELDS.join(", ")}.`,
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

/** Pulls the model's text out of the provider envelope (DeepSeek chat completions; the Gemini
 * `candidates` shape is still accepted so a pre-switch fixture parses identically). */
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
  const legacy = Array.isArray(parts)
    ? parts
        .filter((part) => (part as { thought?: unknown }).thought !== true)
        .map((part) => (part as { text?: unknown }).text)
        .filter((value): value is string => typeof value === "string")
        .join("")
    : "";
  const choices = (envelope as { choices?: unknown }).choices;
  const choice = Array.isArray(choices) ? (choices[0] as Record<string, unknown>) : null;
  const content = (choice?.message as { content?: unknown } | undefined)?.content;
  const text = typeof content === "string" && content.trim() ? content : legacy;
  if (!text.trim()) {
    throw new Error("The extraction model returned no text. Nothing was extracted and nothing was audited.");
  }
  return parseJsonEnvelope(text);
}

interface RawField {
  value?: unknown;
  provenance?: unknown;
  page?: unknown;
  quote?: unknown;
}

function labelOf(raw: unknown): { value: unknown; provenance: FieldProvenance } {
  const field = (raw ?? {}) as RawField;
  const provenance: FieldProvenance =
    field.provenance === "extracted" ||
    field.provenance === "unreadable" ||
    field.provenance === "unstated"
      ? field.provenance
      : "unstated";
  return { value: field.value, provenance };
}

function pageOf(raw: unknown): number | undefined {
  const page = (raw as RawField).page;
  return typeof page === "number" && Number.isInteger(page) ? page : undefined;
}

function quoteOf(raw: unknown): string | undefined {
  const quote = (raw as RawField).quote;
  return typeof quote === "string" && quote.trim() ? quote.trim() : undefined;
}

function asString(raw: unknown): Declared<string> {
  const { value, provenance } = labelOf(raw);
  if (provenance !== "extracted" || typeof value !== "string" || !value.trim()) {
    return { value: null, provenance: provenance === "extracted" ? "unstated" : provenance };
  }
  return { value: value.trim(), provenance, page: pageOf(raw), quote: quoteOf(raw) };
}

function asInteger(raw: unknown): Declared<number> {
  const { value, provenance } = labelOf(raw);
  if (provenance !== "extracted") return { value: null, provenance };
  let parsed = Number.NaN;
  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    parsed = Number(value.trim());
  }
  if (!Number.isSafeInteger(parsed)) return { value: null, provenance: "unstated" };
  return { value: parsed, provenance, page: pageOf(raw), quote: quoteOf(raw) };
}

export interface ExtractedAwardTermsRecord {
  awardTerms: AwardTerms;
  labels: string[];
  findings: Finding[];
  blocked: boolean;
}

/** Normalizes an untrusted award-terms extraction payload (or a caller's declared JSON). */
export function readAwardTermsRecord(payload: unknown): ExtractedAwardTermsRecord {
  const root = (payload ?? {}) as Record<string, unknown>;
  const findings: Finding[] = [];
  const labels: string[] = [];

  const readString = (raw: unknown, path: string): string | null => {
    const field = asString(raw);
    labels.push(`${path}=${field.provenance}`);
    if (field.provenance === "unreadable") {
      findings.push({
        ruleId: "ffr-extraction-unreadable",
        kind: "threshold_unstated",
        severity: "blocking",
        scope: path,
        message: `\`${path}\` is unreadable on the document. The check that depends on it is withheld: an unreadable region is never inferred.`,
        fix: "Re-supply a legible copy of that region and re-run.",
      });
    }
    return field.provenance === "extracted" ? field.value : null;
  };

  const readInt = (raw: unknown, path: string): number | null => {
    const field = asInteger(raw);
    labels.push(`${path}=${field.provenance}`);
    if (field.provenance === "unreadable") {
      findings.push({
        ruleId: "ffr-extraction-unreadable",
        kind: "threshold_unstated",
        severity: "blocking",
        scope: path,
        message: `\`${path}\` is unreadable on the document. The check that depends on it is withheld: an unreadable region is never inferred.`,
        fix: "Re-supply a legible copy of that region and re-run.",
      });
    }
    return field.provenance === "extracted" ? field.value : null;
  };

  const awardId = readString(root.awardId, "awardId");
  const authorized = readInt(root.authorizedFederalAmountCents, "authorizedFederalAmountCents");
  const rawPop = (root.periodOfPerformance ?? {}) as Record<string, unknown>;
  const popStart = readString(rawPop.start, "periodOfPerformance.start");
  const popEnd = readString(rawPop.end, "periodOfPerformance.end");
  const matchBps = readInt(root.requiredMatchPercentBps, "requiredMatchPercentBps");
  const reportingFrequency = readString(root.reportingFrequency, "reportingFrequency");
  const thresholdBps = readInt(root.priorApprovalThresholdBps, "priorApprovalThresholdBps");
  const agencyLineInstructions = readString(root.agencyLineInstructions, "agencyLineInstructions");

  const unreadableRegions = Array.isArray(root.unreadableRegions)
    ? root.unreadableRegions.filter((r): r is string => typeof r === "string")
    : [];
  for (const region of unreadableRegions) {
    findings.push({
      ruleId: "ffr-extraction-unreadable",
      kind: "threshold_unstated",
      severity: "blocking",
      scope: region,
      message: `The document has an unreadable region (${region}). The audit is withheld rather than computed against a partial document.`,
      fix: "Re-supply a legible copy of that page and re-run.",
    });
  }

  const blocked = findings.length > 0;

  return {
    awardTerms: {
      awardId,
      authorizedFederalAmountCents: authorized,
      periodOfPerformance: popStart && popEnd ? { start: popStart, end: popEnd } : null,
      requiredMatchPercentBps: matchBps,
      reportingFrequency,
      priorApprovalThresholdBps: thresholdBps,
      agencyLineInstructions,
    },
    labels,
    findings,
    blocked,
  };
}

export interface ExtractedDrawdownRecord {
  drawdown: DrawdownStatement;
  labels: string[];
  findings: Finding[];
  blocked: boolean;
}

/** Normalizes an untrusted drawdown extraction payload (or a caller's declared JSON). */
export function readDrawdownRecord(payload: unknown): ExtractedDrawdownRecord {
  const root = (payload ?? {}) as Record<string, unknown>;
  const findings: Finding[] = [];
  const labels: string[] = [];

  const readInt = (raw: unknown, path: string): number | null => {
    const field = asInteger(raw);
    labels.push(`${path}=${field.provenance}`);
    if (field.provenance === "unreadable") {
      findings.push({
        ruleId: "ffr-extraction-unreadable",
        kind: "cash_drift",
        severity: "blocking",
        scope: path,
        message: `\`${path}\` is unreadable on the statement. The reconciliation is withheld: an unreadable region is never inferred.`,
        fix: "Re-supply a legible copy of that region and re-run.",
      });
    }
    return field.provenance === "extracted" ? field.value : null;
  };

  const readString = (raw: unknown, path: string): string | null => {
    const field = asString(raw);
    labels.push(`${path}=${field.provenance}`);
    return field.provenance === "extracted" ? field.value : null;
  };

  const totalReceipts = readInt(root.totalReceiptsCents, "totalReceiptsCents");
  const totalDisbursements = readInt(root.totalDisbursementsCents, "totalDisbursementsCents");

  const rawSubaccounts = Array.isArray(root.subaccounts) ? root.subaccounts : [];
  const subaccounts: DrawdownSubaccount[] = [];
  for (const raw of rawSubaccounts) {
    const line = (raw ?? {}) as Record<string, unknown>;
    const subaccount = readString(line.subaccount, "subaccounts[].subaccount");
    const receipts = readInt(line.receiptsCents, "subaccounts[].receiptsCents");
    const disbursements = readInt(line.disbursementsCents, "subaccounts[].disbursementsCents");
    if (subaccount !== null && receipts !== null && disbursements !== null) {
      subaccounts.push({ subaccount, receiptsCents: receipts, disbursementsCents: disbursements });
    }
  }

  const unreadableRegions = Array.isArray(root.unreadableRegions)
    ? root.unreadableRegions.filter((r): r is string => typeof r === "string")
    : [];
  for (const region of unreadableRegions) {
    findings.push({
      ruleId: "ffr-extraction-unreadable",
      kind: "cash_drift",
      severity: "blocking",
      scope: region,
      message: `The statement has an unreadable region (${region}). The reconciliation is withheld rather than computed against a partial statement.`,
      fix: "Re-supply a legible copy of that page and re-run.",
    });
  }

  const blocked = findings.length > 0 || totalReceipts === null || totalDisbursements === null || subaccounts.length === 0;

  return {
    drawdown: {
      totalReceiptsCents: totalReceipts ?? 0,
      totalDisbursementsCents: totalDisbursements ?? 0,
      subaccounts,
    },
    labels,
    findings,
    blocked,
  };
}

async function callModel(input: {
  prompt: string;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<unknown> {
  const response = await input.transport({
    url: EXTRACTION_MODEL_ENDPOINT,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.credentials.modelKey}`,
    },
    body: JSON.stringify({
      model: input.credentials.model,
      messages: [{ role: "user", content: input.prompt }],
      temperature: 0,
      // DeepSeek bills reasoning inside `max_tokens`: keep headroom so a truncated answer stays loud.
      max_tokens: 16000,
      response_format: { type: "json_object" },
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `The extraction model rejected the document (HTTP ${response.status}). Nothing was extracted and nothing was audited.`,
    );
  }
  return readStructuredJsonFromModelResponse(await response.text());
}

/** Extracts the award terms from the notice of award (text, or PDF through the parse service). */
export async function extractAwardTerms(input: {
  document: SourceDocument;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<ExtractedAwardTermsRecord> {
  const text = await parseDocumentToText({
    document: input.document,
    credentials: input.credentials,
    transport: input.transport,
  });
  const payload = await callModel({
    prompt: buildAwardExtractionPrompt(text),
    credentials: input.credentials,
    transport: input.transport,
  });
  return readAwardTermsRecord(payload);
}

/** Extracts the drawdown statement (text, or PDF through the parse service). */
export async function extractDrawdown(input: {
  document: SourceDocument;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<ExtractedDrawdownRecord> {
  const text = await parseDocumentToText({
    document: input.document,
    credentials: input.credentials,
    transport: input.transport,
  });
  const payload = await callModel({
    prompt: buildDrawdownExtractionPrompt(text),
    credentials: input.credentials,
    transport: input.transport,
  });
  return readDrawdownRecord(payload);
}

/** A human-readable description of the award's required match and threshold, for the UI context line. */
export function describeAwardTerms(terms: AwardTerms): string {
  const parts: string[] = [];
  if (terms.requiredMatchPercentBps !== null) {
    parts.push(`required match ${formatBps(terms.requiredMatchPercentBps)}`);
  }
  if (terms.priorApprovalThresholdBps !== null) {
    parts.push(`prior-approval threshold ${formatBps(terms.priorApprovalThresholdBps)}`);
  } else {
    parts.push("no stated prior-approval threshold");
  }
  if (terms.reportingFrequency !== null) {
    parts.push(`${terms.reportingFrequency} reporting`);
  }
  return parts.length > 0 ? parts.join(" · ") : "award terms stated no thresholds";
}
