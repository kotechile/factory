/**
 * CaseProof — canonical types for the buyer-side audit of a warehouse-automation business case.
 *
 * Units, once, for the whole engine:
 * - **Money is integer cents** (`…Cents`). An audit that cannot be reconciled to the cent is not
 *   an audit, and float dollars drift when the same case is re-run by an agent.
 * - **Percentages are percentage points** (`…Pct`: 15 means 15%). Fractions are never accepted —
 *   in a pasted case they are indistinguishable from points.
 * - **Year 1 is the tax year the equipment is placed in service** (the §179 in-service year). The
 *   capex outlay sits at the start of year 1; payback is measured from there in months.
 * - An assumption the buyer has not stated is `undefined` and is reported **`unstated`**, which
 *   blocks a pass verdict (PRD §5 rule-5 guard). It is never defaulted to zero, to a rate, or to
 *   an industry average, and it never silently shrinks a cost line.
 */

/** How the vendor sells the project. */
export type BidModel = "capex" | "lease" | "raas";

/** What happens to the headcount the project removes: they leave the P&L, or they are redeployed. */
export type LabourDisposition = "cash_out" | "redeploy";

/** Whether a throughput claim is warranted at peak burst or at sustained rate. */
export type ThroughputBasis = "sustained" | "peak";

/** One function on the buyer's staffing sheet. A missing wage/hour falls back to the baseline's. */
export interface FunctionStaffing {
  /** e.g. "receiving", "putaway", "picking", "packing", "shipping". */
  function: string;
  headcount: number;
  /** Fully loaded candidates are paid differently; omit to use `Baseline.hourlyWage`. */
  hourlyWage?: number;
  /** Omit to use `Baseline.paidHoursPerFtePerYear`. */
  paidHoursPerFtePerYear?: number;
}

/**
 * The buyer's own warehouse — the side of the table the vendor's case is built without.
 *
 * `payrollBurdenPct`, `benefitsPct`, `overtimeHoursPerWeek`, `turnoverPct`, `costPerHireCents`,
 * `errorRatePct`, `costPerErrorCents` and `peakFactor` are optional **on purpose**: each one is a
 * component of the fully loaded labour rate or of the error saving, and the product's whole point
 * is that a vendor case leaves them out. An omitted component is reported `unstated` (PRD §5) and
 * the loaded rate is then published as a **floor**, explicitly, not as the loaded rate.
 */
export interface Baseline {
  ordersPerDay: number;
  linesPerOrder: number;
  operatingDaysPerYear: number;
  shifts: number;
  staffByFunction: FunctionStaffing[];
  /** The blended wage per hour the vendor's case uses, and the fallback wage per function. */
  hourlyWage: number;
  /** Denominator of the loaded hourly cost: paid hours per FTE per year (e.g. 2080). */
  paidHoursPerFtePerYear: number;
  /** Employer payroll taxes + insurance as a % of wage (FICA, FUTA/SUTA, workers' comp). */
  payrollBurdenPct?: number;
  /** Benefits (health, PTO, 401k match) as a % of wage. */
  benefitsPct?: number;
  /** Paid overtime hours per FTE per week, carrying the FLSA half-time premium. */
  overtimeHoursPerWeek?: number;
  /** Annual separations per FTE (warehousing runs 60%+/yr) — drives rehire cost + ramp. */
  turnoverPct?: number;
  /** Fully loaded cost to recruit + onboard one replacement. */
  costPerHireCents?: number;
  /** Pick/pack error rate as a % of lines, before automation. */
  errorRatePct?: number;
  /** Fully loaded cost to find and re-ship one error. */
  costPerErrorCents?: number;
  /** Peak-season volume multiple of average (1.4 = a 40% seasonal premium). */
  peakFactor?: number;
  /** The single blended $/hour the vendor's case assumed, for the loaded-vs-blended comparison. */
  vendorAssumedHourlyRate?: number;
}

/**
 * What the vendor *claimed*, so the audit can re-run the vendor's own arithmetic and show which
 * input moved the answer. Every field is optional: a claim the vendor did not state in writing is
 * `unverifiable`, which is the finding, not a blank.
 */
export interface VendorClaim {
  /** The payback the proposal quotes, in months. */
  claimedPaybackMonths?: number;
  /** The labour rate the vendor's case uses (a blended wage, not a loaded rate). */
  assumedLoadedHourlyRate?: number;
  assumedTurnoverPct?: number;
  assumedMaintenancePctOfCapex?: number;
  assumedMaintenanceAnnualCents?: number;
  assumedAvailabilityPct?: number;
  assumedFteRemoved?: number;
  assumedErrorReductionPct?: number;
  assumedIntegrationCostCents?: number;
  assumedFacilityCostCents?: number;
  assumedRampMonths?: number;
  /** Where the claim comes from, e.g. "proposal rev C, 2026-09-14, p.7". */
  source?: string;
}

/** Headcount the project removes, how fast, and whether the money actually leaves the P&L. */
export interface LabourImpact {
  /** FTE-equivalents the proposal removes. */
  fteRemoved: number;
  /**
   * `cash_out` = the roles disappear and the cost goes with them. `redeploy` = the people stay and
   * are moved elsewhere, so the case has **no labour cash saving** — an audit that counted it would
   * be inventing money.
   */
  disposition: LabourDisposition;
  /** Months from go-live to full ramp; the saving is earned in proportion during year 1. */
  rampMonths: number;
}

/** The proposal's throughput claim. Availability is what the downtime line is built from. */
export interface ThroughputClaim {
  picksPerHour: number;
  basis: ThroughputBasis;
  /** Contracted/claimed availability. Omitted → the downtime line is `unstated` and blocks pass. */
  availabilityPct?: number;
}

export interface CapexLines {
  /** The equipment/robots quote — the line every case has. */
  equipmentCents: number;
  /** Installation + commissioning. */
  installCents?: number;
  freightCents?: number;
  /** Class life the buyer's accountant uses for the straight-line residual. */
  recoveryYears?: number;
}

export interface LeaseTerms {
  monthlyPaymentCents: number;
  termMonths: number;
  /** Annual escalation % on the payment. */
  escalationPct: number;
  downPaymentCents?: number;
  /** True when the vendor's maintenance is inside the payment — then no separate line is added. */
  maintenanceIncluded: boolean;
  /** Buyout or return obligation at the end of term. */
  endOfTermCostCents?: number;
}

export interface RaasTerms {
  monthlyPerUnitCents: number;
  /** Baseline unit count (the fleet at average volume). */
  units: number;
  termMonths: number;
  escalationPct: number;
  /** Months per year the peak fleet is required (e.g. 3 for a Q4 peak). */
  peakMonthsPerYear: number;
  maintenanceIncluded: boolean;
  exitCostCents: number;
  /** The vendor's own uptime SLA. Omitted → the downtime line is `unstated`. */
  uptimeSlaPct?: number;
}

/** One competing bid, normalized onto the same cash model. */
export interface BidOption {
  id: string;
  vendor: string;
  model: BidModel;
  capex?: CapexLines;
  lease?: LeaseTerms;
  raas?: RaasTerms;
  /** The lines a quote omits and a project always incurs (PRD §1). Omitted → `unstated`. */
  integrationCostCents?: number;
  facilityCostCents?: number;
  trainingCostCents?: number;
  softwareAnnualCents?: number;
  /** Stated either as a % of capex or as an absolute annual figure — never as neither. */
  maintenancePctOfCapex?: number;
  maintenanceAnnualCents?: number;
  labourImpact: LabourImpact;
  /** What the vendor claims the system does to the pick/pack error rate (%), in writing. */
  errorReductionPct?: number;
  throughputClaim?: ThroughputClaim;
  vendorClaim?: VendorClaim;
  /** The vendor's quote line items as CSV rows. Values are echoed, never re-priced. */
  quoteCsv?: string;
}

/** The buyer's tax position — the half of the case a vendor's model does not carry. */
export interface Finance {
  horizonYears: number;
  /** The buyer's hurdle rate, % per year. The NPV the audit reports is at this rate. */
  hurdleRatePct: number;
  /** Blended marginal tax rate, %. */
  taxRatePct: number;
  /** Dollars the buyer elects to expense under §179 (capped by the cited year rule). */
  section179ElectionCents?: number;
  /** > 0 with `financingMonths` ⇒ the capex is financed; the outlay becomes an annuity. */
  financingRatePct?: number;
  financingMonths?: number;
  /** The tax year the equipment is placed in service — cited, never guessed (see taxLayer.ts). */
  inServiceTaxYear: number;
}

/** One fully-formed case: the buyer's numbers, the buyer's tax position, and the bids. */
export interface CaseInput {
  baseline: Baseline;
  finance: Finance;
  options: BidOption[];
  /** Optional label for the decision pack (site, project, committee date). */
  label?: string;
}

/** A component of the loaded labour rate, so the buyer's rate can be shown against a blended wage. */
export interface LabourComponent {
  key: "wage" | "payroll_burden" | "benefits" | "overtime_premium" | "turnover_replacement";
  label: string;
  centsPerHour: number;
  /** The arithmetic in words, reproducible by hand from the inputs. */
  basis: string;
  /** True when its input was not stated (the component is 0 and the rate is a floor). */
  unstated: boolean;
}

/** The fully loaded cost of one productive hour, with its component breakdown. */
export interface LoadedLaborRate {
  /** Weighted across the functions on the staffing sheet. */
  centsPerHour: number;
  /** True when at least one component is unstated: this is a **floor**, not the loaded rate. */
  floorOnly: boolean;
  components: LabourComponent[];
  /** The blended wage the vendor's case used, when the buyer stated it. */
  vendorAssumedHourlyRateCents: number | null;
  /** Loaded rate − blended wave, in cents/hour, when both exist. */
  gapCents: number | null;
  paidHoursPerFtePerYear: number;
  annualLoadedCostCents: number;
  headcount: number;
  notes: string[];
}

/** A quote line, exactly as the vendor wrote it — echoed, categorized, never re-priced. */
export interface QuoteLine {
  row: number;
  item: string;
  /** `null` when the vendor left the amount blank: an unpriced line, never a zero. */
  cents: number | null;
  /** Normalized category, or `unmapped` — an unmapped row is surfaced, never dropped. */
  category: QuoteCategory;
  note?: string;
}

export type QuoteCategory =
  | "equipment"
  | "install"
  | "freight"
  | "integration"
  | "facility"
  | "training"
  | "software"
  | "maintenance"
  | "other"
  | "unmapped";

/** The normalizer's output for one bid: the lines as stated, plus the categories left blank. */
export interface NormalizedQuote {
  lines: QuoteLine[];
  /** Rows the categorizer could not map (surfaced in the UI, never silently dropped). */
  unmappedRows: number[];
  /** Rows the vendor priced nowhere — a blank amount is an unpriced line, never a zero. */
  unpricedRows: number[];
  totalsByCategoryCents: Partial<Record<QuoteCategory, number>>;
  /** A total the quote states but no line itemizes — or an itemized total that disagrees with it. */
  statedTotalCents: number | null;
  itemizedTotalCents: number;
}

/** A term the buyer/vendor has not stated: it blocks a pass verdict (PRD §5 rule-5 guard). */
export interface UnstatedField {
  /** Dotted path, e.g. `baseline.turnoverPct`. */
  field: string;
  label: string;
  /** What the omission changes, and what has to be confirmed in writing. */
  detail: string;
}

/** A finding about an assumption the case depends on. */
export interface AssumptionFinding {
  field: string;
  label: string;
  unit: "usd" | "usd_per_hour" | "percent" | "fte" | "months" | "count";
  /** What the buyer's own numbers say (null when unstated). */
  buyerValue: number | null;
  /** What the vendor's case assumed (null when the proposal does not state it). */
  vendorValue: number | null;
  /** The value at which the case stops clearing the hurdle (null when it cannot be solved). */
  breakEvenValue: number | null;
  /** True when a *higher* value makes the case stronger (so the test is `<` not `>`). */
  higherIsBetter: boolean;
  verdict: "pass" | "fail" | "unstated" | "unverifiable";
  /** Relative distance from the stated value to the break-even — the risk ranking key. */
  headroomPct: number | null;
  message: string
  /** The one-line action that closes the finding (what to confirm before signature). */
  action: string;
}

/** One year of the tax schedule: §179, then bonus, then straight-line — by tax year. */
export interface DepreciationYear {
  taxYear: number;
  section179Cents: number;
  bonusCents: number;
  straightLineCents: number;
  totalCents: number;
}

export interface TaxYearRule {
  taxYear: number;
  section179LimitCents: number;
  section179PhaseOutCents: number;
  bonusDepreciationPct: number;
  /** The date the property must be placed in service by, for this year's treatment. */
  inServiceDeadline: string;
  bonusNote: string;
  source: string;
}

export interface DepreciationSchedule {
  taxYear: number;
  qualifyingBasisCents: number;
  /** The §179 amount the buyer elected, before the dollar limit and phase-out. */
  electedCents: number;
  /** The dollar limit after phase-out: limit − max(0, basis − phase-out threshold). */
  allowedLimitCents: number;
  /** The reduction the phase-out took off the dollar limit. */
  phaseOutReductionCents: number;
  /** What the election actually delivers = min(elected, allowedLimit). */
  allowedCents: number;
  /** Basis left for bonus + straight-line after §179. */
  remainingBasisCents: number;
  bonusPct: number;
  years: DepreciationYear[];
  rule: TaxYearRule;
  notes: string[];
}

/** One year of an option's after-tax cash flow. */
export interface CashflowYear {
  year: number;
  taxYear: number;
  /** Gross labour the project removes (before the availability haircut). */
  labourSavingCents: number;
  /** Money the buyer pays anyway because the system is down — always ≤ 0. */
  downtimeCents: number;
  errorSavingCents: number;
  maintenanceCents: number;
  softwareCents: number;
  /** Financed capex: the annual debt service (0 when paid outright). */
  debtServiceCents: number;
  leasePaymentCents: number;
  /** One-off outlays in this year (capex when paid outright, buyout, exit cost). */
  outlayCents: number;
  taxBenefitCents: number;
  netCents: number;
  cumulativeCents: number;
}

/** One option, run through the buyer's cash model. */
export interface OptionResult {
  id: string;
  vendor: string;
  model: BidModel;
  years: CashflowYear[];
  /** The year-1 outlay paid at t=0 (capex outright, or the lease down payment). */
  upfrontCents: number;
  /** Months from the t=0 outlay to cumulative cash turning positive (null + reason if never). */
  paybackMonths: number | null;
  paybackBasis: string;
  npvCents: number;
  /** Annual IRR in %, or null when the flow series has no sign change. */
  irrPct: number | null;
  irrBasis: string;
  totalNetCents: number;
  costPerOrderCents: number | null;
  costPerLineCents: number | null;
  depreciation: DepreciationSchedule;
  labour: LoadedLaborRate;
  quote: NormalizedQuote | null;
  unstated: UnstatedField[];
  notes: string[];
}

/** The audit deliverable for one bid: the vendor's own run, the buyer's run, and what moved it. */
export interface CaseAudit {
  /** The case-level verdict. An unstated line blocks a pass, by construction (PRD §5). */
  verdict: {
    status: "clears" | "fails" | "blocked";
    headline: string;
    reasons: string[];
  };
  /** The payback the proposal itself quotes, in months (null when it states none). */
  claimedPaybackMonths: number | null;
  /** The buyer's hurdle rate this audit used, as a percentage. */
  hurdleRatePct: number;
  baselineSummary: {
    linesPerDay: number;
    linesPerYear: number;
    peakFactor: number | null;
    totalHeadcount: number;
    annualLoadedCostCents: number;
  };
  /** The recompute on the vendor's stated assumptions — the reproducibility half. */
  vendorRun: { result: OptionResult | null; reason: string | null };
  /** The recompute on the buyer's own numbers — the deliverable. */
  buyerRun: OptionResult;
  /** The inputs that moved the payback, in order, each reproducible from the two input sets. */
  drivers: PaybackDriver[];
  findings: AssumptionFinding[];
  /** The ranked list to confirm in writing before signature (riskiest first). */
  confirmInWriting: AssumptionFinding[];
  unstated: UnstatedField[];
  coverage: Coverage;
  decisionPack: DecisionPack;
}

/** One input's contribution to the vendor-vs-buyer payback gap. */
export interface PaybackDriver {
  field: string;
  label: string;
  /** The unit the from/to values are expressed in, so they are never shown as raw cents. */
  unit: AssumptionFinding["unit"];
  fromValue: number;
  toValue: number;
  paybackBeforeMonths: number | null;
  paybackAfterMonths: number | null;
  /** Months of payback this single input added (null when either run has no payback). */
  addedMonths: number | null;
  detail: string;
}

/** What v1 does and does not claim — printed on the page and in the decision pack. */
export interface Coverage {
  implementedRuleIds: string[];
  unsupportedFamilies: string[];
  note: string;
}

export interface DecisionPack {
  /** The exportable artifact, built from the same numbers the page shows. */
  csv: string;
  formats: string[];
  note: string;
}

/** Two or more bids on one cash model. */
export interface BidComparison {
  results: OptionResult[];
  /** Ranked by NPV at the buyer's hurdle rate, best first. */
  ranking: {
    id: string;
    vendor: string;
    npvCents: number;
    costPerOrderCents: number | null;
    rank: number;
  }[];
  /** Where the ranking flips as an axis moves — and null + a reason when it does not. */
  crossings: Crossing[];
  sensitivity: SensitivityCell[];
  notes: string[];
}

/** A point at which the ranking of two bids flips. */
export interface Crossing {
  pair: [string, string];
  axis: "peakFactor" | "annualVolume" | "maintenancePctOfCapex" | "hurdleRatePct";
  label: string;
  /** The axis value at which the two bids' NPVs are equal (null when no sign change in bracket). */
  value: number | null;
  /** Which option is ahead below the crossing (and so, above it, the other one). */
  leaderBelow: string | null;
  statement: string;
}

/** One scenario in the PRD §2 sensitivity grid. */
export interface SensitivityCell {
  axis: "volume" | "capex" | "maintenance";
  label: string;
  deltaPct: number;
  npvByOptionCents: { id: string; npvCents: number }[];
  /** Ordering by NPV under this scenario, best first. */
  ranking: string[];
  changedLeader: boolean;
}

export interface CaseProofReport {
  engine: { id: string; name: string; version: string };
  label: string | null;
  audit: CaseAudit;
  comparison: BidComparison | null;
}

/** The WebMCP `after_tax_payback` primitive's output. */
export interface AfterTaxPayback {
  optionId: string;
  paybackMonths: number | null;
  paybackBasis: string;
  npvCents: number;
  hurdleRatePct: number;
  irrPct: number | null;
  irrBasis: string;
  upfrontCents: number;
  totalNetCents: number;
  depreciation: DepreciationSchedule;
  unstated: UnstatedField[];
}
