/**
 * RatchetProof engine entry points.
 *
 * `auditDemandBilling` is the deterministic audit: aligned interval data + a declared tariff + the
 * bills that were charged → per-month variance, the peak event, the ratchet ledger and the carry-over.
 *
 * `auditFromText` drives the same engine from the three files an operator actually has (interval
 * export, tariff declaration, bills). The extraction layer (`./extraction.ts`) sits IN FRONT of this
 * engine and extracts only: it fills declared fields, labels every one, and blocks on what it cannot
 * read. No number in a report comes from it.
 *
 * No I/O, no network, no LLM, no clock in this folder: everything here is fixture-testable offline.
 */
import { auditDemandBilling } from "./audit";
import { parseBillsCsv, parseIntervalFile, parseTariffJson } from "./csv";
import { RatchetProofFieldError } from "./money";
import { ENGINE_METADATA } from "./coverage";
import type {
  AuditReport,
  MeterSeries,
  PeakHistoryEntry,
  Tariff,
} from "./types";

export { auditDemandBilling, ENGINE_METADATA };
export { billedDemand, validateHistory } from "./demand";
export { carryOver } from "./ledger";
export {
  align,
  billingWindow,
  epochMinuteOf,
  isoFromEpochMinute,
  monthKeyOf,
  previousMonth,
  windowIncludes,
  type BillingWindowFilter,
} from "./grid";
export { billableWindowPeaks, buildAuditHistory, historyForMonth } from "./history";
export {
  RatchetProofFieldError,
  MICROS_PER_CENT,
  MICROS_PER_USD,
  MILLI_KW_PER_KW,
  applyBasisPoints,
  demandChargeMicroUsd,
  formatKw,
  formatMicros,
  formatMicrosSigned,
  formatRate,
  parseKilowatts,
  parsePercentToBasisPoints,
  parseScaledDecimal,
  parseUsdToMicros,
  peakRequiredForFloor,
  requireInteger,
} from "./money";
export {
  parseBillsCsv,
  parseIntervalFile,
  parseTariffJson,
  usdPerKwToMicros,
  type IntervalFileResult,
} from "./csv";
export {
  COVERAGE_NOTE,
  DEMAND_TOLERANCE_MILLI_KW,
  IMPLEMENTED_RULE_IDS,
  UNSUPPORTED_FAMILIES,
} from "./coverage";
export * from "./types";
export {
  BILL_RECORD_KEYS,
  DECLARED_BILL_FIELDS,
  DECLARED_TARIFF_FIELDS,
  DEFAULT_EXTRACTION_MODEL,
  EXTRACTION_ENV,
  EXTRACTION_MODEL_ENDPOINT,
  PARSE_MAX_DOCUMENT_BYTES,
  PARSE_POLL_INTERVAL_MS,
  PARSE_POLL_MAX_ATTEMPTS,
  PARSE_UPLOAD_ENDPOINT,
  RatchetProofExtractionUnavailableError,
  TARIFF_RECORD_EXAMPLE,
  TARIFF_RECORD_KEYS,
  buildBillsExtractionPrompt,
  buildTariffExtractionPrompt,
  decodeBase64Document,
  extractBills,
  extractTariff,
  labelledBillFields,
  labelledTariffFields,
  parseDocumentToText,
  parseJobEndpoint,
  parseResultEndpoint,
  readBillsPayload,
  readParseJobId,
  readParseJobStatus,
  readParseMarkdownResult,
  readStructuredJsonFromModelResponse,
  readTariffPayload,
  requireParseKey,
  resolveExtractionCredentials,
  unreadableRegionFindings,
  type ExtractionCredentials,
  type ExtractionTransport,
  type ExtractionTransportRequest,
  type ExtractionTransportResponse,
  type SourceDocument,
} from "./extraction";
export {
  DEFAULT_SCENARIO,
  FIXTURE_PEAKS,
  RATCHETPROOF_SCENARIOS,
  SCENARIO_KEYS,
  scenarioByKey,
  type RatchetProofScenario,
  type ScenarioKey,
} from "./fixtures";

/**
 * Parses one or more interval files and returns every meter, refusing a meter id that appears in two
 * files: the same interval would be summed twice and the site peak would be too high.
 */
export function parseIntervalFiles(texts: string[]): {
  meters: MeterSeries[];
  unmappedColumns: string[];
} {
  const meters: MeterSeries[] = [];
  const unmappedColumns: string[] = [];
  for (const text of texts) {
    const parsed = parseIntervalFile(text);
    unmappedColumns.push(...parsed.unmappedColumns);
    for (const meter of parsed.meters) {
      if (meters.some((existing) => existing.meterId === meter.meterId)) {
        throw new RatchetProofFieldError(
          "rp-interval-overlap",
          `meters.${meter.meterId}`,
          `Meter ${meter.meterId} appears in two uploaded files. Summing both would double-count its interval and inflate the site peak, so the files are refused. Nothing was audited.`,
        );
      }
      meters.push(meter);
    }
  }
  return { meters, unmappedColumns };
}

export interface TextAuditRequest {
  intervalTexts: string[];
  tariffText: string;
  billsText: string;
  seedHistory?: PeakHistoryEntry[];
}

export interface TextAuditResult {
  report: AuditReport;
  tariff: Tariff;
  unmappedColumns: string[];
}

/** The same audit, driven by the three files an operator has. */
export function auditFromText(request: TextAuditRequest): TextAuditResult {
  const { meters, unmappedColumns } = parseIntervalFiles(request.intervalTexts);
  const tariff = parseTariffJson(request.tariffText);
  const bills = parseBillsCsv(request.billsText);
  const report = auditDemandBilling({
    tariff,
    meters,
    bills,
    seedHistory: request.seedHistory ?? [],
  });
  return { report, tariff, unmappedColumns };
}
