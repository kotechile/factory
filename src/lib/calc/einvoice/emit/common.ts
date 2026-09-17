/**
 * Shared emission model + serialization primitives.
 *
 * The emitters do NOT re-validate the document — they require the values they must write. When a
 * value is absent or unmappable they throw `EinvoiceFieldError` carrying the rule id it violates:
 * a required field is never substituted with a default (factory rule 5). Numbers written into the
 * XML are the *reconciled* ones, so the emitted artifact is internally consistent to the cent.
 */
import { lineNetCents, fromCents } from "../reconcile";
import { ALL_CATEGORIES, EN16931_TYPE_CODES, REC20_UNIT_CODES } from "../rules/en16931";
import { isFilled, isFiniteNumber, isIsoDate } from "../rules/engine";
import { isIso4217 } from "../vat";
import {
  EinvoiceFieldError,
  type EinvoiceInput,
  type ProfileCode,
  type Reconciliation,
  type TargetCountry,
  type VatCategory,
} from "../types";

export const CII_EN16931_CUSTOMIZATION_ID =
  "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931";
export const CII_EN16931_PROFILE_ID = "urn:cen.eu:en16931:2017";
export const UBL_EN16931_CUSTOMIZATION_ID = "urn:cen.eu:en16931:2017";
export const UBL_PEPPOL_PROFILE_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";
export const CII_SIRET_SCHEME_ID = "0009";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Amounts are written at cent precision — the reconciled figures are already cents. */
export function formatAmount(value: number): string {
  return value.toFixed(2);
}

export function formatRate(value: number): string {
  return value.toFixed(2);
}

/** CII date format 102 (CCYYMMDD). */
export function toCiiDate(isoDate: string, fieldPath: string): string {
  if (!isIsoDate(isoDate)) {
    throw new EinvoiceFieldError("BR-03", fieldPath, `"${isoDate}" is not an ISO 8601 date (YYYY-MM-DD).`);
  }
  return isoDate.replace(/-/g, "");
}

function requireText(value: unknown, ruleId: string, fieldPath: string, what: string): string {
  if (!isFilled(value)) {
    throw new EinvoiceFieldError(ruleId, fieldPath, `${what} is required to serialize the document and is absent.`);
  }
  return (value as string).trim();
}

function requireNumber(value: unknown, ruleId: string, fieldPath: string, what: string): number {
  if (!isFiniteNumber(value)) {
    throw new EinvoiceFieldError(ruleId, fieldPath, `${what} is required to serialize the document and is absent.`);
  }
  return value;
}

export interface EmissionParty {
  name: string;
  /** BT-28 — written only when the document carries a separate registered/trading name. */
  legalName?: string;
  vatId: string;
  legalId?: string;
  legalIdScheme: string | null;
  address: { line1: string; postCode: string; city: string; country: string };
}

export interface EmissionLine {
  id: string;
  description: string;
  quantity: number;
  unitCode: string;
  unitPrice: number;
  lineNetAmount: number;
  vatCategory: VatCategory;
  vatRate: number;
}

export interface EmissionVatGroup {
  category: VatCategory;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  exemptionReason?: string;
}

export interface EmissionTotals {
  lineNetSum: number;
  allowances: number;
  charges: number;
  taxExclusive: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  roundingAmount: number;
  amountDue: number;
}

export interface EmissionModel {
  profile: ProfileCode;
  invoiceNumber: string;
  typeCode: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  buyerReference?: string;
  paymentTerms?: string;
  seller: EmissionParty;
  buyer: EmissionParty;
  lines: EmissionLine[];
  vatGroups: EmissionVatGroup[];
  totals: EmissionTotals;
  /** Disclosed mappings applied while serializing (nothing silently substituted). */
  disclosures: string[];
}

function buildParty(party: "seller" | "buyer", input: EinvoiceInput): EmissionParty {
  const source = party === "seller" ? input.seller : input.buyer;
  const nameRule = party === "seller" ? "BR-06" : "BR-07";
  const addressRule = party === "seller" ? "BR-08" : "BR-10";
  const countryRule = party === "seller" ? "BR-09" : "BR-11";
  const legalId = isFilled(source?.siret) ? source?.siret.trim() : isFilled(source?.legalRegistrationId) ? source?.legalRegistrationId.trim() : undefined;

  return {
    name: requireText(source?.name, nameRule, `${party}.name`, `the ${party} name`),
    legalName: isFilled(source?.legalName) ? source?.legalName.trim() : undefined,
    vatId: requireText(source?.vatId, "BR-CO-26", `${party}.vatId`, `the ${party} VAT identifier`),
    legalId,
    legalIdScheme: isFilled(source?.siret) ? CII_SIRET_SCHEME_ID : null,
    address: {
      line1: requireText(source?.address?.line1, addressRule, `${party}.address.line1`, `the ${party} street`),
      postCode: requireText(source?.address?.postCode, addressRule, `${party}.address.postCode`, `the ${party} post code`),
      city: requireText(source?.address?.city, addressRule, `${party}.address.city`, `the ${party} city`),
      country: requireText(source?.address?.country, countryRule, `${party}.address.country`, `the ${party} country code`),
    },
  };
}

export function buildEmissionModel(input: EinvoiceInput, reconciliation: Reconciliation): EmissionModel {
  const invoice = input.invoice;
  if (!invoice) {
    throw new EinvoiceFieldError("BR-01", "invoice", "no invoice body is present; nothing can be serialized.");
  }
  if (!isIso4217(invoice.currency)) {
    throw new EinvoiceFieldError(
      "BR-05",
      "invoice.currency",
      `"${invoice.currency ?? ""}" is not an ISO 4217 currency code; the emitter will not write a display string.`,
    );
  }
  const typeCode = requireText(invoice.typeCode, "BR-04", "invoice.typeCode", "the document type code");
  if (!EN16931_TYPE_CODES.includes(typeCode)) {
    throw new EinvoiceFieldError("BR-04", "invoice.typeCode", `type code ${typeCode} is not in the EN 16931 subset.`);
  }

  const lines = invoice.lines ?? [];
  if (lines.length === 0) {
    throw new EinvoiceFieldError("BR-16", "invoice.lines", "no invoice lines to serialize.");
  }

  const disclosures: string[] = [];
  const emissionLines: EmissionLine[] = lines.map((line, index) => {
    const unitCode = requireText(line.unitCode, "BR-23", `invoice.lines[${index}].unitCode`, "the line unit code");
    if (!REC20_UNIT_CODES.includes(unitCode)) {
      throw new EinvoiceFieldError(
        "BR-FG-03",
        `invoice.lines[${index}].unitCode`,
        `"${unitCode}" is not a UN/ECE Rec 20 unit code this engine recognises.`,
      );
    }
    if (!line.vatCategory || !ALL_CATEGORIES.includes(line.vatCategory)) {
      throw new EinvoiceFieldError(
        "BR-FG-01",
        `invoice.lines[${index}].vatCategory`,
        `"${line.vatCategory ?? ""}" is not an EN 16931 VAT category code.`,
      );
    }
    return {
      id: requireText(line.id, "BR-21", `invoice.lines[${index}].id`, "the line identifier"),
      description: requireText(line.description, "BR-26", `invoice.lines[${index}].description`, "the item name"),
      quantity: requireNumber(line.quantity, "BR-22", `invoice.lines[${index}].quantity`, "the invoiced quantity"),
      unitCode,
      unitPrice: requireNumber(line.unitPrice, "BR-27", `invoice.lines[${index}].unitPrice`, "the item net price"),
      lineNetAmount: fromCents(lineNetCents(line, index)),
      vatCategory: line.vatCategory,
      vatRate: requireNumber(line.vatRate, "BR-FG-02", `invoice.lines[${index}].vatRate`, "the line VAT rate"),
    };
  });

  const seller = buildParty("seller", input);
  const buyer = buildParty("buyer", input);
  for (const [role, party] of [["seller", seller], ["buyer", buyer]] as const) {
    if (!party.legalName) {
      disclosures.push(
        `BT-28 (a separate registered/trading name) was absent for the ${role}: the BT-27 name was written in its place`,
      );
    }
  }

  const declared = invoice.totals ?? {};
  const paidAmount = isFiniteNumber(declared.paidAmount) ? declared.paidAmount : 0;
  const roundingAmount = isFiniteNumber(declared.roundingAmount) ? declared.roundingAmount : 0;
  const amountDue = isFiniteNumber(declared.amountDue)
    ? declared.amountDue
    : fromCents(Math.round((reconciliation.grandTotal - paidAmount + roundingAmount) * 100));

  const dueDate = isFilled(invoice.dueDate) ? invoice.dueDate.trim() : undefined;

  return {
    profile: "EN16931",
    invoiceNumber: requireText(invoice.number, "BR-02", "invoice.number", "the invoice number"),
    typeCode,
    issueDate: requireText(invoice.issueDate, "BR-03", "invoice.issueDate", "the issue date"),
    dueDate,
    currency: invoice.currency.trim().toUpperCase(),
    buyerReference: isFilled(invoice.buyerReference) ? invoice.buyerReference.trim() : undefined,
    paymentTerms: isFilled(invoice.paymentTerms) ? invoice.paymentTerms.trim() : undefined,
    seller,
    buyer,
    lines: emissionLines,
    vatGroups: reconciliation.vatByBreakdown.map((group) => {
      const emissionGroup: EmissionVatGroup = {
        category: group.category,
        rate: group.rate,
        taxableAmount: group.taxableAmount,
        taxAmount: group.taxAmount,
      };
      if (group.exemptionReason) emissionGroup.exemptionReason = group.exemptionReason;
      return emissionGroup;
    }),
    totals: {
      lineNetSum: reconciliation.lineNetSum,
      allowances: reconciliation.allowances,
      charges: reconciliation.charges,
      taxExclusive: reconciliation.taxExclusive,
      vatTotal: reconciliation.vatTotal,
      grandTotal: reconciliation.grandTotal,
      paidAmount,
      roundingAmount,
      amountDue,
    },
    disclosures,
  };
}

/** The stated limitations of what v1 generated (never implies a container it did not build). */
export function emissionNote(format: "cit" | "ubl", country: TargetCountry, disclosures: readonly string[]): string {
  const parts = [
    format === "ubl"
      ? "UBL 2.1 Invoice at the EN 16931 profile with the Peppol BIS 3.0 ProfileID."
      : "Standalone CII XML at the EN 16931 profile.",
    "PDF/A-3 hybrid authoring (Factur-X PDF) and the EXTENDED-CTC-FR lifecycle/reporting fields are P1 — not generated by v1.",
  ];
  if (country === "PL") {
    parts.push(
      "The Polish national format (KSeF FA(3) XML) is not emitted by v1: this artifact is EN 16931 CII/UBL, which a Peppol/PA layer maps further.",
    );
  }
  if (disclosures.length > 0) parts.push(`Disclosed mapping(s): ${disclosures.join("; ")}.`);
  return parts.join(" ");
}
