/**
 * CanopyProof — the pre-flight audit of a supplier geolocation set before the EUDR due-diligence
 * statement is filed (PRD §2). Engine entry points:
 *
 * - `readBatchInput(value)` — validates untrusted batch JSON (a parsed supplier pack, or an agent
 *   call) and throws a `CanopyProofInputError` naming the rule and the field. Bad input never
 *   half-runs; nothing is coerced into a usable-looking value.
 * - `auditBatch(input)` — the deliverable: per-plot geometry validity, the four-hectare rule,
 *   declared-vs-computed area, the commodity-scope screen, the operator's own yield check, pairwise
 *   overlap and duplicates across the whole set, the completeness invariant, and the per-supplier
 *   fix pack.
 * - `screenCommodity(code, operatorSize, commodity, asOf)` — one product line against the vendored,
 *   version-stamped Annex I subset.
 *
 * No I/O, no network, no LLM and no clock: `asOf` and the operator's yield figure are inputs, the
 * CN table is vendored, and the suite runs on fixtures. A field that was not extracted is reported
 * `unreadable`/`unstated` and BLOCKS the verdict — it is never defaulted (AGENTS.md rules 1 and 5).
 */
import type {
  AuditBatchInput,
  Commodity,
  Coordinate,
  Field,
  FieldState,
  GeometryKind,
  OperatorSize,
  PlotInput,
  UnparsedRow,
  YieldFigure,
} from "./types";
import { COMMODITIES } from "./types";
import { CanopyProofInputError } from "./errors";
import { auditBatch } from "./audit";
import { assertIsoDate, screenCommodity } from "./scope";

export const ENGINE_METADATA = {
  id: "canopyproof_eudr_geolocation_audit",
  name: "CanopyProof — pre-flight audit of a supplier geolocation set",
  version: "1.0.0",
  description:
    "Deterministic audit of an EUDR supplier geolocation pack before the due-diligence statement is filed: geometry validity, the four-hectare point/polygon rule, declared-vs-computed area, cross-supplier polygon overlap and duplicates, yield plausibility against the operator's own figure, the Annex I CN-code screen, a completeness invariant, and a per-supplier fix-request pack.",
} as const;

// --- untrusted input -------------------------------------------------------

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CanopyProofInputError(
      "cp-batch-shape",
      field,
      `\`${field}\` must be an object; received ${Array.isArray(value) ? "an array" : typeof value}. Nothing was audited.`,
    );
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CanopyProofInputError(
      "cp-field-missing",
      field,
      `\`${field}\` is required and must be a non-empty string. Nothing was audited.`,
    );
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function asFiniteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CanopyProofInputError(
      "cp-number-invalid",
      field,
      `\`${field}\` must be a finite number; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return value;
}

function asInteger(value: unknown, field: string): number {
  const parsed = asFiniteNumber(value, field);
  if (!Number.isInteger(parsed)) {
    throw new CanopyProofInputError(
      "cp-integer-invalid",
      field,
      `\`${field}\` must be an integer; received ${parsed}. Nothing was audited.`,
    );
  }
  return parsed;
}

const FIELD_STATES: readonly FieldState[] = ["extracted", "unreadable", "unstated"];

/**
 * A declared field. `extracted` is the only state the engine may compute on; a field that claims
 * `extracted` but carries no usable value is downgraded to `unstated` rather than trusted.
 */
function readField<T>(
  raw: unknown,
  field: string,
  parse: (value: unknown, field: string) => T,
): Field<T> {
  const record = asRecord(raw, field);
  const state = record.state;
  if (typeof state !== "string" || !FIELD_STATES.includes(state as FieldState)) {
    throw new CanopyProofInputError(
      "cp-field-state",
      `${field}.state`,
      `\`${field}.state\` must be one of ${FIELD_STATES.join(", ")}; received ${JSON.stringify(state)}. Nothing was audited.`,
    );
  }
  if (state !== "extracted") {
    return { value: null, state: state as FieldState };
  }
  try {
    return { value: parse(record.value, `${field}.value`), state: "extracted" };
  } catch (error) {
    if (error instanceof CanopyProofInputError && error.ruleId === "cp-field-value-empty") {
      return { value: null, state: "unstated" };
    }
    throw error;
  }
}

function parseText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new CanopyProofInputError(
      "cp-field-value-empty",
      field,
      `\`${field}\` is marked extracted but carries no text.`,
    );
  }
  return value.trim();
}

function parseArea(value: unknown, field: string): number {
  if (value === null || value === undefined) {
    throw new CanopyProofInputError(
      "cp-field-value-empty",
      field,
      `\`${field}\` is marked extracted but carries no value.`,
    );
  }
  const parsed = asFiniteNumber(value, field);
  if (parsed < 0) {
    throw new CanopyProofInputError(
      "cp-area-negative",
      field,
      `\`${field}\` must be zero or greater; received ${parsed}. Nothing was audited.`,
    );
  }
  return parsed;
}

function parseGeometryKind(value: unknown, field: string): GeometryKind {
  if (value !== "point" && value !== "polygon") {
    throw new CanopyProofInputError(
      "cp-geometry-kind",
      field,
      `\`${field}\` must be 'point' or 'polygon'; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return value;
}

function decimalPlaces(literal: string): number {
  const match = /\.(\d+)$/.exec(literal.trim());
  return match ? match[1]!.length : 0;
}

/**
 * One position. Latitude and longitude must be LABELLED (`{lat, lon}`) or given as two numeric
 * strings in that order: a bare `[a, b]` pair is refused, because GeoJSON's order is lon-first and
 * most supplier spreadsheets are lat-first — guessing is exactly the defect this product exists to
 * catch.
 */
function parseCoordinate(value: unknown, field: string): Coordinate {
  if (Array.isArray(value)) {
    throw new CanopyProofInputError(
      "cp-coordinate-order-ambiguous",
      field,
      `\`${field}\` is a bare array; its order is ambiguous (GeoJSON writes [lon, lat], supplier sheets write [lat, lon]). Send \`{ "lat": …, "lon": … }\` instead. Nothing was audited.`,
    );
  }
  const record = asRecord(value, field);
  const readAxis = (axis: string): { number: number; decimals: number | null } => {
    const raw = record[axis];
    if (typeof raw === "number") {
      if (!Number.isFinite(raw)) {
        throw new CanopyProofInputError(
          "cp-coordinate-value",
          `${field}.${axis}`,
          `\`${field}.${axis}\` must be a finite number; received ${JSON.stringify(raw)}. Nothing was audited.`,
        );
      }
      return { number: raw, decimals: null };
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
        throw new CanopyProofInputError(
          "cp-coordinate-value",
          `${field}.${axis}`,
          `\`${field}.${axis}\` is not a decimal degree value: ${JSON.stringify(raw)}. Nothing was audited.`,
        );
      }
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        throw new CanopyProofInputError(
          "cp-coordinate-value",
          `${field}.${axis}`,
          `\`${field}.${axis}\` is not a finite value: ${JSON.stringify(raw)}. Nothing was audited.`,
        );
      }
      return { number: parsed, decimals: decimalPlaces(trimmed) };
    }
    throw new CanopyProofInputError(
      "cp-coordinate-value",
      `${field}.${axis}`,
      `\`${field}.${axis}\` must be a number or a numeric string; received ${JSON.stringify(raw)}. Nothing was audited.`,
    );
  };
  const lat = readAxis("lat");
  const lon = readAxis("lon");
  // Precision is only knowable when the pack carried the literal; a JSON number has already lost it.
  const decimals =
    lat.decimals !== null && lon.decimals !== null ? Math.min(lat.decimals, lon.decimals) : undefined;
  return { lat: lat.number, lon: lon.number, ...(decimals === undefined ? {} : { decimals }) };
}

function parseCoordinates(value: unknown, field: string): Coordinate[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CanopyProofInputError(
      "cp-coordinates-shape",
      field,
      `\`${field}\` must be a non-empty array of positions. Nothing was audited.`,
    );
  }
  return value.map((position, index) => parseCoordinate(position, `${field}[${index}]`));
}

function readCommodity(value: unknown, field: string): Commodity {
  if (typeof value !== "string" || !COMMODITIES.includes(value as Commodity)) {
    throw new CanopyProofInputError(
      "cp-commodity-unknown",
      field,
      `\`${field}\` must be one of ${COMMODITIES.join(", ")}; received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  return value as Commodity;
}

function readPlot(value: unknown, index: number): PlotInput {
  const record = asRecord(value, `plots[${index}]`);
  const base = `plots[${index}]`;
  const ddsReference = optionalString(record.ddsReference);
  return {
    rowIndex: asInteger(record.rowIndex, `${base}.rowIndex`),
    supplierId: asString(record.supplierId, `${base}.supplierId`),
    plotId: asString(record.plotId, `${base}.plotId`),
    commodity: readCommodity(record.commodity, `${base}.commodity`),
    cnCode: readField(record.cnCode, `${base}.cnCode`, parseText),
    countryOfProduction: readField(
      record.countryOfProduction,
      `${base}.countryOfProduction`,
      parseText,
    ),
    declaredAreaHa: readField(record.declaredAreaHa, `${base}.declaredAreaHa`, parseArea),
    geometryKind: readField(record.geometryKind, `${base}.geometryKind`, parseGeometryKind),
    coordinates: readField(record.coordinates, `${base}.coordinates`, parseCoordinates),
    crs: readField(record.crs, `${base}.crs`, parseText),
    productionPeriod: readField(record.productionPeriod, `${base}.productionPeriod`, parseText),
    legalityEvidenceRef: readField(
      record.legalityEvidenceRef,
      `${base}.legalityEvidenceRef`,
      parseText,
    ),
    quantity: readField(record.quantity, `${base}.quantity`, parseArea),
    unit: readField(record.unit, `${base}.unit`, parseText),
    ...(ddsReference === undefined ? {} : { ddsReference }),
  };
}

const OPERATOR_SIZES: readonly OperatorSize[] = ["large", "medium", "small", "micro"];

function readYieldFigures(value: unknown): Partial<Record<Commodity, YieldFigure>> | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "operator.yieldByCommodity");
  const figures: Partial<Record<Commodity, YieldFigure>> = {};
  for (const [key, raw] of Object.entries(record)) {
    const field = `operator.yieldByCommodity.${key}`;
    const commodity = readCommodity(key, field);
    const figure = asRecord(raw, field);
    const unit = figure.unit;
    if (unit !== "t") {
      throw new CanopyProofInputError(
        "cp-yield-unit",
        `${field}.unit`,
        `\`${field}.unit\` must be 't' (tonnes per hectare); received ${JSON.stringify(unit)}. Nothing was audited.`,
      );
    }
    const perHectare = asFiniteNumber(figure.tonnesPerHectare, `${field}.tonnesPerHectare`);
    if (perHectare <= 0) {
      throw new CanopyProofInputError(
        "cp-yield-value",
        `${field}.tonnesPerHectare`,
        `\`${field}.tonnesPerHectare\` must be greater than zero; received ${perHectare}. Nothing was audited.`,
      );
    }
    figures[commodity] = { tonnesPerHectare: perHectare, unit: "t" };
  }
  return Object.keys(figures).length === 0 ? undefined : figures;
}

function readUnparsedRows(value: unknown): UnparsedRow[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new CanopyProofInputError(
      "cp-unparsed-shape",
      "unparsedRows",
      "`unparsedRows` must be an array of `{ rowIndex, supplierId, reason }`. Nothing was audited.",
    );
  }
  return value.map((raw, index) => {
    const field = `unparsedRows[${index}]`;
    const record = asRecord(raw, field);
    return {
      rowIndex: asInteger(record.rowIndex, `${field}.rowIndex`),
      supplierId: optionalString(record.supplierId) ?? null,
      reason: asString(record.reason, `${field}.reason`),
    };
  });
}

/** Validates a batch from an untrusted source. Throws with a rule id + field path, never half-runs. */
export function readBatchInput(value: unknown): AuditBatchInput {
  const record = asRecord(value, "batch");
  const operatorRecord = asRecord(record.operator, "operator");
  const size = operatorRecord.size;
  if (typeof size !== "string" || !OPERATOR_SIZES.includes(size as OperatorSize)) {
    throw new CanopyProofInputError(
      "cp-operator-size",
      "operator.size",
      `\`operator.size\` must be one of ${OPERATOR_SIZES.join(", ")}; received ${JSON.stringify(size)}. Nothing was audited.`,
    );
  }

  const asOf = assertIsoDate(record.asOf, "asOf");

  const rawPlots = record.plots;
  if (!Array.isArray(rawPlots) || rawPlots.length === 0) {
    throw new CanopyProofInputError(
      "cp-plots-empty",
      "plots",
      "`plots` must hold at least one parsed plot record — an empty batch is not a clean batch. Nothing was audited.",
    );
  }
  const plots = rawPlots.map((plot, index) => readPlot(plot, index));

  const seenRows = new Set<number>();
  for (const plot of plots) {
    if (seenRows.has(plot.rowIndex)) {
      throw new CanopyProofInputError(
        "cp-row-index-duplicate",
        "plots",
        `Two plot records claim rowIndex ${plot.rowIndex}; the completeness invariant cannot be checked. Nothing was audited.`,
      );
    }
    seenRows.add(plot.rowIndex);
  }

  const unparsedRows = readUnparsedRows(record.unparsedRows);
  const rowCount = asInteger(record.rowCount, "rowCount");
  if (rowCount < plots.length + (unparsedRows?.length ?? 0)) {
    throw new CanopyProofInputError(
      "cp-row-count",
      "rowCount",
      `\`rowCount\` is ${rowCount} but ${plots.length} row(s) parsed and ${unparsedRows?.length ?? 0} are recorded as unparsed. Nothing was audited.`,
    );
  }

  const operatorId = optionalString(operatorRecord.id);
  const yieldFigures = readYieldFigures(operatorRecord.yieldByCommodity);
  const label = optionalString(record.label);

  const areaTolerancePct =
    record.areaTolerancePct === undefined
      ? undefined
      : asFiniteNumber(record.areaTolerancePct, "areaTolerancePct");
  const overlapToleranceHa =
    record.overlapToleranceHa === undefined
      ? undefined
      : asFiniteNumber(record.overlapToleranceHa, "overlapToleranceHa");

  return {
    operator: {
      ...(operatorId === undefined ? {} : { id: operatorId }),
      size: size as OperatorSize,
      ...(yieldFigures === undefined ? {} : { yieldByCommodity: yieldFigures }),
    },
    asOf,
    ...(areaTolerancePct === undefined ? {} : { areaTolerancePct }),
    ...(overlapToleranceHa === undefined ? {} : { overlapToleranceHa }),
    rowCount,
    plots,
    ...(unparsedRows === undefined ? {} : { unparsedRows }),
    ...(label === undefined ? {} : { label }),
  };
}

// --- public surface --------------------------------------------------------

export { auditBatch, screenCommodity, assertIsoDate };
export { CanopyProofInputError } from "./errors";
export {
  APPLICABILITY_DATES,
  CN_TABLE,
  CN_TABLE_SOURCE,
  CN_TABLE_VERSION,
  applicabilityDateFor,
  matchCnCode,
  normalizeCnCode,
} from "./scope";
export {
  COORDINATE_MIN_DECIMALS,
  DEFAULT_OVERLAP_TOLERANCE_HA,
  EARTH_RADIUS_M,
  EUDR_FORMAT_DECIMALS,
  RING_CLOSE_TOLERANCE_M,
  assessGeometry,
  checkCoordinates,
  classifyCrs,
  geodesicAreaHa,
  haversineM,
  isRingClosed,
  isSimpleRing,
  pointInPolygon,
  polygonIntersectionAreaHa,
  ringSignature,
  stripClosing,
} from "./geometry";
export { AUDITED_COMMODITIES, DEFAULT_AREA_TOLERANCE_PCT, FOUR_HECTARES } from "./audit";
export * from "./types";
