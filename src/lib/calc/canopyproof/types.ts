/**
 * CanopyProof — types for the pre-flight audit of a supplier geolocation set (PRD §2).
 *
 * Entry points live in `index.ts`; the arithmetic lives in `geometry.ts`, `scope.ts` and
 * `audit.ts`. This file is types plus the two closed vocabularies the report is written in:
 * the finding codes and the commodity list. Nothing here computes or defaults anything.
 *
 * The shape mirrors the declared field set the extraction layer fills (PRD §2): every leaf is a
 * `Field<T>` carrying its own state, because `extracted` is the only state the engine may compute
 * on. An `unreadable` or `unstated` field is a finding that blocks the verdict — never a default.
 */

/** The verdict is the whole report in one word. `blocked` outranks `findings`. */
export type Verdict = "pass" | "blocked" | "findings";

/** A plot above four hectares needs a boundary; a point cannot carry one. */
export type GeometryKind = "point" | "polygon";

/**
 * `extracted` — the field was read off the supplier's pack.
 * `unreadable` — the region could not be read (a scan, a redaction, a corrupt page).
 * `unstated`   — the pack is legible but does not state the field.
 * The last two block the verdict; they are not a softer kind of `extracted`.
 */
export type FieldState = "extracted" | "unreadable" | "unstated";

export interface Field<T> {
  value: T | null;
  state: FieldState;
}

/** A WGS84 position. `decimals` is the literal precision when the input carried it as text. */
export interface Coordinate {
  lat: number;
  lon: number;
  /** min(decimal places on the lat literal, decimal places on the lon literal), when both were text. */
  decimals?: number;
}

/** The seven commodities in scope of Regulation (EU) 2023/1115, Annex I. */
export const COMMODITIES = [
  "wood",
  "cocoa",
  "coffee",
  "palm_oil",
  "soy",
  "rubber",
  "cattle",
] as const;

export type Commodity = (typeof COMMODITIES)[number];

/** The operator's own size band, which decides the application date (Art. 38 / Reg. 2025/2650). */
export type OperatorSize = "large" | "medium" | "small" | "micro";

/**
 * Every finding the engine can emit. The code is stable and machine-readable; the message is
 * written for the operator, and the fix-request pack reuses both.
 */
export type FindingCode =
  // geometry
  | "ring_unclosed"
  | "ring_too_few_vertices"
  | "self_intersection"
  | "coordinate_out_of_range"
  | "coordinate_order_suspect"
  | "coordinate_precision_coarse"
  | "crs_unsupported"
  | "crs_unstated"
  | "geometry_kind_mismatch"
  | "geometry_invalid"
  | "area_uncomputable"
  // the four-hectare rule (Art. 2(28) / the plot definition)
  | "point_above_four_hectares"
  | "cattle_establishment_must_be_point"
  // declared vs computed
  | "declared_area_mismatch"
  // fields
  | "field_unreadable"
  | "field_unstated"
  // cross-plot integrity
  | "polygon_overlap"
  | "duplicate_polygon"
  | "overlap_uncomputable"
  // scope
  | "scope_unknown_code"
  | "scope_commodity_mismatch"
  | "scope_out_of_scope"
  | "scope_not_yet_applicable"
  // yield plausibility
  | "yield_overclaim"
  | "yield_unit_mismatch"
  | "yield_unverifiable"
  // completeness invariant
  | "row_not_parsed"
  | "row_unaccounted";

/**
 * `blocking` — the set cannot be certified: the verdict is withheld.
 * `finding`  — a measured defect the operator can fix; the set is still auditable.
 */
export type FindingSeverity = "blocking" | "finding";

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  /** `supplier/plot` for a plot finding, `portfolio` for a set-level one, `row:<n>` for a lost row. */
  subject: string;
  supplierId: string | null;
  plotId: string | null;
  message: string;
  fix: string;
  /** The supplier-facing element to resend, e.g. `declared_area_ha`. The fix pack groups on it. */
  element?: string;
  /** The measured figure, in the finding's own unit (`ha`, tonnes, or the count). */
  measured?: number;
  /** The threshold the figure was measured against, in the same unit. */
  limit?: number;
}

// --- scope ----------------------------------------------------------------

export type ScopeStatus = "in_scope" | "out_of_scope" | "unknown_code" | "not_yet_applicable";

export interface CnCodeEntry {
  /** The heading as printed in Annex I, e.g. `4407` or `0102 21`. */
  code: string;
  /** Digits only, for prefix matching against a supplier's 8-digit CN subheading. */
  normalized: string;
  /** The commodity the heading belongs to, or null for a vendored out-of-scope control. */
  commodity: Commodity | null;
  description: string;
  /** False for a code vendored only to prove the screen is not "everything is in scope". */
  inScope: boolean;
  /** Added to Annex I by Delegated Regulation (EU) 2026/2102 — applies from 30 December 2027. */
  addedBy2026Act: boolean;
}

export interface ScopeResult {
  /** The code as the supplier declared it. */
  code: string;
  /** Digits only: what the table was matched against. */
  normalizedCode: string;
  status: ScopeStatus;
  /** The commodity the operator declared for this line. */
  commodity: Commodity;
  /** The commodity the matched heading belongs to — differs from `commodity` on a mismatch. */
  tableCommodity: Commodity | null;
  /** The Annex I heading the code matched, or null for an unknown code. */
  matchedCode: string | null;
  description: string | null;
  /** The day the operator's obligation starts for this line, ISO `YYYY-MM-DD`; null if out of scope. */
  appliesFrom: string | null;
  /** True when the status withholds the verdict (an unknown code never guesses). */
  blocks: boolean;
  reason: string;
}

// --- geometry -------------------------------------------------------------

export type CrsStatus = "wgs84" | "unsupported" | "unstated";

export interface GeometryAssessment {
  kind: GeometryKind | null;
  /** True only when every geometry check passed and an area could be computed. */
  valid: boolean;
  crsStatus: CrsStatus;
  crsDeclared: string | null;
  /** A point is closed by definition; a polygon ring must repeat its first position. */
  closed: boolean | null;
  /** Distinct positions, excluding the repeated closing position. */
  vertexCount: number | null;
  selfIntersecting: boolean | null;
  /** The coarsest literal precision across the vertices, when the pack carried text literals. */
  minDecimals: number | null;
  /** Spherical-excess area in hectares; null for a point or invalid geometry. */
  areaHa: number | null;
  /** The codes of the geometry findings, in emission order. */
  codes: FindingCode[];
}

// --- yield ----------------------------------------------------------------

export interface YieldFigure {
  /** The operator's own yield, in tonnes of the commodity per hectare. An input, never a default. */
  tonnesPerHectare: number;
  /** Only tonnes are accepted; the engine never converts a unit it was not given. */
  unit: "t";
}

export type YieldCheckStatus = "within" | "overclaim" | "unassessed" | "unverifiable";

export interface YieldAssessment {
  status: YieldCheckStatus;
  declaredQuantityT: number | null;
  /**
   * The area the ceiling was computed on. For a polygon that is the boundary's computed area; for a
   * point (which has no boundary) it is the plot's own DECLARED area — `areaBasis` says which, so a
   * ceiling is never presented as if it rested on a boundary that does not exist.
   */
  computedAreaHa: number | null;
  areaBasis: "computed" | "declared" | null;
  operatorYieldTPerHa: number | null;
  /** area × the operator's own yield: the physical ceiling for this plot. */
  ceilingT: number | null;
  /** declared − ceiling; positive is the over-claim. */
  overclaimT: number | null;
  /** Why the check did not run, when it did not. */
  note: string | null;
}

// --- input ----------------------------------------------------------------

export interface PlotInput {
  /** The 0-based row position in the supplier pack. The completeness invariant counts on it. */
  rowIndex: number;
  supplierId: string;
  plotId: string;
  commodity: Commodity;
  cnCode: Field<string>;
  countryOfProduction: Field<string>;
  declaredAreaHa: Field<number>;
  geometryKind: Field<GeometryKind>;
  coordinates: Field<Coordinate[]>;
  /** The supplier's declared CRS. Absent is `unstated`, never an assumption. */
  crs: Field<string>;
  productionPeriod: Field<string>;
  legalityEvidenceRef: Field<string>;
  quantity: Field<number>;
  /** The declared quantity's unit. Only `t` can be screened against a tonnes-per-hectare yield. */
  unit: Field<string>;
  ddsReference?: string;
}

export interface UnparsedRow {
  rowIndex: number;
  supplierId: string | null;
  /** The parser's own reason, quoted in the finding and in the fix pack. */
  reason: string;
}

export interface OperatorProfile {
  id?: string;
  size: OperatorSize;
  /** The operator's own yield figure, by commodity. Absent means the yield check does not run. */
  yieldByCommodity?: Partial<Record<Commodity, YieldFigure>>;
}

export interface AuditBatchInput {
  operator: OperatorProfile;
  /** ISO `YYYY-MM-DD`. Supplied by the caller: the engine has no clock. */
  asOf: string;
  /** Declared-vs-computed area tolerance, percent of computed area. Default 1. */
  areaTolerancePct?: number;
  /** Pairwise overlap below this many hectares is a shared boundary, not double counting. Default 0.01. */
  overlapToleranceHa?: number;
  /** Every data row the pack contained, parsed or not. */
  rowCount: number;
  plots: PlotInput[];
  unparsedRows?: UnparsedRow[];
  label?: string;
}

// --- report ---------------------------------------------------------------

export interface FourHectareCheck {
  /** True when the rule constrains this plot (non-cattle) — cattle is always a point. */
  applies: boolean;
  /** null when the rule cannot be decided (a point with no stated area). */
  compliant: boolean | null;
  note: string;
}

export interface PlotAudit {
  /** `supplierId/plotId`, the subject every finding about this plot carries. */
  key: string;
  rowIndex: number;
  supplierId: string;
  plotId: string;
  commodity: Commodity;
  geometryKind: GeometryKind | null;
  geometry: GeometryAssessment;
  declaredAreaHa: number | null;
  computedAreaHa: number | null;
  /** declared − computed, hectares. Null when either figure is unavailable. */
  areaDeltaHa: number | null;
  areaDeltaPct: number | null;
  withinAreaTolerance: boolean | null;
  fourHectare: FourHectareCheck;
  scope: ScopeResult | null;
  /** The declared quantity's unit, as stated: the portfolio total only sums tonnes. */
  quantityUnit: string | null;
  yieldCheck: YieldAssessment;
  findings: Finding[];
  /** True when this plot alone withholds the verdict. */
  blocking: boolean;
}

export interface FixRequest {
  supplierId: string;
  plotId: string | null;
  rowIndex: number | null;
  /** The exact element to resend, named as the supplier's own field (`coordinates`, `declared_area_ha`). */
  element: string;
  /** What to resend, in plain language the operator can forward unedited. */
  action: string;
  /** Why the engine cannot proceed without it. */
  because: string;
  blocking: boolean;
  codes: FindingCode[];
}

export interface SupplierAudit {
  supplierId: string;
  plotCount: number;
  blockingCount: number;
  findingCount: number;
  computedAreaHa: number;
  /** Σ of the declared areas that were actually stated; plots without one are excluded, not zeroed. */
  declaredAreaHa: number;
  /** Plots whose declared area is unstated or unreadable — the figure above is not the whole set. */
  declaredAreaUnstatedPlots: number;
  fixRequests: FixRequest[];
}

export interface OverlapFinding {
  code: "polygon_overlap" | "duplicate_polygon";
  plotA: string;
  plotB: string;
  supplierA: string;
  supplierB: string;
  overlapAreaHa: number;
  /** Overlap as a percentage of the smaller polygon — the share of one plot double-counted. */
  shareOfSmallerPct: number;
  blocking: boolean;
  message: string;
  fix: string;
}

export interface CompletenessReport {
  rowsInInput: number;
  rowsParsed: number;
  rowsUnparsed: number;
  /** Σ(parsed) + Σ(unparsed) === rowsInInput. A dropped row is the finding. */
  accountedFor: boolean;
  unparsed: UnparsedRow[];
  findings: Finding[];
}

export interface PortfolioReport {
  completeness: CompletenessReport;
  overlaps: OverlapFinding[];
  duplicates: OverlapFinding[];
  /** Σ computed area of every plot whose geometry produced one — no overlap deducted. */
  computedAreaHa: number;
  /** The same total with every measured overlap subtracted once: what the set actually covers. */
  netAreaHa: number;
  totalOverlapAreaHa: number;
  /** Σ declared tonnage across plots that stated one. */
  declaredQuantityT: number;
}

export interface CanopyProofReport {
  engine: { id: string; name: string; version: string };
  label: string | null;
  asOf: string;
  operator: { id: string | null; size: OperatorSize };
  verdict: Verdict;
  blockingCount: number;
  findingCount: number;
  plots: PlotAudit[];
  suppliers: SupplierAudit[];
  portfolio: PortfolioReport;
  /** Every finding in report order: plots in input order, then portfolio, then completeness. */
  findings: Finding[];
  /** Per supplier, per plot: what to send back. The pre-flight pack the operator forwards. */
  fixRequests: FixRequest[];
  cnTable: { version: string; source: string; entryCount: number };
  provenance: {
    computedBy: "deterministic-engine";
    /** Every figure came from the supplier's declared rows; none from a model. */
    inputSource: "declared-fields";
  };
}
