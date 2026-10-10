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
  parseKey: string;
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
 * Throws `ExtractionUnavailableError` naming every missing variable — never returns a partial set.
 */
export function resolveExtractionCredentials(
  env: Record<string, string | undefined> = process.env,
): ExtractionCredentials {
  const modelKey = firstDefined(env, EXTRACTION_ENV.modelKey);
  const parseKey = firstDefined(env, EXTRACTION_ENV.parseKey);
  const missing: string[] = [];
  if (!modelKey) missing.push(EXTRACTION_ENV.modelKey.join(" or "));
  if (!parseKey) missing.push(EXTRACTION_ENV.parseKey.join(" or "));
  if (!modelKey || !parseKey) throw new ExtractionUnavailableError(missing);
  return {
    modelKey,
    parseKey,
    model: firstDefined(env, EXTRACTION_ENV.model) ?? DEFAULT_EXTRACTION_MODEL,
  };
}

export interface ExtractionTransportRequest {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
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

const PARSE_ENDPOINT = "https://api.cloud.llamaindex.ai/api/parsing/upload";

/** Step 1 — the document parse. Returns the document's text, or throws loudly. */
export async function parseDocumentText(input: {
  documentText: string;
  documentName: string;
  credentials: ExtractionCredentials;
  transport: ExtractionTransport;
}): Promise<string> {
  const response = await input.transport({
    url: PARSE_ENDPOINT,
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.credentials.parseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: input.documentName, content: input.documentText }),
  });
  if (!response.ok) {
    throw new Error(
      `The document-parse service rejected the invoice (HTTP ${response.status}). Nothing was extracted and nothing was reconciled.`,
    );
  }
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(
      "The document-parse service returned no text for the invoice. Nothing was extracted and nothing was reconciled.",
    );
  }
  return body;
}

/** The structured-extraction prompt: read the fields, mark what you cannot read, never guess. */
export function buildExtractionPrompt(documentText: string): string {
  return [
    "You are reading ONE AI provider invoice. Return ONLY JSON matching the declared field set.",
    `Declared fields: ${DECLARED_FIELD_SET.join(", ")}.`,
    "For EVERY field, set `provenance` to exactly one of:",
    '  "extracted" — the value is legible on the document;',
    '  "unreadable" — the region could not be read (scan, redaction, corruption);',
    '  "unstated" — the document is legible but does not state the field.',
    'Set `value` to null for anything that is not "extracted".',
    "DO NOT compute, estimate, infer or default any number. If the amount is not printed, it is",
    "unstated — do not multiply quantity by unit price. If any region of the document is unreadable,",
    "list it in `unreadableRegions`.",
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

/** Pulls the JSON object out of a model response body, or throws loudly. */
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
        .map((part) => (part as { text?: unknown }).text)
        .filter((value): value is string => typeof value === "string")
        .join("\n")
    : "";
  if (!text.trim()) {
    throw new Error(
      "The extraction model returned no text for the invoice. Nothing was extracted and nothing was reconciled.",
    );
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(
      `The extraction model did not return a JSON object (${text.trim().slice(0, 120)}…). Nothing was extracted and nothing was reconciled.`,
    );
  }
  return JSON.parse(text.slice(start, end + 1));
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
