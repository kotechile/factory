/**
 * FacturGate — canonical EU e-invoice model (EN 16931, BT/BG grouped).
 *
 * Pure data types + the engine's public output contract. No I/O, no network, no LLM:
 * every value in a report is derived deterministically from the input document.
 *
 * Rule-id namespaces used by this engine
 * --------------------------------------
 * - `BR-*` / `BR-CO-*` / `BR-S-*` / `BR-Z-*` / `BR-E-*` / `BR-AE-*` / `BR-IC-*` / `BR-G-*` /
 *   `BR-O-*` — EN 16931 business rules (the specification's own identifiers), grouped the way the
 *   specification groups them: document-level, calculated (CO), and VAT-category specific.
 * - `BR-FG-*` — checks this engine implements that are NOT pinned to a numbered EN 16931 rule
 *   (structural reader/emitter gates, undetermined enumerations, the non-FR profile warning).
 *   They are listed in the report's `coverage.implementedRuleIds` like every other id.
 * - `BR-FR-*` — the factory's CIUS-FR overlay (SIRET, French VAT key, profile gate). These are
 *   overlay checks, not verbatim quotes of the French CIUS text.
 *
 * Every finding names a `ruleId`, a `severity`, the `fieldPath` it was raised on, a message and a
 * concrete fix. Nothing is defaulted silently: a required field that is absent is a finding (or a
 * thrown `EinvoiceFieldError` from the emitter/reader) — never an invented value.
 */

export type TargetFormat = "facturx" | "cii" | "ubl";

/** v1 target countries with a rule set / rounding policy (PRD §5 scope guard). */
export type TargetCountry = "FR" | "PL" | "BE" | "DE";

export type VatCategory = "S" | "Z" | "E" | "AE" | "K" | "G" | "O";

export type Severity = "blocking" | "advisory";

/** VAT rounding policy: Polish KSeF rounds VAT only at the total, EN 16931 core rounds per line. */
export type VatRoundingPolicy = "per-line" | "total";

export type ProfileCode =
  | "MINIMUM"
  | "BASIC_WL"
  | "BASIC"
  | "EN16931"
  | "EXTENDED"
  | "EXTENDED_CTC_FR"
  | "UNRECOGNISED";

export interface PostalAddress {
  line1?: string;
  postCode?: string;
  city?: string;
  country?: string;
}

export interface Party {
  /**
   * BT-27 (seller) / BT-44 (buyer) — the party's name as the standards require it. Platforms check
   * that this is the registered entity name; an ERP that exports only the trade name hits BR-06.
   */
  name?: string;
  /**
   * BT-28 / BT-45 — an additional registered / trading name, when the source document carries one
   * separately from BT-27. Optional (the rule is advisory).
   */
  legalName?: string;
  /** BT-31 / BT-48 — VAT identifier. */
  vatId?: string;
  /**
   * BT-30 / BT-47 — legal registration identifier.
   * In France this is the 14-digit SIRET: `siret` is the convenience field for it (the emitter
   * writes it with schemeID 0009); use `legalRegistrationId` for a registration id in another
   * scheme — the emitter then writes it without a scheme id rather than guessing one.
   */
  siret?: string;
  legalRegistrationId?: string;
  address?: PostalAddress;
}

export interface InvoiceLine {
  /** BT-126 */
  id?: string;
  /** BT-153 */
  description?: string;
  /** BT-129 */
  quantity?: number;
  /** BT-130 — UN/ECE Rec 20 unit code. */
  unitCode?: string;
  /** BT-146 */
  unitPrice?: number;
  /** BT-151 */
  vatCategory?: VatCategory;
  /** BT-152 */
  vatRate?: number;
  /** BT-131 */
  lineNetAmount?: number;
  /** Σ line-level allowances (BT-136). */
  allowances?: number;
  /** Σ line-level charges (BT-141). */
  charges?: number;
}

export interface VatBreakdownGroup {
  /** BT-118 */
  category?: VatCategory;
  /** BT-119 */
  rate?: number;
  /** BT-116 */
  taxableAmount?: number;
  /** BT-117 */
  taxAmount?: number;
  /** BT-120 — required by EN 16931 for exempt / reverse-charge / export / out-of-scope groups. */
  exemptionReason?: string;
}

export interface InvoiceTotals {
  /** BT-106 */
  lineNetSum?: number;
  /** BT-107 */
  allowances?: number;
  /** BT-108 */
  charges?: number;
  /** BT-109 */
  taxExclusive?: number;
  /** BT-110 */
  vatTotal?: number;
  /** BT-112 */
  grandTotal?: number;
  /** BT-113 */
  paidAmount?: number;
  /** BT-114 */
  roundingAmount?: number;
  /** BT-115 */
  amountDue?: number;
}

export interface Invoice {
  /** BT-1 */
  number?: string;
  /** BT-2 — ISO 8601 (YYYY-MM-DD). */
  issueDate?: string;
  /** BT-3 — UNTDID 1001 type code (380 = commercial invoice). */
  typeCode?: string;
  /** BT-5 — ISO 4217. */
  currency?: string;
  /** BT-24 — the EN 16931 / Factur-X / Peppol specification identifier. */
  specificationId?: string;
  /** BT-23 — business process / profile identifier. */
  profileId?: string;
  /** BT-10 */
  buyerReference?: string;
  /** BT-20 */
  paymentTerms?: string;
  /** BT-9 */
  dueDate?: string;
  lines?: InvoiceLine[];
  vatBreakdown?: VatBreakdownGroup[];
  totals?: InvoiceTotals;
  references?: {
    orderReference?: string;
    contractReference?: string;
  };
}

export interface EinvoiceInput {
  seller?: Party;
  buyer?: Party;
  invoice?: Invoice;
  /** default "facturx" (CII at EN 16931 profile) */
  targetFormat?: TargetFormat;
  /** default "FR" */
  targetCountry?: TargetCountry;
}

export interface Finding {
  ruleId: string;
  severity: Severity;
  fieldPath: string;
  message: string;
  fix: string;
}

/** A VAT group as recomputed from the invoice lines (never copied from the declared value). */
export interface ReconciledVatGroup {
  category: VatCategory;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  exemptionReason?: string;
}

export interface Reconciliation {
  roundingPolicy: VatRoundingPolicy;
  /** BT-106 from the lines. */
  lineNetSum: number;
  allowances: number;
  charges: number;
  /** BT-109 computed from the lines. */
  taxExclusive: number;
  vatByBreakdown: ReconciledVatGroup[];
  /** BT-110 computed from the lines. */
  vatTotal: number;
  /** BT-112 computed from the lines. */
  grandTotal: number;
  /** BT-112 as declared by the source document (null when it declared none). */
  declaredGrandTotal: number | null;
  /** computed − declared grand total, in currency units (0 when the document declared none). */
  delta: number;
}

export interface EmittedDocument {
  format: TargetFormat;
  profile: ProfileCode;
  customizationId: string;
  profileId: string;
  xml: string;
  /** Stated limitations of what was emitted (nothing is implied that was not generated). */
  note: string;
}

export interface CoverageNote {
  implementedRuleIds: string[];
  unsupportedFamilies: string[];
  note: string;
}

export type Verdict = "ready" | "ready-with-advisories" | "blocked";

export interface EinvoiceReport {
  valid: boolean;
  score: number;
  verdict: Verdict;
  findings: Finding[];
  /** null when the document is too incomplete to reconcile (the blocking findings say why). */
  reconciliation: Reconciliation | null;
  /** present only for a document with no blocking findings. */
  emitted?: EmittedDocument;
  coverage: CoverageNote;
}

/** Thrown when a required value is absent or unmappable. Never substituted with a default. */
export class EinvoiceFieldError extends Error {
  readonly ruleId: string;
  readonly fieldPath: string;

  constructor(ruleId: string, fieldPath: string, message: string) {
    super(`${ruleId} @ ${fieldPath}: ${message}`);
    this.name = "EinvoiceFieldError";
    this.ruleId = ruleId;
    this.fieldPath = fieldPath;
  }
}
