/**
 * CII serializer — CrossIndustryInvoice at the EN 16931 profile (the XML body of Factur-X and of
 * standalone CII documents).
 *
 * Every element is written from the reconciled model, so the monetary summation matches the lines
 * and the VAT breakdown to the cent. No PDF/A-3 container is produced here (P1) and the note in
 * the result says so.
 */
import { reconcileInvoice } from "../reconcile";
import type { EinvoiceInput, Reconciliation, TargetCountry } from "../types";
import {
  CII_EN16931_CUSTOMIZATION_ID,
  CII_EN16931_PROFILE_ID,
  buildEmissionModel,
  emissionNote,
  escapeXml,
  formatAmount,
  formatRate,
  toCiiDate,
  type EmissionLine,
  type EmissionModel,
  type EmissionParty,
} from "./common";

export interface SerializedXml {
  xml: string;
  profile: "EN16931";
  customizationId: string;
  profileId: string;
  note: string;
}

function ciiParty(tag: "SellerTradeParty" | "BuyerTradeParty", party: EmissionParty): string {
  const legalOrganisation = [
    party.legalId
      ? `<ram:ID${party.legalIdScheme ? ` schemeID="${escapeXml(party.legalIdScheme)}"` : ""}>${escapeXml(party.legalId)}</ram:ID>`
      : "",
    party.legalName ? `<ram:TradingBusinessName>${escapeXml(party.legalName)}</ram:TradingBusinessName>` : "",
  ]
    .filter(Boolean)
    .join("");
  const legalId = legalOrganisation
    ? `\n        <ram:SpecifiedLegalOrganization>${legalOrganisation}</ram:SpecifiedLegalOrganization>`
    : "";
  return `      <ram:${tag}>
        <ram:Name>${escapeXml(party.name)}</ram:Name>${legalId}
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${escapeXml(party.address.postCode)}</ram:PostcodeCode>
          <ram:LineOne>${escapeXml(party.address.line1)}</ram:LineOne>
          <ram:CityName>${escapeXml(party.address.city)}</ram:CityName>
          <ram:CountryID>${escapeXml(party.address.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(party.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:${tag}>`;
}

function ciiLine(line: EmissionLine): string {
  return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${escapeXml(line.id)}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${escapeXml(line.description)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${formatAmount(line.unitPrice)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${escapeXml(line.unitCode)}">${formatAmount(line.quantity)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${line.vatCategory}</ram:CategoryCode>
          <ram:RateApplicablePercent>${formatRate(line.vatRate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${formatAmount(line.lineNetAmount)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
}

function ciiTradeTax(model: EmissionModel): string {
  return model.vatGroups
    .map((group) => {
      const exemption = group.exemptionReason
        ? `\n            <ram:ExemptionReason>${escapeXml(group.exemptionReason)}</ram:ExemptionReason>`
        : "";
      return `        <ram:ApplicableTradeTax>
          <ram:CalculatedAmount>${formatAmount(group.taxAmount)}</ram:CalculatedAmount>
          <ram:TypeCode>VAT</ram:TypeCode>${exemption}
          <ram:BasisAmount>${formatAmount(group.taxableAmount)}</ram:BasisAmount>
          <ram:CategoryCode>${group.category}</ram:CategoryCode>
          <ram:RateApplicablePercent>${formatRate(group.rate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>`;
    })
    .join("\n");
}

function ciiPaymentTerms(model: EmissionModel): string {
  if (!model.paymentTerms && !model.dueDate) return "";
  const description = model.paymentTerms
    ? `\n          <ram:Description>${escapeXml(model.paymentTerms)}</ram:Description>`
    : "";
  const dueDate = model.dueDate
    ? `\n          <ram:DueDateDateTime><udt:DateTimeString format="102">${toCiiDate(model.dueDate, "invoice.dueDate")}</udt:DateTimeString></ram:DueDateDateTime>`
    : "";
  return `\n        <ram:SpecifiedTradePaymentTerms>${description}${dueDate}\n        </ram:SpecifiedTradePaymentTerms>`;
}

function ciiX(xml: string): string {
  return xml;
}

export function serializeCii(input: EinvoiceInput, country: TargetCountry, reconciliation?: Reconciliation): SerializedXml {
  const recon = reconciliation ?? reconcileInvoice(input, country);
  const model = buildEmissionModel(input, recon);
  const buyerReference = model.buyerReference
    ? `\n        <ram:BuyerReference>${escapeXml(model.buyerReference)}</ram:BuyerReference>`
    : "";

  const xml = ciiX(`<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${CII_EN16931_CUSTOMIZATION_ID}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
    <ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>${CII_EN16931_PROFILE_ID}</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(model.invoiceNumber)}</ram:ID>
    <ram:TypeCode>${escapeXml(model.typeCode)}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${toCiiDate(model.issueDate, "invoice.issueDate")}</udt:DateTimeString></ram:IssueDateTime>${
      model.paymentTerms ? `\n    <ram:IncludedNote><ram:Content>${escapeXml(model.paymentTerms)}</ram:Content></ram:IncludedNote>` : ""
    }
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
${model.lines.map(ciiLine).join("\n")}
    <ram:ApplicableHeaderTradeAgreement>${buyerReference}
${ciiParty("SellerTradeParty", model.seller)}
${ciiParty("BuyerTradeParty", model.buyer)}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(model.currency)}</ram:InvoiceCurrencyCode>
${ciiTradeTax(model)}${ciiPaymentTerms(model)}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formatAmount(model.totals.lineNetSum)}</ram:LineTotalAmount>
        <ram:AllowanceTotalAmount>${formatAmount(model.totals.allowances)}</ram:AllowanceTotalAmount>
        <ram:ChargeTotalAmount>${formatAmount(model.totals.charges)}</ram:ChargeTotalAmount>
        <ram:TaxBasisTotalAmount>${formatAmount(model.totals.taxExclusive)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(model.currency)}">${formatAmount(model.totals.vatTotal)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formatAmount(model.totals.grandTotal)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${formatAmount(model.totals.paidAmount)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${formatAmount(model.totals.amountDue)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`);

  return {
    xml,
    profile: "EN16931",
    customizationId: CII_EN16931_CUSTOMIZATION_ID,
    profileId: CII_EN16931_PROFILE_ID,
    note: emissionNote("cit", country, model.disclosures),
  };
}
