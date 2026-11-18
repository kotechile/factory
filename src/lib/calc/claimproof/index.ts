/**
 * ClaimProof engine entry points.
 *
 * `auditClaim` is the deterministic audit: a filed warranty claim against the manufacturer's
 * vendored, version-stamped labour schedule → per-line variance (rule, page, dollars) and a
 * resubmission summary. The extraction layer (`./extraction.ts`) sits IN FRONT of this engine and
 * extracts only: it fills declared fields, labels every one, and blocks on what it cannot read.
 * No number in a report comes from it.
 *
 * No I/O, no network, no LLM, no clock in this folder: everything here is fixture-testable offline.
 */
import { auditClaim, allowanceFor, expectedPayment, variance, ENGINE_ID, ENGINE_VERSION, FEE_KEYS } from "./engine";
import { scheduleBySlug, isStaleSchedule, SCHEDULE_SLUGS, TRUEMFG_2022_06 } from "./schedules";

export { auditClaim, allowanceFor, expectedPayment, variance, ENGINE_ID, ENGINE_VERSION, FEE_KEYS };
export { scheduleBySlug, isStaleSchedule, SCHEDULE_SLUGS, TRUEMFG_2022_06 };

export * from "./types";
export {
  ClaimProofFieldError,
  CENTS_PER_USD,
  TENTHS_PER_HOUR,
  formatCents,
  formatCentsSigned,
  formatTenths,
  laborCents,
  parseHoursToTenths,
  parseUsdToCents,
  requireInteger,
} from "./money";
export {
  DECLARED_FIELDS,
  DEFAULT_EXTRACTION_MODEL,
  EXTRACTION_ENV,
  EXTRACTION_MODEL_ENDPOINT,
  ClaimProofExtractionUnavailableError,
  PARSE_ENDPOINT_BASE,
  PARSE_MAX_DOCUMENT_BYTES,
  PARSE_POLL_INTERVAL_MS,
  PARSE_POLL_MAX_ATTEMPTS,
  PARSE_UPLOAD_ENDPOINT,
  RECORD_EXAMPLE,
  buildExtractionPrompt,
  decodeBase64Document,
  extractClaim,
  parseDocumentToText,
  parseJobEndpoint,
  parseResultEndpoint,
  readClaimRecord,
  readParseJobId,
  readParseJobStatus,
  readParseMarkdownResult,
  readStructuredJsonFromModelResponse,
  requireParseKey,
  resolveExtractionCredentials,
} from "./extraction";
export {
  CLAIMPROOF_SCENARIOS,
  DEFAULT_SCENARIO,
  DEFAULT_SCENARIO_RECORD,
  scenarioByKey,
} from "./fixtures";
export type { ClaimProofScenario } from "./fixtures";
export type {
  ExtractionCredentials,
  ExtractionTransport,
  ExtractionTransportRequest,
  ExtractionTransportResponse,
  ExtractedClaimRecord,
  SourceDocument,
} from "./extraction";
