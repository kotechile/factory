/**
 * Known-answer vectors for the ParcelProof engine (PRD §2).
 *
 * Every case asserts the EXACT finding list — `[ruleId, severity, fieldPath]` triples — plus the
 * money to the cent, not just a boolean. The routes this file proves:
 *  1. a divisor swap (USPS 166 → 139 on 2026-07-12) on a ~1,800 cu in parcel: accepted as billed
 *     after the change, an overcharge with the old divisor still in force;
 *  2. the round-up rule (11.2″ billed from 12″): the round-up is accepted, a truncated bill is an
 *     under-bill, never an invented recovery;
 *  3. AHS-Dimension billed on a 40″ parcel, with the trigger that failed named — and an eligible
 *     100″ parcel that produces no flag at all;
 *  4. a late-delivery refund inside vs outside the money-back window;
 *  5. the dispute clock: open / expiring / expired;
 *  6. a clean invoice that must produce ZERO flags;
 *  7. the same over-billed invoice with no rate card: proven weight, unverifiable money;
 *  8. the input contract: unmapped service, out-of-range ship date, missing field, bad CSV.
 */
import { describe, expect, it } from "vitest";

import {
  DISPUTE_CSV_HEADER,
  IMPLEMENTED_RULE_IDS,
  ParcelAuditFieldError,
  auditCarrierInvoice,
  auditInvoiceCsv,
  buildDisputeCsv,
  computeBillableWeight,
  disputeWindowFor,
  parseInvoiceLinesCsv,
  parseRateCardCsv,
  parseShipmentRecordsCsv,
  resolveDimRule,
} from "./index";
import type { AuditFinding, AuditReport } from "./types";
import {
  AUDIT_SCENARIOS,
  CONTRACT_RATE_CARD_CSV,
  ahsDimensionInput,
  cleanInput,
  dateOutOfRangeInput,
  disputeClockInput,
  divisorSwapInput,
  lateDeliveryInput,
  missingTrackingInput,
  noRateCardInput,
  roundUpInput,
  scenarioByKey,
  thresholdInput,
  unsupportedServiceInput,
} from "./fixtures";

/** ruleId / severity / fieldPath triples — the exact contract each fixture pins. */
function shape(findings: readonly AuditFinding[]) {
  return findings.map((finding) => [finding.ruleId, finding.severity, finding.fieldPath]);
}

function ruleIds(report: AuditReport) {
  return report.findings.map((finding) => finding.ruleId);
}

describe("ParcelProof — billable weight (carrier × service × ship date)", () => {
  it("resolves the USPS divisor switch on 2026-07-12 and only for USPS", () => {
    expect(resolveDimRule("usps", "usps_ground_advantage", "2026-07-11").divisor).toBe(166);
    expect(resolveDimRule("usps", "usps_ground_advantage", "2026-07-12").divisor).toBe(139);
    expect(resolveDimRule("usps", "usps_priority_mail", "2026-12-31").divisor).toBe(139);
    expect(resolveDimRule("ups", "ups_ground", "2026-01-01").divisor).toBe(139);
    expect(resolveDimRule("fedex", "fedex_ground", "2026-06-01").divisor).toBe(139);
    // FedEx Ground and USPS only bill DIM above 1,728 cu in; UPS/Express bill it at any size.
    expect(resolveDimRule("fedex", "fedex_ground", "2026-06-01").cubicInThreshold).toBe(1728);
    expect(resolveDimRule("usps", "usps_ground_advantage", "2026-06-01").cubicInThreshold).toBe(1728);
    expect(resolveDimRule("ups", "ups_ground", "2026-06-01").cubicInThreshold).toBe(0);
  });

  it("recomputes 1,800 cu in under both USPS divisors and rounds the weight up", () => {
    const dims = { length: 20, width: 15, height: 6 };
    const before = computeBillableWeight({
      carrier: "usps",
      service: "usps_ground_advantage",
      shipDate: "2026-06-01",
      dims,
      actualWeightLb: 10,
    });
    const after = computeBillableWeight({
      carrier: "usps",
      service: "usps_ground_advantage",
      shipDate: "2026-08-01",
      dims,
      actualWeightLb: 10,
    });

    expect(before.cubicInches).toBe(1800);
    expect(before.divisor).toBe(166);
    expect(before.dimWeightRawLb).toBeCloseTo(10.8434, 4);
    expect(before.billableWeightLb).toBe(11);
    expect(before.basis).toBe("dimensional");
    expect(after.divisor).toBe(139);
    expect(after.dimWeightRawLb).toBeCloseTo(12.9496, 4);
    expect(after.billableWeightLb).toBe(13);
  });

  it("leaves FedEx Ground alone below 1,728 cu in and applies DIM above it", () => {
    const below = computeBillableWeight({
      carrier: "fedex",
      service: "fedex_ground",
      shipDate: "2026-09-01",
      dims: { length: 16, width: 10, height: 10 },
      actualWeightLb: 8,
    });
    expect(below.cubicInches).toBe(1600);
    expect(below.dimApplied).toBe(false);
    expect(below.billableWeightLb).toBe(8);

    const above = computeBillableWeight({
      carrier: "fedex",
      service: "fedex_ground",
      shipDate: "2026-09-01",
      dims: { length: 18, width: 14, height: 10 },
      actualWeightLb: 15,
    });
    expect(above.cubicInches).toBe(2520);
    expect(above.dimApplied).toBe(true);
    expect(above.billableWeightLb).toBe(19);
  });

  it("throws for a service, a date and a dimension the v1 table does not cover", () => {
    expect(() =>
      computeBillableWeight({
        carrier: "ups",
        service: "ltl_freight" as never,
        shipDate: "2026-09-01",
        dims: { length: 10, width: 10, height: 10 },
        actualWeightLb: 5,
      }),
    ).toThrowError(ParcelAuditFieldError);

    try {
      computeBillableWeight({
        carrier: "usps",
        service: "usps_ground_advantage",
        shipDate: "2025-12-31",
        dims: { length: 10, width: 10, height: 10 },
        actualWeightLb: 5,
      });
      throw new Error("expected a date-range failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParcelAuditFieldError);
      expect((error as ParcelAuditFieldError).ruleId).toBe("pp-dim-date-out-of-range");
      expect((error as ParcelAuditFieldError).fieldPath).toBe("shipDate");
    }

    try {
      computeBillableWeight({
        carrier: "ups",
        service: "ups_ground",
        shipDate: "2026-09-01",
        dims: { length: 0, width: 10, height: 10 },
        actualWeightLb: 5,
      });
      throw new Error("expected a dimension failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParcelAuditFieldError);
      expect((error as ParcelAuditFieldError).ruleId).toBe("pp-field-invalid");
    }
  });
});

describe("ParcelProof — recovery audit", () => {
  it("accepts the divisor swap as billed after 2026-07-12 and flags it before", () => {
    const report = auditCarrierInvoice(divisorSwapInput());

    expect(shape(report.findings)).toEqual([
      ["pp-dim-divisor", "recoverable", "invoiceLines[1].billedWeightLb"],
    ]);
    expect(report.clean).toBe(false);

    const accepted = report.lines[0];
    expect(accepted.recomputedWeightLb).toBe(13);
    expect(accepted.billedWeightLb).toBe(13);
    expect(accepted.findings).toEqual([]);
    expect(accepted.weight?.divisor).toBe(139);
    expect(accepted.deltaCents).toBe(0);

    const overcharged = report.lines[1];
    expect(overcharged.recomputedWeightLb).toBe(11);
    expect(overcharged.billedWeightLb).toBe(13);
    expect(overcharged.weight?.divisor).toBe(166);
    expect(overcharged.weight?.divisorRuleEffectiveFrom).toBe("2026-01-01");
    expect(overcharged.recomputedBaseCents).toBe(1050);
    expect(overcharged.billedBaseCents).toBe(1150);
    expect(overcharged.deltaCents).toBe(100);
    expect(overcharged.recomputedTotalCents).toBe(1050);
    expect(overcharged.claimableCents).toBe(100);
    expect(overcharged.expiredCents).toBe(0);
    expect(overcharged.rateVerification).toBe("verified");

    // The finding names the divisor that was applied, the one in force, and both weights.
    const finding = overcharged.findings[0] as AuditFinding;
    expect(finding.trigger).toContain("divisor 139 was applied");
    expect(finding.trigger).toContain("2026-06-01 is 166");
    expect(finding.evidence.cause).toBe("divisor");
    expect(finding.deltaCents).toBe(100);

    expect(report.summary.recoverableTotalCents).toBe(100);
    expect(report.summary.expiringSoonCents).toBe(0);
    expect(report.summary.expiredTotalCents).toBe(0);
    expect(report.summary.linesAudited).toBe(2);
    expect(report.summary.linesUnverifiable).toBe(0);
    expect(report.summary.findings).toBe(1);
    expect(report.summary.byRule).toEqual([{ ruleId: "pp-dim-divisor", count: 1, totalCents: 100 }]);
    expect(report.summary.byCarrier).toEqual([
      // A single-day invoice window cannot be annualised — the field is null, not a fabricated rate.
      { carrier: "usps", lines: 2, recoverableCents: 100, expiredCents: 0, annualisedRunRateCents: null },
    ]);
    expect(report.summary.observedWindowDays).toBe(1);
  });

  it("applies the round-up rule and reports a truncated bill as an under-bill", () => {
    const report = auditCarrierInvoice(roundUpInput());

    expect(shape(report.findings)).toEqual([
      ["pp-billing-under", "advisory", "invoiceLines[1].billedWeightLb"],
    ]);

    const rounded = report.lines[0];
    expect(rounded.weight?.roundUpApplied).toBe(true);
    expect(rounded.weight?.roundedDims).toEqual({ length: 12, width: 10, height: 10 });
    expect(rounded.weight?.cubicInches).toBe(1200);
    expect(rounded.weight?.dimWeightRawLb).toBeCloseTo(8.6331, 4);
    expect(rounded.weight?.dimWeightLb).toBe(9);
    expect(rounded.recomputedWeightLb).toBe(9);
    expect(rounded.findings).toEqual([]);
    expect(rounded.deltaCents).toBe(0);

    const truncated = report.lines[1];
    expect(truncated.recomputedWeightLb).toBe(9);
    expect(truncated.billedWeightLb).toBe(8);
    expect(truncated.recomputedBaseCents).toBe(4600);
    expect(truncated.deltaCents).toBe(-500);
    expect(truncated.recomputedTotalCents).toBe(4600);
    expect(truncated.underBilledCents).toBe(500);
    expect(truncated.claimableCents).toBe(0);
    expect(report.summary.underBilledTotalCents).toBe(500);
    expect(report.summary.recoverableTotalCents).toBe(0);
  });

  it("flags AHS-Dimension on a 40″ parcel with the failed trigger, at FedEx and at UPS", () => {
    const report = auditCarrierInvoice(ahsDimensionInput());

    expect(shape(report.findings)).toEqual([
      ["pp-sur-ahs-dimension", "recoverable", "invoiceLines[0].surcharges[0].amountCents"],
      ["pp-sur-ahs-dimension", "recoverable", "invoiceLines[1].surcharges[0].amountCents"],
    ]);

    // FedEx: 40″ does not exceed the 48″ trigger the PRD assigns to FedEx.
    const fedex = report.lines[0].findings[0] as AuditFinding;
    expect(fedex.deltaCents).toBe(2950);
    expect(fedex.trigger).toContain("exceeds 48 in (FEDEX)");
    expect(fedex.trigger).toContain("longest rounded side is 40 in");
    expect(fedex.evidence.longestSideIn).toBe(40);
    expect(report.lines[0].recomputedTotalCents).toBe(1900);

    // UPS: 40″ does not exceed the 96″ trigger the PRD assigns to UPS either.
    const ups = report.lines[1].findings[0] as AuditFinding;
    expect(ups.deltaCents).toBe(2950);
    expect(ups.trigger).toContain("exceeds 96 in (UPS)");
    expect(report.lines[1].recomputedTotalCents).toBe(1450);

    // The control: a 100″ parcel IS eligible at UPS (trigger > 96″) and produces no finding.
    const eligible = report.lines[2];
    expect(eligible.findings).toEqual([]);
    expect(eligible.surcharges).toEqual([
      {
        code: "AHS-DIM",
        kind: "ahs_dimension",
        amountCents: 2950,
        eligible: true,
        verdict: "eligible",
        trigger: "AHS-Dimension applies when the longest side exceeds 96 in (UPS); this parcel's longest rounded side is 100 in",
      },
    ]);
    expect(eligible.deltaCents).toBe(0);

    expect(report.summary.recoverableTotalCents).toBe(5900);
  });

  it("refunds a late delivery inside the money-back window and refuses outside it", () => {
    const report = auditCarrierInvoice(lateDeliveryInput());

    expect(shape(report.findings)).toEqual([
      ["pp-svc-late", "recoverable", "shipmentRecords[0].deliveredAt"],
      ["pp-svc-late-expired", "advisory", "shipmentRecords[1].deliveredAt"],
    ]);

    const claimable = report.lines[0];
    expect(claimable.serviceCommitment?.status).toBe("late-claimable");
    expect(claimable.serviceCommitment?.daysLate).toBe(2);
    expect(claimable.serviceCommitment?.refundableCents).toBe(4100);
    expect(claimable.serviceCommitment?.claimDaysRemaining).toBe(13);
    expect(claimable.serviceCommitment?.claimDeadline).toBe("2026-09-02");
    expect(claimable.deltaCents).toBe(4100);
    expect(claimable.claimableCents).toBe(4100);
    expect(claimable.findings[0].deltaCents).toBe(4100);
    expect(claimable.findings[0].fix).toContain("2026-09-02");
    // The refund is the base charge only — accessorials and fuel are not claimable, and the base
    // charge is the whole line, so the recomputed total is zero.
    expect(claimable.recomputedTotalCents).toBe(0);

    const expired = report.lines[1];
    expect(expired.serviceCommitment?.status).toBe("late-window-closed");
    expect(expired.serviceCommitment?.moneyBackDays).toBe(21);
    expect(expired.serviceCommitment?.refundableCents).toBe(0);
    expect(expired.findings[0].deltaCents).toBeUndefined();
    expect(expired.claimableCents).toBe(0);
    // The line's own dispute window is already past too, but with no claimable money the clock
    // raises no finding — the clock only speaks when there is something to claim.
    expect(expired.disputeWindow?.status).toBe("expired");
    expect(ruleIds(report)).not.toContain("pp-clk-expired");

    expect(report.summary.recoverableTotalCents).toBe(4100);
    expect(report.summary.expiredTotalCents).toBe(0);
  });

  it("tracks the dispute clock per line: open, expiring, expired", () => {
    const report = auditCarrierInvoice(disputeClockInput());

    expect(shape(report.findings)).toEqual([
      ["pp-dim-divisor", "recoverable", "invoiceLines[0].billedWeightLb"],
      ["pp-dim-divisor", "recoverable", "invoiceLines[1].billedWeightLb"],
      ["pp-clk-expiring", "advisory", "invoiceLines[1].invoiceDate"],
      ["pp-dim-divisor", "recoverable", "invoiceLines[2].billedWeightLb"],
      ["pp-clk-expired", "advisory", "invoiceLines[2].invoiceDate"],
    ]);

    expect(report.lines[0].disputeWindow).toEqual({
      carrier: "usps",
      windowDays: 30,
      invoiceDate: "2026-09-15",
      deadline: "2026-10-15",
      daysRemaining: 27,
      status: "open",
    });
    expect(report.lines[1].disputeWindow?.status).toBe("expiring");
    expect(report.lines[1].disputeWindow?.daysRemaining).toBe(7);
    expect(report.lines[2].disputeWindow?.status).toBe("expired");
    expect(report.lines[2].disputeWindow?.deadline).toBe("2026-08-31");

    expect(report.lines[0].claimableCents).toBe(100);
    expect(report.lines[1].claimableCents).toBe(100);
    expect(report.lines[2].claimableCents).toBe(0);
    expect(report.lines[2].expiredCents).toBe(100);

    expect(report.summary.recoverableTotalCents).toBe(200);
    expect(report.summary.expiringSoonCents).toBe(100);
    expect(report.summary.expiredTotalCents).toBe(100);
    expect(report.summary.observedWindowDays).toBe(45);
    expect(report.summary.byCarrier).toEqual([
      { carrier: "usps", lines: 3, recoverableCents: 200, expiredCents: 100, annualisedRunRateCents: 1622 },
    ]);
  });

  it("prices a DIM weight billed below the cubic-inch threshold", () => {
    const report = auditCarrierInvoice(thresholdInput());

    expect(shape(report.findings)).toEqual([
      ["pp-dim-threshold", "recoverable", "invoiceLines[0].billedWeightLb"],
    ]);
    const finding = report.findings[0] as AuditFinding;
    expect(finding.trigger).toContain("bills DIM only above 1,728 cu in");
    expect(finding.trigger).toContain("1,600 cu in");
    expect(finding.deltaCents).toBe(150);
    expect(report.lines[0].recomputedWeightLb).toBe(8);
    expect(report.lines[0].billedWeightLb).toBe(12);
    expect(report.lines[0].recomputedTotalCents).toBe(1350);
  });

  it("produces ZERO flags on a clean invoice", () => {
    const report = auditCarrierInvoice(cleanInput());

    expect(shape(report.findings)).toEqual([]);
    expect(report.clean).toBe(true);
    expect(ruleIds(report)).toEqual([]);
    expect(report.summary.findings).toBe(0);
    expect(report.summary.recoverableTotalCents).toBe(0);
    expect(report.summary.expiredTotalCents).toBe(0);
    expect(report.summary.underBilledTotalCents).toBe(0);
    expect(report.summary.recordsUnbilled).toBe(0);
    expect(report.summary.linesAudited).toBe(3);
    expect(report.summary.linesUnverifiable).toBe(0);
    expect(report.summary.unverifiableCents).toBe(0);
    expect(report.lines.every((line) => line.deltaCents === 0)).toBe(true);
    expect(report.lines.map((line) => line.rateVerification)).toEqual([
      "verified",
      "verified",
      "verified",
    ]);
    // The eligible residential surcharge is billed and NOT flagged, and the recomputed total is the
    // billed total because nothing was over-charged.
    expect(report.lines[0].surcharges[0]?.verdict).toBe("eligible");
    expect(report.lines[0].recomputedTotalCents).toBe(report.lines[0].billedTotalCents);
    expect(report.summary.byRule).toEqual([]);
  });

  it("reports an unpriced line as unverifiable rather than as $0 of recovery", () => {
    const report = auditCarrierInvoice(noRateCardInput());

    expect(shape(report.findings)).toEqual([
      // No rate card: the weight proof holds (advisory — nothing to claim), and each line's money is
      // reported unverifiable instead of being counted as $0 of recovery. Order is line order, then
      // within-line order (weight → surcharge → commitment → clock → rate).
      ["pp-rate-unverifiable", "advisory", "invoiceLines[0].baseChargeCents"],
      ["pp-dim-divisor", "advisory", "invoiceLines[1].billedWeightLb"],
      ["pp-rate-unverifiable", "advisory", "invoiceLines[1].baseChargeCents"],
    ]);
    // The weight proof survives without the rate card; the money does not get invented.
    expect(report.lines[1].recomputedWeightLb).toBe(11);
    expect(report.lines[1].billedWeightLb).toBe(13);
    expect(report.lines[1].recomputedBaseCents).toBeNull();
    expect(report.lines[1].rateVerification).toBe("unverifiable-rate");
    expect(report.lines[1].findings[0].deltaCents).toBeUndefined();
    expect(report.lines[1].claimableCents).toBe(0);
    expect(report.summary.recoverableTotalCents).toBe(0);
    expect(report.summary.unverifiableCents).toBe(0);
    expect(report.summary.linesUnpriced).toBe(2);
    expect(report.summary.linesAudited).toBe(2);
    expect(report.summary.linesUnverifiable).toBe(0);
  });

  it("flags a rate-card gap as unmapped, not as a pass", () => {
    const report = auditCarrierInvoice({
      ...cleanInput(),
      rateCard: { rows: [] },
    });
    expect(shape(report.findings)).toEqual([
      ["pp-rate-unmapped", "advisory", "rateCard.rows"],
      ["pp-rate-unmapped", "advisory", "rateCard.rows"],
      ["pp-rate-unmapped", "advisory", "rateCard.rows"],
    ]);
    expect(report.lines.every((line) => line.rateVerification === "unmapped")).toBe(true);
    expect(report.summary.recoverableTotalCents).toBe(0);
  });

  it("blocks an unsupported service and an out-of-range ship date with their rule ids", () => {
    const unsupported = auditCarrierInvoice(unsupportedServiceInput());
    expect(shape(unsupported.findings)[0]).toEqual([
      "pp-dim-unsupported-service",
      "blocking",
      "shipmentRecords[0].service",
    ]);
    expect(unsupported.lines[0].audited).toBe(false);
    expect(unsupported.lines[0].unauditedReason).toBe("pp-dim-unsupported-service");
    expect(ruleIds(unsupported)).toContain("pp-record-unbilled");

    const outOfRange = auditCarrierInvoice(dateOutOfRangeInput());
    expect(shape(outOfRange.findings)[0]).toEqual([
      "pp-dim-date-out-of-range",
      "blocking",
      "shipmentRecords[0].shipDate",
    ]);
    expect(outOfRange.lines[0].audited).toBe(false);
    // The second line of the same invoice is unaffected — one bad record does not hide the rest.
    expect(outOfRange.lines[1].findings.map((finding) => finding.ruleId)).toEqual(["pp-dim-divisor"]);
  });

  it("blocks a missing required field by rule id and field path", () => {
    const report = auditCarrierInvoice(missingTrackingInput());
    expect(shape(report.findings)[0]).toEqual([
      "pp-field-missing",
      "blocking",
      "invoiceLines[0].tracking",
    ]);
    expect(report.lines[0].audited).toBe(false);
    expect(report.lines[0].unauditedReason).toContain("pp-field-missing");
    expect(report.summary.linesUnverifiable).toBe(1);
    expect(report.summary.linesAudited).toBe(1);
  });

  it("blocks an invoice line with no shipment record behind it", () => {
    const input = cleanInput();
    const report = auditCarrierInvoice({
      ...input,
      invoiceLines: [
        ...input.invoiceLines,
        {
          tracking: "1Z999AA10123456999",
          carrier: "ups",
          billedWeightLb: 5,
          zone: "3",
          baseChargeCents: 900,
          surcharges: [],
          totalCents: 900,
          invoiceDate: "2026-09-10",
        },
      ],
    });
    expect(shape(report.findings)).toEqual([
      ["pp-line-orphan", "blocking", "invoiceLines[3].tracking"],
    ]);
    expect(report.lines[3].audited).toBe(false);
    expect(report.lines[3].disputeWindow?.windowDays).toBe(30);
    expect(report.summary.linesUnverifiable).toBe(1);
  });

  it("reports a shipment record that the invoice never billed", () => {
    const input = cleanInput();
    const report = auditCarrierInvoice({
      ...input,
      invoiceLines: input.invoiceLines.slice(0, 2),
    });
    expect(shape(report.findings)).toEqual([
      ["pp-record-unbilled", "advisory", "shipmentRecords[2].tracking"],
    ]);
    expect(report.summary.recordsUnbilled).toBe(1);
    expect(report.summary.linesAudited).toBe(2);
  });

  it("flags a zone that disagrees with the manifest and prices from the record", () => {
    const input = cleanInput();
    const report = auditCarrierInvoice({
      ...input,
      invoiceLines: [{ ...input.invoiceLines[0], zone: "8", baseChargeCents: 1900, totalCents: 2520 }, ...input.invoiceLines.slice(1)],
    });
    expect(shape(report.findings)).toEqual([
      ["pp-zone-mismatch", "advisory", "invoiceLines[0].zone"],
    ]);
    expect(report.lines[0].zone).toEqual({ record: "3", invoice: "8", match: false });
    expect(report.findings[0].trigger).toBe("invoice zone 8 ≠ record zone 3");
    expect(report.lines[0].recomputedBaseCents).toBe(1450);
  });

  it("scopes by carrier explicitly instead of silently skipping other lines", () => {
    const input = cleanInput();
    const report = auditCarrierInvoice({ ...input, carrier: "ups" });
    const outOfScope = report.findings.filter(
      (finding) => finding.ruleId === "pp-carrier-out-of-scope",
    );
    expect(outOfScope.length).toBe(2);
    expect(outOfScope[0].fieldPath).toBe("invoiceLines[1].carrier");
    expect(report.lines[0].audited).toBe(true);
    expect(report.lines[1].audited).toBe(false);
  });

  it("flags a surcharge whose eligibility the record cannot confirm", () => {
    const input = cleanInput();
    const record = { ...input.shipmentRecords[0] };
    delete (record as { residential?: unknown }).residential;
    const report = auditCarrierInvoice({
      ...input,
      shipmentRecords: [record, ...input.shipmentRecords.slice(1)],
    });
    expect(shape(report.findings)).toEqual([
      ["pp-sur-unverifiable", "advisory", "invoiceLines[0].surcharges[0].amountCents"],
    ]);
    expect(report.findings[0].trigger).toContain("does not state whether the delivery address is residential");
    expect(report.lines[0].surcharges[0]?.verdict).toBe("unverifiable");
    expect(report.summary.recoverableTotalCents).toBe(0);
  });

  it("treats fuel and unmapped accessorials as unsupported, never as benign", () => {
    const input = cleanInput();
    const report = auditCarrierInvoice({
      ...input,
      invoiceLines: [
        {
          ...input.invoiceLines[0],
          surcharges: [
            { code: "FUEL", amountCents: 700 },
            { code: "PEAK-SEASON-SURGE", amountCents: 450 },
          ],
        },
        ...input.invoiceLines.slice(1),
      ],
    });
    expect(shape(report.findings)).toEqual([
      ["pp-sur-fuel-unverifiable", "advisory", "invoiceLines[0].surcharges[0].amountCents"],
      ["pp-sur-unsupported", "advisory", "invoiceLines[0].surcharges[1].amountCents"],
    ]);
    expect(report.summary.recoverableTotalCents).toBe(0);
  });
});

describe("ParcelProof — ledger integrity", () => {
  it("keeps recomputed = billed − Σ deltas on every audited line, in every fixture", () => {
    const reports = [
      divisorSwapInput(),
      roundUpInput(),
      ahsDimensionInput(),
      lateDeliveryInput(),
      disputeClockInput(),
      cleanInput(),
      noRateCardInput(),
      thresholdInput(),
    ].map(auditCarrierInvoice);

    for (const report of reports) {
      for (const line of report.lines) {
        const sum = line.findings.reduce((total, finding) => total + (finding.deltaCents ?? 0), 0);
        expect(line.deltaCents).toBe(sum);
        expect(line.recomputedTotalCents).toBe(line.billedTotalCents - sum);
        expect(line.findings.every((finding) => finding.ruleId.startsWith("pp-"))).toBe(true);
        expect(line.findings.every((finding) => finding.message.length > 20)).toBe(true);
        expect(line.findings.every((finding) => finding.fix.length > 20)).toBe(true);
      }
      const claimable = report.lines.reduce((total, line) => total + line.claimableCents, 0);
      expect(report.summary.recoverableTotalCents).toBe(claimable);
    }
  });

  it("only ever emits rule ids it publishes as implemented", () => {
    const reports = [
      divisorSwapInput(),
      roundUpInput(),
      ahsDimensionInput(),
      lateDeliveryInput(),
      disputeClockInput(),
      cleanInput(),
      noRateCardInput(),
      thresholdInput(),
      unsupportedServiceInput(),
      dateOutOfRangeInput(),
      missingTrackingInput(),
    ].map(auditCarrierInvoice);

    const emitted = new Set(reports.flatMap(ruleIds));
    for (const ruleId of emitted) {
      expect(IMPLEMENTED_RULE_IDS, `${ruleId} is not published in coverage.ts`).toContain(ruleId);
    }
    // And the published list is the real surface — no rule id is published that no fixture exercises
    // beyond the ones the input contract can only reach through a CSV (asserted separately below).
    expect(emitted.size).toBeGreaterThan(8);
  });

  it("writes a dispute packet with one row per finding and the claim scope of each", () => {
    const report = auditCarrierInvoice(disputeClockInput());
    const packet = buildDisputeCsv(report);
    const rows = packet.trim().split("\n");

    expect(rows[0]).toBe(DISPUTE_CSV_HEADER.join(","));
    expect(rows.length).toBe(report.findings.length + 1);

    const columns = [...DISPUTE_CSV_HEADER];
    const parsed = rows.slice(1).map((row) => {
      const cells: string[] = [];
      // The engine never quotes in these fixtures, so a plain split is exact here.
      row.split(",").forEach((cell) => cells.push(cell));
      return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""]));
    });

    expect(parsed.map((row) => row.rule_id)).toEqual([
      "pp-dim-divisor",
      "pp-dim-divisor",
      "pp-clk-expiring",
      "pp-dim-divisor",
      "pp-clk-expired",
    ]);
    expect(parsed.map((row) => row.scope)).toEqual([
      "claimable",
      "claimable",
      "review",
      "expired",
      "review",
    ]);
    const openLine = parsed[0] as Record<string, string>;
    expect(openLine.delta_usd).toBe("1.00");
    expect(openLine.window_status).toBe("open");
    expect(openLine.window_deadline).toBe("2026-10-15");
    expect(openLine.recomputed_weight_lb).toBe("11");
    expect(openLine.trigger).toContain("divisor 139 was applied");
    const expiredLine = parsed[3] as Record<string, string>;
    expect(expiredLine.window_status).toBe("expired");
    expect(expiredLine.window_deadline).toBe("2026-08-31");

    // The packet is the same artifact the engine returns inside the report.
    expect(report.disputePacket).toBe(packet);
  });

  it("audits the CSV scenarios the UI loads, including a clean one with zero flags", () => {
    for (const scenario of AUDIT_SCENARIOS.filter((entry) => entry.key !== "messy")) {
      const result = auditInvoiceCsv({
        shipmentRecordsCsv: scenario.shipmentRecordsCsv,
        invoiceLinesCsv: scenario.invoiceLinesCsv,
        rateCardCsv: scenario.rateCardCsv,
        asOfDate: scenario.asOfDate,
      });
      expect(result.unmappedColumns.shipmentRecords).toEqual([]);
      expect(result.unmappedColumns.invoiceLines).toEqual([]);
      expect(result.report.lines.length).toBeGreaterThan(0);
    }

    const clean = scenarioByKey("clean");
    const cleanReport = auditInvoiceCsv({
      shipmentRecordsCsv: clean?.shipmentRecordsCsv ?? "",
      invoiceLinesCsv: clean?.invoiceLinesCsv ?? "",
      rateCardCsv: clean?.rateCardCsv ?? "",
      asOfDate: "2026-09-18",
    });
    expect(shape(cleanReport.report.findings)).toEqual([]);
    expect(cleanReport.report.clean).toBe(true);

    // The demo invoice with money on it: a divisor swap, an ineligible AHS-Dimension and a
    // late-delivery refund, each priced from the contract rate card.
    const demo = scenarioByKey("overcharge");
    const demoReport = auditInvoiceCsv({
      shipmentRecordsCsv: demo?.shipmentRecordsCsv ?? "",
      invoiceLinesCsv: demo?.invoiceLinesCsv ?? "",
      rateCardCsv: demo?.rateCardCsv ?? "",
      asOfDate: "2026-09-18",
    });
    expect(shape(demoReport.report.findings)).toEqual([
      ["pp-dim-divisor", "recoverable", "invoiceLines[0].billedWeightLb"],
      ["pp-sur-ahs-dimension", "recoverable", "invoiceLines[1].surcharges[0].amountCents"],
      ["pp-svc-late", "recoverable", "shipmentRecords[2].deliveredAt"],
    ]);
    expect(demoReport.report.summary.recoverableTotalCents).toBe(100 + 2950 + 4100);

    const deadline = scenarioByKey("deadline");
    const deadlineReport = auditInvoiceCsv({
      shipmentRecordsCsv: deadline?.shipmentRecordsCsv ?? "",
      invoiceLinesCsv: deadline?.invoiceLinesCsv ?? "",
      rateCardCsv: deadline?.rateCardCsv ?? "",
      asOfDate: "2026-09-18",
    });
    expect(deadlineReport.report.summary.recoverableTotalCents).toBe(200);
    expect(deadlineReport.report.summary.expiredTotalCents).toBe(100);
    expect(deadlineReport.report.summary.expiringSoonCents).toBe(100);

    const unpriced = scenarioByKey("unverified");
    const unpricedReport = auditInvoiceCsv({
      shipmentRecordsCsv: unpriced?.shipmentRecordsCsv ?? "",
      invoiceLinesCsv: unpriced?.invoiceLinesCsv ?? "",
      rateCardCsv: unpriced?.rateCardCsv ?? "",
      asOfDate: "2026-09-18",
    });
    expect(ruleIds(unpricedReport.report)).toEqual(["pp-dim-divisor", "pp-rate-unverifiable"]);
    expect(unpricedReport.report.summary.recoverableTotalCents).toBe(0);

    const roundup = scenarioByKey("roundup");
    const roundupReport = auditInvoiceCsv({
      shipmentRecordsCsv: roundup?.shipmentRecordsCsv ?? "",
      invoiceLinesCsv: roundup?.invoiceLinesCsv ?? "",
      rateCardCsv: roundup?.rateCardCsv ?? "",
      asOfDate: "2026-09-18",
    });
    expect(ruleIds(roundupReport.report)).toEqual(["pp-billing-under"]);
  });
});

describe("ParcelProof — input contract", () => {
  it("refuses a CSV with a required column missing, naming it", () => {
    const messy = scenarioByKey("messy");
    try {
      parseShipmentRecordsCsv(messy?.shipmentRecordsCsv ?? "");
      throw new Error("expected a missing-column failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParcelAuditFieldError);
      expect((error as ParcelAuditFieldError).ruleId).toBe("pp-field-missing");
      expect((error as ParcelAuditFieldError).fieldPath).toBe("shipmentRecords.zone");
      expect((error as ParcelAuditFieldError).message).toContain("zone");
    }
  });

  it("refuses an unparsable amount instead of coercing it", () => {
    try {
      parseInvoiceLinesCsv(
        "tracking,invoice_date,billed_weight_lb,zone,base_charge_usd,total_usd\n9400111899223197420010,2026-09-10,13,4,eleven-fifty,11.50",
      );
      throw new Error("expected an amount failure");
    } catch (error) {
      expect(error).toBeInstanceOf(ParcelAuditFieldError);
      expect((error as ParcelAuditFieldError).ruleId).toBe("pp-field-invalid");
      expect((error as ParcelAuditFieldError).fieldPath).toContain("base_charge_usd");
    }
  });

  it("refuses a non-ISO date and a malformed surcharge pair", () => {
    expect(() =>
      parseInvoiceLinesCsv(
        "tracking,invoice_date,billed_weight_lb,zone,base_charge_usd,total_usd\n9400111899223197420010,09/10/2026,13,4,11.50,11.50",
      ),
    ).toThrowError(/not an ISO 8601 date/);

    expect(() =>
      parseInvoiceLinesCsv(
        "tracking,invoice_date,billed_weight_lb,zone,base_charge_usd,surcharges,total_usd\n9400111899223197420010,2026-09-10,13,4,11.50,AHS-DIM,11.50",
      ),
    ).toThrowError(/not a code:amount pair/);
  });

  it("parses the contract rate card and refuses a bad row", () => {
    const ingest = parseRateCardCsv(CONTRACT_RATE_CARD_CSV);
    expect(ingest.rateCard.rows.length).toBe(12);
    expect(ingest.rateCard.rows[0]).toEqual({
      carrier: "usps",
      service: "usps_ground_advantage",
      zone: "4",
      minWeightLb: 1,
      maxWeightLb: 10,
      rateCents: 900,
    });
    expect(() => parseRateCardCsv("carrier,service,zone,min_weight_lb,rate_usd\nusps,ltl_freight,4,1,9.00")).toThrowError(
      /not a service v1 audits/,
    );
  });

  it("surfaces columns it does not map instead of ignoring them", () => {
    const ingest = parseShipmentRecordsCsv(
      [
        "order_id,tracking,carrier,service,ship_date,length,width,height,actual_weight_lb,zone,internal_cost_center",
        "SO-1,9400111899223197420400,usps,usps_ground_advantage,2026-09-01,20,15,6,10,4,CC-42",
      ].join("\n"),
    );
    expect(ingest.unmappedColumns).toEqual(["internal_cost_center"]);
    expect(ingest.records[0]?.zone).toBe("4");
  });

  it("requires an explicit asOfDate and arrays for both inputs", () => {
    expect(() =>
      auditCarrierInvoice({ shipmentRecords: [], invoiceLines: [], asOfDate: "not-a-date" }),
    ).toThrowError(ParcelAuditFieldError);
    expect(() =>
      auditCarrierInvoice({
        shipmentRecords: undefined as never,
        invoiceLines: [],
        asOfDate: "2026-09-18",
      }),
    ).toThrowError(/must be arrays/);
  });

  it("computes the dispute window from the invoice date for each carrier", () => {
    expect(disputeWindowFor("ups", "2026-09-10", "2026-09-18")).toEqual({
      carrier: "ups",
      windowDays: 30,
      invoiceDate: "2026-09-10",
      deadline: "2026-10-10",
      daysRemaining: 22,
      status: "open",
    });
    expect(disputeWindowFor("fedex", "2026-09-10", "2026-09-18").daysRemaining).toBe(13);
    expect(disputeWindowFor("fedex", "2026-08-01", "2026-09-18").status).toBe("expired");
    expect(disputeWindowFor("fedex", "2026-08-31", "2026-09-18")).toMatchObject({
      daysRemaining: 3,
      status: "expiring",
    });
  });
});
