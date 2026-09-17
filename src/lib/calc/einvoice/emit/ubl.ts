/**
 * UBL 2.1 serializer — an EN 16931 Invoice with the Peppol BIS 3.0 ProfileID (the flavour accepted
 * by the French mandate, Belgian Peppol flows and most EU platforms).
 */
import { reconcileInvoice } from "../reconcile";
import type { EinvoiceInput, Reconciliation, TargetCountry } from "../types";
import {
  UBL_EN16931_CUSTOMIZATION_ID,
  UBL_PEPPOL_PROFILE_ID,
  buildEmissionModel,
  emissionNote,
  escapeXml,
  formatAmount,
  formatRate,
  type EmissionLine,
  type EmissionModel,
  type EmissionParty,
} from "./common";
import type { SerializedXml } from "./facturx";

function ublParty(tag: "AccountingSupplierParty" | "AccountingCustomerParty", party: EmissionParty): string {
  const legalId = party.legalId
    ? `<cbc:CompanyID${party.legalIdScheme ? ` schemeID="${escapeXml(party.legalIdScheme)}"` : ""}>${escapeXml(party.legalId)}</cbc:CompanyID>`
    : "";
  // BT-27 binds to RegistrationName; BT-28 (when the document has a separate one) to PartyName/Name.
  const tradingName = party.legalName ?? party.name;
  return `  <cac:${tag}>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(tradingName)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(party.address.line1)}</cbc:StreetName>
        <cbc:PostalZone>${escapeXml(party.address.postCode)}</cbc:PostalZone>
        <cbc:CityName>${escapeXml(party.address.city)}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${escapeXml(party.address.country)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>${escapeXml(party.vatId)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(party.name)}</cbc:RegistrationName>${legalId}</cac:PartyLegalEntity>
    </cac:Party>
  </cac:${tag}>`;
}

function ublLine(line: EmissionLine, currency: string): string {
  return `  <cac:InvoiceLine>
    <cbc:ID>${escapeXml(line.id)}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${escapeXml(line.unitCode)}">${formatAmount(line.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${formatAmount(line.lineNetAmount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(line.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${line.vatCategory}</cbc:ID>
        <cbc:Percent>${formatRate(line.vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="${escapeXml(currency)}">${formatAmount(line.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
}

function ublTaxTotal(model: EmissionModel): string {
  const subtotals = model.vatGroups
    .map((group) => {
      const exemption = group.exemptionReason
        ? `\n      <cbc:TaxExemptionReason>${escapeXml(group.exemptionReason)}</cbc:TaxExemptionReason>`
        : "";
      return `    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(model.currency)}">${formatAmount(group.taxableAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(model.currency)}">${formatAmount(group.taxAmount)}</cbc:TaxAmount>${exemption}
      <cac:TaxCategory>
        <cbc:ID>${group.category}</cbc:ID>
        <cbc:Percent>${formatRate(group.rate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    })
    .join("\n");
  return `  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.vatTotal)}</cbc:TaxAmount>
${subtotals}
  </cac:TaxTotal>`;
}

export function serializeUbl(
  input: EinvoiceInput,
  country: TargetCountry,
  reconciliation?: Reconciliation,
): SerializedXml {
  const recon = reconciliation ?? reconcileInvoice(input, country);
  const model = buildEmissionModel(input, recon);
  const dueDate = model.dueDate ? `\n  <cbc:DueDate>${escapeXml(model.dueDate)}</cbc:DueDate>` : "";
  const buyerReference = model.buyerReference
    ? `\n  <cbc:BuyerReference>${escapeXml(model.buyerReference)}</cbc:BuyerReference>`
    : "";
  const paymentTerms = model.paymentTerms
    ? `\n  <cac:PaymentTerms><cbc:Note>${escapeXml(model.paymentTerms)}</cbc:Note></cac:PaymentTerms>`
    : "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>${UBL_EN16931_CUSTOMIZATION_ID}</cbc:CustomizationID>
  <cbc:ProfileID>${UBL_PEPPOL_PROFILE_ID}</cbc:ProfileID>
  <cbc:ID>${escapeXml(model.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(model.issueDate)}</cbc:IssueDate>${dueDate}
  <cbc:InvoiceTypeCode>${escapeXml(model.typeCode)}</cbc:InvoiceTypeCode>${buyerReference}
  <cbc:DocumentCurrencyCode>${escapeXml(model.currency)}</cbc:DocumentCurrencyCode>
${ublParty("AccountingSupplierParty", model.seller)}
${ublParty("AccountingCustomerParty", model.buyer)}${paymentTerms}
${ublTaxTotal(model)}
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.lineNetSum)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.taxExclusive)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.grandTotal)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.allowances)}</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.charges)}</cbc:ChargeTotalAmount>
    <cbc:PrepaidAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.paidAmount)}</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.amountDue)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${model.lines.map((line) => ublLine(line, model.currency)).join("\n")}
</Invoice>`;

  return {
    xml,
    profile: "EN16931",
    customizationId: UBL_EN16931_CUSTOMIZATION_ID,
    profileId: UBL_PEPPOL_PROFILE_ID,
    note: emissionNote("ubl", country, model.disclosures),
  };
}
