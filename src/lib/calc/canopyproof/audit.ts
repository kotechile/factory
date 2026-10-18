/**
 * CanopyProof — the audit itself: one supplier submission set in, one pre-flight report out.
 *
 * Entry points:
 * - `auditBatch(input)` — the deliverable: per-plot geometry, the four-hectare rule, declared vs
 *   computed area, the commodity-scope screen, the operator's own yield check, pairwise overlap and
 *   duplicates across the whole set, the completeness invariant, and the per-supplier fix pack.
 * - `FOUR_HECTARES` / `DEFAULT_AREA_TOLERANCE_PCT` — the two constants the caller may override.
 *
 * No I/O, no network, no LLM, no clock: `asOf` and the operator's yield figure are inputs. Every
 * number in the report is computed here from the declared rows; nothing is defaulted, estimated or
 * filled from a neighbouring field (AGENTS.md rule 5). A field that is `unreadable` or `unstated`
 * becomes a blocking finding, and the verdict is withheld.
 *
 * ── The rules, and why they are hard ───────────────────────────────────────────────────────────
 * - Four hectares: a plot above 4 ha must carry a boundary; a point cannot describe more than
 *   4 ha, so a >4 ha point is a hard finding (it cannot be filed). A cattle establishment is
 *   always a point, whatever its area — the register, not the boundary, identifies it.
 * - Declared vs computed: the supplier's own area against the area its vertices enclose, at a
 *   caller-supplied tolerance (default 1 % of computed). Absent declared area is `unstated`.
 * - Overlap: any pair of valid polygons whose intersection exceeds the area tolerance. The
 *   measured overlap is reported — it is a double-count risk, not a rejection.
 * - Duplicate: the same vertex set twice (rotation and direction ignored) is the same plot counted
 *   twice, which is blocking.
 * - Completeness: Σ(rows parsed) + Σ(rows the parser recorded as unparsed) must equal the rows the
 *   pack contained. A row that simply vanished is a finding in its own right.
 * - Yield: declared tonnage against computed area × the OPERATOR'S OWN yield figure. An over-claim
 *   is a finding carrying the computed ceiling, never a rejection and never a vendored yield.
 */
import type {
  AuditBatchInput,
  CanopyProofReport,
  Commodity,
  CompletenessReport,
  Coordinate,
  Finding,
  FindingCode,
  FixRequest,
  FourHectareCheck,
  GeometryAssessment,
  OperatorSize,
  OverlapFinding,
  PlotAudit,
  PlotInput,
  PortfolioReport,
  SupplierAudit,
  UnparsedRow,
  YieldAssessment,
  YieldFigure,
} from "./types";
import {
  DEFAULT_OVERLAP_TOLERANCE_HA,
  assessGeometry,
  polygonIntersectionAreaHa,
  ringSignature,
  stripClosing,
} from "./geometry";
import { CN_TABLE, CN_TABLE_SOURCE, CN_TABLE_VERSION, screenCommodity } from "./scope";
import { CanopyProofInputError } from "./errors";

/** A plot at or below this area may be a point; above it, the boundary is mandatory. */
export const FOUR_HECTARES = 4;

/** Declared area may differ from the computed area by this percentage before it is a finding. */
export const DEFAULT_AREA_TOLERANCE_PCT = 1;

/** Below this difference the comparison is floating-point noise, not a discrepancy. */
const AREA_EPSILON_HA = 1e-9;

const REQUIRED_FIELDS: readonly {
  key: "countryOfProduction" | "cnCode" | "declaredAreaHa" | "geometryKind" | "coordinates" | "crs" | "productionPeriod";
  element: string;
  label: string;
}[] = [
  { key: "countryOfProduction", element: "country_of_production", label: "country of production" },
  { key: "cnCode", element: "cn_code", label: "CN code" },
  { key: "declaredAreaHa", element: "declared_area_ha", label: "declared area in hectares" },
  { key: "geometryKind", element: "geometry_kind", label: "geometry kind (point or polygon)" },
  { key: "coordinates", element: "coordinates", label: "coordinates" },
  { key: "crs", element: "crs", label: "declared CRS" },
  { key: "productionPeriod", element: "production_period", label: "production period" },
];

const TONNE_UNITS: readonly string[] = ["t", "tonne", "tonnes", "mt", "metric tonne", "metric tonnes"];

function isTonnes(unit: string | null): boolean {
  return unit !== null && TONNE_UNITS.includes(unit.trim().toLowerCase());
}

function plotKey(plot: PlotInput): string {
  return `${plot.supplierId}/${plot.plotId}`;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

const GEOMETRY_MESSAGES: Record<string, { message: string; fix: string; blocking: boolean }> = {
  ring_unclosed: {
    message:
      "The polygon ring does not return to its first position, so it does not enclose a plot. An open ring is not closed on the supplier's behalf.",
    fix: "Resend the polygon with the first coordinate repeated as the last position.",
    blocking: true,
  },
  ring_too_few_vertices: {
    message:
      "The polygon has fewer than four positions (three distinct corners plus the repeated closing position), so it cannot enclose an area.",
    fix: "Resend the full boundary with at least three distinct corners and the first position repeated at the end.",
    blocking: true,
  },
  self_intersection: {
    message:
      "The ring crosses itself: two non-adjacent edges intersect, so the enclosed area is ambiguous.",
    fix: "Resend the boundary with the crossing corrected — the vertices in the order they are walked around the plot.",
    blocking: true,
  },
  coordinate_out_of_range: {
    message:
      "At least one position is outside the valid latitude/longitude range, so the vertex cannot be placed on the Earth.",
    fix: "Resend the coordinates in WGS84 decimal degrees with latitude in [-90, 90] and longitude in [-180, 180].",
    blocking: true,
  },
  coordinate_order_suspect: {
    message:
      "A longitude appears in the latitude slot: the pair was written longitude-first. The engine reports the swap and does not re-order the supplier's vertices.",
    fix: "Resend the coordinates labelled latitude first, longitude second (WGS84 decimal degrees).",
    blocking: true,
  },
  coordinate_precision_coarse: {
    message:
      "The vertices are stated to fewer than four decimal places, so the area they imply is coarser than the audit can rely on.",
    fix: "Resend the coordinates to six decimal places (the Information System's own format).",
    blocking: false,
  },
  crs_unsupported: {
    message:
      "The declared CRS is not WGS84. The engine does not reproject: a silently reprojected boundary is a number nobody can trace.",
    fix: "Resend the coordinates in WGS84 (EPSG:4326), or supply the boundary already transformed with the transformation stated.",
    blocking: true,
  },
  crs_unstated: {
    message:
      "The pack does not state the CRS. WGS84 is not assumed: an unstated projection may be a national grid.",
    fix: "State the CRS on the submission (WGS84 / EPSG:4326 if that is what the coordinates are in).",
    blocking: true,
  },
  geometry_kind_mismatch: {
    message:
      "The declared geometry kind does not match the coordinates: a point carries exactly one position, a polygon carries a ring.",
    fix: "Resend either a single point or the full polygon ring, and state which one it is.",
    blocking: true,
  },
  area_uncomputable: {
    message:
      "The ring encloses no measurable area (zero or degenerate), so no area can be reported.",
    fix: "Resend the boundary with distinct corners that enclose the plot.",
    blocking: true,
  },
};

function geometryFindings(assessment: GeometryAssessment, subject: string, plot: PlotInput): Finding[] {
  const findings: Finding[] = [];
  for (const code of assessment.codes) {
    const template = GEOMETRY_MESSAGES[code];
    if (!template) continue; // `geometry_invalid` is the absence case, already a field finding.
    findings.push({
      code,
      severity: template.blocking ? "blocking" : "finding",
      subject,
      supplierId: plot.supplierId,
      plotId: plot.plotId,
      message: `${template.message}${
        code === "coordinate_precision_coarse" && assessment.minDecimals !== null
          ? ` Stated to ${assessment.minDecimals} decimal place(s).`
          : ""
      }${code === "crs_unsupported" || code === "crs_unstated" ? ` Declared: ${assessment.crsDeclared ?? "nothing"}.` : ""}`,
      fix: template.fix,
      element: code.startsWith("crs_")
        ? "crs"
        : code === "geometry_kind_mismatch"
          ? "geometry_kind"
          : "coordinates",
    });
  }
  return findings;
}

function fieldFindings(plot: PlotInput, subject: string): Finding[] {
  const findings: Finding[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = plot[field.key];
    if (value.state === "extracted" && value.value !== null) continue;
    const state = value.state === "extracted" ? "unstated" : value.state;
    findings.push({
      code: state === "unreadable" ? "field_unreadable" : "field_unstated",
      severity: "blocking",
      subject,
      supplierId: plot.supplierId,
      plotId: plot.plotId,
      message:
        state === "unreadable"
          ? `The ${field.label} could not be read from the supplier's pack. An unreadable region is never inferred from the rest of the row.`
          : `The supplier's pack does not state the ${field.label}. A missing declared value is never estimated.`,
      fix:
        state === "unreadable"
          ? `Re-supply a legible copy of the ${field.label} (a text-based export or a clear scan) and re-run.`
          : `Ask the supplier to state the ${field.label} explicitly and resend.`,
      element: field.element,
    });
  }
  return findings;
}

function fourHectareCheck(plot: PlotInput, assessment: GeometryAssessment, subject: string): {
  check: FourHectareCheck;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  const kind = assessment.kind;
  const declared = plot.declaredAreaHa.value;

  if (plot.commodity === "cattle") {
    if (kind === "polygon") {
      findings.push({
        code: "cattle_establishment_must_be_point",
        severity: "blocking",
        subject,
        supplierId: plot.supplierId,
        plotId: plot.plotId,
        message:
          "A cattle establishment is geolocated as a point, not a boundary. A polygon here is the wrong kind of record for the DDS.",
        fix: "Resend the establishment as a single point (the holding's location), not a polygon.",
        element: "geometry_kind",
      });
      return { check: { applies: false, compliant: false, note: "Cattle establishments are always a point; a polygon was supplied." }, findings };
    }
    return {
      check: {
        applies: false,
        compliant: kind === "point" ? true : null,
        note: "Cattle: the establishment is always a point, so the four-hectare boundary rule does not apply.",
      },
      findings,
    };
  }

  if (kind === "point") {
    if (declared !== null && declared > FOUR_HECTARES + AREA_EPSILON_HA) {
      findings.push({
        code: "point_above_four_hectares",
        severity: "blocking",
        subject,
        supplierId: plot.supplierId,
        plotId: plot.plotId,
        message:
          `The plot is declared at ${round(declared, 4)} ha, above the four-hectare ceiling for a point. A point cannot carry a boundary, so this cannot be filed as submitted.`,
        fix: "Resend the plot as a polygon boundary (a ring of WGS84 vertices).",
        element: "geometry_kind",
        measured: declared,
        limit: FOUR_HECTARES,
      });
      return { check: { applies: true, compliant: false, note: "Above 4 ha a boundary is mandatory." }, findings };
    }
    return {
      check: {
        applies: true,
        compliant: declared === null ? null : true,
        note:
          declared === null
            ? "A point carries no boundary and the declared area is unstated, so the four-hectare ceiling cannot be confirmed."
            : "At or below 4 ha a single point is permitted.",
      },
      findings,
    };
  }

  if (kind === "polygon") {
    return {
      check: {
        applies: true,
        compliant: true,
        note:
          assessment.areaHa === null
            ? "A boundary was supplied; its area could not be computed (see the geometry findings)."
            : `A boundary was supplied; the computed area is ${round(assessment.areaHa, 4)} ha.`,
      },
      findings,
    };
  }

  return {
    check: { applies: true, compliant: null, note: "The geometry kind is not stated, so the rule cannot be decided." },
    findings,
  };
}

function areaComparison(
  plot: PlotInput,
  assessment: GeometryAssessment,
  tolerancePct: number,
  subject: string,
): { deltaHa: number | null; deltaPct: number | null; within: boolean | null; findings: Finding[] } {
  const declared = plot.declaredAreaHa.value;
  const computed = assessment.areaHa;
  if (declared === null || computed === null) {
    return { deltaHa: null, deltaPct: null, within: null, findings: [] };
  }
  const deltaHa = declared - computed;
  const deltaPct = (deltaHa / computed) * 100;
  const within = Math.abs(deltaPct) <= tolerancePct + 1e-12;
  if (within) return { deltaHa, deltaPct, within, findings: [] };
  return {
    deltaHa,
    deltaPct,
    within,
    findings: [
      {
        code: "declared_area_mismatch",
        severity: "finding",
        subject,
        supplierId: plot.supplierId,
        plotId: plot.plotId,
        message:
          `The supplier declares ${round(declared, 4)} ha; its own vertices enclose ${round(computed, 4)} ha ` +
          `(${deltaPct > 0 ? "+" : ""}${round(deltaPct, 2)} % against a ${tolerancePct} % tolerance).`,
        fix: "Ask the supplier to confirm which is right — the declared area or the boundary — and resend the corrected pair.",
        element: "declared_area_ha",
        measured: declared,
        limit: computed,
      },
    ],
  };
}

function scopeFindings(
  plot: PlotInput,
  operatorSize: OperatorSize,
  asOf: string,
  subject: string,
): { result: ReturnType<typeof screenCommodity> | null; findings: Finding[] } {
  const code = plot.cnCode.value;
  if (code === null) return { result: null, findings: [] };
  const result = screenCommodity(code, operatorSize, plot.commodity, asOf);
  const findings: Finding[] = [];

  if (result.blocks) {
    findings.push({
      code: "scope_unknown_code",
      severity: "blocking",
      subject,
      supplierId: plot.supplierId,
      plotId: plot.plotId,
      message: result.reason,
      fix: `Confirm the CN code on the supplier's invoice or customs entry, or refresh the vendored Annex I table (currently ${CN_TABLE_VERSION}) and re-run.`,
      element: "cn_code",
    });
    return { result, findings };
  }
  if (result.tableCommodity !== null && result.tableCommodity !== plot.commodity) {
    findings.push({
      code: "scope_commodity_mismatch",
      severity: "blocking",
      subject,
      supplierId: plot.supplierId,
      plotId: plot.plotId,
      message:
        `CN ${result.matchedCode} is a ${result.tableCommodity} heading, but the row declares ${plot.commodity}. ` +
        "The commodity and the code cannot both be right.",
      fix: "Confirm the commodity and the CN code with the supplier; one of the two is wrong.",
      element: "cn_code",
    });
    return { result, findings };
  }
  if (result.status === "out_of_scope") {
    findings.push({
      code: "scope_out_of_scope",
      severity: "finding",
      subject,
      supplierId: plot.supplierId,
      plotId: plot.plotId,
      message: `${result.reason} This line needs no due-diligence statement.`,
      fix: "Remove the line from the DDS set, or confirm the code if the product is in fact a listed commodity.",
      element: "cn_code",
    });
  }
  if (result.status === "not_yet_applicable") {
    findings.push({
      code: "scope_not_yet_applicable",
      severity: "finding",
      subject,
      supplierId: plot.supplierId,
      plotId: plot.plotId,
      message: result.reason,
      fix: `No statement is due for this line before ${result.appliesFrom}; re-run the audit on or after that date.`,
      element: "cn_code",
    });
  }
  return { result, findings };
}

function yieldAssessment(
  plot: PlotInput,
  assessment: GeometryAssessment,
  figure: YieldFigure | undefined,
  subject: string,
): { check: YieldAssessment; findings: Finding[] } {
  const quantity = plot.quantity.value;
  const unit = plot.unit.value;
  // A point has no boundary: its own declared area is the only area there is, and using it is
  // labelled `areaBasis: "declared"` rather than passed off as a computed figure. A polygon whose
  // geometry failed gets NO area — the broken boundary is the finding, and its declared area is not
  // substituted for the one under audit.
  const declaredArea = plot.declaredAreaHa.value;
  const usesDeclaredArea = assessment.kind === "point" && assessment.areaHa === null && declaredArea !== null;
  const area = assessment.areaHa ?? (usesDeclaredArea ? declaredArea : null);
  const areaBasis: YieldAssessment["areaBasis"] =
    assessment.areaHa !== null ? "computed" : usesDeclaredArea ? "declared" : null;

  const base: YieldAssessment = {
    status: "unassessed",
    declaredQuantityT: quantity,
    computedAreaHa: area,
    areaBasis,
    operatorYieldTPerHa: figure ? figure.tonnesPerHectare : null,
    ceilingT: null,
    overclaimT: null,
    note: null,
  };

  if (!figure) {
    return {
      check: { ...base, note: `The operator supplied no yield figure for ${plot.commodity}; the check did not run.` },
      findings: [],
    };
  }
  if (quantity === null) {
    return {
      check: { ...base, note: "The row states no quantity, so there is nothing to compare with area × yield." },
      findings: [],
    };
  }
  if (!isTonnes(unit)) {
    return {
      check: {
        ...base,
        status: "unverifiable",
        note: `The quantity's unit (${unit ?? "unstated"}) is not tonnes; the engine does not convert a unit it was not given.`,
      },
      findings: [
        {
          code: "yield_unit_mismatch",
          severity: "blocking",
          subject,
          supplierId: plot.supplierId,
          plotId: plot.plotId,
          message: `The declared quantity is in ${unit ?? "an unstated unit"}; the yield figure is tonnes per hectare, and no conversion is assumed.`,
          fix: "Resend the quantity in tonnes (t), or supply the operator's yield figure in the declared unit.",
          element: "unit",
        },
      ],
    };
  }
  if (area === null) {
    return {
      check: { ...base, status: "unverifiable", note: "No area is available (no boundary and no stated declared area), so the ceiling cannot be computed." },
      findings: [
        {
          code: "yield_unverifiable",
          severity: "finding",
          subject,
          supplierId: plot.supplierId,
          plotId: plot.plotId,
          message:
            "The yield check cannot run because the plot's area could not be computed. The geometry findings above are the cause.",
          fix: "Fix the geometry first; the yield check then runs on the computed area.",
          element: "coordinates",
        },
      ],
    };
  }

  const ceilingT = area * figure.tonnesPerHectare;
  const overclaimT = quantity - ceilingT;
  if (overclaimT > 0) {
    return {
      check: { ...base, status: "overclaim", ceilingT, overclaimT },
      findings: [
        {
          code: "yield_overclaim",
          severity: "finding",
          subject,
          supplierId: plot.supplierId,
          plotId: plot.plotId,
          message:
            `The row declares ${round(quantity, 4)} t off ${round(area, 4)} ha. At the operator's own ` +
            `${figure.tonnesPerHectare} t/ha that plot can physically carry ${round(ceilingT, 4)} t — an over-claim of ${round(overclaimT, 4)} t.`,
          fix: "Ask the supplier to reconcile the tonnage with the plot area, or to supply the additional plots the volume comes from.",
          element: "quantity",
          measured: quantity,
          limit: ceilingT,
        },
      ],
    };
  }
  return {
    check: { ...base, status: "within", ceilingT, overclaimT },
    findings: [],
  };
}

interface PlotContext {
  operatorSize: OperatorSize;
  asOf: string;
  areaTolerancePct: number;
  yieldByCommodity: Partial<Record<Commodity, YieldFigure>> | undefined;
}

function auditPlot(plot: PlotInput, ctx: PlotContext): PlotAudit {
  const subject = plotKey(plot);
  const findings: Finding[] = [];

  findings.push(...fieldFindings(plot, subject));

  const assessment = assessGeometry({
    kind: plot.geometryKind.value,
    coordinates: plot.coordinates.value,
    crs: plot.crs.value,
  });
  findings.push(...geometryFindings(assessment, subject, plot));

  const four = fourHectareCheck(plot, assessment, subject);
  findings.push(...four.findings);

  const area = areaComparison(plot, assessment, ctx.areaTolerancePct, subject);
  findings.push(...area.findings);

  const scope = scopeFindings(plot, ctx.operatorSize, ctx.asOf, subject);
  findings.push(...scope.findings);

  const figure = ctx.yieldByCommodity?.[plot.commodity];
  const yieldCheck = yieldAssessment(plot, assessment, figure, subject);
  findings.push(...yieldCheck.findings);

  return {
    key: subject,
    rowIndex: plot.rowIndex,
    supplierId: plot.supplierId,
    plotId: plot.plotId,
    commodity: plot.commodity,
    geometryKind: plot.geometryKind.value,
    geometry: assessment,
    declaredAreaHa: plot.declaredAreaHa.value,
    computedAreaHa: assessment.areaHa,
    areaDeltaHa: area.deltaHa,
    areaDeltaPct: area.deltaPct,
    withinAreaTolerance: area.within,
    fourHectare: four.check,
    scope: scope.result,
    quantityUnit: plot.unit.value,
    yieldCheck: yieldCheck.check,
    findings,
    blocking: findings.some((finding) => finding.severity === "blocking"),
  };
}

function pairwiseIntegrity(
  plots: PlotAudit[],
  rings: Map<string, Coordinate[]>,
  toleranceHa: number,
): { overlaps: OverlapFinding[]; duplicates: OverlapFinding[]; findings: Finding[] } {
  const overlaps: OverlapFinding[] = [];
  const duplicates: OverlapFinding[] = [];
  const findings: Finding[] = [];
  const eligible = plots.filter(
    (plot) =>
      plot.geometry.kind === "polygon" &&
      plot.geometry.valid &&
      plot.geometry.areaHa !== null &&
      plot.computedAreaHa !== null,
  );

  for (let i = 0; i < eligible.length; i += 1) {
    for (let j = i + 1; j < eligible.length; j += 1) {
      const a = eligible[i]!;
      const b = eligible[j]!;
      const ringA = rings.get(a.key);
      const ringB = rings.get(b.key);
      if (!ringA || !ringB) continue;

      if (ringSignature(ringA) === ringSignature(ringB)) {
        const area = Math.min(a.computedAreaHa!, b.computedAreaHa!);
        const duplicate: OverlapFinding = {
          code: "duplicate_polygon",
          plotA: a.key,
          plotB: b.key,
          supplierA: a.supplierId,
          supplierB: b.supplierId,
          overlapAreaHa: area,
          shareOfSmallerPct: 100,
          blocking: true,
          message:
            `${a.key} and ${b.key} are the same boundary: identical vertex sets, so the land behind two rows ` +
            `(${round(area, 4)} ha) is counted twice.`,
          fix: "Keep one row per plot. Ask the suppliers which row the boundary belongs to and remove the other.",
        };
        duplicates.push(duplicate);
        findings.push({
          code: "duplicate_polygon",
          severity: "blocking",
          subject: "portfolio",
          supplierId: b.supplierId,
          plotId: b.plotId,
          message: duplicate.message,
          fix: duplicate.fix,
          element: "coordinates",
          measured: area,
          limit: 0,
        });
        continue;
      }

      const overlap = polygonIntersectionAreaHa(ringA, ringB);
      if (overlap === null) {
        findings.push({
          code: "overlap_uncomputable",
          severity: "blocking",
          subject: "portfolio",
          supplierId: b.supplierId,
          plotId: b.plotId,
          message:
            `The overlap between ${a.key} and ${b.key} could not be computed: one ring could not be triangulated. ` +
            "No overlap figure is reported rather than a zero.",
          fix: "Fix the two boundaries (the geometry findings name them) and re-run.",
          element: "coordinates",
        });
        continue;
      }
      if (overlap <= toleranceHa) continue;

      const smaller = Math.min(a.computedAreaHa!, b.computedAreaHa!);
      const share = smaller > 0 ? (overlap / smaller) * 100 : 0;
      const finding: OverlapFinding = {
        code: "polygon_overlap",
        plotA: a.key,
        plotB: b.key,
        supplierA: a.supplierId,
        supplierB: b.supplierId,
        overlapAreaHa: overlap,
        shareOfSmallerPct: share,
        blocking: false,
        message:
          `${a.key} and ${b.key} overlap by ${round(overlap, 4)} ha — ${round(share, 2)} % of the smaller plot. ` +
          "The same land sits behind two rows, so a tonnage or an area total that counts both double-counts it.",
        fix: "Ask the two suppliers for the shared boundary, or split the overlapping area between the rows before filing.",
      };
      overlaps.push(finding);
      findings.push({
        code: "polygon_overlap",
        severity: "finding",
        subject: "portfolio",
        supplierId: b.supplierId,
        plotId: b.plotId,
        message: finding.message,
        fix: finding.fix,
        element: "coordinates",
        measured: overlap,
        limit: toleranceHa,
      });
    }
  }
  return { overlaps, duplicates, findings };
}

function completenessReport(input: AuditBatchInput): CompletenessReport {
  const unparsed: UnparsedRow[] = input.unparsedRows ? [...input.unparsedRows] : [];
  const rowsParsed = input.plots.length;
  const accountedFor = rowsParsed + unparsed.length === input.rowCount;
  const findings: Finding[] = [];

  for (const row of unparsed) {
    findings.push({
      code: "row_not_parsed",
      severity: "blocking",
      subject: `row:${row.rowIndex}`,
      supplierId: row.supplierId,
      plotId: null,
      message: `Row ${row.rowIndex} is in the pack but was not parsed into a plot record: ${row.reason}`,
      fix: "Re-supply that row (a text-based export of the page or table) so it can be parsed; the set is not certified without it.",
      element: "row",
    });
  }
  if (!accountedFor) {
    findings.push({
      code: "row_unaccounted",
      severity: "blocking",
      subject: "portfolio",
      supplierId: null,
      plotId: null,
      message:
        `The pack declares ${input.rowCount} data row(s); ${rowsParsed} parsed and ${unparsed.length} were recorded as unparsed. ` +
        `${input.rowCount - rowsParsed - unparsed.length} row(s) are unaccounted for.`,
      fix: "Re-export the pack and re-run; a row that vanishes between the file and the parser is a finding in its own right.",
      element: "row",
      measured: rowsParsed + unparsed.length,
      limit: input.rowCount,
    });
  }
  return {
    rowsInInput: input.rowCount,
    rowsParsed,
    rowsUnparsed: unparsed.length,
    accountedFor,
    unparsed,
    findings,
  };
}

function supplierReports(plots: PlotAudit[], fixRequests: FixRequest[]): SupplierAudit[] {
  const bySupplier = new Map<string, PlotAudit[]>();
  for (const plot of plots) {
    const list = bySupplier.get(plot.supplierId);
    if (list) list.push(plot);
    else bySupplier.set(plot.supplierId, [plot]);
  }
  return [...bySupplier.entries()].map(([supplierId, supplierPlots]) => {
    let blockingCount = 0;
    let findingCount = 0;
    let computedAreaHa = 0;
    let declaredAreaHa = 0;
    let declaredAreaUnstatedPlots = 0;
    for (const plot of supplierPlots) {
      blockingCount += plot.findings.filter((finding) => finding.severity === "blocking").length;
      findingCount += plot.findings.filter((finding) => finding.severity === "finding").length;
      if (plot.computedAreaHa !== null) computedAreaHa += plot.computedAreaHa;
      if (plot.declaredAreaHa !== null) declaredAreaHa += plot.declaredAreaHa;
      else declaredAreaUnstatedPlots += 1;
    }
    return {
      supplierId,
      plotCount: supplierPlots.length,
      blockingCount,
      findingCount,
      computedAreaHa,
      declaredAreaHa,
      declaredAreaUnstatedPlots,
      fixRequests: fixRequests.filter((request) => request.supplierId === supplierId),
    };
  });
}

/**
 * One request per (supplier, plot, element): the exact thing to resend, with every code that named
 * it. A cross-supplier finding lands in BOTH suppliers' packs — each of them has to resend the
 * boundary, and a pack that only told one side would leave the operator forwarding half a request.
 */
function buildFixRequests(
  plots: PlotAudit[],
  overlaps: OverlapFinding[],
  duplicates: OverlapFinding[],
): FixRequest[] {
  const requests: FixRequest[] = [];
  for (const plot of plots) {
    const groups = new Map<string, { codes: FindingCode[]; blocking: boolean; fixes: string[]; messages: string[] }>();
    for (const finding of plot.findings) {
      const element = finding.element ?? "row";
      const group = groups.get(element);
      if (group) {
        group.codes.push(finding.code);
        group.blocking = group.blocking || finding.severity === "blocking";
        group.fixes.push(finding.fix);
        group.messages.push(finding.message);
      } else {
        groups.set(element, {
          codes: [finding.code],
          blocking: finding.severity === "blocking",
          fixes: [finding.fix],
          messages: [finding.message],
        });
      }
    }
    for (const [element, group] of groups) {
      requests.push({
        supplierId: plot.supplierId,
        plotId: plot.plotId,
        rowIndex: plot.rowIndex,
        element,
        action: [...new Set(group.fixes)].join(" "),
        because: group.messages[0] ?? "",
        blocking: group.blocking,
        codes: group.codes,
      });
    }
  }

  const byKey = new Map(plots.map((plot) => [plot.key, plot]));
  for (const overlap of [...overlaps, ...duplicates]) {
    for (const key of [overlap.plotA, overlap.plotB]) {
      const plot = byKey.get(key);
      if (!plot) continue;
      requests.push({
        supplierId: plot.supplierId,
        plotId: plot.plotId,
        rowIndex: plot.rowIndex,
        element: "coordinates",
        action: overlap.fix,
        because: overlap.message,
        blocking: overlap.blocking,
        codes: [overlap.code],
      });
    }
  }
  return requests;
}

export function auditBatch(input: AuditBatchInput): CanopyProofReport {
  if (!input || !Array.isArray(input.plots)) {
    throw new CanopyProofInputError(
      "cp-plots-empty",
      "plots",
      "`plots` must be an array of parsed plot records. Nothing was audited.",
    );
  }
  if (input.plots.length === 0) {
    throw new CanopyProofInputError(
      "cp-plots-empty",
      "plots",
      "`plots` is empty: there is no supplier set to audit. Nothing was audited.",
    );
  }
  if (!Number.isInteger(input.rowCount) || input.rowCount < input.plots.length) {
    throw new CanopyProofInputError(
      "cp-row-count",
      "rowCount",
      `\`rowCount\` must be an integer at least as large as the ${input.plots.length} parsed row(s); received ${String(input.rowCount)}. Nothing was audited.`,
    );
  }

  const areaTolerancePct = input.areaTolerancePct ?? DEFAULT_AREA_TOLERANCE_PCT;
  if (!Number.isFinite(areaTolerancePct) || areaTolerancePct < 0) {
    throw new CanopyProofInputError(
      "cp-area-tolerance",
      "areaTolerancePct",
      `\`areaTolerancePct\` must be a non-negative number; received ${String(input.areaTolerancePct)}. Nothing was audited.`,
    );
  }
  const overlapToleranceHa = input.overlapToleranceHa ?? DEFAULT_OVERLAP_TOLERANCE_HA;
  if (!Number.isFinite(overlapToleranceHa) || overlapToleranceHa < 0) {
    throw new CanopyProofInputError(
      "cp-overlap-tolerance",
      "overlapToleranceHa",
      `\`overlapToleranceHa\` must be a non-negative number; received ${String(input.overlapToleranceHa)}. Nothing was audited.`,
    );
  }

  const ctx = {
    operatorSize: input.operator.size,
    asOf: input.asOf,
    areaTolerancePct,
    yieldByCommodity: input.operator.yieldByCommodity,
  };

  // The rings the pairwise pass needs are kept beside the audit records, not inside them: the
  // report shape carries the assessment, not the raw vertices a second time.
  const rings = new Map<string, Coordinate[]>();
  const audits: PlotAudit[] = input.plots.map((plot) => {
    const audit = auditPlot(plot, ctx);
    const coordinates = plot.coordinates.value;
    if (plot.geometryKind.value === "polygon" && coordinates !== null && coordinates.length >= 3) {
      rings.set(audit.key, stripClosing(coordinates));
    }
    return audit;
  });

  const portfolioPass = pairwiseIntegrity(audits, rings, overlapToleranceHa);
  const completeness = completenessReport(input);

  const plotFindings = audits.flatMap((plot) => plot.findings);
  const portfolioFindings = [...portfolioPass.findings, ...completeness.findings];
  const findings = [...plotFindings, ...portfolioFindings];

  const fixRequests = buildFixRequests(audits, portfolioPass.overlaps, portfolioPass.duplicates);

  const computedAreaHa = audits.reduce((sum, plot) => sum + (plot.computedAreaHa ?? 0), 0);
  const totalOverlapAreaHa =
    portfolioPass.overlaps.reduce((sum, finding) => sum + finding.overlapAreaHa, 0) +
    portfolioPass.duplicates.reduce((sum, finding) => sum + finding.overlapAreaHa, 0);
  // Only tonnes: a row declared in pounds is not added to a tonne total (the unit finding names it).
  const declaredQuantityT = audits.reduce(
    (sum, plot) =>
      isTonnes(plot.quantityUnit) ? sum + (plot.yieldCheck.declaredQuantityT ?? 0) : sum,
    0,
  );

  const portfolio: PortfolioReport = {
    completeness,
    overlaps: portfolioPass.overlaps,
    duplicates: portfolioPass.duplicates,
    computedAreaHa,
    // Pairwise overlaps can sum past the total when three or more plots stack; the covered area is
    // floored at zero rather than reported as a negative acreage.
    netAreaHa: Math.max(0, computedAreaHa - totalOverlapAreaHa),
    totalOverlapAreaHa,
    declaredQuantityT,
  };

  const blockingCount = findings.filter((finding) => finding.severity === "blocking").length;
  const findingCount = findings.length - blockingCount;
  const verdict = blockingCount > 0 ? "blocked" : findingCount > 0 ? "findings" : "pass";

  const publicPlots: PlotAudit[] = audits;

  return {
    engine: { id: "canopyproof_eudr_geolocation_audit", name: "CanopyProof", version: "1.0.0" },
    label: input.label ?? null,
    asOf: input.asOf,
    operator: { id: input.operator.id ?? null, size: input.operator.size },
    verdict,
    blockingCount,
    findingCount,
    plots: publicPlots,
    suppliers: supplierReports(publicPlots, fixRequests),
    portfolio,
    findings,
    fixRequests,
    cnTable: {
      version: CN_TABLE_VERSION,
      source: CN_TABLE_SOURCE,
      entryCount: CN_TABLE.length,
    },
    provenance: { computedBy: "deterministic-engine", inputSource: "declared-fields" },
  };
}

/** The commodities the report groups by, re-exported for the UI's filter row. */
export const AUDITED_COMMODITIES: readonly Commodity[] = [
  "wood",
  "cocoa",
  "coffee",
  "palm_oil",
  "soy",
  "rubber",
  "cattle",
];
