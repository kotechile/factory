import { describe, expect, it } from "vitest";

import {
  CanopyProofInputError,
  CN_TABLE,
  CN_TABLE_VERSION,
  FOUR_HECTARES,
  applicabilityDateFor,
  auditBatch,
  classifyCrs,
  geodesicAreaHa,
  isRingClosed,
  isSimpleRing,
  pointInPolygon,
  polygonIntersectionAreaHa,
  readBatchInput,
  screenCommodity,
} from "./index";
import {
  BOWTIE_RING,
  PLOT_A_RING,
  PLOT_B_RING,
  PLOT_C_RING,
  PLOT_D_RING,
  SCENARIOS,
  UNCLOSED_RING,
  cleanBatch,
  plot,
} from "./fixtures";
import type { Coordinate, PlotAudit } from "./types";

const R = 6371008.8;
const DEG = Math.PI / 180;

/** The independent known answer for a lat/lon rectangle on a sphere: R²·Δλ·(sin φ₂ − sin φ₁). */
function sphereRectangleHa(lat1: number, lat2: number, lon1: number, lon2: number): number {
  return (R * R * Math.abs(lon2 - lon1) * DEG * Math.abs(Math.sin(lat2 * DEG) - Math.sin(lat1 * DEG))) / 10_000;
}

function audit(scenario: keyof typeof SCENARIOS) {
  return auditBatch(readBatchInput(SCENARIOS[scenario]()));
}

function codes(plotAudit: PlotAudit): string[] {
  return plotAudit.findings.map((finding) => finding.code);
}

function ringOf(raw: { lat: string | number; lon: string | number }[]): Coordinate[] {
  return raw.map((position) => ({ lat: Number(position.lat), lon: Number(position.lon) }));
}

// --- geometry primitives ---------------------------------------------------

describe("CanopyProof geometry primitives", () => {
  it("computes a spherical rectangle's area as R²·Δλ·(sin φ₂ − sin φ₁)", () => {
    const area = geodesicAreaHa(ringOf(PLOT_A_RING));
    // 0.002° × 0.002° at 6° N: 222.4 m × 221.2 m = 4.9186 ha.
    expect(area).toBeCloseTo(4.918636, 5);
    expect(area).toBeCloseTo(sphereRectangleHa(6.0, 6.002, -3.01, -3.008), 9);
  });

  it("closes only a ring that returns to its first position", () => {
    expect(isRingClosed(ringOf(PLOT_A_RING))).toBe(true);
    expect(isRingClosed(ringOf(UNCLOSED_RING))).toBe(false);
  });

  it("rejects a bow-tie and accepts a rectangle", () => {
    expect(isSimpleRing(ringOf(BOWTIE_RING)).simple).toBe(false);
    expect(isSimpleRing(ringOf(PLOT_A_RING)).simple).toBe(true);
  });

  it("puts a point inside its ring, and outside a neighbouring one", () => {
    const ring = ringOf(PLOT_A_RING);
    expect(pointInPolygon({ lat: 6.001, lon: -3.009 }, ring)).toBe(true);
    expect(pointInPolygon({ lat: 6.001, lon: -3.007 }, ring)).toBe(false);
    expect(pointInPolygon({ lat: 6.05, lon: -3.05 }, ring)).toBe(false);
  });

  it("intersects a polygon with itself to its own area, and disjoint polygons to zero", () => {
    const a = ringOf(PLOT_A_RING);
    expect(polygonIntersectionAreaHa(a, a)!).toBeCloseTo(4.918636, 4);
    expect(polygonIntersectionAreaHa(a, ringOf(PLOT_B_RING))!).toBeCloseTo(0, 9);
  });

  it("measures the overlap of two suppliers' boundaries (known answer)", () => {
    const overlap = polygonIntersectionAreaHa(ringOf(PLOT_C_RING), ringOf(PLOT_D_RING));
    // The 0.005° × 0.005° square shared by C and D at 6.005–6.010° N.
    expect(overlap).not.toBeNull();
    expect(overlap!).toBeCloseTo(sphereRectangleHa(6.005, 6.01, -3.005, -3.0), 4);
    expect(overlap!).toBeCloseTo(30.741108, 3);
  });

  it("classifies WGS84 spellings, and refuses every other CRS", () => {
    expect(classifyCrs("EPSG:4326").status).toBe("wgs84");
    expect(classifyCrs("WGS 84").status).toBe("wgs84");
    expect(classifyCrs("urn:ogc:def:crs:OGC:1.3:CRS84").status).toBe("wgs84");
    expect(classifyCrs("EPSG:32735").status).toBe("unsupported");
    expect(classifyCrs("EPSG:32630").status).toBe("unsupported");
    expect(classifyCrs(null).status).toBe("unstated");
  });
});

// --- scope -----------------------------------------------------------------

describe("CanopyProof CN-code screen", () => {
  it("stamps the vendored table and carries the seven commodities", () => {
    expect(CN_TABLE_VERSION).toBe("2026-09-18 consolidated, subset");
    const headings = CN_TABLE.filter((entry) => entry.inScope).map((entry) => entry.code);
    expect(headings).toEqual([
      "4401",
      "4403",
      "4407",
      "4410",
      "1801",
      "0901",
      "1511",
      "1201",
      "4001",
      "0102",
      "0102 21",
      "0102 29",
    ]);
  });

  it("matches an 8-digit subheading to its heading", () => {
    const result = screenCommodity("4407 11 90", "large", "wood", "2027-01-15");
    expect(result.status).toBe("in_scope");
    expect(result.matchedCode).toBe("4407");
    expect(result.tableCommodity).toBe("wood");
    expect(result.appliesFrom).toBe("2026-12-30");
  });

  it("returns unknown_code — and blocks — for a code the subset does not carry", () => {
    const result = screenCommodity("1202", "large", "soy", "2027-01-15");
    expect(result.status).toBe("unknown_code");
    expect(result.blocks).toBe(true);
    expect(result.matchedCode).toBeNull();
  });

  it("returns out_of_scope for a vendored control heading", () => {
    const result = screenCommodity("0902", "large", "coffee", "2027-01-15");
    expect(result.status).toBe("out_of_scope");
    expect(result.blocks).toBe(false);
    expect(result.appliesFrom).toBeNull();
  });

  it("applies the dated rule: large/medium 2026-12-30, micro/small non-timber 2027-06-30, timber SMEs 2026-12-30", () => {
    expect(screenCommodity("1801", "large", "cocoa", "2027-01-15").status).toBe("in_scope");
    expect(screenCommodity("1801", "large", "cocoa", "2026-12-29").status).toBe("not_yet_applicable");
    expect(screenCommodity("1801", "micro", "cocoa", "2027-06-29").status).toBe("not_yet_applicable");
    expect(screenCommodity("1801", "micro", "cocoa", "2027-06-30").status).toBe("in_scope");
    // A timber SME keeps the 2026 date: the deferral is for the non-timber commodities only.
    expect(screenCommodity("4407", "small", "wood", "2026-12-30").status).toBe("in_scope");
    expect(screenCommodity("4407", "small", "wood", "2026-12-29").status).toBe("not_yet_applicable");
  });

  it("dates a line added by the 2026 act at 30 December 2027", () => {
    const synthetic = {
      code: "9999",
      normalized: "9999",
      commodity: "cocoa" as const,
      description: "synthetic entry — the date rule only",
      inScope: true,
      addedBy2026Act: true,
    };
    expect(applicabilityDateFor(synthetic, "large")).toBe("2027-12-30");
    expect(applicabilityDateFor(synthetic, "micro")).toBe("2027-12-30");
    expect(applicabilityDateFor(CN_TABLE[0]!, "large")).toBe("2026-12-30");
  });
});

// --- vector 1 --------------------------------------------------------------

describe("vector 1 — a clean multi-supplier set", () => {
  const report = audit("clean");

  it("passes with zero findings and zero blockers", () => {
    expect(report.verdict).toBe("pass");
    expect(report.findings).toEqual([]);
    expect(report.blockingCount).toBe(0);
    expect(report.findingCount).toBe(0);
    expect(report.fixRequests).toEqual([]);
  });

  it("computes both plots' areas and checks them against the declared area", () => {
    expect(report.plots).toHaveLength(2);
    for (const plotAudit of report.plots) {
      expect(plotAudit.computedAreaHa!).toBeCloseTo(4.918636, 5);
      expect(plotAudit.declaredAreaHa).toBe(4.92);
      expect(Math.abs(plotAudit.areaDeltaPct!)).toBeLessThan(0.05);
      expect(plotAudit.withinAreaTolerance).toBe(true);
      expect(plotAudit.geometry.crsStatus).toBe("wgs84");
      expect(plotAudit.geometry.closed).toBe(true);
      expect(plotAudit.geometry.selfIntersecting).toBe(false);
      expect(plotAudit.geometry.minDecimals).toBe(6);
    }
  });

  it("groups per supplier and keeps the completeness invariant", () => {
    expect(report.suppliers.map((supplier) => supplier.supplierId)).toEqual(["SUP-ALPHA", "SUP-BETA"]);
    expect(report.suppliers.every((supplier) => supplier.plotCount === 1)).toBe(true);
    expect(report.portfolio.completeness).toMatchObject({
      rowsInInput: 2,
      rowsParsed: 2,
      rowsUnparsed: 0,
      accountedFor: true,
    });
    expect(report.portfolio.computedAreaHa).toBeCloseTo(2 * 4.918636, 4);
    expect(report.portfolio.netAreaHa).toBeCloseTo(2 * 4.918636, 4);
    expect(report.portfolio.overlaps).toEqual([]);
    expect(report.portfolio.duplicates).toEqual([]);
    expect(report.cnTable.version).toBe(CN_TABLE_VERSION);
  });

  it("screens every line in scope", () => {
    expect(report.plots.every((plotAudit) => plotAudit.scope?.status === "in_scope")).toBe(true);
    expect(report.plots.every((plotAudit) => plotAudit.scope?.matchedCode === "1801")).toBe(true);
  });

  it("checks the declared tonnage against area × the operator's own yield", () => {
    for (const plotAudit of report.plots) {
      expect(plotAudit.yieldCheck.status).toBe("within");
      expect(plotAudit.yieldCheck.operatorYieldTPerHa).toBe(0.8);
      expect(plotAudit.yieldCheck.ceilingT!).toBeCloseTo(3.934909, 5);
      expect(plotAudit.yieldCheck.declaredQuantityT).toBe(3.5);
    }
  });
});

// --- vector 2 --------------------------------------------------------------

describe("vector 2 — a >4 ha plot submitted as a point", () => {
  const report = audit("point_above_four_hectares");

  it("is a hard, blocking finding with the measured area", () => {
    expect(report.verdict).toBe("blocked");
    const finding = report.plots[0]!.findings.find((entry) => entry.code === "point_above_four_hectares");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("blocking");
    expect(finding!.measured).toBe(12);
    expect(finding!.limit).toBe(FOUR_HECTARES);
    expect(finding!.element).toBe("geometry_kind");
    expect(report.plots[0]!.fourHectare.compliant).toBe(false);
    expect(report.plots[0]!.computedAreaHa).toBeNull();
  });

  it("names the polygon boundary as the thing to resend", () => {
    const request = report.fixRequests.find((entry) => entry.element === "geometry_kind");
    expect(request).toBeDefined();
    expect(request!.blocking).toBe(true);
    expect(request!.action).toContain("polygon");
  });
});

// --- vector 3 --------------------------------------------------------------

describe("vector 3 — two suppliers whose polygons overlap", () => {
  const report = audit("overlap");

  it("reports the measured overlap in hectares, not just 'a finding'", () => {
    expect(report.verdict).toBe("findings");
    expect(report.portfolio.overlaps).toHaveLength(1);
    const overlap = report.portfolio.overlaps[0]!;
    expect(overlap.code).toBe("polygon_overlap");
    expect(overlap.plotA).toBe("SUP-ALPHA/C-1");
    expect(overlap.plotB).toBe("SUP-BETA/D-1");
    expect(overlap.overlapAreaHa).toBeCloseTo(30.741108, 2);
    expect(overlap.shareOfSmallerPct).toBeCloseTo(25, 1);
    expect(overlap.blocking).toBe(false);
  });

  it("subtracts the double-counted land from the net covered area", () => {
    expect(report.portfolio.computedAreaHa).toBeCloseTo(2 * 122.965, 2);
    expect(report.portfolio.totalOverlapAreaHa).toBeCloseTo(30.741108, 2);
    expect(report.portfolio.netAreaHa).toBeCloseTo(2 * 122.965 - 30.741108, 2);
  });

  it("puts the overlap in both suppliers' fix packs — each side has to resend a boundary", () => {
    const requests = report.fixRequests.filter((request) => request.codes.includes("polygon_overlap"));
    expect(requests.map((request) => request.supplierId).sort()).toEqual(["SUP-ALPHA", "SUP-BETA"]);
    expect(requests.every((request) => request.element === "coordinates")).toBe(true);
  });

  it("keeps both plots geometrically valid — the overlap is a set-level finding", () => {
    expect(report.plots.every((plotAudit) => plotAudit.blocking)).toBe(false);
    expect(report.blockingCount).toBe(0);
    expect(report.plots.every((plotAudit) => plotAudit.computedAreaHa! > 122)).toBe(true);
  });
});

// --- vector 4 --------------------------------------------------------------

describe("vector 4 — the same polygon twice", () => {
  const report = audit("duplicate");

  it("detects the identical vertex set across suppliers and blocks", () => {
    expect(report.verdict).toBe("blocked");
    expect(report.portfolio.duplicates).toHaveLength(1);
    const duplicate = report.portfolio.duplicates[0]!;
    expect(duplicate.code).toBe("duplicate_polygon");
    expect(duplicate.supplierA).toBe("SUP-ALPHA");
    expect(duplicate.supplierB).toBe("SUP-BETA");
    expect(duplicate.overlapAreaHa).toBeCloseTo(4.918636, 4);
    expect(duplicate.shareOfSmallerPct).toBe(100);
    expect(duplicate.blocking).toBe(true);
    expect(report.portfolio.overlaps).toEqual([]);
  });

  it("counts the duplicated land once in the net area", () => {
    expect(report.portfolio.computedAreaHa).toBeCloseTo(2 * 4.918636, 4);
    expect(report.portfolio.netAreaHa).toBeCloseTo(4.918636, 4);
  });
});

// --- vector 5 --------------------------------------------------------------

describe("vector 5 — declared tonnage above area × yield", () => {
  const report = audit("yield_overclaim");

  it("is a finding carrying the computed ceiling", () => {
    expect(report.verdict).toBe("findings");
    const check = report.plots[0]!.yieldCheck;
    expect(check.status).toBe("overclaim");
    expect(check.computedAreaHa!).toBeCloseTo(4.918636, 4);
    expect(check.ceilingT!).toBeCloseTo(3.934909, 4);
    expect(check.declaredQuantityT).toBe(9);
    expect(check.overclaimT!).toBeCloseTo(9 - 3.934909, 4);

    const finding = report.plots[0]!.findings.find((entry) => entry.code === "yield_overclaim");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("finding");
    expect(finding!.measured).toBe(9);
    expect(finding!.limit!).toBeCloseTo(3.934909, 4);
  });
});

// --- vector 6 --------------------------------------------------------------

describe("vector 6 — an unreadable / unstated required field", () => {
  const report = audit("blocked_field");

  it("blocks on both states, naming the element", () => {
    expect(report.verdict).toBe("blocked");
    const a = report.plots[0]!;
    expect(codes(a)).toContain("field_unreadable");
    const unreadableFinding = a.findings.find((entry) => entry.code === "field_unreadable");
    expect(unreadableFinding!.element).toBe("declared_area_ha");
    expect(a.declaredAreaHa).toBeNull();

    const b = report.plots[1]!;
    expect(codes(b)).toContain("field_unstated");
    const unstatedFinding = b.findings.find((entry) => entry.code === "field_unstated");
    expect(unstatedFinding!.element).toBe("country_of_production");
  });

  it("does not invent the missing values", () => {
    const request = report.fixRequests.find((entry) => entry.element === "declared_area_ha");
    expect(request).toBeDefined();
    expect(request!.blocking).toBe(true);
    expect(request!.action).toContain("legible");
    // The plot's geometry is still audited; only the missing field withheld the verdict.
    expect(report.plots[0]!.computedAreaHa!).toBeCloseTo(4.918636, 4);
  });
});

// --- vector 7 --------------------------------------------------------------

describe("vector 7 — a CN code absent from the vendored table", () => {
  const report = audit("unknown_code");

  it("comes back unknown_code and blocks the verdict", () => {
    expect(report.verdict).toBe("blocked");
    const scope = report.plots[0]!.scope!;
    expect(scope.status).toBe("unknown_code");
    expect(scope.blocks).toBe(true);
    expect(scope.matchedCode).toBeNull();
    expect(codes(report.plots[0]!)).toContain("scope_unknown_code");
    const finding = report.plots[0]!.findings.find((entry) => entry.code === "scope_unknown_code");
    expect(finding!.severity).toBe("blocking");
    expect(finding!.element).toBe("cn_code");
  });
});

// --- vector 8 --------------------------------------------------------------

describe("vector 8 — a row present in the input but not parsed", () => {
  const report = audit("unparsed_row");

  it("reports the lost row and blocks", () => {
    expect(report.verdict).toBe("blocked");
    expect(report.portfolio.completeness).toMatchObject({
      rowsInInput: 3,
      rowsParsed: 2,
      rowsUnparsed: 1,
      accountedFor: true,
    });
    const finding = report.findings.find((entry) => entry.code === "row_not_parsed");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("blocking");
    expect(finding!.subject).toBe("row:2");
    expect(finding!.supplierId).toBe("SUP-GAMMA");
    expect(finding!.message).toContain("scan");
  });

  it("catches a row that vanished with no record at all", () => {
    const silent = cleanBatch();
    silent.rowCount = 3;
    const silentReport = auditBatch(readBatchInput(silent));
    expect(silentReport.verdict).toBe("blocked");
    expect(silentReport.portfolio.completeness.accountedFor).toBe(false);
    const finding = silentReport.findings.find((entry) => entry.code === "row_unaccounted");
    expect(finding).toBeDefined();
    expect(finding!.measured).toBe(2);
    expect(finding!.limit).toBe(3);
  });
});

// --- vector 9 --------------------------------------------------------------

describe("vector 9 — a self-intersecting ring and an unclosed ring", () => {
  const report = audit("broken_ring");

  it("codes the bow-tie as self_intersection and withholds its area", () => {
    const bowtie = report.plots[0]!;
    expect(codes(bowtie)).toContain("self_intersection");
    expect(bowtie.geometry.selfIntersecting).toBe(true);
    expect(bowtie.geometry.valid).toBe(false);
    expect(bowtie.computedAreaHa).toBeNull();
    expect(bowtie.findings.find((entry) => entry.code === "self_intersection")!.severity).toBe("blocking");
  });

  it("codes the open ring as ring_unclosed and withholds its area", () => {
    const open = report.plots[1]!;
    expect(codes(open)).toContain("ring_unclosed");
    expect(open.geometry.closed).toBe(false);
    expect(open.geometry.valid).toBe(false);
    expect(open.computedAreaHa).toBeNull();
    expect(open.findings.find((entry) => entry.code === "ring_unclosed")!.severity).toBe("blocking");
  });

  it("blocks the set and asks for the boundary back", () => {
    expect(report.verdict).toBe("blocked");
    expect(report.blockingCount).toBeGreaterThanOrEqual(2);
    expect(report.fixRequests.every((request) => request.element === "coordinates")).toBe(true);
  });
});

// --- vector 10 -------------------------------------------------------------

describe("vector 10 — a non-WGS84 declaration", () => {
  const report = audit("unsupported_crs");

  it("is unsupported, and no area is computed — never a silent reprojection", () => {
    expect(report.verdict).toBe("blocked");
    const plotAudit = report.plots[0]!;
    expect(plotAudit.geometry.crsStatus).toBe("unsupported");
    expect(plotAudit.geometry.crsDeclared).toBe("EPSG:32735");
    expect(plotAudit.geometry.areaHa).toBeNull();
    expect(plotAudit.computedAreaHa).toBeNull();
    const finding = plotAudit.findings.find((entry) => entry.code === "crs_unsupported");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("blocking");
    expect(finding!.message).toContain("does not reproject");
  });
});

// --- input validation ------------------------------------------------------

describe("CanopyProof input validation", () => {
  it("refuses a bare [lat, lon] pair rather than guessing its order", () => {
    const raw = cleanBatch();
    const plots = raw.plots as Record<string, unknown>[];
    (plots[0]!.coordinates as { value: unknown }).value = [
      [6, -3],
      [6, -2.999],
      [6.001, -2.999],
      [6, -3],
    ];
    try {
      readBatchInput(raw);
      throw new Error("expected a refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(CanopyProofInputError);
      expect((error as CanopyProofInputError).ruleId).toBe("cp-coordinate-order-ambiguous");
      expect((error as CanopyProofInputError).field).toBe("plots[0].coordinates.value[0]");
    }
  });

  it("refuses an unlabelled field state and a non-ISO asOf", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.crs = { value: "EPSG:4326", state: "guessed" };
    expect(() => readBatchInput(raw)).toThrow(CanopyProofInputError);

    const dated = cleanBatch();
    dated.asOf = "18/10/2026";
    expect(() => readBatchInput(dated)).toThrow(/cp-asof-format|ISO date/);
  });

  it("keeps an empty batch from passing as a clean one", () => {
    const raw = cleanBatch();
    raw.plots = [];
    raw.rowCount = 0;
    expect(() => readBatchInput(raw)).toThrow(CanopyProofInputError);
  });

  it("downgrades a field that claims extracted but carries nothing", () => {
    const raw = batchWithEmptyDeclaredArea();
    const parsed = readBatchInput(raw);
    expect(parsed.plots[0]!.declaredAreaHa.state).toBe("unstated");
    expect(parsed.plots[0]!.declaredAreaHa.value).toBeNull();
  });
});

function batchWithEmptyDeclaredArea() {
  const raw = cleanBatch();
  (raw.plots as Record<string, unknown>[])[0]!.declaredAreaHa = { value: null, state: "extracted" };
  return raw;
}

// --- before the application date ------------------------------------------

describe("CanopyProof — a set screened before the application date", () => {
  const report = audit("before_application");

  it("flags not_yet_applicable without blocking the arithmetic", () => {
    expect(report.plots[0]!.scope!.status).toBe("not_yet_applicable");
    expect(report.plots[0]!.scope!.appliesFrom).toBe("2026-12-30");
    expect(report.verdict).toBe("findings");
    expect(codes(report.plots[0]!)).toContain("scope_not_yet_applicable");
  });
});

// --- the four-hectare boundary --------------------------------------------

describe("CanopyProof — the four-hectare boundary", () => {
  it("accepts a point at exactly 4.0 ha and rejects 4.0001 ha", () => {
    const atLimit = auditAtPointArea(4);
    expect(atLimit.verdict).toBe("pass");
    expect(atLimit.plots[0]!.fourHectare.compliant).toBe(true);

    const above = auditAtPointArea(4.0001);
    expect(above.verdict).toBe("blocked");
    expect(codes(above.plots[0]!)).toContain("point_above_four_hectares");
  });

  it("requires cattle establishments to be points", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.commodity = "cattle";
    (raw.plots as Record<string, unknown>[])[0]!.cnCode = { value: "0102 29", state: "extracted" };
    const report = auditBatch(readBatchInput(raw));
    expect(codes(report.plots[0]!)).toContain("cattle_establishment_must_be_point");
    expect(report.verdict).toBe("blocked");
  });
});

function auditAtPointArea(area: number) {
  const raw = cleanBatch();
  const plots = raw.plots as Record<string, unknown>[];
  plots.length = 1;
  raw.rowCount = 1;
  plots[0]!.geometryKind = { value: "point", state: "extracted" };
  plots[0]!.coordinates = { value: [{ lat: "6.000000", lon: "-3.000000" }], state: "extracted" };
  plots[0]!.declaredAreaHa = { value: area, state: "extracted" };
  plots[0]!.quantity = { value: null, state: "unstated" };
  return auditBatch(readBatchInput(raw));
}

// --- declared area ---------------------------------------------------------

describe("CanopyProof — declared vs computed area", () => {
  it("reports the measured disagreement beyond the caller's tolerance", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.declaredAreaHa = { value: 8.5, state: "extracted" };
    const report = auditBatch(readBatchInput(raw));
    const plotAudit = report.plots[0]!;
    const finding = plotAudit.findings.find((entry) => entry.code === "declared_area_mismatch");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("finding");
    expect(plotAudit.areaDeltaHa!).toBeCloseTo(8.5 - 4.918636, 4);
    expect(plotAudit.areaDeltaPct!).toBeCloseTo(((8.5 - 4.918636) / 4.918636) * 100, 2);
    expect(plotAudit.withinAreaTolerance).toBe(false);
    expect(report.verdict).toBe("findings");
  });

  it("honours a wider caller tolerance", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.declaredAreaHa = { value: 5.1, state: "extracted" };
    raw.areaTolerancePct = 5;
    const report = auditBatch(readBatchInput(raw));
    expect(report.plots[0]!.withinAreaTolerance).toBe(true);
    expect(report.plots[0]!.findings.some((entry) => entry.code === "declared_area_mismatch")).toBe(false);
  });
});

// --- no silent fallbacks ---------------------------------------------------

describe("CanopyProof — no silent fallbacks", () => {
  it("does not assume WGS84 when the CRS is unstated", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.crs = { value: null, state: "unstated" };
    const report = auditBatch(readBatchInput(raw));
    expect(report.plots[0]!.geometry.crsStatus).toBe("unstated");
    expect(report.plots[0]!.computedAreaHa).toBeNull();
    expect(report.verdict).toBe("blocked");
  });

  it("does not run the yield check on a vendored assumption", () => {
    const raw = cleanBatch();
    raw.operator = { id: "OP-1", size: "large" };
    (raw.plots as Record<string, unknown>[])[0]!.quantity = { value: 50, state: "extracted" };
    const report = auditBatch(readBatchInput(raw));
    expect(report.plots[0]!.yieldCheck.status).toBe("unassessed");
    expect(report.plots[0]!.yieldCheck.ceilingT).toBeNull();
    expect(report.findings.some((entry) => entry.code === "yield_overclaim")).toBe(false);
    expect(report.verdict).toBe("pass");
  });

  it("blocks a quantity in a unit it cannot convert", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.quantity = { value: 50, state: "extracted" };
    (raw.plots as Record<string, unknown>[])[0]!.unit = { value: "lb", state: "extracted" };
    const report = auditBatch(readBatchInput(raw));
    expect(report.plots[0]!.yieldCheck.status).toBe("unverifiable");
    expect(codes(report.plots[0]!)).toContain("yield_unit_mismatch");
    expect(report.verdict).toBe("blocked");
    // The portfolio tonne total does not absorb the 50 lb declared on this row: only plot B's
    // 3.5 t is counted.
    expect(report.portfolio.declaredQuantityT).toBe(3.5);
  });

  it("flags a coarse vertex rather than treating it as a precise one", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.coordinates = {
      value: [
        { lat: "6.00", lon: "-3.01" },
        { lat: "6.00", lon: "-3.00" },
        { lat: "6.01", lon: "-3.00" },
        { lat: "6.01", lon: "-3.01" },
        { lat: "6.00", lon: "-3.01" },
      ],
      state: "extracted",
    };
    (raw.plots as Record<string, unknown>[])[0]!.declaredAreaHa = { value: 122.96, state: "extracted" };
    const report = auditBatch(readBatchInput(raw));
    expect(codes(report.plots[0]!)).toContain("coordinate_precision_coarse");
    const finding = report.plots[0]!.findings.find((entry) => entry.code === "coordinate_precision_coarse");
    expect(finding!.severity).toBe("finding");
    expect(report.verdict).toBe("findings");
  });

  it("names a swapped lat/lon pair instead of re-ordering it", () => {
    const raw = cleanBatch();
    (raw.plots as Record<string, unknown>[])[0]!.coordinates = {
      value: [
        { lat: "120.100000", lon: "-3.010000" },
        { lat: "120.100000", lon: "-3.008000" },
        { lat: "120.102000", lon: "-3.008000" },
        { lat: "120.100000", lon: "-3.010000" },
      ],
      state: "extracted",
    };
    const report = auditBatch(readBatchInput(raw));
    expect(codes(report.plots[0]!)).toContain("coordinate_order_suspect");
    expect(report.plots[0]!.computedAreaHa).toBeNull();
    expect(report.verdict).toBe("blocked");
  });
});

// --- fixture sanity --------------------------------------------------------

describe("CanopyProof fixtures", () => {
  it("starts plot B clear of plot A", () => {
    expect(polygonIntersectionAreaHa(ringOf(PLOT_A_RING), ringOf(PLOT_B_RING))!).toBeCloseTo(0, 9);
    expect(polygonIntersectionAreaHa(ringOf(PLOT_C_RING), ringOf(PLOT_D_RING))!).toBeCloseTo(30.741108, 3);
  });

  it("defaults a fixture row to a stated, in-scope cocoa plot", () => {
    const row = plot();
    expect(row.commodity).toBe("cocoa");
    expect((row.cnCode as { value: string }).value).toBe("1801");
  });
});
