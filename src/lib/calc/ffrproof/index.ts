/**
 * FFRProof engine entry points.
 *
 * `auditFfr` is the deterministic pre-flight audit: the SF-425 worksheet cross-footed against its
 * own four line identities, reconciled against the payment system's drawdown statement, matched
 * against the required recipient share, budget-variance-checked against the award's own
 * prior-approval threshold, and differenced against the prior filing. The extraction layer
 * (`./extraction.ts`) sits IN FRONT of this engine and extracts only: it fills declared fields,
 * labels every one, and blocks the check that depends on what it cannot read. No number in a report
 * comes from it.
 *
 * No I/O, no network, no LLM, no clock in this folder: everything here is fixture-testable offline.
 */
import {
  auditFfr,
  budgetVariance,
  crossFoot,
  ENGINE_ID,
  ENGINE_VERSION,
  matchTest,
  periodVsCumulative,
  reconcileCash,
  termsConsistency,
} from "./engine";

export {
  auditFfr,
  budgetVariance,
  crossFoot,
  ENGINE_ID,
  ENGINE_VERSION,
  matchTest,
  periodVsCumulative,
  reconcileCash,
  termsConsistency,
};

export * from "./types";
export {
  FFRProofFieldError,
  BASIS_POINTS_PER_PERCENT,
  CENTS_PER_USD,
  formatBps,
  formatCents,
  formatCentsSigned,
  parseUsdToCents,
  requireInteger,
} from "./money";
export {
  parseApprovedBudgetCsv,
  parseCsvRows,
  parseGlExportCsv,
  BUDGET_HEADERS,
  GL_HEADERS,
} from "./csv";
export {
  DECLARED_AWARD_FIELDS,
  DECLARED_DRAWDOWN_FIELDS,
  DEFAULT_EXTRACTION_MODEL,
  EXTRACTION_ENV,
  EXTRACTION_MODEL_ENDPOINT,
  FFRProofExtractionUnavailableError,
  PARSE_ENDPOINT_BASE,
  PARSE_MAX_DOCUMENT_BYTES,
  PARSE_POLL_INTERVAL_MS,
  PARSE_POLL_MAX_ATTEMPTS,
  PARSE_UPLOAD_ENDPOINT,
  buildAwardExtractionPrompt,
  buildDrawdownExtractionPrompt,
  decodeBase64Document,
  describeAwardTerms,
  extractAwardTerms,
  extractDrawdown,
  parseDocumentToText,
  parseJobEndpoint,
  parseResultEndpoint,
  readAwardTermsRecord,
  readDrawdownRecord,
  readParseJobId,
  readParseJobStatus,
  readParseMarkdownResult,
  readStructuredJsonFromModelResponse,
  requireParseKey,
  resolveExtractionCredentials,
} from "./extraction";
export {
  readCompositeInput,
  readReport,
  toAuditInput,
} from "./read";
export { DEFAULT_SCENARIO_JSON, DEFAULT_SCENARIO_RECORD } from "./fixtures";
export type {
  CompositeInput,
} from "./read";
export type {
  ExtractionCredentials,
  ExtractionTransport,
  ExtractionTransportRequest,
  ExtractionTransportResponse,
  ExtractedAwardTermsRecord,
  ExtractedDrawdownRecord,
  SourceDocument,
} from "./extraction";
