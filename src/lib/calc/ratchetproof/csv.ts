/**
 * Input readers: interval files (CSV, a compact wide CSV, Green Button XML), the declared tariff, and
 * the bills. Parsing is strict — a missing column or a malformed cell throws with the field path, and
 * nothing is ever partially read into the engine.
 */
import { RatchetProofFieldError, parseKilowatts, parseScaledDecimal, parseUsdToMicros } from "./money";
import { epochMinuteOf, isoFromEpochMinute } from "./grid";
import type {
  BillingWindowSpec,
  BillRecord,
  Declared,
  FieldProvenance,
  MeterReading,
  MeterSeries,
  Tariff,
  TariffRateLine,
} from "./types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

interface ParsedTable {
  header: string[];
  rows: string[][];
  metadata: Record<string, string>;
}

function readTable(text: string): ParsedTable {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const metadata: Record<string, string> = {};
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("#")) {
      const body = line.replace(/^#+\s*/, "");
      const separator = body.indexOf(":");
      if (separator > 0) {
        metadata[body.slice(0, separator).trim().toLowerCase()] = body.slice(separator + 1).trim();
      }
      continue;
    }
    dataLines.push(line);
  }
  const header = dataLines.length > 0 ? splitCsvLine(dataLines[0]) : [];
  return { header, rows: dataLines.slice(1).map(splitCsvLine), metadata };
}

function columnIndex(header: string[], aliases: string[], fieldPath: string): number {
  const normalised = header.map((cell) => cell.toLowerCase().replace(/\s+/g, "_"));
  for (const alias of aliases) {
    const index = normalised.indexOf(alias);
    if (index !== -1) return index;
  }
  throw new RatchetProofFieldError(
    "rp-interval-invalid",
    fieldPath,
    `The interval file has no ${aliases.join(" / ")} column (header: ${header.join(", ") || "none"}). Nothing was audited.`,
  );
}

export interface IntervalFileResult {
  meters: MeterSeries[];
  format: "long" | "wide" | "green-button";
  /** Columns the reader did not map — surfaced, never silently dropped. */
  unmappedColumns: string[];
}

/** Green Button XML: one `IntervalReading` = start (epoch seconds) + value (uom 72 = W, 38 = kW). */
function parseGreenButtonXml(text: string, fallbackMeterId: string): IntervalFileResult {
  const meterIdMatch = /<UsagePoint>[\s\S]*?<mrid>([^<]+)<\/mrid>/.exec(text);
  const meterId = (meterIdMatch?.[1] ?? fallbackMeterId).trim();
  const blocks = [...text.matchAll(/<IntervalReading>([\s\S]*?)<\/IntervalReading>/g)];
  if (blocks.length === 0) {
    throw new RatchetProofFieldError(
      "rp-interval-invalid",
      "intervalXml",
      "The Green Button file contains no IntervalReading elements. Nothing was audited.",
    );
  }
  const readings: MeterReading[] = [];
  for (const [index, block] of blocks.entries()) {
    const body = block[1];
    const startMatch = /<timePeriod>[\s\S]*?<start>([^<]+)<\/start>/.exec(body);
    const valueMatch = /<value>([^<]+)<\/value>/.exec(body);
    const multiplierMatch = /<powerOfTenMultiplier>([^<]+)<\/powerOfTenMultiplier>/.exec(body);
    const uomMatch = /<uom>([^<]+)<\/uom>/.exec(body);
    if (!startMatch || !valueMatch) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalXml[${index + 1}]`,
        `Green Button reading ${index + 1} has no timePeriod/start or value. Nothing was audited.`,
      );
    }
    const startSeconds = Number(startMatch[1].trim());
    if (!Number.isSafeInteger(startSeconds)) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalXml[${index + 1}].start`,
        `Green Button reading ${index + 1} starts at ${startMatch[1]} which is not an integer epoch second. Nothing was audited.`,
      );
    }
    const uom = (uomMatch?.[1] ?? "").trim();
    if (uom !== "72" && uom !== "38") {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalXml[${index + 1}].uom`,
        `Green Button reading ${index + 1} is expressed in unit-of-measure '${uom || "none"}'; this engine reads demand in watts (72) or kilowatts (38). Convert the export to a demand unit rather than guessing. Nothing was audited.`,
      );
    }
    const multiplier = Number((multiplierMatch?.[1] ?? "0").trim() || "0");
    if (!Number.isInteger(multiplier) || multiplier < -3 || multiplier > 3) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalXml[${index + 1}].powerOfTenMultiplier`,
        `Green Button reading ${index + 1} carries a power-of-ten multiplier of ${multiplierMatch?.[1]}. Nothing was audited.`,
      );
    }
    const raw = Number(valueMatch[1].trim());
    if (!Number.isFinite(raw) || raw < 0) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalXml[${index + 1}].value`,
        `Green Button reading ${index + 1} has a demand value of ${valueMatch[1]}. Nothing was audited.`,
      );
    }
    const watts = raw * 10 ** multiplier * (uom === "38" ? 1000 : 1);
    readings.push({
      startUtc: new Date(startSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"),
      kwMilli: Math.round(watts),
    });
  }

  const epochs = readings.map((reading) => epochMinuteOf(reading.startUtc, "intervalXml.start"));
  const deltas = epochs.slice(1).map((epoch, index) => epoch - epochs[index]);
  const distinct = [...new Set(deltas)];
  const intervalMinutes = distinct.length === 1 ? distinct[0] : Number.NaN;
  if (intervalMinutes !== 15 && intervalMinutes !== 30) {
    throw new RatchetProofFieldError(
      "rp-interval-granularity-mixed",
      "intervalXml",
      `The Green Button readings are not on a constant 15- or 30-minute grid (observed gaps: ${distinct.join(", ") || "none"} minutes). A gap or a mixed-grid export is refused, never interpolated. Nothing was audited.`,
    );
  }
  return {
    meters: [
      {
        meterId,
        intervalMinutes,
        declaredIntervalCount: readings.length,
        readings,
      },
    ],
    format: "green-button",
    unmappedColumns: [],
  };
}

/**
 * Reads an interval file.
 *
 * Supported shapes:
 *   1. LONG — `meter_id,interval_start_utc,kw` (one row per meter-interval).
 *   2. WIDE — metadata `# meters: m1,m2`, `# start: <iso>`, `# interval_minutes: 30`, then one row of
 *      N demand values per interval, in meter order. Compact enough to keep a four-month example on
 *      the page without a megabyte of text.
 *   3. GREEN BUTTON XML — `<IntervalReading>` blocks.
 */
export function parseIntervalFile(
  text: string,
  fallbackMeterId = "meter-1",
): IntervalFileResult {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new RatchetProofFieldError(
      "rp-intervals-empty",
      "intervalFile",
      "The interval file is empty. Nothing was audited.",
    );
  }
  if (trimmed.startsWith("<") || trimmed.startsWith("<?xml")) {
    return parseGreenButtonXml(trimmed, fallbackMeterId);
  }

  const table = readTable(trimmed);
  const width = table.header.length;

  // WIDE: no header row, metadata declares the meters.
  const wideMeters = table.metadata.meters;
  if (wideMeters) {
    const meterIds = wideMeters.split(",").map((id) => id.trim()).filter(Boolean);
    const start = table.metadata.start;
    const intervalMinutes = Number(table.metadata.interval_minutes ?? "0");
    if (!start) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        "intervalFile.start",
        "A wide interval file must declare `# start: <ISO timestamp>` so its slots can be aligned. Nothing was audited.",
      );
    }
    if (intervalMinutes !== 15 && intervalMinutes !== 30) {
      throw new RatchetProofFieldError(
        "rp-interval-granularity-mixed",
        "intervalFile.interval_minutes",
        `A wide interval file must declare \`# interval_minutes: 15\` or \`30\`; received ${table.metadata.interval_minutes ?? "nothing"}. Nothing was audited.`,
      );
    }
    const startEpoch = epochMinuteOf(start, "intervalFile.start");
    const series = meterIds.map<MeterSeries>((meterId) => ({
      meterId,
      intervalMinutes,
      declaredIntervalCount: 0,
      readings: [],
    }));
    const dataLines = [table.header, ...table.rows].filter(
      (cells) => !(cells.length === 1 && cells[0] === ""),
    );
    if (Number(table.metadata.interval_count ?? "") > 0) {
      const declared = Number(table.metadata.interval_count);
      if (dataLines.length !== declared) {
        throw new RatchetProofFieldError(
          "rp-interval-count-mismatch",
          "intervalFile",
          `The file declares ${declared} intervals but ${dataLines.length} were read. A partial series is refused, never summed. Nothing was audited.`,
        );
      }
    }
    dataLines.forEach((cells, index) => {
      if (cells.length !== meterIds.length) {
        throw new RatchetProofFieldError(
          "rp-interval-invalid",
          `intervalFile.row${index + 1}`,
          `Row ${index + 1} has ${cells.length} demand value${cells.length === 1 ? "" : "s"} but the file declares ${meterIds.length} meter${meterIds.length === 1 ? "" : "s"} (${wideMeters}). Nothing was audited.`,
        );
      }
      const startUtc = isoFromEpochMinute(startEpoch + index * intervalMinutes);
      cells.forEach((cell, meterIndex) => {
        const seriesEntry = series[meterIndex];
        seriesEntry.readings.push({
          startUtc,
          kwMilli: parseKilowatts(cell, `intervalFile.row${index + 1}.${seriesEntry.meterId}`),
        });
        seriesEntry.declaredIntervalCount += 1;
      });
    });
    return { meters: series, format: "wide", unmappedColumns: [] };
  }

  // LONG: a header row naming the three columns.
  const meterColumn = columnIndex(table.header, ["meter_id", "meter", "usage_point"], "intervalFile.header");
  const startColumn = columnIndex(
    table.header,
    ["interval_start_utc", "interval_start", "start", "timestamp"],
    "intervalFile.header",
  );
  const kwColumn = columnIndex(table.header, ["kw", "demand_kw", "demand"], "intervalFile.header");

  const byMeter = new Map<string, MeterSeries>();
  const declaredCount = Number(table.metadata.interval_count ?? "0");
  table.rows.forEach((cells, index) => {
    if (cells.length < width) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalFile.row${index + 2}`,
        `Row ${index + 2} has ${cells.length} cells but the header declares ${width}. Nothing was audited.`,
      );
    }
    const meterId = cells[meterColumn];
    if (!meterId) {
      throw new RatchetProofFieldError(
        "rp-interval-invalid",
        `intervalFile.row${index + 2}.meter_id`,
        `Row ${index + 2} carries no meter id. Nothing was audited.`,
      );
    }
    const reading: MeterReading = {
      startUtc: cells[startColumn],
      kwMilli: parseKilowatts(cells[kwColumn], `intervalFile.row${index + 2}.kw`),
    };
    const existing = byMeter.get(meterId);
    if (existing) {
      existing.readings.push(reading);
    } else {
      byMeter.set(meterId, {
        meterId,
        intervalMinutes: 15,
        declaredIntervalCount: 0,
        readings: [reading],
      });
    }
  });
  if (byMeter.size === 0) {
    throw new RatchetProofFieldError(
      "rp-intervals-empty",
      "intervalFile",
      "The interval file has a header but no data rows. Nothing was audited.",
    );
  }

  const meters = [...byMeter.values()];
  for (const meter of meters) {
    const epochs = meter.readings.map((reading) =>
      epochMinuteOf(reading.startUtc, `intervalFile.${meter.meterId}.start`),
    );
    const deltas = epochs
      .slice(1)
      .map((epoch, index) => epoch - epochs[index])
      .filter((delta) => delta > 0);
    // The grid length is the SMALLEST observed step: a larger step is a gap, and `align` refuses it by
    // name. Inferring the length from an average (or the last step) would hide the gap.
    const intervalMinutes = deltas.length > 0 ? Math.min(...deltas) : 15;
    if (intervalMinutes !== 15 && intervalMinutes !== 30) {
      throw new RatchetProofFieldError(
        "rp-interval-granularity-mixed",
        `intervalFile.${meter.meterId}`,
        `Meter ${meter.meterId} is recorded on a ${intervalMinutes}-minute interval; this engine aligns on 15 or 30. Nothing was audited.`,
      );
    }
    meter.intervalMinutes = intervalMinutes;
    meter.declaredIntervalCount = declaredCount > 0 ? declaredCount : meter.readings.length;
  }

  const mapped = new Set([meterColumn, startColumn, kwColumn]);
  return {
    meters,
    format: "long",
    unmappedColumns: table.header.filter((_, index) => !mapped.has(index)),
  };
}

function declared<T>(
  value: unknown,
  fieldPath: string,
  parse: (input: unknown, path: string) => T,
  provenance: unknown,
  page?: unknown,
  quote?: unknown,
): Declared<T> {
  const label: FieldProvenance =
    provenance === "extracted" || provenance === "unreadable" || provenance === "unstated"
      ? provenance
      : "extracted";
  const field: Declared<T> = {
    value: null,
    provenance: label,
    ...(typeof page === "number" ? { page } : {}),
    ...(typeof quote === "string" ? { quote } : {}),
  };
  if (label !== "extracted") return field;
  field.value = parse(value, fieldPath);
  return field;
}

function asString(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a non-empty string. Nothing was audited.`,
    );
  }
  return value.trim();
}

function asNumber(value: unknown, fieldPath: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a number. Nothing was audited.`,
    );
  }
  return value;
}

function asBillingWindow(value: unknown, fieldPath: string): BillingWindowSpec {
  if (!value || typeof value !== "object") {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be an object with days, startMinute, endMinute and utcOffsetMinutes. Nothing was audited.`,
    );
  }
  const spec = value as Record<string, unknown>;
  const days = Array.isArray(spec.days) ? spec.days : null;
  if (
    !days ||
    days.length === 0 ||
    !days.every((day) => Number.isInteger(day) && (day as number) >= 0 && (day as number) <= 6)
  ) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      `${fieldPath}.days`,
      `\`${fieldPath}.days\` must be a non-empty array of 0–6 (0 = Sunday). Nothing was audited.`,
    );
  }
  const startMinute = asNumber(spec.startMinute, `${fieldPath}.startMinute`);
  const endMinute = asNumber(spec.endMinute, `${fieldPath}.endMinute`);
  const utcOffsetMinutes = asNumber(spec.utcOffsetMinutes, `${fieldPath}.utcOffsetMinutes`);
  if (
    !Number.isInteger(startMinute) ||
    !Number.isInteger(endMinute) ||
    !Number.isInteger(utcOffsetMinutes) ||
    startMinute < 0 ||
    startMinute > 1439 ||
    endMinute < 1 ||
    endMinute > 1440 ||
    utcOffsetMinutes < -840 ||
    utcOffsetMinutes > 840
  ) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` has an out-of-range minute or offset. Nothing was audited.`,
    );
  }
  return {
    days: (days as number[]).map((day) => Number(day)),
    startMinute,
    endMinute,
    utcOffsetMinutes,
  };
}

function asRateLines(value: unknown, fieldPath: string): TariffRateLine[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      fieldPath,
      `\`${fieldPath}\` must be a non-empty array of {season, voltageClass, rateUsdPerKw}. Nothing was audited.`,
    );
  }
  return value.map((entry, index) => {
    const line = (entry ?? {}) as Record<string, unknown>;
    const rate = line.rateUsdPerKw ?? line.rate_usd_per_kw ?? line.rateMicroUsdPerKw;
    return {
      season: asString(line.season, `${fieldPath}[${index}].season`),
      voltageClass: asString(
        line.voltageClass ?? line.voltage_class,
        `${fieldPath}[${index}].voltageClass`,
      ),
      rateMicroUsdPerKw:
        typeof rate === "number" && Number.isInteger(rate) && line.rateMicroUsdPerKw !== undefined
          ? rate
          : typeof rate === "string"
            ? parseUsdToMicros(rate, `${fieldPath}[${index}].rateUsdPerKw`)
            : Math.round(asNumber(rate, `${fieldPath}[${index}].rateUsdPerKw`) * 1_000_000),
      ...(typeof line.page === "number" ? { page: line.page } : {}),
      ...(typeof line.quote === "string" ? { quote: line.quote } : {}),
    };
  });
}

/**
 * The declared tariff, as JSON. This is the *agent/UI* path: the caller states the clause set and each
 * field carries its own label, so a page can demonstrate a blocked verdict by marking a clause
 * `unstated` — which is exactly what a tariff the reader could not resolve looks like.
 */
export function parseTariffJson(text: string): Tariff {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new RatchetProofFieldError(
      "rp-field-invalid",
      "tariff",
      `The tariff declaration is not JSON (${error instanceof Error ? error.message : "parse failure"}). Nothing was audited.`,
    );
  }
  const root = (payload ?? {}) as Record<string, unknown>;
  const field = (name: string) =>
    (root[name] ?? {}) as { value?: unknown; provenance?: unknown; page?: unknown; quote?: unknown };
  const read = <T>(name: string, parse: (value: unknown, path: string) => T): Declared<T> => {
    const entry = field(name);
    return declared(
      entry.value,
      `tariff.${name}`,
      parse,
      entry.provenance,
      entry.page,
      entry.quote,
    );
  };

  return {
    utility: read("utility", asString),
    schedule: read("schedule", asString),
    voltageClass: read("voltageClass", asString),
    demandRates: read("demandRates", asRateLines),
    ratchetPercent: read("ratchetPercent", asNumber),
    ratchetLookbackMonths: read("ratchetLookbackMonths", asNumber),
    billingWindow: read("billingWindow", asBillingWindow),
    intervalMinutes: read("intervalMinutes", (value, path) => {
      const minutes = asNumber(value, path);
      if (minutes !== 15 && minutes !== 30) {
        throw new RatchetProofFieldError(
          "rp-field-invalid",
          path,
          `\`${path}\` must be 15 or 30. Nothing was audited.`,
        );
      }
      return minutes as 15 | 30;
    }),
    contractMinimumKw: read("contractMinimumKw", asNumber),
  };
}

/**
 * Bills CSV: `month,period_start,period_end,printed_billed_demand_kw,printed_demand_rate_usd_per_kw,printed_ratchet_line`
 *
 * A blank cell is `unstated` — the bill is legible and does not print that figure. It is never filled
 * from the tariff formula: the printed number is the thing under audit.
 */
export function parseBillsCsv(text: string): BillRecord[] {
  const table = readTable(text);
  const monthColumn = columnIndex(table.header, ["month", "billing_month"], "bills.header");
  const startColumn = columnIndex(table.header, ["period_start", "start"], "bills.header");
  const endColumn = columnIndex(table.header, ["period_end", "end"], "bills.header");
  const demandColumn = columnIndex(
    table.header,
    ["printed_billed_demand_kw", "billed_demand_kw", "billed_demand"],
    "bills.header",
  );
  const rateColumn = columnIndex(
    table.header,
    ["printed_demand_rate_usd_per_kw", "demand_rate_usd_per_kw", "demand_rate"],
    "bills.header",
  );
  let ratchetColumn = -1;
  try {
    ratchetColumn = columnIndex(table.header, ["printed_ratchet_line", "ratchet_line"], "bills.header");
  } catch {
    ratchetColumn = -1;
  }

  if (table.rows.length === 0) {
    throw new RatchetProofFieldError(
      "rp-bill-missing",
      "bills",
      "The bills file has a header but no rows, so there is nothing to audit. Nothing was audited.",
    );
  }

  const seen = new Set<string>();
  return table.rows.map((cells, index) => {
    const month = cells[monthColumn];
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new RatchetProofFieldError(
        "rp-bill-invalid",
        `bills.row${index + 2}.month`,
        `Row ${index + 2} has a billing month of ${JSON.stringify(month)}; expected YYYY-MM. Nothing was audited.`,
      );
    }
    if (seen.has(month)) {
      throw new RatchetProofFieldError(
        "rp-bill-invalid",
        `bills.row${index + 2}.month`,
        `The bills file lists ${month} twice. Nothing was audited.`,
      );
    }
    seen.add(month);
    const demandCell = cells[demandColumn] ?? "";
    const rateCell = cells[rateColumn] ?? "";
    const ratchetCell = ratchetColumn === -1 ? "" : (cells[ratchetColumn] ?? "");
    return {
      month,
      periodStart: cells[startColumn] ?? "",
      periodEnd: cells[endColumn] ?? "",
      printedBilledDemandKwMilli: demandCell
        ? parseKilowatts(demandCell, `bills.row${index + 2}.printed_billed_demand_kw`)
        : null,
      printedBilledDemandProvenance: demandCell ? "extracted" : "unstated",
      printedDemandRateMicroUsdPerKw: rateCell
        ? parseUsdToMicros(rateCell, `bills.row${index + 2}.printed_demand_rate_usd_per_kw`)
        : null,
      printedDemandRateProvenance: rateCell ? "extracted" : "unstated",
      printedRatchetLine: ratchetCell || null,
      printedRatchetLineProvenance: ratchetCell ? "extracted" : "unstated",
    };
  });
}

/** Unused-but-exported helper kept for the fixture writer: `$15` → micro-USD. */
export function usdPerKwToMicros(usd: string): number {
  return parseScaledDecimal(usd, 1_000_000, "rateUsdPerKw");
}
