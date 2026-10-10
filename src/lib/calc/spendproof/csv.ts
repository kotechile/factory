/**
 * CSV ingest for SpendProof's two inputs.
 *
 * Both files are the ones the two sides of the reconciliation actually produce:
 *  - the provider invoice's line items, in the DECLARED field set the extraction layer fills
 *    (`provider, period, service, model, quantity, unit_price, amount, sku`, plus the document's own
 *    printed total so the balancing invariant has something to check against),
 *  - the organization's own tagged-usage ledger export.
 *
 * Parsing is STRICT and header-driven. A malformed cell, a missing column or a blank required value
 * throws a `SpendProofFieldError` naming the column and the row — a file the audit cannot read is
 * never partially reconciled, and a blank amount is never read as $0 (rule 5). Columns present in
 * the file that the audit does not map are returned, not swallowed.
 */
import { SpendProofFieldError, parseUsdToMicros, requireInteger } from "./money";
import { isoDay } from "./dates";
import type { Invoice, InvoiceLine, Ledger, LedgerRow } from "./types";

export const INVOICE_HEADERS = [
  "provider",
  "period_start",
  "period_end",
  "service",
  "model",
  "sku",
  "quantity",
  "unit_price_usd_per_thousand",
  "amount_usd",
  "invoice_total_usd",
] as const;

export const LEDGER_HEADERS = [
  "bucket",
  "service",
  "model",
  "sku",
  "quantity",
  "timestamp",
] as const;

/** Minimal RFC-4180-ish reader: quoted fields, embedded commas, CRLF. */
export function parseCsvRows(text: string, fieldPath: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (quoted) {
    throw new SpendProofFieldError(
      "sp-csv-unterminated",
      fieldPath,
      `\`${fieldPath}\` has an unterminated quoted field. Nothing was reconciled.`,
    );
  }
  if (cell !== "" || row.length > 0) pushRow();

  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ""));
}

interface HeaderMap {
  index: Map<string, number>;
  unmappedColumns: string[];
}

function readHeader(header: string[], required: readonly string[], fieldPath: string): HeaderMap {
  const index = new Map<string, number>();
  header.forEach((name, position) => {
    const key = name.trim().toLowerCase();
    if (key && !index.has(key)) index.set(key, position);
  });
  const missing = required.filter((name) => !index.has(name));
  if (missing.length > 0) {
    throw new SpendProofFieldError(
      "sp-csv-header",
      fieldPath,
      `\`${fieldPath}\` is missing the column(s) ${missing.map((name) => `'${name}'`).join(", ")}. Expected header: ${required.join(",")}. Nothing was reconciled.`,
    );
  }
  const unmappedColumns = [...index.keys()].filter(
    (name) => !required.includes(name) && name !== "",
  );
  return { index, unmappedColumns };
}

function cellString(row: string[], header: HeaderMap, name: string, fieldPath: string): string {
  const position = header.index.get(name);
  const raw = position === undefined ? undefined : row[position];
  const value = (raw ?? "").trim();
  if (value === "") {
    throw new SpendProofFieldError(
      "sp-field-missing",
      `${fieldPath}.${name}`,
      `\`${name}\` is blank on this row. A blank declared value blocks the reconciliation; it is never read as zero. Nothing was reconciled.`,
    );
  }
  return value;
}

export interface InvoiceCsvIngest {
  invoice: Invoice;
  unmappedColumns: string[];
}

/**
 * Reads the declared invoice. The document-level fields (provider, period, printed total) are
 * carried on every line and must agree: a file that claims two different periods or two different
 * totals is a file whose document identity is ambiguous, and it is refused rather than guessed.
 */
export function parseInvoiceCsv(text: string): InvoiceCsvIngest {
  const rows = parseCsvRows(text, "invoice");
  if (rows.length === 0) {
    throw new SpendProofFieldError(
      "sp-csv-empty",
      "invoice",
      "The invoice line items are empty. Nothing was reconciled.",
    );
  }
  const [headerRow, ...dataRows] = rows;
  const header = readHeader(headerRow, INVOICE_HEADERS, "invoice");

  let provider: string | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let totalMicroUsd: number | null = null;

  const lines: InvoiceLine[] = dataRows.map((row, position) => {
    const fieldPath = `invoice[${position + 1}]`;

    const rowProvider = cellString(row, header, "provider", fieldPath);
    const rowStart = isoDay(cellString(row, header, "period_start", fieldPath), `${fieldPath}.period_start`);
    const rowEnd = isoDay(cellString(row, header, "period_end", fieldPath), `${fieldPath}.period_end`);
    const rowTotal = parseUsdToMicros(
      cellString(row, header, "invoice_total_usd", fieldPath),
      `${fieldPath}.invoice_total_usd`,
    );

    if (provider === null) {
      provider = rowProvider;
      periodStart = rowStart;
      periodEnd = rowEnd;
      totalMicroUsd = rowTotal;
    } else if (
      provider !== rowProvider ||
      periodStart !== rowStart ||
      periodEnd !== rowEnd ||
      totalMicroUsd !== rowTotal
    ) {
      throw new SpendProofFieldError(
        "sp-field-invalid",
        fieldPath,
        `This row declares a different provider, period or invoice total than row 1 (${provider} ${periodStart}..${periodEnd} total ${totalMicroUsd} micro-USD). One file is one invoice; split the documents. Nothing was reconciled.`,
      );
    }

    return {
      service: cellString(row, header, "service", fieldPath),
      model: cellString(row, header, "model", fieldPath),
      sku: cellString(row, header, "sku", fieldPath),
      quantity: requireInteger(
        cellString(row, header, "quantity", fieldPath),
        `${fieldPath}.quantity`,
      ),
      unitPriceMicroUsdPerThousandUnits: parseUsdToMicros(
        cellString(row, header, "unit_price_usd_per_thousand", fieldPath),
        `${fieldPath}.unit_price_usd_per_thousand`,
      ),
      amountMicroUsd: parseUsdToMicros(
        cellString(row, header, "amount_usd", fieldPath),
        `${fieldPath}.amount_usd`,
      ),
    };
  });

  if (provider === null || periodStart === null || periodEnd === null || totalMicroUsd === null) {
    throw new SpendProofFieldError(
      "sp-csv-empty",
      "invoice",
      "The invoice carries a header but no line items. Nothing was reconciled.",
    );
  }

  return {
    invoice: {
      provider,
      period: { start: periodStart, end: periodEnd },
      currency: "USD",
      totalMicroUsd,
      lines,
    },
    unmappedColumns: header.unmappedColumns,
  };
}

export interface LedgerIngest {
  ledger: Ledger;
  unmappedColumns: string[];
}

export function parseLedgerCsv(text: string): LedgerIngest {
  const rows = parseCsvRows(text, "ledger");
  if (rows.length === 0) {
    throw new SpendProofFieldError(
      "sp-csv-empty",
      "ledger",
      "The tagged-usage ledger is empty. Nothing was reconciled.",
    );
  }
  const [headerRow, ...dataRows] = rows;
  const header = readHeader(headerRow, LEDGER_HEADERS, "ledger");
  const bucketPosition = header.index.get("bucket");

  const ledgerRows: LedgerRow[] = dataRows.map((row, position) => {
    const fieldPath = `ledger[${position + 1}]`;
    const bucketRaw = bucketPosition === undefined ? "" : (row[bucketPosition] ?? "").trim();
    return {
      // A blank bucket is the `unattributed` case — carried through as null, never filled in.
      bucket: bucketRaw === "" ? null : bucketRaw,
      service: cellString(row, header, "service", fieldPath),
      model: cellString(row, header, "model", fieldPath),
      sku: cellString(row, header, "sku", fieldPath),
      quantity: requireInteger(cellString(row, header, "quantity", fieldPath), `${fieldPath}.quantity`),
      timestamp: cellString(row, header, "timestamp", fieldPath),
    };
  });

  return { ledger: { rows: ledgerRows }, unmappedColumns: header.unmappedColumns };
}

/** Serializes rows back to CSV (used by the close pack's evidence table). */
export function csvRow(cells: readonly (string | number)[]): string {
  return cells
    .map((cell) => {
      const text = String(cell);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
}
