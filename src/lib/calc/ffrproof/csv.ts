/**
 * Deterministic CSV ingest for FFRProof's two structured inputs: the GL export and the approved
 * budget. These are the files the recipient's own accounting system produces — they are parsed
 * HERE, by header, never by a model (a model may read documents; it never parses a spreadsheet that
 * has a header row).
 *
 * Parsing is STRICT and header-driven. A malformed cell, a missing column or a blank required value
 * throws an `FFRProofFieldError` naming the column and the row — a file the audit cannot read is
 * never partially reconciled, and a blank amount is never read as $0 (rule 5). Columns present in
 * the file that the audit does not map are returned, not swallowed.
 */
import { FFRProofFieldError, parseUsdToCents } from "./money";
import type { ApprovedBudget, BudgetLine, GlExport, GlLine } from "./types";

export const GL_HEADERS = ["category", "actual_usd"] as const;
export const BUDGET_HEADERS = ["category", "approved_usd"] as const;

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
    throw new FFRProofFieldError(
      "ffr-csv-unterminated",
      fieldPath,
      `\`${fieldPath}\` has an unterminated quoted field. Nothing was audited.`,
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
    throw new FFRProofFieldError(
      "ffr-csv-header",
      fieldPath,
      `\`${fieldPath}\` is missing the column(s) ${missing.map((name) => `'${name}'`).join(", ")}. Expected header: ${required.join(",")}. Nothing was audited.`,
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
    throw new FFRProofFieldError(
      "ffr-field-missing",
      `${fieldPath}.${name}`,
      `\`${name}\` is blank on this row. A blank declared value blocks the audit; it is never read as zero. Nothing was audited.`,
    );
  }
  return value;
}

export interface GlCsvIngest {
  glExport: GlExport;
  unmappedColumns: string[];
}

export function parseGlExportCsv(text: string): GlCsvIngest {
  const rows = parseCsvRows(text, "glExport");
  if (rows.length === 0) {
    throw new FFRProofFieldError(
      "ffr-csv-empty",
      "glExport",
      "The GL export is empty. Nothing was audited.",
    );
  }
  const [headerRow, ...dataRows] = rows;
  const header = readHeader(headerRow, GL_HEADERS, "glExport");

  const lines: GlLine[] = dataRows.map((row, position) => {
    const fieldPath = `glExport[${position + 1}]`;
    return {
      category: cellString(row, header, "category", fieldPath),
      actualCents: parseUsdToCents(cellString(row, header, "actual_usd", fieldPath), `${fieldPath}.actual_usd`),
    };
  });

  if (lines.length === 0) {
    throw new FFRProofFieldError(
      "ffr-csv-empty",
      "glExport",
      "The GL export carries a header but no line items. Nothing was audited.",
    );
  }

  return {
    glExport: {
      lines,
      totalActualCents: lines.reduce((sum, line) => sum + line.actualCents, 0),
    },
    unmappedColumns: header.unmappedColumns,
  };
}

export interface BudgetCsvIngest {
  approvedBudget: ApprovedBudget;
  unmappedColumns: string[];
}

export function parseApprovedBudgetCsv(text: string): BudgetCsvIngest {
  const rows = parseCsvRows(text, "approvedBudget");
  if (rows.length === 0) {
    throw new FFRProofFieldError(
      "ffr-csv-empty",
      "approvedBudget",
      "The approved budget is empty. Nothing was audited.",
    );
  }
  const [headerRow, ...dataRows] = rows;
  const header = readHeader(headerRow, BUDGET_HEADERS, "approvedBudget");

  const lines: BudgetLine[] = dataRows.map((row, position) => {
    const fieldPath = `approvedBudget[${position + 1}]`;
    return {
      category: cellString(row, header, "category", fieldPath),
      approvedCents: parseUsdToCents(cellString(row, header, "approved_usd", fieldPath), `${fieldPath}.approved_usd`),
    };
  });

  if (lines.length === 0) {
    throw new FFRProofFieldError(
      "ffr-csv-empty",
      "approvedBudget",
      "The approved budget carries a header but no line items. Nothing was audited.",
    );
  }

  return {
    approvedBudget: {
      lines,
      totalApprovedCents: lines.reduce((sum, line) => sum + line.approvedCents, 0),
    },
    unmappedColumns: header.unmappedColumns,
  };
}
