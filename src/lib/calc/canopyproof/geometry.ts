/**
 * CanopyProof — the geometry core. Pure arithmetic on declared coordinates: no I/O, no network,
 * no clock, no projection library, no npm dependency.
 *
 * Entry points:
 * - `classifyCrs(value)` — WGS84 / unsupported / unstated. A non-WGS84 declaration is refused; it
 *   is NEVER reprojected, because a silent reprojection is a number nobody can trace.
 * - `isRingClosed(ring)` — the ring must repeat its first position (RFC 7946 §3.1.6).
 * - `isSimpleRing(ring)` — O(n²) segment test with a metric tolerance on non-adjacent edges only.
 * - `checkCoordinates(ring)` — lat/lon plausibility, an out-of-range vertex, and the one
 *   unambiguous swapped-order case (a longitude sitting in the latitude slot).
 * - `geodesicAreaHa(ring)` — spherical excess on a sphere of mean Earth radius 6 371 008.8 m.
 * - `pointInPolygon(point, ring)` — ray casting, boundary counts as inside.
 * - `polygonIntersectionAreaHa(a, b)` — exact-on-the-projection intersection area.
 * - `assessGeometry(request)` — every check above, composed into one `GeometryAssessment`.
 * - `ringSignature(ring)` — a canonical vertex-set key for duplicate detection.
 *
 * ── Area: the sphere, stated plainly ────────────────────────────────────────────────────────────
 * The area is the spherical excess of the ring on a sphere of radius R = 6 371 008.8 m (the IUGG
 * mean Earth radius), computed with the line-integral form
 *
 *     A = R² / 2 · |Σ (λᵢ₊₁ − λᵢ)(2 + sin φᵢ + sin φᵢ₊₁)|
 *
 * with Δλ normalised to (−π, π] so a ring may cross the antimeridian. On a sphere of that radius a
 * lat/lon rectangle reduces exactly to R²·Δλ·(sin φ₂ − sin φ₁), which is the known answer the
 * tests assert. It is not an ellipsoidal (GRS80) area: on a WGS84 ellipsoid the same ring is within
 * roughly 0.3 % of this figure at mid-latitudes, which is far inside the audit's area tolerance and
 * is stated here rather than hidden. Nothing is reported to more precision than the vertices carry.
 *
 * ── Intersection area: local sinusoidal projection + ear clipping + Sutherland–Hodgman ────────
 * Two rings are projected onto a LOCAL SINUSOIDAL projection centred on the mean of the pair:
 *
 *     x = R · (λ − λ₀) · cos φ        y = R · (φ − φ₀)
 *
 * This projection is EQUAL-AREA: its Jacobian is R²·cos φ, exactly the sphere's area element, so a
 * projected area equals the spherical area of the same region — the projection itself introduces no
 * area error. The one approximation is at the edges: a segment between two vertices is drawn as a
 * straight line in the projection, not as the great-circle (or rhumb) arc between them. For a plot
 * edge of a few kilometres that is a sub-metre sagitta, orders of magnitude below the hectare the
 * report is written in; for a single edge spanning hundreds of kilometres it is not, and the header
 * says so rather than pretending otherwise.
 *
 * On that projection: polygon A is ear-clipped into triangles (a triangulation of a simple polygon
 * exists and the ear test finds it), polygon B is clipped against each triangle in turn with
 * Sutherland–Hodgman (valid because every clip polygon is a triangle, hence convex), and the
 * absolute shoelace area of each clipped piece is summed. The pieces are disjoint and cover B ∩ A,
 * so the sum is the intersection area. A ring that cannot be triangulated returns `null` — the
 * audit then reports `overlap_uncomputable` and blocks, rather than guessing an overlap of zero.
 */
import type {
  Coordinate,
  CrsStatus,
  FindingCode,
  GeometryAssessment,
  GeometryKind,
} from "./types";

/** IUGG mean Earth radius, metres. */
export const EARTH_RADIUS_M = 6371008.8;

const DEG = Math.PI / 180;
const M2_PER_HA = 10_000;

/** A closing position further than this from the first position is a gap, not a rounding artefact. */
export const RING_CLOSE_TOLERANCE_M = 0.5;

/**
 * Below four decimal places a vertex is coarser than ~11 m, so the area it implies cannot be
 * audited against a declared area. Six decimals is the Information System's own format; a pack at
 * five or six is reported with no finding, a pack below four is reported as coarse.
 */
export const COORDINATE_MIN_DECIMALS = 4;
export const EUDR_FORMAT_DECIMALS = 6;

/** A shared boundary sliver below this is not double counting. The audit's default tolerance. */
export const DEFAULT_OVERLAP_TOLERANCE_HA = 0.01;

/** Metric tolerance for the planar predicates (metres). */
const GEOM_EPS_M = 1e-6;

/** The CRS spellings that mean WGS84. Anything else is refused, never reprojected. */
const WGS84_ALIASES = [
  "epsg:4326",
  "wgs84",
  "wgs 84",
  "wgs-84",
  "urn:ogc:def:crs:ogc:1.3:crs84",
  "urn:ogc:def:crs:epsg::4326",
  "crs84",
  "ogc:crs84",
];

export function classifyCrs(declared: string | null | undefined): {
  status: CrsStatus;
  declared: string | null;
} {
  if (declared === null || declared === undefined || declared.trim() === "") {
    return { status: "unstated", declared: null };
  }
  const normalized = declared.trim().toLowerCase().replace(/\s+/g, " ");
  const compact = normalized.replace(/\s+/g, "");
  const isWgs84 =
    WGS84_ALIASES.includes(normalized) ||
    WGS84_ALIASES.includes(compact) ||
    compact === "epsg:4326" ||
    compact === "wgs84";
  return { status: isWgs84 ? "wgs84" : "unsupported", declared: declared.trim() };
}

/**
 * Drops a repeated closing position, using the same 0.5 m tolerance the closure check uses — a
 * ring closed within tolerance and a ring strip at a different tolerance would disagree about how
 * many vertices the polygon has. Returns a copy; never mutates the caller's ring.
 */
export function stripClosing(ring: readonly Coordinate[]): Coordinate[] {
  if (ring.length >= 2 && haversineM(ring[0]!, ring[ring.length - 1]!) <= RING_CLOSE_TOLERANCE_M) {
    return ring.slice(0, -1);
  }
  return ring.slice();
}

export function haversineM(a: Coordinate, b: Coordinate): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLon = (b.lon - a.lon) * DEG;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** True when the ring repeats its first position within `toleranceM`. */
export function isRingClosed(
  ring: readonly Coordinate[],
  toleranceM: number = RING_CLOSE_TOLERANCE_M,
): boolean {
  if (ring.length < 2) return false;
  return haversineM(ring[0]!, ring[ring.length - 1]!) <= toleranceM;
}

export interface CoordinateProblem {
  /** Indices of positions whose latitude or longitude is impossible. */
  outOfRange: number[];
  /** Indices where a longitude was written in the latitude slot (the unambiguous swap). */
  swapped: number[];
}

/**
 * Lat/lon plausibility. A latitude outside [−90, 90] with a longitude inside that band is the one
 * swap that can be called without a boundary dataset: the pair was written lon-first. It is
 * reported, never repaired — re-ordering a supplier's vertices would be inventing their data.
 */
export function checkCoordinates(ring: readonly Coordinate[]): CoordinateProblem {
  const outOfRange: number[] = [];
  const swapped: number[] = [];
  ring.forEach((position, index) => {
    const latOk = Number.isFinite(position.lat) && Math.abs(position.lat) <= 90;
    const lonOk = Number.isFinite(position.lon) && Math.abs(position.lon) <= 180;
    if (!latOk && lonOk) {
      swapped.push(index);
      return;
    }
    if (!latOk || !lonOk) outOfRange.push(index);
  });
  return { outOfRange, swapped };
}

interface Point2D {
  x: number;
  y: number;
}

/** Local sinusoidal projection, metres. Equal-area; see the file header. */
function project(ring: readonly Coordinate[], lon0: number, lat0: number): Point2D[] {
  return ring.map((position) => ({
    x: EARTH_RADIUS_M * (position.lon - lon0) * DEG * Math.cos(position.lat * DEG),
    y: EARTH_RADIUS_M * (position.lat - lat0) * DEG,
  }));
}

function cross(ox: number, oy: number, ax: number, ay: number, bx: number, by: number): number {
  return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
}

function onSegment(a: Point2D, b: Point2D, p: Point2D, eps: number): boolean {
  if (Math.abs(cross(a.x, a.y, b.x, b.y, p.x, p.y)) > eps) return false;
  return (
    p.x >= Math.min(a.x, b.x) - eps &&
    p.x <= Math.max(a.x, b.x) + eps &&
    p.y >= Math.min(a.y, b.y) - eps &&
    p.y <= Math.max(a.y, b.y) + eps
  );
}

function segmentsCross(a: Point2D, b: Point2D, c: Point2D, d: Point2D, eps: number): boolean {
  const d1 = cross(c.x, c.y, d.x, d.y, a.x, a.y);
  const d2 = cross(c.x, c.y, d.x, d.y, b.x, b.y);
  const d3 = cross(a.x, a.y, b.x, b.y, c.x, c.y);
  const d4 = cross(a.x, a.y, b.x, b.y, d.x, d.y);
  if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) &&
      ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) {
    return true;
  }
  // Collinear or touching contact between non-adjacent edges is a self-touch, not a simple ring.
  if (Math.abs(d1) <= eps && onSegment(c, d, a, eps)) return true;
  if (Math.abs(d2) <= eps && onSegment(c, d, b, eps)) return true;
  if (Math.abs(d3) <= eps && onSegment(a, b, c, eps)) return true;
  if (Math.abs(d4) <= eps && onSegment(a, b, d, eps)) return true;
  return false;
}

/**
 * O(n²) simple-ring test: every pair of non-adjacent edges is tested in a local metric projection,
 * so the tolerance is in metres rather than degrees and means the same thing at any latitude.
 */
export function isSimpleRing(ring: readonly Coordinate[]): { simple: boolean; edges: [number, number] | null } {
  const vertices = stripClosing(ring);
  const n = vertices.length;
  if (n < 3) return { simple: false, edges: [0, 1] };
  const lat0 = vertices.reduce((sum, position) => sum + position.lat, 0) / n;
  const lon0 = vertices.reduce((sum, position) => sum + position.lon, 0) / n;
  const points = project(vertices, lon0, lat0);
  for (let i = 0; i < n; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    for (let j = i + 1; j < n; j += 1) {
      if (j === i) continue;
      // Adjacent edges share a vertex by construction; the first and last edges also share one.
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) continue;
      const c = points[j]!;
      const d = points[(j + 1) % n]!;
      if (segmentsCross(a, b, c, d, GEOM_EPS_M)) return { simple: false, edges: [i, j] };
    }
  }
  return { simple: true, edges: null };
}

/**
 * Spherical-excess area of a ring, hectares. The ring is closed implicitly (the last vertex joins
 * the first), which is why the caller must have checked closure first: this function computes the
 * area of the ring it was given, it does not repair it.
 */
export function geodesicAreaHa(ring: readonly Coordinate[]): number {
  const vertices = stripClosing(ring);
  const n = vertices.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % n]!;
    let dLon = (b.lon - a.lon) * DEG;
    // Normalise to (−π, π] so an antimeridian crossing does not cancel the ring.
    dLon = ((dLon + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    total += dLon * (2 + Math.sin(a.lat * DEG) + Math.sin(b.lat * DEG));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2) / M2_PER_HA;
}

/** Ray casting on the lon/lat plane. A position exactly on the boundary counts as inside. */
export function pointInPolygon(point: Coordinate, ring: readonly Coordinate[]): boolean {
  const vertices = stripClosing(ring);
  const n = vertices.length;
  if (n < 3) return false;
  const eps = 1e-12;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const a = vertices[i]!;
    const b = vertices[j]!;
    const crossProduct =
      (point.lon - b.lon) * (a.lat - b.lat) - (point.lat - b.lat) * (a.lon - b.lon);
    if (Math.abs(crossProduct) <= eps) {
      const withinLon =
        point.lon >= Math.min(a.lon, b.lon) - eps && point.lon <= Math.max(a.lon, b.lon) + eps;
      const withinLat =
        point.lat >= Math.min(a.lat, b.lat) - eps && point.lat <= Math.max(a.lat, b.lat) + eps;
      if (withinLon && withinLat) return true;
    }
    if (a.lat > point.lat !== b.lat > point.lat) {
      const x = ((b.lon - a.lon) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lon;
      if (point.lon < x) inside = !inside;
    }
  }
  return inside;
}

function signedArea(points: readonly Point2D[]): number {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    total += a.x * b.y - b.x * a.y;
  }
  return total / 2;
}

function pointInTriangle(p: Point2D, a: Point2D, b: Point2D, c: Point2D, eps: number): boolean {
  const d1 = cross(a.x, a.y, b.x, b.y, p.x, p.y);
  const d2 = cross(b.x, b.y, c.x, c.y, p.x, p.y);
  const d3 = cross(c.x, c.y, a.x, a.y, p.x, p.y);
  const negative = d1 < -eps || d2 < -eps || d3 < -eps;
  const positive = d1 > eps || d2 > eps || d3 > eps;
  return !(negative && positive);
}

/**
 * Ear clipping of a simple polygon, in the projection's metres. Returns triangles, or `null` when
 * no ear can be found (which for a valid simple polygon cannot happen: every simple polygon with
 * more than three vertices has at least two ears). `null` is surfaced, never substituted.
 */
function triangulate(points: readonly Point2D[]): Point2D[][] | null {
  const n = points.length;
  if (n < 3) return null;
  const working = points.map((point) => ({ ...point }));
  if (signedArea(working) < 0) working.reverse();
  // Drop collinear vertices: they carry no shape, and a run of them can stall the ear test.
  let pruned = true;
  while (pruned && working.length > 3) {
    pruned = false;
    for (let i = 0; i < working.length; i += 1) {
      const a = working[(i - 1 + working.length) % working.length]!;
      const b = working[i]!;
      const c = working[(i + 1) % working.length]!;
      if (Math.abs(cross(a.x, a.y, b.x, b.y, c.x, c.y)) <= GEOM_EPS_M) {
        working.splice(i, 1);
        pruned = true;
        break;
      }
    }
  }
  const indices = working.map((_, index) => index);
  const triangles: Point2D[][] = [];
  let guard = 0;
  while (indices.length > 3) {
    guard += 1;
    if (guard > indices.length * indices.length + 16) return null;
    let clipped = false;
    const count = indices.length;
    for (let i = 0; i < count; i += 1) {
      const prev = indices[(i - 1 + count) % count]!;
      const current = indices[i]!;
      const next = indices[(i + 1) % count]!;
      const a = working[prev]!;
      const b = working[current]!;
      const c = working[next]!;
      if (cross(a.x, a.y, b.x, b.y, c.x, c.y) <= GEOM_EPS_M) continue;
      const contains = indices.some((index) => {
        if (index === prev || index === current || index === next) return false;
        return pointInTriangle(working[index]!, a, b, c, GEOM_EPS_M);
      });
      if (contains) continue;
      triangles.push([a, b, c]);
      indices.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) return null;
  }
  triangles.push(indices.map((index) => working[index]!));
  return triangles;
}

function clipAgainstTriangle(subject: readonly Point2D[], triangle: readonly Point2D[]): Point2D[] {
  let output: Point2D[] = subject.map((point) => ({ ...point }));
  for (let i = 0; i < triangle.length; i += 1) {
    const a = triangle[i]!;
    const b = triangle[(i + 1) % triangle.length]!;
    const input = output;
    output = [];
    if (input.length === 0) break;
    for (let j = 0; j < input.length; j += 1) {
      const current = input[j]!;
      const previous = input[(j - 1 + input.length) % input.length]!;
      const currentInside = cross(a.x, a.y, b.x, b.y, current.x, current.y) >= -GEOM_EPS_M;
      const previousInside = cross(a.x, a.y, b.x, b.y, previous.x, previous.y) >= -GEOM_EPS_M;
      if (currentInside) {
        if (!previousInside) {
          const hit = lineIntersection(previous, current, a, b);
          if (hit) output.push(hit);
        }
        output.push(current);
      } else if (previousInside) {
        const hit = lineIntersection(previous, current, a, b);
        if (hit) output.push(hit);
      }
    }
  }
  return output;
}

function lineIntersection(p: Point2D, q: Point2D, a: Point2D, b: Point2D): Point2D | null {
  const rx = q.x - p.x;
  const ry = q.y - p.y;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 1e-12) return null;
  const t = ((a.x - p.x) * sy - (a.y - p.y) * sx) / denominator;
  return { x: p.x + t * rx, y: p.y + t * ry };
}

/**
 * Intersection area of two simple rings, hectares — or `null` when a ring cannot be triangulated.
 * Exact on the equal-area projection; see the file header for what "exact" covers.
 */
export function polygonIntersectionAreaHa(
  a: readonly Coordinate[],
  b: readonly Coordinate[],
): number | null {
  const ringA = stripClosing(a);
  const ringB = stripClosing(b);
  if (ringA.length < 3 || ringB.length < 3) return null;
  const all = [...ringA, ...ringB];
  const lat0 = all.reduce((sum, position) => sum + position.lat, 0) / all.length;
  const lon0 = all.reduce((sum, position) => sum + position.lon, 0) / all.length;
  const projectedA = project(ringA, lon0, lat0);
  const projectedB = project(ringB, lon0, lat0);
  const triangles = triangulate(projectedA);
  if (triangles === null) return null;
  let areaM2 = 0;
  for (const triangle of triangles) {
    const piece = clipAgainstTriangle(projectedB, triangle);
    if (piece.length < 3) continue;
    areaM2 += Math.abs(signedArea(piece));
  }
  return areaM2 / M2_PER_HA;
}

/** Canonical key for "the same vertices, maybe rotated or reversed". Used for duplicates. */
export function ringSignature(ring: readonly Coordinate[]): string {
  const vertices = stripClosing(ring).map(
    (position) => `${position.lat.toFixed(6)},${position.lon.toFixed(6)}`,
  );
  const n = vertices.length;
  if (n === 0) return "";
  let best: string | null = null;
  for (const sequence of [vertices, [...vertices].reverse()]) {
    for (let start = 0; start < n; start += 1) {
      const rotated = [...sequence.slice(start), ...sequence.slice(0, start)].join(";");
      if (best === null || rotated < best) best = rotated;
    }
  }
  return best ?? "";
}

export interface GeometryRequest {
  kind: GeometryKind | null;
  coordinates: Coordinate[] | null;
  crs: string | null;
}

const FATAL_CODES: ReadonlySet<FindingCode> = new Set<FindingCode>([
  "ring_unclosed",
  "ring_too_few_vertices",
  "self_intersection",
  "coordinate_out_of_range",
  "coordinate_order_suspect",
  "crs_unsupported",
  "crs_unstated",
  "geometry_kind_mismatch",
  "geometry_invalid",
  "area_uncomputable",
]);

/**
 * Every geometry check, composed. `valid` means the geometry is sound enough to compute an area
 * on — not that the plot is acceptable (the four-hectare rule and the declared-area comparison sit
 * above this in `audit.ts`).
 */
export function assessGeometry(request: GeometryRequest): GeometryAssessment {
  const { status: crsStatus, declared: crsDeclared } = classifyCrs(request.crs);
  const codes: FindingCode[] = [];
  // One code per defect: a three-position ring is both "too few" and "unclosed" by different
  // checks, and reporting that twice would inflate the finding count.
  const addCode = (code: FindingCode): void => {
    if (!codes.includes(code)) codes.push(code);
  };
  const assessment: GeometryAssessment = {
    kind: request.kind,
    valid: false,
    crsStatus,
    crsDeclared,
    closed: null,
    vertexCount: null,
    selfIntersecting: null,
    minDecimals: null,
    areaHa: null,
    codes,
  };

  if (crsStatus === "unsupported") addCode("crs_unsupported");
  if (crsStatus === "unstated") addCode("crs_unstated");

  const coordinates = request.coordinates;
  if (!coordinates || coordinates.length === 0 || request.kind === null) {
    addCode("geometry_invalid");
    return assessment;
  }

  const decimals = coordinates
    .map((position) => position.decimals)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (decimals.length === coordinates.length && decimals.length > 0) {
    assessment.minDecimals = Math.min(...decimals);
  }

  const problem = checkCoordinates(coordinates);
  if (problem.swapped.length > 0) addCode("coordinate_order_suspect");
  if (problem.outOfRange.length > 0) addCode("coordinate_out_of_range");
  if (assessment.minDecimals !== null && assessment.minDecimals < COORDINATE_MIN_DECIMALS) {
    addCode("coordinate_precision_coarse");
  }

  if (request.kind === "point") {
    if (coordinates.length !== 1) {
      addCode("geometry_kind_mismatch");
      assessment.vertexCount = coordinates.length;
      return assessment;
    }
    assessment.vertexCount = 1;
    assessment.valid =
      crsStatus === "wgs84" && problem.swapped.length === 0 && problem.outOfRange.length === 0;
    return assessment;
  }

  // Polygon.
  if (coordinates.length < 4) addCode("ring_too_few_vertices");
  const closed = isRingClosed(coordinates);
  assessment.closed = closed;
  if (!closed) addCode("ring_unclosed");
  const vertices = stripClosing(coordinates);
  assessment.vertexCount = vertices.length;
  if (vertices.length < 3) addCode("ring_too_few_vertices");

  if (closed && vertices.length >= 3 && problem.swapped.length === 0 && problem.outOfRange.length === 0) {
    const simple = isSimpleRing(coordinates);
    assessment.selfIntersecting = !simple.simple;
    if (!simple.simple) addCode("self_intersection");
  }

  const fatal = codes.some((code) => FATAL_CODES.has(code));
  if (!fatal) {
    const area = geodesicAreaHa(coordinates);
    if (!Number.isFinite(area) || area <= 0) {
      addCode("area_uncomputable");
      assessment.valid = false;
      return assessment;
    }
    assessment.areaHa = area;
    assessment.valid = true;
    return assessment;
  }

  assessment.valid = false;
  return assessment;
}
