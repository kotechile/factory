/**
 * Fixtures — deterministic, generated in code, and the worked example the page ships with.
 *
 * THE FOUR-MONTH 75% CASE (the PRD's example, to the cent):
 *   tariff: 75% ratchet, 3-month lookback, $15.00/kW, 400 kW contract minimum,
 *           billed Monday–Friday 08:00–20:00 (so a Saturday spike sets nothing)
 *   standing history: 2025-10 = 900 kW, 2025-11 = 850 kW, 2025-12 = 950 kW
 *   peaks: Jan 1,000 · Feb 700 (+ a 1,400 kW Saturday spike the tariff ignores) · Mar 650 · Apr 600
 *   → Jan billed 1,000 (its own peak) · Feb/Mar/Apr billed 750 (75% × the 1,000 kW January peak)
 *   → carry-over $750 + $1,500 + $2,250 = $4,500.00
 *   → shaving January's peak by 66.666 kW (to 933.334 kW) removes the floor above 700 kW and saves
 *     $2,250.00 across the three bound months.
 * April's printed bill says 775 kW against the recomputed 750, so the variance column has a real
 * finding to show: 25 kW, $375.00.
 */
import type { MeterSeries, PeakHistoryEntry, Tariff } from "./types";

export const SCENARIO_KEYS = [
  "ratchet-75",
  "coincident-peak",
  "no-ratchet",
  "unstated-clause",
  "interval-gap",
] as const;

export type ScenarioKey = (typeof SCENARIO_KEYS)[number];

export interface RatchetProofScenario {
  key: ScenarioKey;
  label: string;
  description: string;
  intervalCsv: string;
  tariffJson: string;
  billsCsv: string;
  seedHistory: PeakHistoryEntry[];
}

const ISO = (epochMinute: number) =>
  `${new Date(epochMinute * 60_000).toISOString().slice(0, 16)}:00Z`;

function tariffDeclaration(overrides: {
  ratchetPercent?: { value: number | null; provenance: "extracted" | "unstated" };
} = {}): Tariff {
  return {
    utility: {
      value: "Pacific Grid & Electric",
      provenance: "extracted",
      page: 1,
      quote: "PACIFIC GRID & ELECTRIC — SCHEDULE C-3 DEMAND",
    },
    schedule: { value: "C-3", provenance: "extracted", page: 1, quote: "Schedule C-3" },
    voltageClass: { value: "Secondary", provenance: "extracted", page: 1, quote: "Secondary voltage service" },
    demandRates: {
      value: [
        {
          season: "all year",
          voltageClass: "Secondary",
          rateMicroUsdPerKw: 15_000_000,
          page: 1,
          quote: "Demand charge: $15.00 per kW of billed demand",
        },
      ],
      provenance: "extracted",
      page: 1,
      quote: "Demand charge: $15.00 per kW of billed demand",
    },
    ratchetPercent: {
      value: overrides.ratchetPercent?.value ?? 75,
      provenance: overrides.ratchetPercent?.provenance ?? "extracted",
      page: 2,
      quote: "Billed demand shall be the greater of the maximum demand ... or 75% of the highest maximum demand ... during the preceding 3 months",
    },
    ratchetLookbackMonths: {
      value: 3,
      provenance: "extracted",
      page: 2,
      quote: "...during the preceding 3 months",
    },
    billingWindow: {
      value: { days: [1, 2, 3, 4, 5], startMinute: 8 * 60, endMinute: 20 * 60, utcOffsetMinutes: 0 },
      provenance: "extracted",
      page: 2,
      quote: "The demand charge applies to maximum demand occurring Monday through Friday, 8:00 a.m. to 8:00 p.m.",
    },
    intervalMinutes: {
      value: 30,
      provenance: "extracted",
      page: 2,
      quote: "Maximum demand shall be measured over successive 30-minute intervals.",
    },
    contractMinimumKw: {
      value: 400,
      provenance: "extracted",
      page: 2,
      quote: "Minimum contract demand: 400 kW",
    },
  };
}

function tariffJsonOf(tariff: Tariff): string {
  return JSON.stringify(tariff, null, 2);
}

/** The wide interval export: one row per 30-minute interval, one column per meter. */
function wideIntervalCsv(options: {
  startUtc: string;
  slots: number;
  meters: string[];
  base: number[];
  overrides?: Map<number, number[]>;
}): string {
  const lines = [
    "# Export: interval demand (kW) — wide layout",
    `# meters: ${options.meters.join(",")}`,
    `# start: ${options.startUtc}`,
    "# interval_minutes: 30",
    `# interval_count: ${options.slots}`,
  ];
  for (let index = 0; index < options.slots; index += 1) {
    const values = options.overrides?.get(index) ?? options.base;
    lines.push(values.map((value) => String(value)).join(","));
  }
  return lines.join("\n");
}

const FOUR_MONTH_START = "2026-01-01T00:00:00Z";
const FOUR_MONTH_SLOTS = 120 * 48; // 1 Jan – 30 Apr 2026, 30-minute intervals
const HALF_HOUR_OF = (iso: string) => (Date.parse(iso) - Date.parse(FOUR_MONTH_START)) / 60_000 / 30;

const FOUR_MONTH_OVERRIDES = new Map<number, number[]>([
  [HALF_HOUR_OF("2026-01-14T19:00:00Z"), [620, 380]], // Wed 12:00 local — 1,000 kW, sets the floor
  [HALF_HOUR_OF("2026-02-07T18:00:00Z"), [900, 500]], // Saturday 10:00 local — 1,400 kW, NOT billed
  [HALF_HOUR_OF("2026-02-18T19:00:00Z"), [400, 300]], // Wed — 700 kW
  [HALF_HOUR_OF("2026-03-11T19:00:00Z"), [380, 270]], // Wed — 650 kW
  [HALF_HOUR_OF("2026-04-15T19:00:00Z"), [350, 250]], // Wed — 600 kW
]);

const SEED_HISTORY: PeakHistoryEntry[] = [
  { month: "2025-12", peakKwMilli: 950_000 },
  { month: "2025-11", peakKwMilli: 850_000 },
  { month: "2025-10", peakKwMilli: 900_000 },
];

const BILLS_LINES = [
  "month,period_start,period_end,printed_billed_demand_kw,printed_demand_rate_usd_per_kw,printed_ratchet_line",
  '2026-01,2026-01-01,2026-01-31,1000,15.00,"Billed demand: 1,000 kW (maximum demand)"',
  '2026-02,2026-02-01,2026-02-28,750,15.00,"Billed demand: 750 kW (75% ratchet of 1,000 kW)"',
  '2026-03,2026-03-01,2026-03-31,750,15.00,"Billed demand: 750 kW (75% ratchet of 1,000 kW)"',
  '2026-04,2026-04-01,2026-04-30,775,15.00,"Billed demand: 775 kW (75% ratchet of 1,000 kW)"',
].join("\n");

function fourMonthScenario(key: ScenarioKey, overrides: Parameters<typeof tariffDeclaration>[0] = {}): RatchetProofScenario {
  const tariff = tariffDeclaration(overrides);
  return {
    key,
    label: "The four-month 75% ratchet",
    description:
      "Four months of two-meter interval data, a 75% ratchet over a three-month lookback, and a 1,400 kW Saturday spike the tariff does not bill.",
    intervalCsv: wideIntervalCsv({
      startUtc: FOUR_MONTH_START,
      slots: FOUR_MONTH_SLOTS,
      meters: ["Main-100A", "Roof-HVAC"],
      base: [260, 140],
      overrides: FOUR_MONTH_OVERRIDES,
    }),
    tariffJson: tariffJsonOf(tariff),
    billsCsv: BILLS_LINES,
    seedHistory: SEED_HISTORY,
  };
}

/** Four 15-minute intervals on two meters: the site peaks at 250 kW, which neither meter reaches. */
const COINCIDENT_CSV = [
  "# Export: interval demand (kW) — wide layout",
  "# meters: North-Bay,South-Bay",
  "# start: 2026-06-02T12:00:00Z",
  "# interval_minutes: 15",
  "# interval_count: 4",
  "100,150",
  "200,50",
  "50,60",
  "40,30",
].join("\n");

const COINCIDENT_TARIFF = {
  utility: { value: "Pacific Grid & Electric", provenance: "extracted" },
  schedule: { value: "C-3", provenance: "extracted" },
  voltageClass: { value: "Secondary", provenance: "extracted" },
  demandRates: {
    value: [{ season: "summer", voltageClass: "Secondary", rateUsdPerKw: "15.00" }],
    provenance: "extracted",
  },
  ratchetPercent: { value: 75, provenance: "extracted" },
  ratchetLookbackMonths: { value: 1, provenance: "extracted" },
  billingWindow: {
    value: { days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440, utcOffsetMinutes: 0 },
    provenance: "extracted",
  },
  intervalMinutes: { value: 15, provenance: "extracted" },
  contractMinimumKw: { value: 0, provenance: "extracted" },
};

const COINCIDENT_BILLS = [
  "month,period_start,period_end,printed_billed_demand_kw,printed_demand_rate_usd_per_kw,printed_ratchet_line",
  "2026-06,2026-06-01,2026-06-30,250,15.00,",
].join("\n");

function noRatchetTariffJson(): string {
  const tariff = JSON.parse(tariffJsonOf(tariffDeclaration())) as Record<string, unknown>;
  tariff.ratchetPercent = { value: 0, provenance: "extracted", page: 2, quote: "No demand ratchet applies." };
  return JSON.stringify(tariff, null, 2);
}

export const DEFAULT_SCENARIO: ScenarioKey = "ratchet-75";

export const RATCHETPROOF_SCENARIOS: Record<ScenarioKey, RatchetProofScenario> = {
  "ratchet-75": fourMonthScenario("ratchet-75"),
  "coincident-peak": {
    key: "coincident-peak",
    label: "Coincident peak",
    description:
      "Two 15-minute meters whose own peaks are 200 kW and 150 kW. The site's 250 kW peak exists only in the sum.",
    intervalCsv: COINCIDENT_CSV,
    tariffJson: JSON.stringify(COINCIDENT_TARIFF, null, 2),
    billsCsv: COINCIDENT_BILLS,
    seedHistory: [{ month: "2026-05", peakKwMilli: 200_000 }],
  },
  "no-ratchet": {
    ...fourMonthScenario("no-ratchet"),
    label: "No ratchet (the null)",
    description:
      "The same four months under a tariff with no ratchet: every month bills its own peak, and the ledger's carry-over is zero.",
    tariffJson: noRatchetTariffJson(),
  },
  "unstated-clause": {
    ...fourMonthScenario("unstated-clause", {
      ratchetPercent: { value: null, provenance: "unstated" },
    }),
    label: "Unstated ratchet clause",
    description:
      "The tariff page that carries the ratchet percentage did not parse. Every month is blocked — nothing is defaulted to 0%.",
  },
  "interval-gap": {
    ...fourMonthScenario("interval-gap"),
    label: "An interval gap",
    description:
      "One 30-minute reading is missing from a long-format export. The engine refuses the file rather than interpolating the peak that may have been in it.",
    // Long format, because a positional (wide) file cannot express a missing interval at all: dropping
    // a row there shifts every later value and the count check is what catches it. A long export names
    // each interval's start, so the gap is real and is refused by name.
    intervalCsv: [
      "meter_id,interval_start_utc,kw",
      "Main-100A,2026-06-02T12:00:00Z,100",
      "Roof-HVAC,2026-06-02T12:00:00Z,150",
      "Main-100A,2026-06-02T12:30:00Z,120",
      // Roof-HVAC 12:30 is missing.
      "Main-100A,2026-06-02T13:00:00Z,90",
      "Roof-HVAC,2026-06-02T13:00:00Z,110",
      "Main-100A,2026-06-02T13:30:00Z,80",
      "Roof-HVAC,2026-06-02T13:30:00Z,100",
    ].join("\n"),
  },
};

export function scenarioByKey(key: ScenarioKey): RatchetProofScenario {
  return RATCHETPROOF_SCENARIOS[key];
}

/** Exposed for tests: the peak the fixture places in a month, at a named slot. */
export const FIXTURE_PEAKS = {
  januaryKw: 1_000,
  februaryKw: 700,
  marchKw: 650,
  aprilKw: 600,
  ignoredSaturdayKw: 1_400,
  januarySlotUtc: "2026-01-14T19:00:00Z",
  ignoredSaturdaySlotUtc: "2026-02-07T18:00:00Z",
} as const;

/** The two-meter 15-minute grid used by the coincident-peak unit test. */
export function coincidentMeters(): MeterSeries[] {
  const start = Date.parse("2026-06-02T12:00:00Z") / 60_000;
  const series = (meterId: string, values: number[]): MeterSeries => ({
    meterId,
    intervalMinutes: 15,
    declaredIntervalCount: values.length,
    readings: values.map((value, index) => ({
      startUtc: ISO(start + index * 15),
      kwMilli: value * 1_000,
    })),
  });
  return [series("North-Bay", [100, 200, 50, 40]), series("South-Bay", [150, 50, 60, 30])];
}
