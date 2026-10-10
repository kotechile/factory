/**
 * SpendProof engine entry points.
 *
 * `reconcileInvoice` is the single deterministic reconciliation: an AI provider invoice against the
 * organization's own tagged-usage ledger, recomputed at the rate the invoice itself declares, with
 * every variance classified and a clean close withheld whenever a bucket does not reconcile or
 * usage cannot be attributed.
 *
 * `reconcileCsv` is the same engine driven by the two files an operator has.
 *
 * The extraction layer (`./extraction.ts`) sits IN FRONT of this engine and extracts only: it fills
 * the declared field set, labels every field, and blocks the verdict on an unreadable or unstated
 * field. No number in a report comes from it.
 *
 * No I/O, no network, no LLM, no clock: nothing here reads `Date.now()`, and the whole engine is
 * fixture-testable offline.
 */
import { parseInvoiceCsv, parseLedgerCsv } from "./csv";
import { ENGINE_METADATA, reconcileInvoice, summarizeReport } from "./reconcile";
import { buildDeclaredRateCard, lineKey } from "./rateCard";
import { buildCoverage, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES } from "./coverage";
import type { CloseReport, ReconcileRequest } from "./types";

export const SPENDPROOF_ENGINE_METADATA = ENGINE_METADATA;

export { reconcileInvoice, summarizeReport };

export function implementedRuleIds(): string[] {
  return [...IMPLEMENTED_RULE_IDS];
}

export { buildCoverage, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES, buildDeclaredRateCard, lineKey };

export interface CsvReconcileRequest {
  invoiceCsv: string;
  ledgerCsv: string;
  toleranceBps?: number;
}

export interface CsvReconcileResult {
  report: CloseReport;
  /** Columns present in the files that the reconciliation does not map (surfaced, never hidden). */
  unmappedColumns: {
    invoice: string[];
    ledger: string[];
  };
}

/**
 * Reconciles from the operator's two files. Parsing is strict and throws a `SpendProofFieldError`
 * naming the column — a malformed file is never partially reconciled.
 */
export function reconcileCsv(request: CsvReconcileRequest): CsvReconcileResult {
  const invoiceIngest = parseInvoiceCsv(request.invoiceCsv);
  const ledgerIngest = parseLedgerCsv(request.ledgerCsv);

  const engineRequest: ReconcileRequest = {
    invoice: invoiceIngest.invoice,
    ledger: ledgerIngest.ledger,
    ...(request.toleranceBps === undefined ? {} : { toleranceBps: request.toleranceBps }),
  };

  return {
    report: reconcileInvoice(engineRequest),
    unmappedColumns: {
      invoice: invoiceIngest.unmappedColumns,
      ledger: ledgerIngest.unmappedColumns,
    },
  };
}

export * from "./types";
export {
  SpendProofFieldError,
  chargeFromDeclaredRate,
  declaredToleranceMicros,
  formatMicros,
  formatMicrosSigned,
  formatRatePerThousand,
  parseUsdToMicros,
  requireInteger,
  roundingToleranceMicros,
  MICROS_PER_CENT,
  MICROS_PER_USD,
} from "./money";
export { daysBetween, isoDay, nearPeriodBoundary, withinPeriod, PERIOD_BOUNDARY_GRACE_DAYS } from "./dates";
export {
  INVOICE_HEADERS,
  LEDGER_HEADERS,
  csvRow,
  parseCsvRows,
  parseInvoiceCsv,
  parseLedgerCsv,
} from "./csv";
export { DEFAULT_TOLERANCE_BPS, buildClosePack } from "./reconcile";
export { classifyVariance, VARIANCE_RULE } from "./variance";
export type { VarianceInput, VarianceVerdict } from "./variance";
export {
  DECLARED_FIELD_SET,
  DEFAULT_EXTRACTION_MODEL,
  EXTRACTION_ENV,
  EXTRACTION_MODEL_ENDPOINT,
  ExtractionUnavailableError,
  buildExtractionPrompt,
  extractStructuredFields,
  labelledFields,
  parseDocumentText,
  readExtractionPayload,
  readStructuredJsonFromModelResponse,
  resolveExtractionCredentials,
  toInvoiceFromExtraction,
} from "./extraction";
export type {
  DeclaredField,
  ExtractedField,
  ExtractedInvoiceLine,
  ExtractedInvoiceReadResult,
  ExtractedInvoiceRecord,
  ExtractionCredentials,
  ExtractionTransport,
  ExtractionTransportRequest,
  ExtractionTransportResponse,
  FieldProvenance,
} from "./extraction";
export {
  DEFAULT_SCENARIO,
  INVOICE_DOCUMENT_EXAMPLE,
  SCENARIO_KEYS_NOTE,
  SPENDPROOF_SCENARIOS,
  scenarioByKey,
} from "./fixtures";
export type { ScenarioKey, SpendProofScenario } from "./fixtures";
