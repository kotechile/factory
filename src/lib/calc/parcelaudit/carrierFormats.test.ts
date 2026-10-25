/**
 * Known-answer vectors for the two things a real carrier export needs from ParcelProof:
 *
 *  1. **Header mapping.** A UPS Billing Center / FedEx billing / ShipStation export does not spell its
 *     columns the way the audit does ("Tracking Number" vs `tracking`, "Net Amount" vs `total_usd`).
 *     The audit maps case/space/punctuation/unit variants onto its canonical fields, refuses a file
 *     where two columns claim the same field, and — when it cannot resolve the columns at all — fails
 *     loudly naming the columns the file DOES have, never auditing a guessed column.
 *
 *  2. **Pricing without a contract rate card** (`pricingBasis: "observed-bracket"`). The price of a
 *     corrected weight is the charge the carrier itself billed for that same whole-pound weight in the
 *     same carrier/service/zone lane on the same invoice. Asserted here: the money to the cent, the
 *     `observed-bracket` label (never `verified`), the refusal when no observation exists, and the
 *     refusal when the lane's own charges disagree — an unpriced line stays unpriced.
 */
import { describe, expect, it } from "vitest";

import {
  ParcelAuditFieldError,
  auditInvoiceCsv,
  deriveObservedBracketCard,
  parseInvoiceLinesCsv,
  normaliseHeader,
  parseShipmentRecordsCsv,
} from "./index";

const AS_OF = "2026-09-18";

/** A shipment export in the shape a shipping platform emits, not in the audit's own shape. */
const PLATFORM_RECORDS = [
  "Order Number,Tracking Number,Carrier,Service,Ship Date,Length,Width,Height,Actual Weight (lb),Zone,Residential,Ignored Column",
  "SO-1,T1,ups,ups_ground,2026-09-10,10,10,10,12,4,no,x",
  "SO-2,T2,ups,ups_ground,2026-09-10,10,10,10,12,4,no,y",
].join("\n");

/** A carrier billing export in the shape a billing portal emits. */
const BILLING_EXPORT = [
  "Tracking Number,Invoice Date,Carrier,Service,Billed Weight (lb),Zone,Net Freight,Net Amount,Order Reference",
  "T1,2026-09-10,ups,ups_ground,13,4,15.00,15.00,SO-1",
  "T2,2026-09-10,ups,ups_ground,12,4,13.50,13.50,SO-2",
].join("\n");

function audit(pricingBasis?: "contract-rate-card" | "observed-bracket") {
  return auditInvoiceCsv({
    shipmentRecordsCsv: PLATFORM_RECORDS,
    invoiceLinesCsv: BILLING_EXPORT,
    asOfDate: AS_OF,
    ...(pricingBasis === undefined ? {} : { pricingBasis }),
  });
}

describe("ParcelProof — carrier export headers", () => {
  it("folds case, spaces, punctuation and unit suffixes onto one header form", () => {
    expect(normaliseHeader("Tracking Number")).toBe("tracking_number");
    expect(normaliseHeader("Billed Weight (lb)")).toBe("billed_weight_lb");
    expect(normaliseHeader("Net Amount ($)")).toBe("net_amount");
    expect(normaliseHeader("  ACTUAL-WEIGHT  ")).toBe("actual_weight");
  });

  it("reads a platform shipment export and a carrier billing export without renaming columns", () => {
    const records = parseShipmentRecordsCsv(PLATFORM_RECORDS);
    expect(records.records.map((record) => record.tracking)).toEqual(["T1", "T2"]);
    expect(records.records[0]?.orderId).toBe("SO-1");
    expect(records.records[0]?.actualWeightLb).toBe(12);
    expect(records.records[0]?.dims).toEqual({ length: 10, width: 10, height: 10 });
    // A column nothing recognises is reported by the name the file used, never silently dropped.
    // ("Residential" IS a field the audit maps; only the aliases it does not know are listed.)
    expect(records.unmappedColumns).toEqual(["Ignored Column"]);

    const lines = parseInvoiceLinesCsv(BILLING_EXPORT);
    expect(lines.lines.map((line) => line.billedWeightLb)).toEqual([13, 12]);
    expect(lines.lines[0]?.baseChargeCents).toBe(1500);
    expect(lines.lines[0]?.totalCents).toBe(1500);
    expect(lines.lines[0]?.invoiceDate).toBe("2026-09-10");
    expect(lines.unmappedColumns).toEqual(["Order Reference"]);
  });

  it("refuses two columns that claim the same field instead of choosing one", () => {
    try {
      parseInvoiceLinesCsv(
        [
          "Tracking,Tracking Number,Invoice Date,Billed Weight,Zone,Base Charge,Total",
          "T1,T1,2026-09-10,13,4,15.00,15.00",
        ].join("\n"),
      );
      throw new Error("expected an ambiguous-column failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParcelAuditFieldError);
      expect((error as ParcelAuditFieldError).ruleId).toBe("pp-field-invalid");
      expect((error as ParcelAuditFieldError).fieldPath).toBe("invoiceLines.tracking");
    }
  });

  it("names the columns the file has when a required field cannot be resolved", () => {
    try {
      parseShipmentRecordsCsv("Weight,Zone\n12,4");
      throw new Error("expected a missing-column failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParcelAuditFieldError);
      expect((error as ParcelAuditFieldError).ruleId).toBe("pp-field-missing");
      expect((error as ParcelAuditFieldError).message).toContain("Your file's columns: Weight, Zone");
      expect((error as ParcelAuditFieldError).message).toContain("Accepted names for this field: tracking");
    }
  });
});

describe("ParcelProof — pricing from the carrier's own charges", () => {
  it("derives one observation per homogeneous lane + whole-pound weight", () => {
    const { card, diagnostics } = deriveObservedBracketCard(
      parseInvoiceLinesCsv(BILLING_EXPORT).lines,
    );
    expect(diagnostics.observations).toBe(2);
    expect(diagnostics.dropped).toEqual([]);
    expect(card.kind).toBe("observed-bracket");
    expect(card.rows).toEqual([
      { carrier: "ups", service: "ups_ground", zone: "4", minWeightLb: 12, maxWeightLb: 12, rateCents: 1350 },
      { carrier: "ups", service: "ups_ground", zone: "4", minWeightLb: 13, maxWeightLb: 13, rateCents: 1500 },
    ]);
  });

  it("prices an over-billed line from the carrier's own charge at the corrected weight", () => {
    const { report } = audit("observed-bracket");
    const line = report.lines.find((entry) => entry.tracking === "T1");
    expect(line?.recomputedWeightLb).toBe(12);
    expect(line?.billedWeightLb).toBe(13);
    expect(line?.rateVerification).toBe("observed-bracket");
    expect(line?.recomputedBaseCents).toBe(1350);
    expect(line?.deltaCents).toBe(150);
    expect(line?.claimableCents).toBe(150);
    expect(report.summary.recoverableTotalCents).toBe(150);
    expect(report.summary.linesUnpriced).toBe(0);
    expect(report.pricing).toMatchObject({
      basis: "observed-bracket",
      // Both lines are priced from an observed charge (T2's own weight is also an observation).
      linesPricedByObservation: 2,
      observations: 2,
      observationsDropped: 0,
    });
    // No line may be labelled `verified` by an observation: that word is reserved for a contract card.
    expect(report.lines.every((entry) => entry.rateVerification !== "verified")).toBe(true);
  });

  it("claims nothing when the same invoice is audited without the observation basis", () => {
    const { report } = audit();
    const line = report.lines.find((entry) => entry.tracking === "T1");
    expect(line?.rateVerification).toBe("unverifiable-rate");
    expect(line?.claimableCents).toBe(0);
    expect(report.summary.recoverableTotalCents).toBe(0);
    expect(report.pricing.basis).toBe("contract-rate-card");
  });

  it("leaves the line unpriced when no line bills the corrected weight in that lane", () => {
    const { report } = auditInvoiceCsv({
      shipmentRecordsCsv: PLATFORM_RECORDS.split("\n").slice(0, 2).join("\n"),
      invoiceLinesCsv: BILLING_EXPORT.split("\n").slice(0, 2).join("\n"),
      asOfDate: AS_OF,
      pricingBasis: "observed-bracket",
    });
    const line = report.lines[0];
    expect(line?.recomputedWeightLb).toBe(12);
    expect(line?.rateVerification).toBe("unmapped");
    expect(line?.recomputedBaseCents).toBeNull();
    expect(line?.claimableCents).toBe(0);
    expect(report.summary.recoverableTotalCents).toBe(0);
    expect(report.pricing.observationsDropped).toBe(0);
  });

  it("drops an observation whose charges disagree, and prices nothing from it", () => {
    const lines = parseInvoiceLinesCsv(
      [
        "Tracking Number,Invoice Date,Carrier,Service,Billed Weight (lb),Zone,Base Charge,Net Amount",
        "T1,2026-09-10,ups,ups_ground,13,4,15.00,15.00",
        "T2,2026-09-10,ups,ups_ground,12,4,13.50,13.50",
        "T3,2026-09-10,ups,ups_ground,12,4,14.00,14.00",
      ].join("\n"),
    ).lines;
    const { diagnostics } = deriveObservedBracketCard(lines);
    expect(diagnostics.observations).toBe(1);
    expect(diagnostics.dropped).toEqual([
      { carrier: "ups", service: "ups_ground", zone: "4", weightLb: 12, charges: 2, spreadCents: 50 },
    ]);

    const { report } = auditInvoiceCsv({
      shipmentRecordsCsv: PLATFORM_RECORDS,
      invoiceLinesCsv: [
        "Tracking Number,Invoice Date,Carrier,Service,Billed Weight (lb),Zone,Base Charge,Net Amount",
        "T1,2026-09-10,ups,ups_ground,13,4,15.00,15.00",
        "T2,2026-09-10,ups,ups_ground,12,4,13.50,13.50",
        "T3,2026-09-10,ups,ups_ground,12,4,14.00,14.00",
      ].join("\n"),
      asOfDate: AS_OF,
      pricingBasis: "observed-bracket",
    });
    const line = report.lines.find((entry) => entry.tracking === "T1");
    expect(line?.rateVerification).toBe("unmapped");
    expect(line?.claimableCents).toBe(0);
    expect(report.pricing.observationsDropped).toBe(1);
  });

  it("keeps the contract rate card authoritative when one is supplied", () => {
    const { report } = auditInvoiceCsv({
      shipmentRecordsCsv: PLATFORM_RECORDS,
      invoiceLinesCsv: BILLING_EXPORT,
      rateCardCsv: "carrier,service,zone,min_weight_lb,max_weight_lb,rate_usd\nups,ups_ground,4,12,12,14.00",
      asOfDate: AS_OF,
      pricingBasis: "observed-bracket",
    });
    const line = report.lines.find((entry) => entry.tracking === "T1");
    expect(line?.rateVerification).toBe("verified");
    expect(line?.recomputedBaseCents).toBe(1400);
    expect(line?.deltaCents).toBe(100);
    expect(report.pricing.basis).toBe("observed-bracket");
    expect(report.pricing.linesPricedByObservation).toBe(0);
  });
});
