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

/**
 * Header synonyms for the files a shipper actually has.
 *
 * A UPS Billing Center CSV, a FedEx billing export and a ShipStation/NetSuite/TMS manifest all name
 * the same field differently ("Tracking Number" / "tracking_no"), and a column that differs only in
 * case, spacing or a "(lb)" suffix is not a different field. Matching is therefore done on the
 * NORMALISED header (`normaliseHeader`), and this table lists the plain-English names the audit has
 * seen used for each canonical field. It is a synonym list, NOT a claim about any one vendor's
 * schema: a column nothing here recognises stays unmapped and is reported to the reader (and a file
 * whose columns cannot be resolved fails loudly, naming the columns it does have — rule 5).
 *
 * The carrier's own header row is what makes a file readable. A headerless positional export (the
 * 270-column UPS Billing Data file, for example) has no column names at all, so it is refused with
 * the instruction to download the headed summary or add the published header row.
 */
const HEADER_SYNONYMS: Record<string, readonly string[]> = {
  // --- both files ---------------------------------------------------------------------------
  tracking: [
    "tracking",
    "tracking_number",
    "tracking_no",
    "tracking_num",
    "trackingnumber",
    "tracking_id",
    "package_tracking_number",
    "shipment_tracking_number",
    "tracking_number_1",
    "tracker",
  ],
  carrier: [
    "carrier",
    "carrier_name",
    "carrier_code",
    "carrier_id",
    "service_carrier",
    "shipper_carrier",
  ],
  service: [
    "service",
    "service_type",
    "service_code",
    "service_level",
    "service_name",
    "service_description",
    "product",
    "product_code",
    "product_name",
    "package_type",
    "mail_class",
  ],
  zone: ["zone", "zone_number", "zone_no", "zone_code", "rate_zone", "dest_zone", "destination_zone", "to_zone"],
  // --- shipment records (what the shipper handed over) ---------------------------------------
  order_id: [
    "order_id",
    "order_number",
    "order_no",
    "order",
    "reference",
    "reference_number",
    "customer_reference",
    "shipment_id",
    "shipment_reference",
  ],
  ship_date: [
    "ship_date",
    "shipment_date",
    "shipped_date",
    "ship_dt",
    "date_shipped",
    "manifest_date",
    "pickup_date",
    "ship_date_utc",
  ],
  length: ["length", "length_in", "length_inches", "package_length", "dim_length", "l_in"],
  width: ["width", "width_in", "width_inches", "package_width", "dim_width", "w_in"],
  height: ["height", "height_in", "height_inches", "package_height", "dim_height", "h_in"],
  actual_weight_lb: [
    "actual_weight_lb",
    "actual_weight_lbs",
    "actual_weight",
    "weight",
    "weight_lb",
    "weight_lbs",
    "scale_weight",
    "scale_weight_lb",
    "gross_weight",
    "package_weight",
    "shipped_weight",
  ],
  declared_value_usd: ["declared_value_usd", "declared_value", "insured_value", "insured_value_usd", "declared_value_usd_amount"],
  residential: ["residential", "is_residential", "residential_delivery", "resi", "residential_indicator"],
  address_correction: [
    "address_correction",
    "address_correction_billed",
    "address_correction_indicator",
    "address_correction_flag",
  ],
  promised_date: [
    "promised_date",
    "committed_date",
    "guaranteed_delivery_date",
    "service_commitment_date",
    "expected_delivery_date",
    "scheduled_delivery_date",
    "promise_date",
  ],
  delivered_at: [
    "delivered_at",
    "delivery_date",
    "delivered_date",
    "actual_delivery_date",
    "delivery_timestamp",
    "delivered_timestamp",
    "delivered_on",
  ],
  // --- invoice lines (what the carrier billed) ------------------------------------------------
  invoice_date: ["invoice_date", "invoice_dt", "bill_date", "billing_date", "invoice_day", "invoice_period_date"],
  billed_weight_lb: [
    "billed_weight_lb",
    "billed_weight_lbs",
    "billed_weight",
    "billable_weight_lb",
    "billable_weight",
    "weight_billed",
    "billed_package_weight",
  ],
  billed_length: ["billed_length", "billed_length_in", "measured_length", "measured_length_in"],
  billed_width: ["billed_width", "billed_width_in", "measured_width", "measured_width_in"],
  billed_height: ["billed_height", "billed_height_in", "measured_height", "measured_height_in"],
  base_charge_usd: [
    "base_charge_usd",
    "base_charge",
    "base_amount",
    "base_rate",
    "base_charge_amount",
    "transportation_charge",
    "transportation_charges",
    "net_freight",
    "freight_charge",
    "freight_charges",
  ],
  surcharges: [
    "surcharges",
    "surcharge",
    "accessorials",
    "accessorial_charges",
    "additional_charges",
    "accessorial_detail",
  ],
  fuel_pct: ["fuel_pct", "fuel_percent", "fuel_surcharge_pct", "fuel_rate", "fuel_surcharge_percent"],
  total_usd: [
    "total_usd",
    "total",
    "total_charge",
    "total_charges",
    "net_amount",
    "net_charge",
    "net_charges",
    "invoice_amount",
    "billed_amount",
    "amount_billed",
    "charge_amount",
    "grand_total",
  ],
  // --- contract rate card ---------------------------------------------------------------------
  min_weight_lb: ["min_weight_lb", "min_weight", "minimum_weight", "weight_min", "from_lb", "start_lb", "weight_from"],
  max_weight_lb: ["max_weight_lb", "max_weight", "maximum_weight", "weight_max", "to_lb", "end_lb", "weight_to"],
  rate_usd: ["rate_usd", "rate", "price_usd", "price", "charge_usd", "amount_usd", "rate_amount", "net_rate"],
};

/**
 * Case, spacing, punctuation and unit suffixes are presentation, not identity: "Tracking Number",
 * "TRACKING_NO" and "tracking number (1)" are the same column. Everything is folded to lowercase
 * snake case so the synonym table has one form to match.
 */
export function normaliseHeader(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[%$#]/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Canonical field → the synonyms that may stand in for it. */
function synonymsFor(canonical: string): readonly string[] {
  return HEADER_SYNONYMS[canonical] ?? [];
}

interface HeaderMap {
  /** Canonical name for each column, or the file's own name when nothing recognised it. */
  header: string[];
  /** The column name exactly as the file spelled it — used in every message the reader sees. */
  original: string[];
}

/**
 * Maps a file's header row onto the audit's canonical fields. Two columns resolving to the same
 * field is refused rather than guessed: picking one silently would audit a column the shipper did
 * not choose.
 */
function mapHeader(parsed: ParsedCsv, known: readonly string[], csvName: string): HeaderMap {
  if (parsed.header.length === 0) {
    throw new ParcelAuditFieldError(
      "pp-field-missing",
      `${csvName}.header`,
      "the file has no header row, so no column could be mapped.",
    );
  }
  const canonicalFor = new Map<string, string>();
  known.forEach((canonical) => {
    canonicalFor.set(normaliseHeader(canonical), canonical);
    synonymsFor(canonical).forEach((synonym) => {
      const key = normaliseHeader(synonym);
      if (!canonicalFor.has(key)) canonicalFor.set(key, canonical);
    });
  });

  const header: string[] = [];
  const claimed = new Map<string, string>();
  parsed.header.forEach((raw, index) => {
    const key = normaliseHeader(raw);
    const canonical = key ? canonicalFor.get(key) : undefined;
    if (!canonical) {
      header.push(raw);
      return;
    }
    const already = claimed.get(canonical);
    if (already !== undefined) {
      throw new ParcelAuditFieldError(
        "pp-field-invalid",
        `${csvName}.${canonical}`,
        `two columns map to "${canonical}": "${already}" and "${raw}". Keep one — the audit will not choose a column for you.`,
      );
    }
    claimed.set(canonical, raw);
    header.push(canonical);
    void index;
  });

  return { header, original: parsed.header.slice() };
}

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
  // Header spelling is preserved (only trimmed): the reader sees the file's own column names in
  // every message, and matching happens on the normalised form in `mapHeader`.
  const header = rows[0].map((cell) => cell.trim());
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
  map: HeaderMap,
  required: readonly string[],
  requiredAny: readonly (readonly string[])[],
  csvName: string,
): void {
  if (parsed.header.length === 0) {
    throw new ParcelAuditFieldError(
      "pp-field-missing",
      `${csvName}.header`,
      "the file has no header row, so no column could be mapped. A positional export (no column names) cannot be audited: download the headed export, or add the carrier's published header row.",
    );
  }
  const present = new Set(map.header);
  const spelled = map.original.join(", ");
  for (const column of required) {
    if (!present.has(column)) {
      throw new ParcelAuditFieldError(
        "pp-field-missing",
        `${csvName}.${column}`,
        `required column "${column}" is missing. Your file's columns: ${spelled}. Accepted names for this field: ${Array.from(new Set([column, ...synonymsFor(column)])).join(", ")}.`,
      );
    }
  }
  for (const group of requiredAny) {
    if (!group.some((column) => present.has(column))) {
      throw new ParcelAuditFieldError(
        "pp-field-missing",
        `${csvName}.${group.join("|")}`,
        `at least one of ${group.map((c) => `"${c}"`).join(", ")} is required. Your file's columns: ${spelled}.`,
      );
    }
  }
}

function table(parsed: ParsedCsv, known: readonly string[], map: HeaderMap): CsvTable {
  const knownSet = new Set<string>(known);
  const unmappedColumns: string[] = [];
  map.header.forEach((column, index) => {
    const original = map.original[index] ?? column;
    if (original && !knownSet.has(column)) unmappedColumns.push(original);
  });
  return {
    header: map.header,
    byColumn: map.header.length,
    records: parsed.rows.map((cells, rowIndex) => {
      const row: Record<string, string> = {};
      map.header.forEach((column, columnIndex) => {
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
  const map = mapHeader(parsed, SHIPMENT_RECORDS_HEADERS, "shipmentRecords");
  requireColumns(parsed, map, ["tracking", "carrier", "service", "ship_date", "length", "width", "height", "actual_weight_lb", "zone"], [], "shipmentRecords");
  const parsedTable = table(parsed, SHIPMENT_RECORDS_HEADERS, map);

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
  const map = mapHeader(parsed, INVOICE_LINES_HEADERS, "invoiceLines");
  requireColumns(parsed, map, ["tracking", "invoice_date", "billed_weight_lb", "zone", "base_charge_usd", "total_usd"], [], "invoiceLines");
  const parsedTable = table(parsed, INVOICE_LINES_HEADERS, map);

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
  const map = mapHeader(parsed, RATE_CARD_HEADERS, "rateCard");
  requireColumns(parsed, map, ["carrier", "service", "zone", "min_weight_lb", "rate_usd"], [], "rateCard");
  const parsedTable = table(parsed, RATE_CARD_HEADERS, map);

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
