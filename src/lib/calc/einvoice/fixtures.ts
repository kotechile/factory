/**
 * Known-answer fixtures for the FacturGate engine.
 *
 * Each fixture is a plain canonical model. The test suite asserts the EXACT finding list
 * (ruleId + severity + fieldPath) each one produces — not just a boolean — plus the reconciled
 * totals, so a rule that starts or stops firing is caught immediately.
 *
 * Identifiers are real check-digit-valid values:
 *  - SIREN 404833048 → SIRET 40483304800006 (Luhn-valid) → VAT FR83404833048 (key 83)
 *  - SIREN 542051180 → SIRET 54205118000009 (Luhn-valid) → VAT FR59542051180 (key 59)
 *  - DE123456788 and PL1234563218 pass their national checksums.
 */
import type { EinvoiceInput, Invoice, Party } from "./types";

const SPEC_EN16931_FACTURX = "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931";
const SPEC_FACTURX_BASIC = "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic";

export const FR_SELLER: Party = {
  name: "ACME Consulting SAS",
  legalName: "ACME CONSULTING SAS",
  vatId: "FR83404833048",
  siret: "40483304800006",
  address: { line1: "1 rue de la Paix", postCode: "75008", city: "Paris", country: "FR" },
};

export const FR_BUYER: Party = {
  name: "Groupe Beta SARL",
  legalName: "GROUPE BETA SARL",
  vatId: "FR59542051180",
  siret: "54205118000009",
  address: { line1: "12 avenue de la Republique", postCode: "69003", city: "Lyon", country: "FR" },
};

/** Fully valid EN 16931 document targeted at France (Factur-X / CII). */
export function validFrFacturxInput(): EinvoiceInput {
  return {
    seller: { ...FR_SELLER, address: { ...FR_SELLER.address } },
    buyer: { ...FR_BUYER, address: { ...FR_BUYER.address } },
    invoice: {
      number: "FG-2026-0001",
      issueDate: "2026-04-21",
      typeCode: "380",
      currency: "EUR",
      specificationId: SPEC_EN16931_FACTURX,
      profileId: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      buyerReference: "PO-4471",
      paymentTerms: "Payment within 30 days net",
      dueDate: "2026-05-21",
      lines: [
        {
          id: "1",
          description: "EN 16931 readiness review",
          quantity: 1,
          unitCode: "C62",
          unitPrice: 1000,
          vatCategory: "S",
          vatRate: 20,
          lineNetAmount: 1000,
        },
      ],
      vatBreakdown: [{ category: "S", rate: 20, taxableAmount: 1000, taxAmount: 200 }],
      totals: {
        lineNetSum: 1000,
        allowances: 0,
        charges: 0,
        taxExclusive: 1000,
        vatTotal: 200,
        grandTotal: 1200,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 1200,
      },
    },
    targetFormat: "facturx",
    targetCountry: "FR",
  };
}

/** Fully valid document targeted at Germany, emitted as UBL (Peppol BIS 3.0 profile). */
export function validDeUblInput(): EinvoiceInput {
  return {
    seller: {
      name: "Muster Handel GmbH",
      legalName: "MUSTER HANDEL GMBH",
      vatId: "DE123456788",
      address: { line1: "Hauptstrasse 5", postCode: "10115", city: "Berlin", country: "DE" },
    },
    buyer: {
      name: "Nordwind AG",
      legalName: "NORDWIND AG",
      vatId: "DE201234566",
      address: { line1: "Hafenweg 22", postCode: "20095", city: "Hamburg", country: "DE" },
    },
    invoice: {
      number: "DE-2026-0007",
      issueDate: "2026-03-02",
      typeCode: "380",
      currency: "EUR",
      specificationId: "urn:cen.eu:en16931:2017",
      profileId: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      paymentTerms: "Payment within 14 days net",
      dueDate: "2026-03-16",
      lines: [
        {
          id: "1",
          description: "Logistics handling",
          quantity: 2,
          unitCode: "HUR",
          unitPrice: 250,
          vatCategory: "S",
          vatRate: 19,
          lineNetAmount: 500,
        },
      ],
      vatBreakdown: [{ category: "S", rate: 19, taxableAmount: 500, taxAmount: 95 }],
      totals: {
        lineNetSum: 500,
        allowances: 0,
        charges: 0,
        taxExclusive: 500,
        vatTotal: 95,
        grandTotal: 595,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 595,
      },
    },
    targetFormat: "ubl",
    targetCountry: "DE",
  };
}

/**
 * Three lines of 33.33 € at 20 %. Per-line rounding gives 3 × 6.67 = 20.01 € of VAT; total
 * rounding gives 20.00 €. Poland (KSeF) rounds VAT only at the total, so the declared 20.00 € is
 * correct there and drifts a cent everywhere else — the vector behind the country rounding policy.
 */
export function thirdOfACentInput(): EinvoiceInput {
  const line = (id: string) => ({
    id,
    description: "Consulting services",
    quantity: 1,
    unitCode: "C62" as const,
    unitPrice: 33.33,
    vatCategory: "S" as const,
    vatRate: 20,
    lineNetAmount: 33.33,
  });
  return {
    seller: {
      name: "Biuro Rachunkowe Sp. z o.o.",
      legalName: "BIURO RACHUNKOWE SP. Z O.O.",
      vatId: "PL1234563218",
      address: { line1: "ul. Wspolna 12", postCode: "00-521", city: "Warszawa", country: "PL" },
    },
    buyer: {
      name: "Kontrahent S.A.",
      legalName: "KONTRAHENT S.A.",
      vatId: "PL5260005706",
      address: { line1: "ul. Dluga 4", postCode: "61-001", city: "Poznan", country: "PL" },
    },
    invoice: {
      number: "PL-2026-0042",
      issueDate: "2026-04-30",
      typeCode: "380",
      currency: "PLN",
      specificationId: "urn:cen.eu:en16931:2017",
      profileId: "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0",
      paymentTerms: "Platnosc w terminie 14 dni",
      dueDate: "2026-05-14",
      lines: [line("1"), line("2"), line("3")],
      vatBreakdown: [{ category: "S", rate: 20, taxableAmount: 99.99, taxAmount: 20 }],
      totals: {
        lineNetSum: 99.99,
        allowances: 0,
        charges: 0,
        taxExclusive: 99.99,
        vatTotal: 20,
        grandTotal: 119.99,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 119.99,
      },
    },
    targetFormat: "ubl",
    targetCountry: "PL",
  };
}

/** Fully valid document targeted at Belgium (Peppol BIS 3.0 / UBL), both parties identified by VAT. */
export function validBeUblInput(): EinvoiceInput {
  return {
    seller: {
      name: "Antwerpen Logistiek BVBA",
      legalName: "ANTWERPEN LOGISTIEK BVBA",
      vatId: "BE1234567496",
      address: { line1: "Kanaalweg 8", postCode: "2000", city: "Antwerpen", country: "BE" },
    },
    buyer: {
      name: "Gent Retail NV",
      legalName: "GENT RETAIL NV",
      vatId: "BE1234567092",
      address: { line1: "Veldstraat 40", postCode: "9000", city: "Gent", country: "BE" },
    },
    invoice: {
      number: "BE-2026-0011",
      issueDate: "2026-05-04",
      typeCode: "380",
      currency: "EUR",
      specificationId: "urn:cen.eu:en16931:2017",
      profileId: "urn:fdc:peppol.eu:2017:poacc:billing:3.0",
      paymentTerms: "Betaling binnen 30 dagen",
      dueDate: "2026-06-03",
      lines: [
        {
          id: "1",
          description: "Warehouse handling",
          quantity: 4,
          unitCode: "HUR",
          unitPrice: 75,
          vatCategory: "S",
          vatRate: 21,
          lineNetAmount: 300,
        },
      ],
      vatBreakdown: [{ category: "S", rate: 21, taxableAmount: 300, taxAmount: 63 }],
      totals: {
        lineNetSum: 300,
        allowances: 0,
        charges: 0,
        taxExclusive: 300,
        vatTotal: 63,
        grandTotal: 363,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 363,
      },
    },
    targetFormat: "ubl",
    targetCountry: "BE",
  };
}

/**
 * A valid example document for each v1 target country — used by the UI's "load example" buttons and
 * by the pSEO preset pages, so every preset opens on a document that actually passes that country's
 * rule set.
 */
export function demoInvoice(country: "FR" | "PL" | "BE" | "DE", format: "facturx" | "cii" | "ubl"): EinvoiceInput {
  const base =
    country === "FR"
      ? validFrFacturxInput()
      : country === "PL"
        ? thirdOfACentInput()
        : country === "BE"
          ? validBeUblInput()
          : validDeUblInput();
  return { ...base, targetFormat: format, targetCountry: country };
}

function withInvoice(base: EinvoiceInput, patch: Partial<Invoice>): EinvoiceInput {
  return { ...base, invoice: { ...base.invoice, ...patch } };
}

function withParty(base: EinvoiceInput, which: "seller" | "buyer", patch: Partial<Party>): EinvoiceInput {
  return { ...base, [which]: { ...base[which], ...patch } };
}

function withTotals(base: EinvoiceInput, patch: Partial<NonNullable<Invoice["totals"]>>): EinvoiceInput {
  return withInvoice(base, { totals: { ...base.invoice?.totals, ...patch } });
}

export const brokenFixtures = {
  /** BR-06 — the ERP exported the trade name where the legal name is required. */
  missingSellerName: (): EinvoiceInput => withParty(validFrFacturxInput(), "seller", { name: undefined }),

  /** BR-05 — display currency instead of ISO 4217. */
  currencyDisplayString: (): EinvoiceInput => withInvoice(validFrFacturxInput(), { currency: "Euro" }),

  /** BR-03 — locale date format. */
  localeIssueDate: (): EinvoiceInput => withInvoice(validFrFacturxInput(), { issueDate: "21/04/2026" }),

  /** BR-01 — stale specification identifier (wrong version). */
  staleSpecificationId: (): EinvoiceInput =>
    withInvoice(validFrFacturxInput(), { specificationId: "urn:cen.eu:en16931:2015" }),

  /** BR-FR-01 — Factur-X BASIC is below EN 16931 and illegal for the FR mandate. */
  basicProfileFr: (): EinvoiceInput =>
    withInvoice(validFrFacturxInput(), { specificationId: SPEC_FACTURX_BASIC }),

  /** BR-FG-08 — the same BASIC profile is only an advisory outside France. */
  basicProfileDe: (): EinvoiceInput => ({
    ...withInvoice(validFrFacturxInput(), { specificationId: SPEC_FACTURX_BASIC }),
    targetFormat: "ubl",
    targetCountry: "DE",
  }),

  /** BR-CO-15 — the grand total drifted one cent from total + VAT. */
  grandTotalOffByOneCent: (): EinvoiceInput =>
    withTotals(validFrFacturxInput(), { grandTotal: 1200.01, amountDue: 1200.01 }),

  /** BR-CO-13 — a cached tax-exclusive total one cent off the lines. */
  taxExclusiveOffByOneCent: (): EinvoiceInput =>
    withTotals(validFrFacturxInput(), {
      taxExclusive: 999.99,
      grandTotal: 1199.99,
      amountDue: 1199.99,
    }),

  /** BR-22 / BR-23 / BR-24 / BR-27 — a line with no quantity, unit, price or net amount. */
  missingLineFacts: (): EinvoiceInput =>
    withInvoice(validFrFacturxInput(), {
      lines: [{ id: "1", description: "EN 16931 readiness review", vatCategory: "S", vatRate: 20 }],
    }),

  /** BR-Z-05 (line + VAT group) — zero-rated category carrying a 20 % rate. */
  vatCategoryRateIncoherence: (): EinvoiceInput =>
    withInvoice(validFrFacturxInput(), {
      lines: [
        {
          id: "1",
          description: "EN 16931 readiness review",
          quantity: 1,
          unitCode: "C62",
          unitPrice: 1000,
          vatCategory: "Z",
          vatRate: 20,
          lineNetAmount: 1000,
        },
      ],
      vatBreakdown: [{ category: "Z", rate: 20, taxableAmount: 1000, taxAmount: 200 }],
    }),

  /** BR-E-10 — exempt VAT group without an exemption reason. */
  missingExemptionReason: (): EinvoiceInput => ({
    ...validFrFacturxInput(),
    targetFormat: "ubl",
    targetCountry: "DE",
    invoice: {
      ...validFrFacturxInput().invoice,
      lines: [
        {
          id: "1",
          description: "Medical consultation (exempt)",
          quantity: 1,
          unitCode: "HUR",
          unitPrice: 1000,
          vatCategory: "E",
          vatRate: 0,
          lineNetAmount: 1000,
        },
      ],
      vatBreakdown: [{ category: "E", rate: 0, taxableAmount: 1000, taxAmount: 0 }],
      totals: {
        lineNetSum: 1000,
        allowances: 0,
        charges: 0,
        taxExclusive: 1000,
        vatTotal: 0,
        grandTotal: 1000,
        paidAmount: 0,
        roundingAmount: 0,
        amountDue: 1000,
      },
    },
  }),

  /** BR-FR-03 — 14 digits that fail the SIRET Luhn check. */
  invalidSellerSiret: (): EinvoiceInput =>
    withParty(validFrFacturxInput(), "seller", { siret: "40483304800007" }),

  /** BR-FR-07 — French VAT identifier whose key does not match the VAT-key formula. */
  invalidSellerVatKey: (): EinvoiceInput =>
    withParty(validFrFacturxInput(), "seller", { vatId: "FR83404833049" }),

  /** No seller object at all: every missing required field names its own rule id. */
  missingSellerObject: (): EinvoiceInput => {
    const input = validFrFacturxInput();
    delete input.seller;
    return input;
  },
} as const;
