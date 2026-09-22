/**
 * CaseProof worked scenarios (PRD §2 known-answer vectors, §4 shareable state).
 *
 * Every scenario is a complete `CaseInput`, so the page's scenario buttons, the Playwright specs and
 * the vitest vectors all drive the same object — a scenario that renders but does not audit is not a
 * scenario. The reference dates and the vendor claims are stated, never inferred.
 *
 * 1. `vendor_case`       — the flip: a proposal claiming 14 months that audits at 41 on the buyer's
 *                          numbers (the PRD's §2 vector 1).
 * 2. `clean_case`        — every term stated: zero flags, a case that clears (PRD §2 vector 4).
 * 3. `phase_out`         — a §179 phase-out case above $4,090,000 (PRD §2 vector 2).
 * 4. `raas_comparison`   — capex vs a per-unit subscription, with the seasonal-premium crossing
 *                          (PRD §2 vector 3).
 * 5. `unstated_maintenance` — an empty maintenance field reports `unstated`, not zero (vector 5).
 */
import type { Baseline, BidOption, CaseInput, Finance } from "./types";

export type ScenarioKey =
  | "vendor_case"
  | "clean_case"
  | "phase_out"
  | "raas_comparison"
  | "unstated_maintenance";

export const DEFAULT_SCENARIO: ScenarioKey = "vendor_case";

export const SCENARIO_KEYS_NOTE =
  "Worked scenarios: every number is a stated input, and the vendor's claims are reproduced by the same engine that audits the buyer's case.";

/** The buyer's warehouse — a 128-FTE, two-shift DC running 9,000 orders a day. */
export const BUYER_BASELINE: Baseline = {
  ordersPerDay: 9_000,
  linesPerOrder: 2.2,
  operatingDaysPerYear: 300,
  shifts: 2,
  staffByFunction: [
    { function: "picking", headcount: 78 },
    { function: "packing", headcount: 34 },
    { function: "putaway", headcount: 16 },
  ],
  hourlyWage: 21.5,
  paidHoursPerFtePerYear: 2080,
  payrollBurdenPct: 11.9,
  benefitsPct: 16.5,
  overtimeHoursPerWeek: 4.5,
  turnoverPct: 58,
  costPerHireCents: 320_000,
  errorRatePct: 0.12,
  costPerErrorCents: 4_300,
  peakFactor: 1.35,
  vendorAssumedHourlyRate: 21.5,
};

export const BUYER_FINANCE: Finance = {
  horizonYears: 5,
  hurdleRatePct: 12,
  taxRatePct: 26,
  section179ElectionCents: 0,
  inServiceTaxYear: 2026,
};

/** The quote CSV every scenario but `clean_case` starts from — maintenance is simply absent. */
export const VENDOR_QUOTE_CSV = `item,amount_usd,category,note
AMR fleet (140 units),2500000,,"220 units quoted, 140 in the phased schedule"
Site commissioning and installation,180000,install,
Freight and crating,50000,freight,`;

/** The vendor's capex bid as the proposal wrote it: a blended wage, no ramp, no maintenance. */
export const VENDOR_OPTION: BidOption = {
  id: "bid-a",
  vendor: "Northline Robotics",
  model: "capex",
  capex: {
    equipmentCents: 250_000_000,
    installCents: 18_000_000,
    freightCents: 5_000_000,
  },
  integrationCostCents: 26_000_000,
  facilityCostCents: 18_000_000,
  trainingCostCents: 6_000_000,
  softwareAnnualCents: 7_200_000,
  maintenancePctOfCapex: 15,
  labourImpact: { fteRemoved: 18, disposition: "cash_out", rampMonths: 9 },
  errorReductionPct: 50,
  throughputClaim: { picksPerHour: 1_200, basis: "sustained", availabilityPct: 94 },
  vendorClaim: {
    claimedPaybackMonths: 14,
    assumedLoadedHourlyRate: 21.5,
    assumedTurnoverPct: 0,
    assumedFteRemoved: 52,
    assumedAvailabilityPct: 100,
    assumedRampMonths: 0,
    assumedErrorReductionPct: 0,
    source: "Northline proposal rev C, 2026-09-14, section 6 'Return on investment'",
  },
  quoteCsv: VENDOR_QUOTE_CSV,
};

const vendorCase: CaseInput = {
  label: "Northline robotics case — Q4 capital request",
  baseline: BUYER_BASELINE,
  finance: BUYER_FINANCE,
  options: [{ ...VENDOR_OPTION }],
};

/** Every term the engine reads is stated, and every cost line is priced by the quote. */
const cleanQuoteCsv = `item,amount_usd,category,note
AMR fleet (140 units),2450000,equipment,
Site commissioning,170000,install,
Freight and crating,45000,freight,
WMS/ERP integration (fixed price),210000,integration,"scope and acceptance criteria attached"
"Electrical, network and racking modification",150000,facility,"contractor quote 2026-09-08"
Operator and maintenance training,52000,training,
Fleet management software (annual),68000,software,"3-year price hold"
Preventive maintenance and spares (annual),330000,maintenance,"15% of list, fixed for 36 months"
Total,3475000,,`;

const cleanOption: BidOption = {
  id: "bid-clean",
  vendor: "Northline Robotics",
  model: "capex",
  capex: { equipmentCents: 245_000_000, installCents: 17_000_000, freightCents: 4_500_000, recoveryYears: 7 },
  labourImpact: { fteRemoved: 18, disposition: "cash_out", rampMonths: 6 },
  errorReductionPct: 50,
  throughputClaim: { picksPerHour: 1_200, basis: "sustained", availabilityPct: 96 },
  vendorClaim: {
    assumedLoadedHourlyRate: 21.5,
    assumedTurnoverPct: 0,
    assumedFteRemoved: 18,
    assumedAvailabilityPct: 100,
    assumedRampMonths: 0,
    source: "Northline proposal rev C, 2026-09-14, section 6",
  },
  quoteCsv: cleanQuoteCsv,
};

const cleanCase: CaseInput = {
  label: "Clean, fully stated case",
  baseline: BUYER_BASELINE,
  finance: { ...BUYER_FINANCE, section179ElectionCents: 245_000_000, hurdleRatePct: 10 },
  options: [{ ...cleanOption }],
};

/**
 * A large fleet above the §179 phase-out threshold: $5,000,000 of qualifying property cuts the
 * $2,560,000 dollar limit by $910,000, so the election delivers $1,650,000 — not the elected amount.
 */
const phaseOutQuoteCsv = `item,amount_usd,category,note
ASRS shuttle system (2 aisles),4700000,equipment,
Installation and commissioning,250000,install,
Freight and rigging,50000,freight,
WMS/ERP integration (turnkey),300000,integration,
"Structural, power and sprinkler work",240000,facility,
Operator and maintenance training,90000,training,
Fleet control software (annual),96000,software,
Preventive maintenance and spares (annual),705000,maintenance,"15% of list, fixed for 36 months"
Total,6431000,,`;

const phaseOutOption: BidOption = {
  ...cleanOption,
  id: "bid-phaseout",
  vendor: "Halden Systems",
  capex: { equipmentCents: 470_000_000, installCents: 25_000_000, freightCents: 5_000_000, recoveryYears: 7 },
  labourImpact: { fteRemoved: 46, disposition: "cash_out", rampMonths: 9 },
  throughputClaim: { picksPerHour: 3_400, basis: "sustained", availabilityPct: 96 },
  vendorClaim: {
    assumedLoadedHourlyRate: 21.5,
    assumedTurnoverPct: 0,
    assumedFteRemoved: 46,
    assumedAvailabilityPct: 100,
    assumedRampMonths: 0,
    source: "Halden systems proposal, 2026-09-10, exhibit 4",
  },
  quoteCsv: phaseOutQuoteCsv,
};

const phaseOutCase: CaseInput = {
  label: "Halden systems — §179 phase-out above $4,090,000",
  baseline: BUYER_BASELINE,
  finance: { ...BUYER_FINANCE, section179ElectionCents: 256_000_000, hurdleRatePct: 10 },
  options: [{ ...phaseOutOption }],
};

/** A capex bid and a per-unit subscription on the same fleet, priced against the peak season. */
const raasOption: BidOption = {
  id: "bid-raas",
  vendor: "Cirrus Robotics (subscription)",
  model: "raas",
  raas: {
    // $600.80 per unit-month. Tuned so the ranking flips at a 40% seasonal premium — the PRD's
    // vector 3 — and pinned by a known-answer test.
    monthlyPerUnitCents: 60_080,
    units: 140,
    termMonths: 60,
    escalationPct: 3,
    peakMonthsPerYear: 3,
    maintenanceIncluded: true,
    exitCostCents: 4_000_000,
    uptimeSlaPct: 96,
  },
  integrationCostCents: 0,
  facilityCostCents: 15_000_000,
  trainingCostCents: 6_000_000,
  softwareAnnualCents: 0,
  labourImpact: { fteRemoved: 16, disposition: "cash_out", rampMonths: 6 },
  errorReductionPct: 45,
  throughputClaim: { picksPerHour: 1_200, basis: "sustained", availabilityPct: 96 },
  vendorClaim: {
    claimedPaybackMonths: 0,
    assumedLoadedHourlyRate: 21.5,
    assumedTurnoverPct: 0,
    assumedFteRemoved: 16,
    assumedAvailabilityPct: 100,
    assumedRampMonths: 0,
    source: "Cirrus subscription schedule, 2026-09-16",
  },
};

const raasCase: CaseInput = {
  label: "Capex bid vs per-unit subscription",
  baseline: BUYER_BASELINE,
  finance: { ...BUYER_FINANCE, section179ElectionCents: 245_000_000, hurdleRatePct: 10 },
  options: [
    {
      ...cleanOption,
      id: "bid-capex",
      labourImpact: { fteRemoved: 16, disposition: "cash_out", rampMonths: 6 },
      errorReductionPct: 45,
      vendorClaim: { ...cleanOption.vendorClaim, assumedFteRemoved: 16 },
    },
    { ...raasOption },
  ],
};

/** The same proposal with the maintenance field left empty — the PRD's vector 5. */
const unstatedMaintenanceCase: CaseInput = {
  label: "Quote with the maintenance line left blank",
  baseline: BUYER_BASELINE,
  finance: BUYER_FINANCE,
  options: [
    {
      ...VENDOR_OPTION,
      maintenancePctOfCapex: undefined,
      maintenanceAnnualCents: undefined,
      quoteCsv: `item,amount_usd,category,note
AMR fleet (140 units),2500000,equipment,
Site commissioning and installation,180000,install,
Preventive maintenance and spares,,maintenance,"left blank in the proposal"`,
    },
  ],
};

export interface CaseProofScenario {
  key: ScenarioKey;
  label: string;
  description: string;
  case: CaseInput;
}

export const SCENARIOS: CaseProofScenario[] = [
  {
    key: "vendor_case",
    label: "The 14-month claim",
    description:
      "The proposal's own payback, then the same project on the buyer's numbers: loaded labour, turnover, a 9-month ramp, 94% availability and the maintenance line the quote never carried.",
    case: vendorCase,
  },
  {
    key: "clean_case",
    label: "Fully stated quote",
    description:
      "Every cost term priced by the vendor's own quote and every assumption in writing — the case that must produce zero flags.",
    case: cleanCase,
  },
  {
    key: "phase_out",
    label: "§179 phase-out",
    description:
      "$5,000,000 of qualifying property, above the $4,090,000 phase-out threshold: the dollar limit is cut by $910,000 and the election delivers less than it asks for.",
    case: phaseOutCase,
  },
  {
    key: "raas_comparison",
    label: "Capex vs subscription",
    description:
      "A capex bid and a per-unit subscription on one cash model, with the peak-season premium at which the ranking flips.",
    case: raasCase,
  },
  {
    key: "unstated_maintenance",
    label: "Maintenance left blank",
    description:
      "A quote that omits maintenance and integration: reported unstated (which blocks a pass) rather than defaulted to zero.",
    case: unstatedMaintenanceCase,
  },
];

export function scenarioByKey(key: ScenarioKey): CaseProofScenario | undefined {
  return SCENARIOS.find((scenario) => scenario.key === key);
}

/** Deep copy so a page instance can never mutate a shipped scenario. */
export function caseFor(key: ScenarioKey): CaseInput {
  const scenario = scenarioByKey(key) ?? SCENARIOS[0]!;
  return JSON.parse(JSON.stringify(scenario.case)) as CaseInput;
}

/** The case JSON as a visitor sees it in the paste box. */
export function caseToJson(key: ScenarioKey): string {
  return JSON.stringify(caseFor(key), null, 2);
}
