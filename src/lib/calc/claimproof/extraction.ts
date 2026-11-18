/**
 * The extraction layer — IN FRONT of the engine, and extraction ONLY.
 *
 * Two documents arrive: the manufacturer's remittance / payment advice and the shop's filed claim.
 * A document-parsing service turns each into text; a model reads them and fills the DECLARED FIELD
 * SET below. That is the whole job. It never computes an allowance, never prices labour, never
 * decides a verdict, and never fills a gap.
 *
 * Rules enforced here (AGENTS.md rule 1, `context/tech_stack_capabilities.md` §2):
 *   1. EXTRACTION IS DECLARED. Every field carries `extracted|unreadable|unstated`, plus the page and
 *      the verbatim quote it was read from.
 *   2. FAILURE IS LOUD. A field the reader cannot resolve is `unstated` and BLOCKS that line; a region
 *      it could not read withholds the whole run. There is no default and no estimate.
 *   3. THE NUMBER UNDER AUDIT IS NEVER DERIVED. If the remittance does not print what it paid for
 *      labour, the reader does NOT recompute it from hours × rate — the paid amount is the evidence
 *      being audited.
 *   4. NO NEW SECRET SURFACE. Keys are read from the deploy env, server-side only, and their absence
 *      is a 503 naming the variable (never Gemini — retired 2026-11-02).
 *   5. THE PARSE CONTRACT IS THE SERVICE'S REAL ONE: multipart upload → poll → markdown result.
 */
import type {
  Claim,
  Declared,
  FeeKey,
  FieldProvenance,
  Finding,
  LabourSchedule,
  Payment,
} from "./types";
import { scheduleRepairCodes } from "./schedules";

/** The declared field set the extraction fills — the only things a reader may produce. */
export const DECLARED_FIELDS = [
  "claimId",
  "model",
  "serial",
  "serviceDate",
  "laborRateCentsPerHour",
  "repairs[].code",
  "repairs[].description",
  "repairs[].hoursClaimedTenths",
  "partsCents",
  "travel.milesOneWay",
  "travel.hoursClaimedTenths",
  "travel.claimedCents",
  "fees.nitrogen",
  "fees.miscMaterials",
  "fees.reclaim",
  "payment.laborCents",
  "payment.partsCents",
  "payment.travelCents",
  "payment.fees.nitrogen",
  "payment.fees.miscMaterials",
  "payment.fees.reclaim",
] as const;

export const EXTRACTION_ENV = {
  modelKey: ["CLAIMPROOF_EXTRACTION_MODEL_KEY", "DEEPSEEK_API_KEY"],
  parseKey: ["CLAIMPROOF_PARSE_KEY", "LLAMAPARSE_API_KEY"],
  model: ["CLAIMPROOF_EXTRACTION_MODEL"],
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
export class ClaimProofExtractionUnavailableError extends Error {
  readonly code = "claimproof-extraction-unavailable";
  readonly ruleId = "claimproof-extraction-unavailable";
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `ClaimProof cannot read the remittance and claim documents: the deploy has no ${missing.join(
        " and no ",
      )}. Set the key in the deploy environment (server-side only) and re-run; nothing was extracted, nothing was estimated and nothing was audited.`,
    );
    this.name = "ClaimProofExtractionUnavailableError";
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
    throw new ClaimProofExtractionUnavailableError([EXTRACTION_ENV.modelKey.join(" or ")]);
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
    throw new ClaimProofExtractionUnavailableError([EXTRACTION_ENV.parseKey.join(" or ")]);
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

/** The one record the extraction must return: the claim + the remittance, every field labelled. */
export const RECORD_EXAMPLE = `{
  "claimId": { "value": "CL-2026-0041", "provenance": "extracted", "page": 1, "quote": "Claim CL-2026-0041" },
  "model": { "value": "GDM-49F", "provenance": "extracted", "page": 1, "quote": "Model: GDM-49F" },
  "serial": { "value": "TRU-8821-113", "provenance": "extracted", "page": 1, "quote": "Serial: TRU-8821-113" },
  "serviceDate": { "value": "2026-06-01", "provenance": "extracted", "page": 1, "quote": "Date Repaired: 6/1/2026" },
  "laborRateCentsPerHour": { "value": 12000, "provenance": "extracted", "page": 1, "quote": "Labor Rate Per Hour: $120.00" },
  "repairs": [
    {
      "code": { "value": "refrig-compressor", "provenance": "extracted", "page": 1, "quote": "replaced defective compressor" },
      "description": { "value": "Diagnose and replace defective compressor", "provenance": "extracted", "page": 1, "quote": "replaced defective compressor" },
      "hoursClaimedTenths": { "value": 50, "provenance": "extracted", "page": 1, "quote": "5.0 hrs" }
    }
  ],
  "partsCents": { "value": 25000, "provenance": "extracted", "page": 2, "quote": "Part Reimbursement: $250.00" },
  "travel": {
    "milesOneWay": { "value": 22, "provenance": "extracted", "page": 1, "quote": "22 miles one way" },
    "hoursClaimedTenths": { "value": 10, "provenance": "extracted", "page": 1, "quote": "Travel Hours: 1.0" },
    "claimedCents": { "value": 12000, "provenance": "extracted", "page": 1, "quote": "Travel $120.00" }
  },
  "fees": {
    "nitrogen": { "value": 1200, "provenance": "extracted", "page": 1, "quote": "Nitrogen Usage Fee: $12.00" },
    "miscMaterials": { "value": 4000, "provenance": "extracted", "page": 1, "quote": "Miscellaneous Material Fee: $40.00" },
    "reclaim": { "value": 3000, "provenance": "extracted", "page": 1, "quote": "Reclaim Fee: $30.00" }
  },
  "payment": {
    "laborCents": { "value": 54000, "provenance": "extracted", "page": 2, "quote": "Labor Paid: $540.00" },
    "partsCents": { "value": 25000, "provenance": "extracted", "page": 2, "quote": "Parts Paid: $250.00" },
    "travelCents": { "value": 12000, "provenance": "extracted", "page": 2, "quote": "Travel Paid: $120.00" },
    "fees": {
      "nitrogen": { "value": 1200, "provenance": "extracted", "page": 2, "quote": "Nitrogen: $12.00" },
      "miscMaterials": { "value": 4000, "provenance": "extracted", "page": 2, "quote": "Misc Materials: $40.00" },
      "reclaim": { "value": 3000, "provenance": "extracted", "page": 2, "quote": "Reclaim: $30.00" }
    }
  },
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
  "ALL MONEY IS AN INTEGER COUNT OF CENTS (1 USD = 100 cents): $12.00 is 1200, $120.00 is 12000.",
  "ALL TIME IS AN INTEGER COUNT OF TENTHS OF AN HOUR: 4.5 h is 45, 1.0 h is 10.",
  "Never emit a decimal, a dollar sign or a thousands separator in a money or time field.",
  "DO NOT compute, estimate, infer or default any number. If a document does not state a value,",
  "that field is \"unstated\" — never 0 by convention. In particular, NEVER derive the paid labour",
  "amount from hours × rate: the paid amount is the evidence under audit, and deriving it would",
  "fabricate the very number the audit exists to check.",
];

/** The extraction prompt: read both documents into the record above, never guess. */
export function buildExtractionPrompt(documentText: string, schedule: LabourSchedule): string {
  const codes = scheduleRepairCodes(schedule);
  return [
    "You are reading TWO documents about ONE warranty labour claim:",
    "  (1) the shop's filed claim form, and",
    "  (2) the manufacturer's remittance / payment advice.",
    "",
    "Return ONE JSON object with exactly this shape (the numbers here are an example, not this claim's):",
    RECORD_EXAMPLE,
    "",
    ...FIELD_RULES,
    "",
    `The repair code in each "repairs" entry MUST be one of the schedule's codes — a NORMALIZED LABEL,`,
    `not a number. The allowed codes are: ${codes.join(", ")}. Match the filed repair description to the`,
    `closest code; if none matches, set the code's provenance to "unstated" and keep the description`,
    `extracted. "repairs" is an array with one entry per repair the claim lists.`,
    "",
    "If the claim has no travel charge, set \"travel\" to null. If a fee line is stated as $0 or blank,",
    'mark it "extracted" with value 0; only mark a fee "unstated" when the document has no such line at all.',
    "List every region you could not read in \"unreadableRegions\".",
    "",
    `The declared fields a reader may fill are: ${DECLARED_FIELDS.join(", ")}.`,
    "",
    "Document text (claim form, then remittance):",
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
    // Only a pure-integer string is accepted: "12.00" or "$12" would silently become a wrong value,
    // so they are refused as unstated (loud) rather than misread.
    parsed = Number(value.trim());
  }
  if (!Number.isSafeInteger(parsed)) return { value: null, provenance: "unstated" };
  return { value: parsed, provenance, page: pageOf(raw), quote: quoteOf(raw) };
}

const FEE_FIELDS: FeeKey[] = ["nitrogen", "miscMaterials", "reclaim"];

export interface ExtractedClaimRecord {
  claim: Claim;
  payment: Payment;
  labels: string[];
  unreadableRegions: string[];
  blocked: boolean;
  findings: Finding[];
}

/** Normalizes an untrusted extraction payload (or a caller's declared JSON) into the record. */
export function readClaimRecord(payload: unknown): ExtractedClaimRecord {
  const root = (payload ?? {}) as Record<string, unknown>;
  const unreadableRegions = Array.isArray(root.unreadableRegions)
    ? root.unreadableRegions.filter((region): region is string => typeof region === "string")
    : [];

  const findings: Finding[] = [];
  const labels: string[] = [];
  const block = (fieldPath: string, provenance: FieldProvenance) => {
    findings.push({
      ruleId: provenance === "unreadable" ? "cp-extraction-unreadable" : "cp-extraction-unstated",
      kind: "repair_unstated",
      severity: "blocking",
      scope: fieldPath,
      message:
        provenance === "unreadable"
          ? `\`${fieldPath}\` is unreadable on the document. The verdict is withheld: an unreadable region is never inferred.`
          : `\`${fieldPath}\` is not stated on the document. The verdict is withheld: a missing declared value is never estimated.`,
      fix:
        provenance === "unreadable"
          ? "Re-supply a legible copy of that region and re-run."
          : "Supply the missing field from the claim or the remittance; nothing is filled in for you.",
    });
  };

  const requireString = (raw: unknown, path: string): string | null => {
    const field = asString(raw);
    labels.push(`${path}=${field.provenance}`);
    if (field.provenance !== "extracted" || field.value === null) {
      block(path, field.provenance);
      return null;
    }
    return field.value;
  };

  const requireInt = (raw: unknown, path: string): number | null => {
    const field = asInteger(raw);
    labels.push(`${path}=${field.provenance}`);
    if (field.provenance !== "extracted" || field.value === null) {
      block(path, field.provenance);
      return null;
    }
    return field.value;
  };

  const claimId = requireString(root.claimId, "claimId");
  const model = requireString(root.model, "model");
  const serial = requireString(root.serial, "serial");
  const serviceDate = requireString(root.serviceDate, "serviceDate");
  const laborRate = requireInt(root.laborRateCentsPerHour, "laborRateCentsPerHour");
  const partsCents = requireInt(root.partsCents, "partsCents");

  const rawRepairs = Array.isArray(root.repairs) ? root.repairs : [];
  if (rawRepairs.length === 0) {
    block("repairs", "unstated");
  }
  const repairs = rawRepairs.map((raw, index) => {
    const line = (raw ?? {}) as Record<string, unknown>;
    const pos = index + 1;
    const code = requireString(line.code, `repairs[${pos}].code`);
    const description = requireString(line.description, `repairs[${pos}].description`);
    const hours = requireInt(line.hoursClaimedTenths, `repairs[${pos}].hoursClaimedTenths`);
    return { code: code ?? "", description: description ?? "", hoursClaimedTenths: hours ?? 0 };
  });

  const rawTravel = root.travel;
  let travel: { milesOneWay: number; hoursClaimedTenths: number; claimedCents: number } | null = null;
  if (rawTravel !== null && rawTravel !== undefined) {
    const t = (rawTravel ?? {}) as Record<string, unknown>;
    const miles = requireInt(t.milesOneWay, "travel.milesOneWay");
    const hours = requireInt(t.hoursClaimedTenths, "travel.hoursClaimedTenths");
    const cents = requireInt(t.claimedCents, "travel.claimedCents");
    if (miles !== null && hours !== null && cents !== null) {
      travel = { milesOneWay: miles, hoursClaimedTenths: hours, claimedCents: cents };
    }
  } else {
    labels.push("travel=absent");
  }

  const rawFees = (root.fees ?? {}) as Record<string, unknown>;
  const feeValues: Record<FeeKey, number> = { nitrogen: 0, miscMaterials: 0, reclaim: 0 };
  for (const key of FEE_FIELDS) {
    const value = requireInt(rawFees[key], `fees.${key}`);
    feeValues[key] = value ?? 0;
  }

  const rawPayment = (root.payment ?? {}) as Record<string, unknown>;
  const paidLabor = requireInt(rawPayment.laborCents, "payment.laborCents");
  const paidParts = requireInt(rawPayment.partsCents, "payment.partsCents");
  const paidTravel = requireInt(rawPayment.travelCents, "payment.travelCents");
  const rawPaidFees = (rawPayment.fees ?? {}) as Record<string, unknown>;
  const paidFeeValues: Record<FeeKey, number> = { nitrogen: 0, miscMaterials: 0, reclaim: 0 };
  for (const key of FEE_FIELDS) {
    const value = requireInt(rawPaidFees[key], `payment.fees.${key}`);
    paidFeeValues[key] = value ?? 0;
  }

  for (const region of unreadableRegions) {
    findings.push({
      ruleId: "cp-extraction-unreadable",
      kind: "repair_unstated",
      severity: "blocking",
      scope: region,
      message: `The document has an unreadable region (${region}). The audit is withheld rather than computed against a partial document.`,
      fix: "Re-supply a legible copy of that page and re-run.",
    });
  }

  const blocked =
    findings.length > 0 ||
    claimId === null ||
    model === null ||
    serial === null ||
    serviceDate === null ||
    laborRate === null ||
    partsCents === null ||
    paidLabor === null ||
    paidParts === null ||
    paidTravel === null ||
    rawRepairs.length === 0;

  if (blocked) {
    return {
      claim: {} as Claim,
      payment: {} as Payment,
      labels,
      unreadableRegions,
      blocked: true,
      findings,
    };
  }

  const claim: Claim = {
    claimId: claimId as string,
    oemSlug: "",
    model: model as string,
    serial: serial as string,
    serviceDate: serviceDate as string,
    laborRateCentsPerHour: laborRate as number,
    repairs: repairs.map((repair) => ({
      code: repair.code,
      description: repair.description,
      hoursClaimedTenths: repair.hoursClaimedTenths,
    })),
    travel: travel
      ? {
          milesOneWay: travel.milesOneWay,
          hoursClaimedTenths: travel.hoursClaimedTenths,
          claimedCents: travel.claimedCents,
        }
      : null,
    partsCents: partsCents as number,
    fees: FEE_FIELDS.map((key) => ({ key, claimedCents: feeValues[key] })),
  };

  const payment: Payment = {
    laborCents: paidLabor as number,
    partsCents: paidParts as number,
    travelCents: paidTravel as number,
    fees: paidFeeValues,
    totalCents:
      (paidLabor as number) +
      (paidParts as number) +
      (paidTravel as number) +
      FEE_FIELDS.reduce((sum, key) => sum + paidFeeValues[key], 0),
  };

  return { claim, payment, labels, unreadableRegions, blocked: false, findings };
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
      // DeepSeek bills reasoning inside `max_tokens`: keep headroom so a truncated answer stays a loud failure.
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

/**
 * Extracts the claim + payment from the two documents (text, or PDFs through the parse service).
 * The `schedule` supplies the repair-code list for label normalization.
 */
export async function extractClaim(input: {
  documents: { claim: SourceDocument; remittance: SourceDocument };
  schedule: LabourSchedule;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<ExtractedClaimRecord> {
  const claimText = await parseDocumentToText({
    document: input.documents.claim,
    credentials: input.credentials,
    transport: input.transport,
  });
  const remittanceText = await parseDocumentToText({
    document: input.documents.remittance,
    credentials: input.credentials,
    transport: input.transport,
  });
  const payload = await callModel({
    prompt: buildExtractionPrompt(
      `===== FILED CLAIM =====\n${claimText}\n\n===== REMITTANCE / PAYMENT ADVICE =====\n${remittanceText}`,
      input.schedule,
    ),
    credentials: input.credentials,
    transport: input.transport,
  });
  return readClaimRecord(payload);
}
