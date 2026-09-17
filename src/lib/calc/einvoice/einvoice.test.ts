/**
 * Known-answer vectors for the FacturGate engine (PRD §2).
 *
 * One fully valid EN 16931 fixture (valid: true, score 100, delta 0) plus one broken fixture per
 * rule family — each asserting the EXACT finding list (ruleId + severity + fieldPath), never just a
 * boolean. The reconciliation is asserted to the cent, and the emitters are exercised for both
 * formats including a read-back round trip.
 */
import { describe, expect, it } from "vitest";

import {
  EinvoiceFieldError,
  checkEuVatId,
  convertInvoiceToFacturX,
  implementedRuleIds,
  reconcileInvoice,
  serializeCii,
  validateEinvoice,
  validateEinvoiceXml,
} from "./index";
import type { EinvoiceInput, Finding } from "./types";
import {
  brokenFixtures,
  demoInvoice,
  thirdOfACentInput,
  validBeUblInput,
  validDeUblInput,
  validFrFacturxInput,
} from "./fixtures";

/** ruleId / severity / fieldPath triples — the exact contract a fixture pins. */
function shape(findings: readonly Finding[]) {
  return findings.map((finding) => [finding.ruleId, finding.severity, finding.fieldPath]);
}

describe("FacturGate — EN 16931 pre-send gate", () => {
  it("scores a fully valid EN 16931 / FR document 100 with zero delta and emits CII", () => {
    const report = validateEinvoice(validFrFacturxInput());

    expect(shape(report.findings)).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.score).toBe(100);
    expect(report.verdict).toBe("ready");

    expect(report.reconciliation).not.toBeNull();
    const reconciliation = report.reconciliation!;
    expect(reconciliation.roundingPolicy).toBe("per-line");
    expect(reconciliation.lineNetSum).toBe(1000);
    expect(reconciliation.taxExclusive).toBe(1000);
    expect(reconciliation.vatByBreakdown).toEqual([
      { category: "S", rate: 20, taxableAmount: 1000, taxAmount: 200 },
    ]);
    expect(reconciliation.vatTotal).toBe(200);
    expect(reconciliation.grandTotal).toBe(1200);
    expect(reconciliation.declaredGrandTotal).toBe(1200);
    expect(reconciliation.delta).toBe(0);

    expect(report.emitted?.format).toBe("facturx");
    expect(report.emitted?.profile).toBe("EN16931");
    expect(report.emitted?.customizationId).toBe(
      "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931",
    );
    expect(report.emitted?.xml).toContain("<ram:ID>FG-2026-0001</ram:ID>");
    expect(report.emitted?.xml).toContain('<udt:DateTimeString format="102">20260421</udt:DateTimeString>');
    expect(report.emitted?.xml).toContain('<ram:CountryID>FR</ram:CountryID>');
    expect(report.emitted?.xml).toContain('<ram:ID schemeID="0009">40483304800006</ram:ID>');
    expect(report.emitted?.xml).toContain('<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>');
    expect(report.emitted?.xml).toContain('<ram:DuePayableAmount>1200.00</ram:DuePayableAmount>');
  });

  it("scores a valid UBL / DE document 100 and emits the Peppol BIS 3.0 profile", () => {
    const report = validateEinvoice(validDeUblInput());

    expect(shape(report.findings)).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.score).toBe(100);
    expect(report.reconciliation?.delta).toBe(0);
    expect(report.emitted?.format).toBe("ubl");
    expect(report.emitted?.customizationId).toBe("urn:cen.eu:en16931:2017");
    expect(report.emitted?.profileId).toBe("urn:fdc:peppol.eu:2017:poacc:billing:01:1.0");
    expect(report.emitted?.xml).toContain("<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>");
    expect(report.emitted?.xml).toContain("<cbc:TaxInclusiveAmount currencyID=\"EUR\">595.00</cbc:TaxInclusiveAmount>");
    expect(report.emitted?.xml).toContain("<cbc:RegistrationName>Nordwind AG</cbc:RegistrationName>");
    expect(report.emitted?.xml).toContain("<cbc:Name>NORDWIND AG</cbc:Name>");
  });

  it("scores a valid BE document 100 and offers a passing example for every v1 target", () => {
    const belgium = validateEinvoice(validBeUblInput());
    expect(shape(belgium.findings)).toEqual([]);
    expect(belgium.score).toBe(100);
    expect(belgium.reconciliation?.delta).toBe(0);

    for (const country of ["FR", "PL", "BE", "DE"] as const) {
      const report = validateEinvoice(demoInvoice(country, country === "FR" ? "facturx" : "ubl"));
      expect(shape(report.findings), `demoInvoice(${country}) should be valid`).toEqual([]);
      expect(report.score).toBe(100);
      expect(report.reconciliation?.delta).toBe(0);
    }
  });

  it("rounds VAT at the total for PL (KSeF) and per line everywhere else", () => {
    const poland = validateEinvoice(thirdOfACentInput());
    expect(shape(poland.findings)).toEqual([]);
    expect(poland.valid).toBe(true);
    expect(poland.reconciliation?.roundingPolicy).toBe("total");
    expect(poland.reconciliation?.vatTotal).toBe(20);
    expect(poland.reconciliation?.delta).toBe(0);

    const germany = validateEinvoice({ ...thirdOfACentInput(), targetCountry: "DE" });
    expect(shape(germany.findings)).toEqual([
      ["BR-CO-14", "blocking", "invoice.totals.vatTotal"],
      ["BR-CO-17", "blocking", "invoice.vatBreakdown[0].taxAmount"],
    ]);
    expect(germany.valid).toBe(false);
    expect(germany.reconciliation?.roundingPolicy).toBe("per-line");
    expect(germany.reconciliation?.vatTotal).toBe(20.01);
    expect(germany.reconciliation?.delta).toBe(0.01);
    expect(germany.emitted).toBeUndefined();
  });

  it("reports the missing seller name with its rule id (BR-06)", () => {
    const report = validateEinvoice(brokenFixtures.missingSellerName());
    expect(shape(report.findings)).toEqual([["BR-06", "blocking", "seller.name"]]);
    expect(report.valid).toBe(false);
    expect(report.score).toBe(80);
    expect(report.verdict).toBe("blocked");
    expect(report.emitted).toBeUndefined();
  });

  it("rejects a display currency instead of ISO 4217 (BR-05)", () => {
    const report = validateEinvoice(brokenFixtures.currencyDisplayString());
    expect(shape(report.findings)).toEqual([["BR-05", "blocking", "invoice.currency"]]);
    expect(report.reconciliation?.grandTotal).toBe(1200);
  });

  it("rejects a locale issue date (BR-03)", () => {
    const report = validateEinvoice(brokenFixtures.localeIssueDate());
    expect(shape(report.findings)).toEqual([["BR-03", "blocking", "invoice.issueDate"]]);
  });

  it("rejects a stale specification identifier (BR-01)", () => {
    const report = validateEinvoice(brokenFixtures.staleSpecificationId());
    expect(shape(report.findings)).toEqual([["BR-01", "blocking", "invoice.specificationId"]]);
  });

  it("blocks a sub-EN 16931 profile in France (BR-FR-01) but only warns elsewhere (BR-FG-08)", () => {
    const france = validateEinvoice(brokenFixtures.basicProfileFr());
    expect(shape(france.findings)).toEqual([["BR-FR-01", "blocking", "invoice.specificationId"]]);
    expect(france.valid).toBe(false);

    const germany = validateEinvoice(brokenFixtures.basicProfileDe());
    expect(shape(germany.findings)).toEqual([["BR-FG-08", "advisory", "invoice.specificationId"]]);
    expect(germany.valid).toBe(true);
    expect(germany.score).toBe(95);
    expect(germany.verdict).toBe("ready-with-advisories");
    // The advisory does not stop conversion, and the emitted artifact is upgraded to EN 16931.
    expect(germany.emitted?.profile).toBe("EN16931");
  });

  it("catches a grand total that drifted one cent (BR-CO-15)", () => {
    const report = validateEinvoice(brokenFixtures.grandTotalOffByOneCent());
    expect(shape(report.findings)).toEqual([["BR-CO-15", "blocking", "invoice.totals.grandTotal"]]);
    expect(report.reconciliation?.grandTotal).toBe(1200);
    expect(report.reconciliation?.declaredGrandTotal).toBe(1200.01);
    expect(report.reconciliation?.delta).toBe(-0.01);
  });

  it("catches a cached tax-exclusive total one cent off the lines (BR-CO-13)", () => {
    const report = validateEinvoice(brokenFixtures.taxExclusiveOffByOneCent());
    expect(shape(report.findings)).toEqual([["BR-CO-13", "blocking", "invoice.totals.taxExclusive"]]);
    expect(report.reconciliation?.taxExclusive).toBe(1000);
    expect(report.reconciliation?.delta).toBe(0.01);
  });

  it("names every missing line fact and refuses to reconcile a line it cannot compute", () => {
    const report = validateEinvoice(brokenFixtures.missingLineFacts());
    expect(shape(report.findings)).toEqual([
      ["BR-22", "blocking", "invoice.lines[0].quantity"],
      ["BR-23", "blocking", "invoice.lines[0].unitCode"],
      ["BR-24", "blocking", "invoice.lines[0].lineNetAmount"],
      ["BR-27", "blocking", "invoice.lines[0].unitPrice"],
    ]);
    expect(report.reconciliation).toBeNull();
    expect(report.emitted).toBeUndefined();
  });

  it("flags a VAT category whose rate contradicts it, on the line and on the VAT group (BR-Z-05)", () => {
    const report = validateEinvoice(brokenFixtures.vatCategoryRateIncoherence());
    expect(shape(report.findings)).toEqual([
      ["BR-Z-05", "blocking", "invoice.lines[0].vatRate"],
      ["BR-Z-05", "blocking", "invoice.vatBreakdown[0].rate"],
    ]);
  });

  it("requires an exemption reason on an exempt VAT group (BR-E-10)", () => {
    const report = validateEinvoice(brokenFixtures.missingExemptionReason());
    expect(shape(report.findings)).toEqual([
      ["BR-E-10", "blocking", "invoice.vatBreakdown[0].exemptionReason"],
    ]);
  });

  it("validates the SIRET (BR-FR-03) and the French VAT key (BR-FR-07)", () => {
    expect(shape(validateEinvoice(brokenFixtures.invalidSellerSiret()).findings)).toEqual([
      ["BR-FR-03", "blocking", "seller.siret"],
    ]);
    expect(shape(validateEinvoice(brokenFixtures.invalidSellerVatKey()).findings)).toEqual([
      ["BR-FR-07", "blocking", "seller.vatId"],
    ]);
  });

  it("lists every missing required field with its own rule id when a party is absent", () => {
    const report = validateEinvoice(brokenFixtures.missingSellerObject());
    expect(shape(report.findings)).toEqual([
      ["BR-06", "blocking", "seller.name"],
      ["BR-08", "blocking", "seller.address.line1"],
      ["BR-08", "blocking", "seller.address.postCode"],
      ["BR-08", "blocking", "seller.address.city"],
      ["BR-09", "blocking", "seller.address.country"],
      ["BR-CO-26", "blocking", "seller.vatId"],
      ["BR-FR-02", "blocking", "seller.siret"],
    ]);
  });

  it("reports every absent required field for an empty document — no silent defaults", () => {
    const report = validateEinvoice({});
    expect(shape(report.findings)).toEqual([
      ["BR-01", "blocking", "invoice.specificationId"],
      ["BR-02", "blocking", "invoice.number"],
      ["BR-03", "blocking", "invoice.issueDate"],
      ["BR-04", "blocking", "invoice.typeCode"],
      ["BR-05", "blocking", "invoice.currency"],
      ["BR-06", "blocking", "seller.name"],
      ["BR-07", "blocking", "buyer.name"],
      ["BR-08", "blocking", "seller.address.line1"],
      ["BR-08", "blocking", "seller.address.postCode"],
      ["BR-08", "blocking", "seller.address.city"],
      ["BR-09", "blocking", "seller.address.country"],
      ["BR-10", "blocking", "buyer.address.line1"],
      ["BR-10", "blocking", "buyer.address.postCode"],
      ["BR-10", "blocking", "buyer.address.city"],
      ["BR-11", "blocking", "buyer.address.country"],
      ["BR-CO-26", "blocking", "seller.vatId"],
      ["BR-16", "blocking", "invoice.lines"],
      ["BR-FG-09", "blocking", "invoice.totals.lineNetSum"],
      ["BR-FG-09", "blocking", "invoice.totals.taxExclusive"],
      ["BR-FG-09", "blocking", "invoice.totals.vatTotal"],
      ["BR-FG-09", "blocking", "invoice.totals.grandTotal"],
      ["BR-FR-02", "blocking", "seller.siret"],
    ]);
    expect(report.valid).toBe(false);
    expect(report.score).toBe(0);
    expect(report.reconciliation).toBeNull();
  });

  it("refuses a target country outside the v1 rule sets instead of defaulting", () => {
    expect(() => validateEinvoice({ ...validFrFacturxInput(), targetCountry: "IT" as never })).toThrowError(
      EinvoiceFieldError,
    );
    try {
      validateEinvoice({ ...validFrFacturxInput(), targetCountry: "IT" as never });
    } catch (error) {
      expect((error as EinvoiceFieldError).ruleId).toBe("BR-FG-11");
    }
  });

  it("converts a document to Factur-X through the same gate and returns the change list", () => {
    const report = convertInvoiceToFacturX({ ...validFrFacturxInput(), targetFormat: "ubl" });
    expect(report.emitted?.format).toBe("facturx");
    expect(report.findings).toEqual([]);
  });

  it("throws with the rule id when the emitter is asked to write an unmappable field", () => {
    const input = brokenFixtures.currencyDisplayString();
    const reconciliation = reconcileInvoice(input, "FR");
    expect(() => serializeCii(input, "FR", reconciliation)).toThrowError(EinvoiceFieldError);
    try {
      serializeCii(input, "FR", reconciliation);
    } catch (error) {
      const fieldError = error as EinvoiceFieldError;
      expect(fieldError.ruleId).toBe("BR-05");
      expect(fieldError.fieldPath).toBe("invoice.currency");
    }
  });

  it("reads its own emitted CII and UBL documents back to a valid report", () => {
    const cii = validateEinvoice(validFrFacturxInput());
    const ciiRoundTrip = validateEinvoiceXml(cii.emitted!.xml, { targetCountry: "FR" });
    expect(shape(ciiRoundTrip.findings)).toEqual([]);
    expect(ciiRoundTrip.valid).toBe(true);
    expect(ciiRoundTrip.reconciliation?.grandTotal).toBe(1200);
    expect(ciiRoundTrip.reconciliation?.delta).toBe(0);

    const ubl = validateEinvoice(validDeUblInput());
    const ublRoundTrip = validateEinvoiceXml(ubl.emitted!.xml, { targetCountry: "DE" });
    expect(shape(ublRoundTrip.findings)).toEqual([]);
    expect(ublRoundTrip.reconciliation?.grandTotal).toBe(595);
    expect(ublRoundTrip.reconciliation?.delta).toBe(0);
  });

  it("fails a document the v1 reader cannot read instead of reporting zero findings", () => {
    const report = validateEinvoiceXml("<Faktura xmlns=\"http://crd.gov.pl\"><P_2>FV/1</P_2></Faktura>");
    expect(report.valid).toBe(false);
    expect(report.score).toBe(80);
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].ruleId).toBe("BR-FG-10");
    expect(report.findings[0].severity).toBe("blocking");
  });

  it("publishes an honest coverage note", () => {
    const report = validateEinvoice(validFrFacturxInput());
    expect(report.coverage.implementedRuleIds).toContain("BR-01");
    expect(report.coverage.implementedRuleIds).toContain("BR-FR-03");
    expect(new Set(report.coverage.implementedRuleIds).size).toBe(report.coverage.implementedRuleIds.length);
    expect(report.coverage.implementedRuleIds.length).toBe(implementedRuleIds().length);
    expect(report.coverage.unsupportedFamilies.length).toBeGreaterThan(0);
    expect(report.coverage.note).toContain("never reported as passing");
  });

  it("validates EU VAT identifiers offline, including the unknown-country case", () => {
    expect(checkEuVatId("FR83404833048", "FR").valid).toBe(true);
    expect(checkEuVatId("FR 83 404 833 048", "FR").valid).toBe(true);
    expect(checkEuVatId("FR83404833049", "FR").checksumValid).toBe(false);
    expect(checkEuVatId("DE123456788", "DE").valid).toBe(true);
    expect(checkEuVatId("BE1234567496", "BE").valid).toBe(true);
    expect(checkEuVatId("PL1234563218", "PL").valid).toBe(true);
    expect(checkEuVatId("NL123456703B01", "NL").valid).toBe(true);
    expect(checkEuVatId("FR12345", "FR").formatValid).toBe(false);

    const unknown = checkEuVatId("FR83404833048", "XX");
    expect(unknown.valid).toBe(false);
    expect(unknown.formatValid).toBe(false);
    expect(unknown.notes.join(" ")).toContain("not in the v1 VAT-format set");

    const unverified = checkEuVatId("LU12345678", "LU");
    expect(unverified.formatValid).toBe(true);
    expect(unverified.checksumVerified).toBe(false);
    expect(unverified.valid).toBe(false);
  });

  it("keeps a documented request default for the target, not an inferred one", () => {
    const input: EinvoiceInput = { ...validFrFacturxInput() };
    delete input.targetFormat;
    delete input.targetCountry;
    const report = validateEinvoice(input);
    expect(report.valid).toBe(true);
    expect(report.emitted?.format).toBe("facturx");
    expect(report.reconciliation?.roundingPolicy).toBe("per-line");
  });
});
