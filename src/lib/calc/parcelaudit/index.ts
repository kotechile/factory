/**
 * ParcelProof engine entry points.
 *
 * `auditCarrierInvoice` is the single deterministic audit: it recomputes billable weight per line
 * (carrier × service × ship-date divisor, round-up, cubic-inch threshold), re-evaluates accessorial
 * eligibility with the failed trigger named, checks service-commitment refunds and the per-line
 * dispute window, prices what your own contract rate card can price, and returns the recovery
 * ledger plus the dispute CSV.
 *
 * `computeBillableWeight` is the same weight core exposed as the primitive an agent needs when it
 * quotes landed cost — no audit, no invoice.
 *
 * No I/O, no network, no LLM, no clock: `asOfDate` is always supplied by the caller. Every failure
 * names a rule id; nothing is defaulted silently, and a line that cannot be priced is reported
 * unverifiable rather than as a zero-dollar overcharge.
 */
import { parseInvoiceLinesCsv, parseRateCardCsv, parseShipmentRecordsCsv } from "./csv";
import { recomputeBillableWeight, type BillableWeightRequest } from "./dimWeight";
import { auditCarrierInvoice } from "./ledger";
import { buildCoverage, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES } from "./coverage";
import type { AuditReport, Carrier, RateCard, WeightResolution } from "./types";

export const ENGINE_METADATA = {
  id: "parcel_dim_surcharge_audit",
  name: "ParcelProof — carrier invoice DIM-weight & surcharge audit",
  version: "1.0.0",
  description:
    "Deterministic audit of UPS/FedEx/USPS parcel invoices against shipment records: billable weight recomputed with the carrier × service × date divisor and round-up rule, accessorial eligibility with the failed trigger, service-commitment refunds, the dispute clock, and a per-line recovery ledger with a dispute CSV.",
} as const;

export function implementedRuleIds(): string[] {
  return [...IMPLEMENTED_RULE_IDS];
}

export { buildCoverage, IMPLEMENTED_RULE_IDS, UNSUPPORTED_FAMILIES };

/** The WebMCP `compute_billable_weight` primitive — pure, no invoice required. */
export function computeBillableWeight(request: BillableWeightRequest): WeightResolution {
  return recomputeBillableWeight(request);
}

export interface CsvAuditRequest {
  shipmentRecordsCsv: string;
  invoiceLinesCsv: string;
  /** Optional contract rate card; without it every line is reported `unverifiable-rate`. */
  rateCardCsv?: string;
  asOfDate: string;
  carrier?: Carrier;
}

export interface CsvAuditResult {
  report: AuditReport;
  /** Columns present in the shipper's files that the audit does not map (surfaced, never hidden). */
  unmappedColumns: {
    shipmentRecords: string[];
    invoiceLines: string[];
    rateCard: string[];
  };
}

/**
 * Audits an invoice from the two CSVs a shipper actually has. Parsing is strict and throws a
 * `ParcelAuditFieldError` naming the column — a malformed file is never partially audited.
 */
export function auditInvoiceCsv(request: CsvAuditRequest): CsvAuditResult {
  const recordsIngest = parseShipmentRecordsCsv(request.shipmentRecordsCsv);
  const linesIngest = parseInvoiceLinesCsv(request.invoiceLinesCsv);
  const rateCardIngest =
    request.rateCardCsv && request.rateCardCsv.trim()
      ? parseRateCardCsv(request.rateCardCsv)
      : { rateCard: null as RateCard | null, unmappedColumns: [] as string[] };

  const report = auditCarrierInvoice({
    shipmentRecords: recordsIngest.records,
    invoiceLines: linesIngest.lines,
    asOfDate: request.asOfDate,
    ...(request.carrier === undefined ? {} : { carrier: request.carrier }),
    ...(rateCardIngest.rateCard === null ? {} : { rateCard: rateCardIngest.rateCard }),
  });

  return {
    report,
    unmappedColumns: {
      shipmentRecords: recordsIngest.unmappedColumns,
      invoiceLines: linesIngest.unmappedColumns,
      rateCard: rateCardIngest.unmappedColumns,
    },
  };
}

export * from "./types";
export { CARRIERS, SERVICES_BY_CARRIER, DIM_RULES, resolveDimRule, diagnoseWeightMismatch } from "./dimWeight";
export type { BillableWeightRequest, DimRule, WeightMismatchCause, WeightMismatchDiagnosis } from "./dimWeight";
export {
  AHS_DIMENSION_LONGEST_SIDE_IN,
  AHS_WEIGHT_ACTUAL_LB,
  CARRIER_SURCHARGE_SUPPORT,
  OVERSIZE_LENGTH_PLUS_GIRTH_IN,
  OVERSIZE_LONGEST_SIDE_IN,
  SURCHARGE_KINDS,
  assessSurcharge,
  classifySurcharge,
  normalizeSurchargeCode,
} from "./surcharges";
export type { SurchargeContext, SurchargeKind } from "./surcharges";
export { COMMITMENT_RULES, evaluateServiceCommitment, resolveCommitmentRule } from "./serviceCommitment";
export { DISPUTE_WINDOW_DAYS, DISPUTE_WINDOW_SOURCE, EXPIRING_SOON_DAYS, disputeWindowFor } from "./disputeClock";
export { assertRateCard, resolveContractRate } from "./rateCard";
export { auditCarrierInvoice, buildDisputeCsv, DISPUTE_CSV_HEADER, formatLb, formatUsd, SURCHARGE_LABELS } from "./ledger";
export {
  INVOICE_LINES_HEADERS,
  RATE_CARD_HEADERS,
  SHIPMENT_RECORDS_HEADERS,
  csvRow,
  parseCsvText,
  parseInvoiceLinesCsv,
  parseRateCardCsv,
  parseShipmentRecordsCsv,
  parseUsdToCents,
} from "./csv";
export { addDays, daysBetween, isoDatePart, parseIsoDate } from "./dates";
