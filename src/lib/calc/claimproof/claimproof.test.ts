import { describe, it, expect } from "vitest";
import { allowanceFor, expectedPayment, auditClaim, variance, FEE_KEYS } from "./engine";
import { TRUEMFG_2022_06, scheduleBySlug, isStaleSchedule, SCHEDULE_SLUGS } from "./schedules";
import { formatCents, formatTenths, laborCents, parseHoursToTenths, parseUsdToCents } from "./money";
import { DEFAULT_SCENARIO_RECORD } from "./fixtures";
import { readClaimRecord } from "./extraction";
import type { Claim, LabourSchedule, Payment } from "./types";

function mkClaim(partial: Partial<Claim>): Claim {
  return {
    claimId: "CL-TEST",
    oemSlug: "truemfg@2022-06",
    model: "GDM-49F",
    serial: "SER-1",
    serviceDate: "2026-06-01",
    laborRateCentsPerHour: 12000,
    travel: null,
    partsCents: 0,
    fees: FEE_KEYS.map((key) => ({ key, claimedCents: 0 })),
    repairs: [],
    ...partial,
  };
}

function mkPayment(partial: Partial<Payment> = {}): Payment {
  return {
    laborCents: 0,
    partsCents: 0,
    travelCents: 0,
    fees: { nitrogen: 0, miscMaterials: 0, reclaim: 0 },
    totalCents: 0,
    ...partial,
  };
}

describe("allowanceFor — the repair-code table and the multiple-repair rule", () => {
  it("pays a single repair at its full table allowance", () => {
    const result = allowanceFor(
      mkClaim({ repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }] }),
      TRUEMFG_2022_06,
    );
    expect(result.totalAllowedTenths).toBe(45);
    expect(result.blockedCount).toBe(0);
    expect(result.multipleRepairApplied).toBe(false);
  });

  it("applies the multiple-repair rule: highest full + 1 h for each additional refrigeration part", () => {
    const result = allowanceFor(
      mkClaim({
        repairs: [
          { code: "refrig-compressor", description: "", hoursClaimedTenths: 45 },
          { code: "refrig-locate-leak", description: "", hoursClaimedTenths: 40 },
        ],
      }),
      TRUEMFG_2022_06,
    );
    expect(result.totalAllowedTenths).toBe(55);
    expect(result.multipleRepairApplied).toBe(true);
    const compressor = result.lines.find((line) => line.code === "refrig-compressor");
    const leak = result.lines.find((line) => line.code === "refrig-locate-leak");
    expect(compressor?.allowedTenths).toBe(45);
    expect(compressor?.multipleRepairIncrement).toBe(false);
    expect(leak?.allowedTenths).toBe(10);
    expect(leak?.multipleRepairIncrement).toBe(true);
  });

  it("takes the HIGHEST-allowance line as the base regardless of filing order", () => {
    const result = allowanceFor(
      mkClaim({
        repairs: [
          { code: "refrig-locate-leak", description: "", hoursClaimedTenths: 40 },
          { code: "refrig-compressor", description: "", hoursClaimedTenths: 45 },
        ],
      }),
      TRUEMFG_2022_06,
    );
    expect(result.totalAllowedTenths).toBe(55);
  });

  it("does not decrement a non-refrigeration repair under the refrigeration multiple-repair rule", () => {
    const result = allowanceFor(
      mkClaim({
        repairs: [
          { code: "refrig-compressor", description: "", hoursClaimedTenths: 45 },
          { code: "elec-temp-control-module", description: "", hoursClaimedTenths: 20 },
        ],
      }),
      TRUEMFG_2022_06,
    );
    expect(result.totalAllowedTenths).toBe(65);
  });

  it("reports an unknown code as unstated and BLOCKS the line — never zero", () => {
    const result = allowanceFor(
      mkClaim({
        repairs: [
          { code: "refrig-compressor", description: "", hoursClaimedTenths: 45 },
          { code: "not-a-vented-code", description: "some off-table repair", hoursClaimedTenths: 30 },
        ],
      }),
      TRUEMFG_2022_06,
    );
    expect(result.blockedCount).toBe(1);
    const blocked = result.lines.find((line) => line.code === "not-a-vented-code");
    expect(blocked?.blocked).toBe(true);
    expect(blocked?.allowedTenths).toBeNull();
    expect(blocked?.ruleId).toBe("cp-repair-unstated");
  });

  it("every vendored code resolves to a non-blocked allowance", () => {
    for (const code of Object.keys(TRUEMFG_2022_06.rules)) {
      const result = allowanceFor(
        mkClaim({ repairs: [{ code, description: "", hoursClaimedTenths: 10 }] }),
        TRUEMFG_2022_06,
      );
      expect(result.blockedCount, `code ${code} must resolve`).toBe(0);
    }
  });
});

describe("expectedPayment — hours × rate, caps, and the travel rule", () => {
  it("prices labour at the claim's own rate (the schedule publishes no fixed rate)", () => {
    const result = expectedPayment(
      mkClaim({ repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }] }),
      TRUEMFG_2022_06,
    );
    expect(result.laborCents).toBe(54000);
  });

  it("reports a fee over its cap AT the cap with the excess named", () => {
    const result = expectedPayment(
      mkClaim({
        repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }],
        fees: [
          { key: "nitrogen", claimedCents: 1500 },
          { key: "miscMaterials", claimedCents: 0 },
          { key: "reclaim", claimedCents: 0 },
        ],
      }),
      TRUEMFG_2022_06,
    );
    const nitrogen = result.fees.find((fee) => fee.key === "nitrogen");
    expect(nitrogen?.claimedCents).toBe(1500);
    expect(nitrogen?.allowedCents).toBe(1200);
    expect(nitrogen?.capped).toBe(true);
    expect(nitrogen?.excessCents).toBe(300);
    const finding = result.findings.find((f) => f.ruleId === "cp-fee-over-cap");
    expect(finding).toBeDefined();
    expect(finding?.deltaCents).toBe(300);
  });

  it("allows a fee under its cap at the claimed amount", () => {
    const result = expectedPayment(
      mkClaim({
        repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }],
        fees: [
          { key: "reclaim", claimedCents: 2000 },
          { key: "nitrogen", claimedCents: 0 },
          { key: "miscMaterials", claimedCents: 0 },
        ],
      }),
      TRUEMFG_2022_06,
    );
    const reclaim = result.fees.find((fee) => fee.key === "reclaim");
    expect(reclaim?.allowedCents).toBe(2000);
    expect(reclaim?.capped).toBe(false);
  });

  it("travel within 30 miles passes through as claimed (no fixed hour allowance is published)", () => {
    const result = expectedPayment(
      mkClaim({
        repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }],
        travel: { milesOneWay: 22, hoursClaimedTenths: 10, claimedCents: 12000 },
      }),
      TRUEMFG_2022_06,
    );
    expect(result.travelOverMiles).toBe(false);
    expect(result.travelCents).toBe(12000);
  });

  it("travel beyond 30 miles one way is NOT covered (allowance 0, excess named)", () => {
    const result = expectedPayment(
      mkClaim({
        repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }],
        travel: { milesOneWay: 45, hoursClaimedTenths: 10, claimedCents: 12000 },
      }),
      TRUEMFG_2022_06,
    );
    expect(result.travelOverMiles).toBe(true);
    expect(result.travelCents).toBe(0);
    const finding = result.findings.find((f) => f.ruleId === "cp-travel-over-miles");
    expect(finding).toBeDefined();
    expect(finding?.deltaCents).toBe(12000);
  });
});

describe("auditClaim — the per-line variance and the batch verdict", () => {
  it("reports the demo scenario as underpaid by $120.00 with the fee excess named", () => {
    const schedule = scheduleBySlug("truemfg@2022-06");
    const record = readClaimRecord(DEFAULT_SCENARIO_RECORD);
    expect(record.blocked).toBe(false);
    const claim = { ...record.claim, oemSlug: schedule.slug };
    const report = auditClaim(claim, schedule, record.payment);

    expect(report.verdict).toBe("underpaid");
    expect(report.staleSchedule).toBe(false);
    expect(report.blockedLineCount).toBe(0);

    const labor = report.lines.find((line) => line.scope === "labor");
    expect(labor?.expectedCents).toBe(66000);
    expect(labor?.paidCents).toBe(54000);
    expect(labor?.varianceCents).toBe(-12000);

    const nitrogen = report.lines.find((line) => line.scope === "fee:nitrogen");
    expect(nitrogen?.expectedCents).toBe(1200);
    expect(nitrogen?.verdict).toBe("correctly-paid");
    expect(report.findings.some((f) => f.ruleId === "cp-fee-over-cap")).toBe(true);

    expect(report.totalVarianceCents).toBe(-12000);
    expect(report.resubmissionSummary).toContain("$120.00");
  });

  it("withholds the labour line and the batch verdict when a repair code is unstated", () => {
    const claim = mkClaim({
      repairs: [
        { code: "refrig-compressor", description: "", hoursClaimedTenths: 45 },
        { code: "unknown-part", description: "mystery repair", hoursClaimedTenths: 20 },
      ],
    });
    const report = auditClaim(claim, TRUEMFG_2022_06, mkPayment({ laborCents: 54000 }));
    expect(report.blockedLineCount).toBe(1);
    expect(report.verdict).toBe("unverifiable");
    const labor = report.lines.find((line) => line.scope === "labor");
    expect(labor?.blocked).toBe(true);
    expect(labor?.expectedCents).toBeNull();
    expect(labor?.verdict).toBe("unverifiable");
  });

  it("flags a stale schedule on the face of the report", () => {
    const staleSchedule: LabourSchedule = { ...TRUEMFG_2022_06, supersededAfter: "2025-01-01" };
    const claim = mkClaim({
      serviceDate: "2025-06-01",
      repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }],
    });
    expect(isStaleSchedule(staleSchedule, claim.serviceDate)).toBe(true);
    const report = auditClaim(claim, staleSchedule, mkPayment({ laborCents: 54000 }));
    expect(report.staleSchedule).toBe(true);
    expect(report.findings.some((f) => f.ruleId === "cp-stale-schedule")).toBe(true);
    expect(report.verdict).toBe("unverifiable");
  });

  it("does not flag a current schedule as stale", () => {
    const claim = mkClaim({
      serviceDate: "2026-06-01",
      repairs: [{ code: "refrig-compressor", description: "", hoursClaimedTenths: 45 }],
    });
    const report = auditClaim(claim, TRUEMFG_2022_06, mkPayment({ laborCents: 54000 }));
    expect(report.staleSchedule).toBe(false);
  });
});

describe("the sum invariant — Σ(line variances) == batch variance", () => {
  it("holds on the demo scenario and is enforced in the engine", () => {
    const schedule = scheduleBySlug("truemfg@2022-06");
    const record = readClaimRecord(DEFAULT_SCENARIO_RECORD);
    const claim = { ...record.claim, oemSlug: schedule.slug };
    const report = auditClaim(claim, schedule, record.payment);

    const lineSum = report.lines.reduce((sum, line) => sum + (line.varianceCents ?? 0), 0);
    const paidSum = report.lines.reduce((sum, line) => sum + line.paidCents, 0);
    const expectedSum = report.lines.reduce((sum, line) => sum + (line.expectedCents ?? 0), 0);
    expect(lineSum).toBe(report.totalVarianceCents);
    expect(report.totalVarianceCents).toBe(paidSum - expectedSum);
    expect(report.totalPaidCents).toBe(paidSum);
    expect(report.totalExpectedCents).toBe(expectedSum);
  });

  it("holds across every single-code allowance (the invariant is structural, not a fixture accident)", () => {
    for (const code of Object.keys(TRUEMFG_2022_06.rules)) {
      const claim = mkClaim({ repairs: [{ code, description: "", hoursClaimedTenths: 10 }] });
      const payment = mkPayment({
        laborCents: laborCents(TRUEMFG_2022_06.rules[code].allowedTenths, 12000),
      });
      const report = auditClaim(claim, TRUEMFG_2022_06, payment);
      const lineSum = report.lines.reduce((sum, line) => sum + (line.varianceCents ?? 0), 0);
      expect(lineSum).toBe(report.totalVarianceCents);
    }
  });
});

describe("variance — the verdict classifier", () => {
  it("classifies the four cases", () => {
    expect(variance(100, 120).verdict).toBe("underpaid");
    expect(variance(100, 100).verdict).toBe("correctly-paid");
    expect(variance(120, 100).verdict).toBe("overpaid");
    expect(variance(100, null).verdict).toBe("unverifiable");
    expect(variance(100, 120).varianceCents).toBe(-20);
  });
});

describe("money and time — integer arithmetic at every boundary", () => {
  it("parses dollars to cents and hours to tenths exactly", () => {
    expect(parseUsdToCents("$12.00", "x")).toBe(1200);
    expect(parseUsdToCents("120.50", "x")).toBe(12050);
    expect(parseHoursToTenths("4.5", "x")).toBe(45);
    expect(parseHoursToTenths("1.0", "x")).toBe(10);
    expect(() => parseUsdToCents("12.005", "x")).toThrow(/finer than the cent/);
  });

  it("formats without ever emitting a float", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(-12000)).toBe("-$120.00");
    expect(formatTenths(55)).toBe("5.5 h");
    expect(formatTenths(40)).toBe("4 h");
  });

  it("prices labour as allowedTenths × rate ÷ 10, rounded once", () => {
    expect(laborCents(55, 12000)).toBe(66000);
    expect(laborCents(45, 12000)).toBe(54000);
  });
});

describe("the schedule registry", () => {
  it("lists exactly the vendored schedules and refuses an unknown slug", () => {
    expect(SCHEDULE_SLUGS).toEqual(["truemfg@2022-06"]);
    expect(() => scheduleBySlug("not-vendored")).toThrow(/No vendored schedule/);
    expect(scheduleBySlug("truemfg@2022-06").oem).toBe("True Manufacturing");
  });
});
