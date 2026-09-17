/**
 * Read layer — validate an existing CII / UBL 2.1 document as-is.
 *
 * This is a deliberately small, deterministic reader: it extracts the EN 16931 fields this engine
 * validates and hands them to the same rule engine as a pasted model. Anything it cannot read
 * structure-wise throws `EinvoiceFieldError` with `BR-FG-10` — an unreadable document is never
 * reported as "0 findings" (factory rule 5: no silent fallback).
 *
 * Namespace prefixes are stripped before scanning (a deterministic text transform), so the same
 * code reads `<ram:ID>` and `<cbc:ID>`. National serializations (Polish KSeF FA(3), Peppol SMP
 * status messages, e-reporting) are explicitly out of scope for v1 and raise BR-FG-10.
 */
import { EinvoiceFieldError, type EinvoiceInput, type InvoiceLine, type VatBreakdownGroup } from "../types";

const UNREADABLE_RULE = "BR-FG-10";

function stripNamespacePrefixes(xml: string): string {
  return xml.replace(/<(\/?)([A-Za-z_][\w.-]*):/g, "<$1");
}

function section(scope: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(scope);
  return match ? match[1] : undefined;
}

function sections(scope: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  return [...scope.matchAll(pattern)].map((match) => match[1]);
}

function text(scope: string | undefined, tag: string): string | undefined {
  if (!scope) return undefined;
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(scope);
  const value = match ? match[1].trim() : "";
  return value === "" ? undefined : value;
}

function attribute(scope: string | undefined, tag: string, attributeName: string): string | undefined {
  if (!scope) return undefined;
  const match = new RegExp(`<${tag}([^>]*)>`).exec(scope);
  if (!match) return undefined;
  const attr = new RegExp(`${attributeName}="([^"]*)"`).exec(match[1]);
  return attr ? attr[1] : undefined;
}

function number(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value.replace(/\s/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isoDateFromCii(scope: string | undefined, tag: string): string | undefined {
  const block = section(scope ?? "", tag);
  if (!block) return undefined;
  const format = attribute(`<${tag}>${block}`, "DateTimeString", "format");
  const raw = text(block, "DateTimeString");
  if (!raw) return undefined;
  if (format && format !== "102") {
    throw new EinvoiceFieldError(
      UNREADABLE_RULE,
      `xml.${tag}.DateTimeString`,
      `date format "${format}" is not read by v1 (only 102, CCYYMMDD, is supported).`,
    );
  }
  const compact = raw.replace(/-/g, "");
  if (!/^\d{8}$/.test(compact)) {
    throw new EinvoiceFieldError(UNREADABLE_RULE, `xml.${tag}.DateTimeString`, `"${raw}" is not a CCYYMMDD date.`);
  }
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function partyFromCii(block: string | undefined) {
  if (!block) return undefined;
  const address = section(block, "PostalTradeAddress");
  const legal = section(block, "SpecifiedLegalOrganization");
  const registrations = sections(block, "SpecifiedTaxRegistration");
  const vatId = registrations
    .map((registration) => ({
      scheme: attribute(registration, "ID", "schemeID"),
      value: text(registration, "ID"),
    }))
    .find((entry) => entry.scheme === "VA" && entry.value)?.value;

  return {
    name: text(block, "Name"),
    legalName: text(legal, "TradingBusinessName"),
    vatId,
    siret: text(legal, "ID"),
    address: {
      line1: text(address, "LineOne"),
      postCode: text(address, "PostcodeCode"),
      city: text(address, "CityName"),
      country: text(address, "CountryID"),
    },
  };
}

function readCii(xml: string): EinvoiceInput {
  const context = section(xml, "ExchangedDocumentContext");
  const document = section(xml, "ExchangedDocument");
  const agreement = section(xml, "ApplicableHeaderTradeAgreement");
  const settlement = section(xml, "ApplicableHeaderTradeSettlement");
  if (!context || !document || !settlement) {
    throw new EinvoiceFieldError(
      UNREADABLE_RULE,
      "xml",
      "the document does not have the CII structure v1 reads (ExchangedDocumentContext / ExchangedDocument / ApplicableHeaderTradeSettlement).",
    );
  }

  const lineBlocks = sections(xml, "IncludedSupplyChainTradeLineItem");
  const lines: InvoiceLine[] = lineBlocks.map((block) => {
    const tax = section(block, "ApplicableTradeTax") ?? block;
    const price = section(block, "NetPriceProductTradePrice") ?? block;
    return {
      id: text(block, "LineID"),
      description: text(block, "Name"),
      quantity: number(text(block, "BilledQuantity")),
      unitCode: attribute(block, "BilledQuantity", "unitCode"),
      unitPrice: number(text(price, "ChargeAmount")),
      vatCategory: text(tax, "CategoryCode") as InvoiceLine["vatCategory"],
      vatRate: number(text(tax, "RateApplicablePercent")),
      lineNetAmount: number(text(section(block, "SpecifiedTradeSettlementLineMonetarySummation") ?? block, "LineTotalAmount")),
    };
  });

  const summation = section(settlement, "SpecifiedTradeSettlementHeaderMonetarySummation");
  const vatBreakdown: VatBreakdownGroup[] = sections(settlement, "ApplicableTradeTax").map((block) => ({
    category: text(block, "CategoryCode") as VatBreakdownGroup["category"],
    rate: number(text(block, "RateApplicablePercent")),
    taxableAmount: number(text(block, "BasisAmount")),
    taxAmount: number(text(block, "CalculatedAmount")),
    exemptionReason: text(block, "ExemptionReason"),
  }));

  return {
    seller: partyFromCii(section(agreement ?? "", "SellerTradeParty")),
    buyer: partyFromCii(section(agreement ?? "", "BuyerTradeParty")),
    invoice: {
      number: text(document, "ID"),
      issueDate: isoDateFromCii(document, "IssueDateTime"),
      typeCode: text(document, "TypeCode"),
      currency: text(settlement, "InvoiceCurrencyCode"),
      specificationId: text(section(context, "GuidelineSpecifiedDocumentContextParameter"), "ID"),
      profileId: text(section(context, "BusinessProcessSpecifiedDocumentContextParameter"), "ID"),
      buyerReference: text(agreement, "BuyerReference"),
      paymentTerms: text(section(settlement, "SpecifiedTradePaymentTerms"), "Description"),
      dueDate: isoDateFromCii(settlement, "SpecifiedTradePaymentTerms"),
      lines,
      vatBreakdown,
      totals: {
        lineNetSum: number(text(summation, "LineTotalAmount")),
        allowances: number(text(summation, "AllowanceTotalAmount")),
        charges: number(text(summation, "ChargeTotalAmount")),
        taxExclusive: number(text(summation, "TaxBasisTotalAmount")),
        vatTotal: number(text(summation, "TaxTotalAmount")),
        grandTotal: number(text(summation, "GrandTotalAmount")),
        paidAmount: number(text(summation, "TotalPrepaidAmount")),
        amountDue: number(text(summation, "DuePayableAmount")),
      },
    },
  };
}

function partyFromUbl(block: string | undefined) {
  if (!block) return undefined;
  const address = section(block, "PostalAddress");
  const legal = section(block, "PartyLegalEntity");
  // BT-27 (the mandatory party name) binds to cbc:RegistrationName in UBL; BT-28 (an additional
  // registered/trading name) binds to cac:PartyName/cbc:Name.
  return {
    name: text(legal, "RegistrationName") ?? text(section(block, "PartyName"), "Name"),
    legalName: text(section(block, "PartyName"), "Name"),
    vatId: text(section(block, "PartyTaxScheme"), "CompanyID"),
    siret: text(legal, "CompanyID"),
    address: {
      line1: text(address, "StreetName"),
      postCode: text(address, "PostalZone"),
      city: text(address, "CityName"),
      country: text(section(address ?? "", "Country"), "IdentificationCode"),
    },
  };
}

function readUbl(xml: string): EinvoiceInput {
  // UBL permits a line-level cac:TaxTotal; the header one is the block that carries TaxSubtotal.
  const taxTotal = sections(xml, "TaxTotal").find((block) => block.includes("<TaxSubtotal"));
  const monetaryTotal = section(xml, "LegalMonetaryTotal");
  if (!taxTotal || !monetaryTotal) {
    throw new EinvoiceFieldError(
      UNREADABLE_RULE,
      "xml",
      "the document does not have the UBL Invoice structure v1 reads (TaxTotal / LegalMonetaryTotal).",
    );
  }

  const lines: InvoiceLine[] = sections(xml, "InvoiceLine").map((block) => {
    const taxCategory = section(section(block, "Item") ?? block, "ClassifiedTaxCategory") ?? block;
    return {
      id: text(block, "ID"),
      description: text(section(block, "Item") ?? block, "Name"),
      quantity: number(text(block, "InvoicedQuantity")),
      unitCode: attribute(block, "InvoicedQuantity", "unitCode"),
      unitPrice: number(text(section(block, "Price") ?? block, "PriceAmount")),
      vatCategory: text(taxCategory, "ID") as InvoiceLine["vatCategory"],
      vatRate: number(text(taxCategory, "Percent")),
      lineNetAmount: number(text(block, "LineExtensionAmount")),
    };
  });

  const vatBreakdown: VatBreakdownGroup[] = sections(taxTotal, "TaxSubtotal").map((block) => {
    const taxCategory = section(block, "TaxCategory") ?? block;
    return {
      category: text(taxCategory, "ID") as VatBreakdownGroup["category"],
      rate: number(text(taxCategory, "Percent")),
      taxableAmount: number(text(block, "TaxableAmount")),
      taxAmount: number(text(block, "TaxAmount")),
      exemptionReason: text(block, "TaxExemptionReason"),
    };
  });
  const vatTotalBlock = taxTotal.split("<TaxSubtotal")[0];

  return {
    seller: partyFromUbl(section(xml, "AccountingSupplierParty")),
    buyer: partyFromUbl(section(xml, "AccountingCustomerParty")),
    invoice: {
      number: text(xml, "ID"),
      issueDate: text(xml, "IssueDate"),
      typeCode: text(xml, "InvoiceTypeCode"),
      currency: text(xml, "DocumentCurrencyCode"),
      specificationId: text(xml, "CustomizationID"),
      profileId: text(xml, "ProfileID"),
      buyerReference: text(xml, "BuyerReference"),
      paymentTerms: text(section(xml, "PaymentTerms"), "Note"),
      dueDate: text(xml, "DueDate"),
      lines,
      vatBreakdown,
      totals: {
        lineNetSum: number(text(monetaryTotal, "LineExtensionAmount")),
        allowances: number(text(monetaryTotal, "AllowanceTotalAmount")),
        charges: number(text(monetaryTotal, "ChargeTotalAmount")),
        taxExclusive: number(text(monetaryTotal, "TaxExclusiveAmount")),
        vatTotal: number(text(vatTotalBlock, "TaxAmount")),
        grandTotal: number(text(monetaryTotal, "TaxInclusiveAmount")),
        paidAmount: number(text(monetaryTotal, "PrepaidAmount")),
        amountDue: number(text(monetaryTotal, "PayableAmount")),
      },
    },
  };
}

/** Reads a CII or UBL 2.1 document into the canonical model. Throws BR-FG-10 when unreadable. */
export function readEinvoiceXml(xml: string): EinvoiceInput {
  if (typeof xml !== "string" || xml.trim() === "") {
    throw new EinvoiceFieldError(UNREADABLE_RULE, "xml", "the document is empty.");
  }
  const stripped = stripNamespacePrefixes(xml);
  if (/<([A-Za-z_][\w.-]*:)?(Faktura|Ewidencja|KSeF|FakturaFa)/.test(xml)) {
    throw new EinvoiceFieldError(
      UNREADABLE_RULE,
      "xml",
      "this looks like a Polish KSeF FA(3) document; national serializations are not read in v1 (out of scope, see coverage.unsupportedFamilies).",
    );
  }
  if (/<([A-Za-z_][\w.-]*:)?CrossIndustryInvoice[\s>]/.test(stripped)) return readCii(stripped);
  if (/<([A-Za-z_][\w.-]*:)?Invoice[\s>]/.test(stripped)) return readUbl(stripped);
  throw new EinvoiceFieldError(
    UNREADABLE_RULE,
    "xml",
    "the root element is neither a CII CrossIndustryInvoice nor a UBL Invoice — v1 reads only those two formats.",
  );
}
