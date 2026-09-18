/**
 * CSV ingest for the two files a shipper actually has: the shipment records it handed over and the
 * carrier's invoice lines (plus the optional contract rate card).
 *
 * Hand-rolled and dependency-free on purpose: the parser is deterministic, strict, and fails loudly
 * with a rule id and the column name — an unparsable cell is never coerced to 0, `NaN` or `""`
 * (factory rule 5). Recognised-but-unused columns are returned so the UI can say which of the
 * shipper's columns the audit did not map, instead of silently ignoring them.
 */
import {
  ParcelAuditFieldError,
  type Carrier,
  type InvoiceLine,
  type RateCard,
  type ServiceCode,
  type ShipmentRecord,
  type TriState,
} from "./types";
import { isCarrier, isServiceCode } from "./dimWeight";

export const SHIPMENT_RECORDS_HEADERS = [
  "order_id",
  "tracking",
  "carrier",
  "service",
  "ship_date",
  "length",
  "width",
  "height",
  "actual_weight_lb",
  "zone",
  "declared_value_usd",
  "residential",
  "address_correction",
  "promised_date",
  "delivered_at",
] as const;

export const INVOICE_LINES_HEADERS = [
  "tracking",
  "invoice_date",
  "carrier",
  "service",
  "billed_weight_lb",
  "billed_length",
  "billed_width",
  "billed_height",
  "zone",
  "base_charge_usd",
  "surcharges",
  "fuel_pct",
  "total_usd",
] as const;

export const RATE_CARD_HEADERS = [
  "carrier",
  "service",
  "zone",
  "min_weight_lb",
  "max_weight_lb",
  "rate_usd",
] as const;

export interface ParsedCsv {
  header: string[];
  /** Data rows, blank lines dropped. */
  rows: string[][];
}

/** RFC 4180 subset: quoted fields, embedded commas/quotes, CRLF or LF, optional BOM. */
export function parseCsvText(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let index = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    const isBlank = row.every((cell) => cell.trim() === "");
    if (!isBlank) rows.push(row);
    row = [];
  };

  while (index < clean.length) {
    const char = clean[index];
    if (quoted) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"' && field.trim() === "") {
      quoted = true;
      field = "";
      index += 1;
      continue;
    }
    if (char === ",") {
      pushField();
      index += 1;
      continue;
    }
    if (char === "\n") {
      pushRow();
      index += 1;
      continue;
    }
    if (char === "\r") {
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  if (rows.length === 0) {
    return { header: [], rows: [] };
  }
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  return { header, rows: rows.slice(1) };
}

interface CsvTable {
  header: string[];
  byColumn: number;
  /** Record-like objects keyed by header, with the source row number for error paths. */
  records: Array<{ row: Record<string, string>; rowNumber: number; cells: string[] }>;
  unmappedColumns: string[];
}

function requireColumns(
  parsed: ParsedCsv,
  required: readonly string[],
  requiredAny: readonly (readonly string[])[],
  csvName: string,
): void {
  if (parsed.header.length === 0) {
    throw new ParcelAuditFieldError(
      "pp-field-missing",
      `${csvName}.header`,
      "the file has no header row, so no column could be mapped.",
    );
  }
  for (const column of required) {
    if (!parsed.header.includes(column)) {
      throw new ParcelAuditFieldError(
        "pp-field-missing",
        `${csvName}.${column}`,
        `required column "${column}" is missing. Expected header: ${parsed.header.join(", ")}.`,
      );
    }
  }
  for (const group of requiredAny) {
    if (!group.some((column) => parsed.header.includes(column))) {
      throw new ParcelAuditFieldError(
        "pp-field-missing",
        `${csvName}.${group.join("|")}`,
        `at least one of ${group.map((c) => `"${c}"`).join(", ")} is required. Expected header: ${parsed.header.join(", ")}.`,
      );
    }
  }
}

function table(parsed: ParsedCsv, known: readonly string[]): CsvTable {
  const knownSet = new Set<string>(known);
  const unmappedColumns = parsed.header.filter((column) => column && !knownSet.has(column));
  return {
    header: parsed.header,
    byColumn: parsed.header.length,
    records: parsed.rows.map((cells, rowIndex) => {
      const row: Record<string, string> = {};
      parsed.header.forEach((column, columnIndex) => {
        if (!column) return;
        row[column] = (cells[columnIndex] ?? "").trim();
      });
      return { row, rowNumber: rowIndex + 2, cells };
    }),
    unmappedColumns,
  };
}

function cell(value: string | undefined): string {
  return value === undefined ? "" : value.trim();
}

function requireText(value: string, fieldPath: string): string {
  if (!value) {
    throw new ParcelAuditFieldError("pp-field-missing", fieldPath, "value is empty.");
  }
  return value;
}

export function parseUsdToCents(value: string, fieldPath: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `"${value}" is not a plain dollar amount (expected e.g. 12.34).`,
    );
  }
  return Math.round(Number(cleaned) * 100);
}

export function parseNumberCell(value: string, fieldPath: string): number {
  const cleaned = value.replace(/[,\s]/g, "");
  if (cleaned === "" || !Number.isFinite(Number(cleaned))) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `"${value}" is not a number.`,
    );
  }
  return Number(cleaned);
}

export function parseDateCell(value: string, fieldPath: string): string {
  if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(value)) {
    throw new ParcelAuditFieldError(
      "pp-field-invalid",
      fieldPath,
      `"${value}" is not an ISO 8601 date (expected YYYY-MM-DD).`,
    );
  }
  return value;
}

export function parseTriStateCell(value: string, fieldPath: string): TriState {
  const normalized = value.trim().toLowerCase();
  if (normalized === "") return "unknown";
  if (["true", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  if (["unknown", "?", "n/a", "na"].includes(normalized)) return "unknown";
  throw new ParcelAuditFieldError(
    "pp-field-invalid",
    fieldPath,
    `"${value}" is not a yes/no/unknown value for a shipment attribute.`,
  );
}

function parseCarrierCell(value: string, fieldPath: string): Carrier {
  const normalized = value.trim().toLowerCase();
  if (!isCarrier(normalized)) {
    throw new ParcelAuditFieldError(
      "pp-field-unsupported-value",
      fieldPath,
      `"${value}" is not a carrier v1 audits (ups, fedex, usps).`,
    );
  }
  return normalized;
}

function parseServiceCell(value: string, fieldPath: string): ServiceCode {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!isServiceCode(normalized)) {
    throw new ParcelAuditFieldError(
      "pp-dim-unsupported-service",
      fieldPath,
      `"${value}" is not a service v1 audits (ups_ground, ups_air, ups_express_saver, fedex_ground, fedex_home_delivery, fedex_express, usps_ground_advantage, usps_priority_mail, usps_priority_mail_express, usps_parcel_select).`,
    );
  }
  return normalized;
}

export interface ShipmentRecordsIngest {
  records: ShipmentRecord[];
  unmappedColumns: string[];
}

export function parseShipmentRecordsCsv(text: string): ShipmentRecordsIngest {
  const parsed = parseCsvText(text);
  requireColumns(parsed, ["tracking", "carrier", "service", "ship_date", "length", "width", "height", "actual_weight_lb", "zone"], [], "shipmentRecords");
  const parsedTable = table(parsed, SHIPMENT_RECORDS_HEADERS);

  const records = parsedTable.records.map(({ row, rowNumber }) => {
    const base = `shipmentRecords[row ${rowNumber}]`;
    const declaredValue = cell(row.declared_value_usd);
    const promisedDate = cell(row.promised_date);
    const deliveredAt = cell(row.delivered_at);
    return {
      orderId: cell(row.order_id) || "—",
      tracking: requireText(row.tracking ?? "", `${base}.tracking`),
      carrier: parseCarrierCell(row.carrier ?? "", `${base}.carrier`),
      service: parseServiceCell(row.service ?? "", `${base}.service`),
      shipDate: parseDateCell(requireText(row.ship_date ?? "", `${base}.ship_date`), `${base}.ship_date`),
      dims: {
        length: parseNumberCell(requireText(row.length ?? "", `${base}.length`), `${base}.length`),
        width: parseNumberCell(requireText(row.width ?? "", `${base}.width`), `${base}.width`),
        height: parseNumberCell(requireText(row.height ?? "", `${base}.height`), `${base}.height`),
      },
      actualWeightLb: parseNumberCell(
        requireText(row.actual_weight_lb ?? "", `${base}.actual_weight_lb`),
        `${base}.actual_weight_lb`,
      ),
      zone: requireText(row.zone ?? "", `${base}.zone`),
      ...(declaredValue
        ? { declaredValueCents: parseUsdToCents(declaredValue, `${base}.declared_value_usd`) }
        : {}),
      residential: parseTriStateCell(cell(row.residential), `${base}.residential`),
      addressCorrection: parseTriStateCell(cell(row.address_correction), `${base}.address_correction`),
      ...(promisedDate ? { promisedDate: parseDateCell(promisedDate, `${base}.promised_date`) } : {}),
      ...(deliveredAt ? { deliveredAt: parseDateCell(deliveredAt, `${base}.delivered_at`) } : {}),
    } satisfies ShipmentRecord;
  });

  return { records, unmappedColumns: parsedTable.unmappedColumns };
}

export function parseSurchargesCell(value: string, fieldPath: string): InvoiceLine["surcharges"] {
  const raw = value.trim();
  if (!raw) return [];
  return raw.split(";").map((entry, index) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      throw new ParcelAuditFieldError(
        "pp-field-invalid",
        `${fieldPath}[${index}]`,
        `empty surcharge entry in "${value}" — expected code:amount pairs separated by ";".`,
      );
    }
    const separator = trimmed.lastIndexOf(":");
    if (separator <= 0) {
      throw new ParcelAuditFieldError(
        "pp-field-invalid",
        `${fieldPath}[${index}]`,
        `"${trimmed}" is not a code:amount pair.`,
      );
    }
    const code = trimmed.slice(0, separator).trim();
    const amount = trimmed.slice(separator + 1).trim();
    return { code, amountCents: parseUsdToCents(amount, `${fieldPath}[${index}]`) };
  });
}

export interface InvoiceLinesIngest {
  lines: InvoiceLine[];
  unmappedColumns: string[];
}

export function parseInvoiceLinesCsv(text: string): InvoiceLinesIngest {
  const parsed = parseCsvText(text);
  requireColumns(parsed, ["tracking", "invoice_date", "billed_weight_lb", "zone", "base_charge_usd", "total_usd"], [], "invoiceLines");
  const parsedTable = table(parsed, INVOICE_LINES_HEADERS);

  const lines = parsedTable.records.map(({ row, rowNumber }) => {
    const base = `invoiceLines[row ${rowNumber}]`;
    const carrier = cell(row.carrier);
    const service = cell(row.service);
    const billedLength = cell(row.billed_length);
    const billedWidth = cell(row.billed_width);
    const billedHeight = cell(row.billed_height);
    const anyBilledDim = Boolean(billedLength || billedWidth || billedHeight);
    if (anyBilledDim && !(billedLength && billedWidth && billedHeight)) {
      throw new ParcelAuditFieldError(
        "pp-field-missing",
        `${base}.billed_length|billed_width|billed_height`,
        "billed dimensions must be supplied for all three sides or none.",
      );
    }
    const fuelPct = cell(row.fuel_pct);
    return {
      tracking: requireText(row.tracking ?? "", `${base}.tracking`),
      ...(carrier ? { carrier: parseCarrierCell(carrier, `${base}.carrier`) } : {}),
      ...(service ? { service: parseServiceCell(service, `${base}.service`) } : {}),
      billedWeightLb: parseNumberCell(
        requireText(row.billed_weight_lb ?? "", `${base}.billed_weight_lb`),
        `${base}.billed_weight_lb`,
      ),
      ...(anyBilledDim
        ? {
            billedDims: {
              length: parseNumberCell(billedLength, `${base}.billed_length`),
              width: parseNumberCell(billedWidth, `${base}.billed_width`),
              height: parseNumberCell(billedHeight, `${base}.billed_height`),
            },
          }
        : {}),
      zone: requireText(row.zone ?? "", `${base}.zone`),
      baseChargeCents: parseUsdToCents(
        requireText(row.base_charge_usd ?? "", `${base}.base_charge_usd`),
        `${base}.base_charge_usd`,
      ),
      surcharges: parseSurchargesCell(cell(row.surcharges), `${base}.surcharges`),
      ...(fuelPct ? { fuelPct: parseNumberCell(fuelPct, `${base}.fuel_pct`) } : {}),
      totalCents: parseUsdToCents(
        requireText(row.total_usd ?? "", `${base}.total_usd`),
        `${base}.total_usd`,
      ),
      invoiceDate: parseDateCell(
        requireText(row.invoice_date ?? "", `${base}.invoice_date`),
        `${base}.invoice_date`,
      ),
    } satisfies InvoiceLine;
  });

  return { lines, unmappedColumns: parsedTable.unmappedColumns };
}

export interface RateCardIngest {
  rateCard: RateCard;
  unmappedColumns: string[];
}

export function parseRateCardCsv(text: string): RateCardIngest {
  const parsed = parseCsvText(text);
  requireColumns(parsed, ["carrier", "service", "zone", "min_weight_lb", "rate_usd"], [], "rateCard");
  const parsedTable = table(parsed, RATE_CARD_HEADERS);

  const rows = parsedTable.records.map(({ row, rowNumber }) => {
    const base = `rateCard[row ${rowNumber}]`;
    const maxWeight = cell(row.max_weight_lb);
    return {
      carrier: parseCarrierCell(row.carrier ?? "", `${base}.carrier`),
      service: parseServiceCell(row.service ?? "", `${base}.service`),
      zone: requireText(row.zone ?? "", `${base}.zone`),
      minWeightLb: parseNumberCell(
        requireText(row.min_weight_lb ?? "", `${base}.min_weight_lb`),
        `${base}.min_weight_lb`,
      ),
      maxWeightLb: maxWeight ? parseNumberCell(maxWeight, `${base}.max_weight_lb`) : null,
      rateCents: parseUsdToCents(
        requireText(row.rate_usd ?? "", `${base}.rate_usd`),
        `${base}.rate_usd`,
      ),
    };
  });

  return {
    rateCard: { rows, source: "customer contract rate card" },
    unmappedColumns: parsedTable.unmappedColumns,
  };
}

/** Escapes one CSV cell: quote when it contains a delimiter, a quote or a newline. */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvEscape).join(",");
}
