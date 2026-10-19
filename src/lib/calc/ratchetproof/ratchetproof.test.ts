import { describe, expect, it } from "vitest";

import {
  RATCHETPROOF_SCENARIOS,
  TARIFF_RECORD_KEYS,
  BILL_RECORD_KEYS,
  RatchetProofExtractionUnavailableError,
  RatchetProofFieldError,
  align,
  auditFromText,
  billedDemand,
  buildTariffExtractionPrompt,
  buildBillsExtractionPrompt,
  parseIntervalFile,
  parseTariffJson,
  readBillsPayload,
  readTariffPayload,
  resolveExtractionCredentials,
  validateHistory,
} from "./index";
import { coincidentMeters, FIXTURE_PEAKS } from "./fixtures";

const scenario = RATCHETPROOF_SCENARIOS["ratchet-75"];

function run(key: keyof typeof RATCHETPROOF_SCENARIOS) {
  const entry = RATCHETPROOF_SCENARIOS[key];
  return auditFromText({
    intervalTexts: [entry.intervalCsv],
    tariffText: entry.tariffJson,
    billsText: entry.billsCsv,
    seedHistory: entry.seedHistory,
  });
}

describe("RatchetProof — the billed-demand formula", () => {
  it("reproduces the four-month 75% example to the cent", () => {
    const { report } = run("ratchet-75");
    expect(report.verdict).toBe("complete");
    expect(report.months.map((month) => month.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);

    const [january, february, march, april] = report.months;
    expect(january.recomputedBilledKwMilli).toBe(1_000_000);
    expect(january.binding).toBe("month_peak");
    expect(february.recomputedBilledKwMilli).toBe(750_000);
    expect(february.binding).toBe("ratchet");
    expect(february.ratchetDriverMonth).toBe("2026-01");
    expect(march.recomputedBilledKwMilli).toBe(750_000);
    expect(april.recomputedBilledKwMilli).toBe(750_000);

    // $750 + $1,500 + $2,250 = $4,500.00, to the cent.
    expect(report.carryOverMicroUsd).toBe(4_500_000_000);
    expect(report.ledger.rows.map((row) => row.carryMicroUsd)).toEqual([
      0, 750_000_000, 1_500_000_000, 2_250_000_000,
    ]);

    // April's printed bill says 775 kW: 25 kW over the tariff formula, $375.00.
    expect(april.printedBilledKwMilli).toBe(775_000);
    expect(april.varianceKwMilli).toBe(25_000);
    expect(april.varianceMicroUsd).toBe(375_000_000);
    const variance = report.findings.find((finding) => finding.ruleId === "rp-billed-variance");
    expect(variance?.scope).toBe("months.2026-04");
    expect(variance?.severity).toBe("unmatched");
  });

  it("prices the counterfactual shave of the interval that set the floor", () => {
    const { report } = run("ratchet-75");
    expect(report.counterfactual).not.toBeNull();
    const counterfactual = report.counterfactual!;
    expect(counterfactual.driverMonth).toBe("2026-01");
    expect(counterfactual.driverPeakKwMilli).toBe(1_000_000);
    // 75% × 933.334 kW = 700.0005 kW → the floor stops binding above the highest bound month (700).
    expect(counterfactual.shaveKwMilli).toBe(66_666);
    expect(counterfactual.floorAfterShaveKwMilli).toBe(700_000);
    expect(counterfactual.savingMicroUsd).toBe(2_250_000_000);
    expect(counterfactual.monthsAffected).toEqual(["2026-02", "2026-03", "2026-04"]);
  });

  it("uses the billed window, so a Saturday spike sets nothing", () => {
    const { report } = run("ratchet-75");
    // The site's biggest interval is a 1,400 kW Saturday spike — outside Mon–Fri 08:00–20:00.
    expect(report.sitePeakEvent?.totalKwMilli).toBe(1_400_000);
    expect(report.sitePeakEvent?.startUtc).toBe(FIXTURE_PEAKS.ignoredSaturdaySlotUtc);
    expect(report.sitePeakEvent?.inBillingWindow).toBe(false);
    expect(report.ignoredPeakEvent?.totalKwMilli).toBe(1_400_000);
    // It is not February's billed peak: that month bills on its own 700 kW Wednesday interval.
    const february = report.months.find((month) => month.month === "2026-02");
    expect(february?.meteredPeakKwMilli).toBe(700_000);
    // And the floor event is January's 1,000 kW interval, not the spike.
    expect(report.floorEvent?.totalKwMilli).toBe(1_000_000);
    expect(report.floorEvent?.startUtc).toBe(FIXTURE_PEAKS.januarySlotUtc);
    expect(report.floorEvent?.byMeter.map((entry) => entry.kwMilli)).toEqual([620_000, 380_000]);
  });

  it("bills its own peak in every month under a no-ratchet tariff (the null)", () => {
    const { report } = run("no-ratchet");
    expect(report.verdict).toBe("complete");
    for (const month of report.months) {
      expect(month.binding).toBe("month_peak");
      expect(month.recomputedBilledKwMilli).toBe(month.meteredPeakKwMilli);
    }
    expect(report.carryOverMicroUsd).toBe(0);
    expect(report.counterfactual).toBeNull();
    // April still prints 775 against 600: the variance is a billing error, not a ratchet effect.
    const april = report.months.find((month) => month.month === "2026-04");
    expect(april?.varianceKwMilli).toBe(175_000);
  });

  it("blocks every month when the ratchet clause is unstated — never defaults to 0%", () => {
    const { report } = run("unstated-clause");
    expect(report.verdict).toBe("blocked");
    expect(report.blocked).toBe(true);
    expect(report.months).toHaveLength(4);
    for (const month of report.months) {
      expect(month.blocked).toBe(true);
      expect(month.recomputedBilledKwMilli).toBeNull();
      expect(month.blockingRuleIds).toContain("rp-tariff-unstated");
    }
    expect(report.carryOverMicroUsd).toBe(0);
    expect(report.ledger.rows).toHaveLength(0);
    expect(report.findings.some((finding) => finding.scope === "tariff.ratchetPercent")).toBe(true);
  });
});

describe("RatchetProof — coincident meters and refusals", () => {
  it("sums coincident intervals: the site peak exists only in the sum", () => {
    const grid = align(coincidentMeters());
    expect(grid.intervalMinutes).toBe(15);
    expect(grid.slots.map((slot) => slot.totalKwMilli)).toEqual([250_000, 250_000, 110_000, 70_000]);
    expect(grid.intervalsRead).toBe(8);
    expect(grid.intervalsDeclared).toBe(8);
    // Summing the meters' independent peaks (200 + 150 = 350) would over-bill the site by 100 kW.
    const independentPeaks =
      Math.max(...grid.slots.map((slot) => slot.byMeter[0]?.kwMilli ?? 0)) +
      Math.max(...grid.slots.map((slot) => slot.byMeter[1]?.kwMilli ?? 0));
    expect(independentPeaks).toBe(350_000);
    expect(grid.slots[0].byMeter).toEqual([
      { meterId: "North-Bay", kwMilli: 100_000 },
      { meterId: "South-Bay", kwMilli: 150_000 },
    ]);
  });

  it("rejects a gap in the interval series instead of interpolating it", () => {
    expect(() => run("interval-gap")).toThrowError(RatchetProofFieldError);
    try {
      run("interval-gap");
    } catch (error) {
      expect(error).toBeInstanceOf(RatchetProofFieldError);
      expect((error as RatchetProofFieldError).ruleId).toBe("rp-interval-gap");
      expect((error as RatchetProofFieldError).message).toContain("never interpolated");
    }
  });

  it("enforces Σ(read) == Σ(declared) rather than summing a short file", () => {
    const [series] = coincidentMeters();
    expect(() =>
      align([
        { ...series, declaredIntervalCount: series.readings.length + 1 },
        coincidentMeters()[1],
      ]),
    ).toThrowError(/declares 5 intervals but 4 were read/);
  });

  it("refuses mixed 15/30-minute granularity instead of splitting an interval", () => {
    const [series] = coincidentMeters();
    expect(() =>
      align([series, { ...coincidentMeters()[1], intervalMinutes: 30 }]),
    ).toThrowError(/different interval lengths/);
  });

  it("refuses a history window that drifts", () => {
    const tariff = parseTariffJson(scenario.tariffJson);
    const history = [
      { month: "2025-11", peakKwMilli: 850_000 },
      { month: "2025-12", peakKwMilli: 950_000 },
      { month: "2025-10", peakKwMilli: 900_000 },
    ];
    expect(() =>
      billedDemand({ month: "2026-01", peakKwMilli: 1_000_000 }, history, tariff),
    ).toThrowError(/most recent first, contiguous/);
    expect(() =>
      validateHistory("2026-01", history.slice(0, 2), 3),
    ).toThrowError(/needs exactly 3 prior month peaks/);
  });
});

describe("RatchetProof — extraction is declared, and never derives a number", () => {
  it("fails loudly when the deploy has no model key", () => {
    expect(() => resolveExtractionCredentials({})).toThrowError(
      RatchetProofExtractionUnavailableError,
    );
    try {
      resolveExtractionCredentials({ GEMINI_API_KEY: "test-key" });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
    const credentials = resolveExtractionCredentials({ GEMINI_API_KEY: "test-key" });
    expect(credentials.parseKey).toBeNull();
    expect(credentials.model).toBeTruthy();
  });

  it("renders the prompt from the same record the parser reads", () => {
    const prompt = buildTariffExtractionPrompt("Sch E-19 ...");
    for (const key of TARIFF_RECORD_KEYS) {
      expect(prompt, `the prompt must name ${key}`).toContain(key);
    }
    const billsPrompt = buildBillsExtractionPrompt("bill text", 4);
    for (const key of BILL_RECORD_KEYS) {
      expect(billsPrompt, `the bills prompt must name ${key}`).toContain(key);
    }
    expect(prompt).toContain("never 0");
    expect(billsPrompt).toContain("NEVER derive");
  });

  it("keeps every unreadable or unstated field labelled and blocks on it", () => {
    const payload = JSON.parse(scenario.tariffJson) as Record<string, unknown>;
    payload.ratchetPercent = { value: null, provenance: "unstated", page: 30 };
    const { tariff } = readTariffPayload(payload);
    expect(tariff.ratchetPercent.provenance).toBe("unstated");
    expect(tariff.ratchetPercent.value).toBeNull();

    const { bills } = readBillsPayload({
      bills: [
        {
          month: { value: "2026-02", provenance: "extracted", page: 1, quote: "02/2026" },
          printedBilledDemandKw: { value: null, provenance: "unstated", page: 1 },
          printedDemandRateUsdPerKw: { value: "15.00", provenance: "extracted", page: 1 },
          printedRatchetLine: { value: null, provenance: "unstated", page: 1 },
        },
      ],
    });
    expect(bills[0].printedBilledDemandProvenance).toBe("unstated");
    expect(bills[0].printedBilledDemandKwMilli).toBeNull();
    expect(bills[0].printedDemandRateProvenance).toBe("extracted");
  });
});

describe("RatchetProof — file readers", () => {
  it("reads Green Button XML demand in watts", () => {
    const xml = `<?xml version="1.0"?><feed><UsagePoint><mrid>GB-1</mrid></UsagePoint>
      <IntervalReading><timePeriod><start>1767225600</start></timePeriod><value>120000</value>
      <powerOfTenMultiplier>0</powerOfTenMultiplier><uom>72</uom></IntervalReading>
      <IntervalReading><timePeriod><start>1767226500</start></timePeriod><value>98000</value>
      <powerOfTenMultiplier>0</powerOfTenMultiplier><uom>72</uom></IntervalReading>
    </feed>`;
    const parsed = parseIntervalFile(xml);
    expect(parsed.format).toBe("green-button");
    expect(parsed.meters).toHaveLength(1);
    expect(parsed.meters[0].meterId).toBe("GB-1");
    expect(parsed.meters[0].intervalMinutes).toBe(15);
    expect(parsed.meters[0].readings[0].kwMilli).toBe(120_000);
  });

  it("exposes a coincident-meter fixture and the tariff declaration the page ships", () => {
    expect(coincidentMeters().length).toBe(2);
    const tariff = parseTariffJson(scenario.tariffJson);
    expect(tariff.ratchetPercent.value).toBe(75);
    expect(tariff.billingWindow.value?.days).toEqual([1, 2, 3, 4, 5]);
  });
});
