/**
 * CanopyProof — fixture supplier packs. Raw, untrusted JSON exactly as a parsed CSV/XLSX/PDF would
 * hand it to `readBatchInput`: every leaf field is `{ value, state }`, the CN code is a string, and
 * coordinates are six-decimal text literals (so the precision check has a literal to read).
 *
 * The packs are small and deliberately boring: two suppliers, cocoa in Côte d'Ivoire, a rectangle
 * whose area the tests can compute independently from R²·Δλ·(sin φ₂ − sin φ₁). No clock, no
 * network, no randomness — the same bytes every run.
 *
 * Each builder returns a fresh object, so a test that mutates one cannot leak into the next.
 */

export type RawBatch = Record<string, unknown>;

export interface RawCoordinate {
  lat: string | number;
  lon: string | number;
}

export function extracted<T>(value: T): { value: T; state: "extracted" } {
  return { value, state: "extracted" };
}

export function unreadable(): { value: null; state: "unreadable" } {
  return { value: null, state: "unreadable" };
}

export function unstated(): { value: null; state: "unstated" } {
  return { value: null, state: "unstated" };
}

/** A closed ring from four corners, in walking order, six decimals. */
export function rectangle(
  latSouth: string,
  latNorth: string,
  lonWest: string,
  lonEast: string,
): RawCoordinate[] {
  return [
    { lat: latSouth, lon: lonWest },
    { lat: latSouth, lon: lonEast },
    { lat: latNorth, lon: lonEast },
    { lat: latNorth, lon: lonWest },
    { lat: latSouth, lon: lonWest },
  ];
}

/** Plot A: 0.002° × 0.002° at 6° N ≈ 4.9186 ha — just above the four-hectare line, so a polygon. */
export const PLOT_A_RING = rectangle("6.000000", "6.002000", "-3.010000", "-3.008000");

/** Plot B: the same latitude band (so the same exact area), 0.04° west — no overlap with A. */
export const PLOT_B_RING = rectangle("6.000000", "6.002000", "-3.050000", "-3.048000");

/** Plot C: a 0.01° square (~123 ha) used to build a measured 30.74 ha overlap with plot D. */
export const PLOT_C_RING = rectangle("6.000000", "6.010000", "-3.010000", "-3.000000");

/** Plot D: shifted half a side north-east of C, so the overlap is a 0.005° square. */
export const PLOT_D_RING = rectangle("6.005000", "6.015000", "-3.005000", "-2.995000");

/** A bow-tie: edge 0→1 and edge 2→3 cross at the centre of the square. */
export const BOWTIE_RING: RawCoordinate[] = [
  { lat: "6.000000", lon: "-3.010000" },
  { lat: "6.002000", lon: "-3.008000" },
  { lat: "6.002000", lon: "-3.010000" },
  { lat: "6.000000", lon: "-3.008000" },
  { lat: "6.000000", lon: "-3.010000" },
];

/** The same square as plot A, but the closing position is missing (A4 is not A1). */
export const UNCLOSED_RING: RawCoordinate[] = [
  { lat: "6.000000", lon: "-3.010000" },
  { lat: "6.000000", lon: "-3.008000" },
  { lat: "6.002000", lon: "-3.008000" },
  { lat: "6.002000", lon: "-3.010000" },
];

export interface PlotOptions {
  rowIndex?: number;
  supplierId?: string;
  plotId?: string;
  commodity?: string;
  cnCode?: { value: unknown; state: string };
  countryOfProduction?: { value: unknown; state: string };
  declaredAreaHa?: { value: unknown; state: string };
  geometryKind?: { value: unknown; state: string };
  coordinates?: { value: unknown; state: string };
  crs?: { value: unknown; state: string };
  productionPeriod?: { value: unknown; state: string };
  quantity?: { value: unknown; state: string };
  unit?: { value: unknown; state: string };
  legalityEvidenceRef?: { value: unknown; state: string };
}

/** One supplier row, every declared field present and labelled. */
export function plot(options: PlotOptions = {}): Record<string, unknown> {
  return {
    rowIndex: options.rowIndex ?? 0,
    supplierId: options.supplierId ?? "SUP-ALPHA",
    plotId: options.plotId ?? "A-1",
    commodity: options.commodity ?? "cocoa",
    cnCode: options.cnCode ?? extracted("1801"),
    countryOfProduction: options.countryOfProduction ?? extracted("Côte d'Ivoire"),
    declaredAreaHa: options.declaredAreaHa ?? extracted(4.92),
    geometryKind: options.geometryKind ?? extracted("polygon"),
    coordinates: options.coordinates ?? extracted(PLOT_A_RING),
    crs: options.crs ?? extracted("EPSG:4326"),
    productionPeriod: options.productionPeriod ?? extracted("2025-10-01/2026-09-30"),
    legalityEvidenceRef: options.legalityEvidenceRef ?? unstated(),
    quantity: options.quantity ?? unstated(),
    unit: options.unit ?? extracted("t"),
  };
}

const COCOA_YIELD = { cocoa: { tonnesPerHectare: 0.8, unit: "t" } };

function batch(overrides: Partial<Record<string, unknown>> & { plots: unknown[] }): RawBatch {
  return {
    label: "fixture",
    asOf: "2027-01-15",
    operator: { id: "OP-1", size: "large", yieldByCommodity: COCOA_YIELD },
    rowCount: overrides.plots.length,
    ...overrides,
  };
}

// --- 1. the clean set -------------------------------------------------------

export function cleanBatch(): RawBatch {
  return batch({
    label: "clean two-supplier cocoa set",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-1",
        declaredAreaHa: extracted(4.92),
        coordinates: extracted(PLOT_A_RING),
        quantity: extracted(3.5),
      }),
      plot({
        rowIndex: 1,
        supplierId: "SUP-BETA",
        plotId: "B-1",
        declaredAreaHa: extracted(4.92),
        coordinates: extracted(PLOT_B_RING),
        quantity: extracted(3.5),
      }),
    ],
  });
}

// --- 2. a >4 ha plot sent as a point ---------------------------------------

export function pointAboveFourHectaresBatch(): RawBatch {
  return batch({
    label: "point above four hectares",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-POINT",
        geometryKind: extracted("point"),
        coordinates: extracted([{ lat: "6.000000", lon: "-3.000000" }]),
        declaredAreaHa: extracted(12),
      }),
    ],
  });
}

// --- 3. two suppliers whose polygons overlap -------------------------------

export function overlapBatch(): RawBatch {
  return batch({
    label: "overlapping suppliers",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "C-1",
        declaredAreaHa: extracted(122.96),
        coordinates: extracted(PLOT_C_RING),
      }),
      plot({
        rowIndex: 1,
        supplierId: "SUP-BETA",
        plotId: "D-1",
        declaredAreaHa: extracted(122.96),
        coordinates: extracted(PLOT_D_RING),
      }),
    ],
  });
}

// --- 4. the same polygon twice --------------------------------------------

export function duplicateBatch(): RawBatch {
  return batch({
    label: "duplicate boundary across two suppliers",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-1",
        declaredAreaHa: extracted(4.92),
        coordinates: extracted(PLOT_A_RING),
      }),
      plot({
        rowIndex: 1,
        supplierId: "SUP-BETA",
        plotId: "A-1-COPY",
        declaredAreaHa: extracted(4.92),
        coordinates: extracted(
          // The same ring, rotated to start at the second corner: a different list, the same plot.
          [
            { lat: "6.000000", lon: "-3.008000" },
            { lat: "6.002000", lon: "-3.008000" },
            { lat: "6.002000", lon: "-3.010000" },
            { lat: "6.000000", lon: "-3.010000" },
            { lat: "6.000000", lon: "-3.008000" },
          ],
        ),
      }),
    ],
  });
}

// --- 5. declared tonnage above area × yield -------------------------------

export function yieldOverclaimBatch(): RawBatch {
  return batch({
    label: "tonnage above the operator's own yield",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-1",
        declaredAreaHa: extracted(4.92),
        coordinates: extracted(PLOT_A_RING),
        quantity: extracted(9),
        unit: extracted("t"),
      }),
    ],
  });
}

// --- 6. an unreadable / unstated required field ---------------------------

export function blockedFieldBatch(): RawBatch {
  return batch({
    label: "unreadable and unstated fields",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-1",
        declaredAreaHa: unreadable(),
      }),
      plot({
        rowIndex: 1,
        supplierId: "SUP-BETA",
        plotId: "B-1",
        countryOfProduction: unstated(),
        coordinates: extracted(PLOT_B_RING),
      }),
    ],
  });
}

// --- 7. a CN code absent from the vendored table --------------------------

export function unknownCodeBatch(): RawBatch {
  return batch({
    label: "code the table does not carry",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-1",
        cnCode: extracted("1202"),
        declaredAreaHa: extracted(4.92),
      }),
    ],
  });
}

// --- 8. a row present in the input but not parsed -------------------------

export function unparsedRowBatch(): RawBatch {
  return batch({
    label: "a row lost in parsing",
    rowCount: 3,
    plots: [
      plot({ rowIndex: 0, supplierId: "SUP-ALPHA", plotId: "A-1" }),
      plot({
        rowIndex: 1,
        supplierId: "SUP-BETA",
        plotId: "B-1",
        coordinates: extracted(PLOT_B_RING),
      }),
    ],
    unparsedRows: [
      {
        rowIndex: 2,
        supplierId: "SUP-GAMMA",
        reason: "page 4 of the PDF was a scan; the row's coordinates could not be read",
      },
    ],
  });
}

// --- 9. a self-intersecting ring and an unclosed ring ---------------------

export function brokenRingBatch(): RawBatch {
  return batch({
    label: "two broken rings",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "BOWTIE",
        coordinates: extracted(BOWTIE_RING),
      }),
      plot({
        rowIndex: 1,
        supplierId: "SUP-BETA",
        plotId: "OPEN",
        coordinates: extracted(UNCLOSED_RING),
      }),
    ],
  });
}

// --- 10. a non-WGS84 declaration -----------------------------------------

export function unsupportedCrsBatch(): RawBatch {
  return batch({
    label: "UTM in a WGS84 field",
    plots: [
      plot({
        rowIndex: 0,
        supplierId: "SUP-ALPHA",
        plotId: "A-UTM",
        crs: extracted("EPSG:32735"),
        declaredAreaHa: extracted(4.92),
      }),
    ],
  });
}

/** A set screened before the operator's application date, and one on/after it. */
export function beforeApplicationBatch(): RawBatch {
  return batch({
    label: "screened before 30 December 2026",
    asOf: "2026-10-18",
    operator: { id: "OP-1", size: "large", yieldByCommodity: COCOA_YIELD },
    plots: [plot({ rowIndex: 0, supplierId: "SUP-ALPHA", plotId: "A-1" })],
  });
}

export const SCENARIOS = {
  clean: cleanBatch,
  point_above_four_hectares: pointAboveFourHectaresBatch,
  overlap: overlapBatch,
  duplicate: duplicateBatch,
  yield_overclaim: yieldOverclaimBatch,
  blocked_field: blockedFieldBatch,
  unknown_code: unknownCodeBatch,
  unparsed_row: unparsedRowBatch,
  broken_ring: brokenRingBatch,
  unsupported_crs: unsupportedCrsBatch,
  before_application: beforeApplicationBatch,
} as const;
