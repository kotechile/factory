/**
 * The quote normalizer (PRD §2, archetype **b**) — the vendor's line items as CSV rows.
 *
 * Scope guard (PRD §5 v1): line items are **pasted or uploaded as CSV rows**. No PDF/OCR
 * extraction, no rate tables of our own, and — the rule that matters — a line-item value is only
 * ever **echoed back as the vendor stated it**. CaseProof never re-prices a vendor's line, invents
 * a maintenance percentage, or estimates utilisation.
 *
 * Rows the categorizer cannot map are counted and surfaced (`unmappedRows`), and a category the
 * quote never prices stays `unstated` for the cash model to refuse to guess.
 */
import type {
  BidOption,
  CapexLines,
  NormalizedQuote,
  QuoteCategory,
  QuoteLine,
} from "./types";
import { CaseProofInputError, roundCents } from "./money";

export const QUOTE_CSV_HEADER = "item,amount_usd,category,note";

/** Keyword → category. Longest/most specific first; an unmatched row is `unmapped`, never guessed. */
const CATEGORY_PATTERNS: { category: QuoteCategory; pattern: RegExp }[] = [
  { category: "maintenance", pattern: /maintenance|service plan|service contract|warranty|spares|preventive/i },
  { category: "integration", pattern: /integration|integrate|wms|erp|interface|api|middleware|host system|plc|software integration/i },
  { category: "facility", pattern: /facility|facilit|electrical|power|network|wifi|racking|mezzanine|floor|structural|sprinkler|hvac|permit/i },
  { category: "training", pattern: /training|train|onboarding|change management|documentation/i },
  { category: "software", pattern: /software|licen[cs]e|subscription|saas|fleet manager|control system/i },
  { category: "freight", pattern: /freight|shipping|delivery|logistics|crating|rigging/i },
  { category: "install", pattern: /install|commission|deploy|start[- ]?up|assembly|set[- ]?up/i },
  { category: "equipment", pattern: /robot|amr|agv|asrs|shuttle|conveyor|sorter|arm|tote|bin|dock|equipment|hardware|unit|vehicle|charger|battery|scanner|camera/i },
  { category: "other", pattern: /contingency|other|misc|professional|legal|insurance|bond/i },
];

const TOTAL_PATTERN = /^(grand\s+)?(project\s+|quote\s+|bid\s+|contract\s+)?total$|^total\b/i;

function categorize(item: string, explicit?: string): QuoteCategory {
  if (explicit && explicit.trim()) {
    const wanted = explicit.trim().toLowerCase();
    const known: QuoteCategory[] = [
      "equipment",
      "install",
      "freight",
      "integration",
      "facility",
      "training",
      "software",
      "maintenance",
      "other",
      "unmapped",
    ];
    const match = known.find((category) => category === wanted);
    if (!match) {
      throw new CaseProofInputError(
        "cp-quote-category",
        "quoteCsv.category",
        `Unknown quote category '${explicit.trim()}'. Supported: ${known.join(", ")}. Nothing was audited.`,
      );
    }
    return match;
  }
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(item)) return category;
  }
  return "unmapped";
}

/** Strict, quote-aware CSV split. A malformed file is an explicit failure naming the row. */
export function parseQuoteCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (inQuotes) {
      if (char === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

/** `$340,000`, `1234.5`, ` 12,345.67 ` → integer cents. Anything else fails loudly. */
export function parseUsdToCents(value: string, rowNumber: number, column: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  if (cleaned === "") {
    throw new CaseProofInputError(
      "cp-quote-empty-amount",
      `quoteCsv.row[${rowNumber}].${column}`,
      `Row ${rowNumber} has no ${column}: every quote line needs the amount the vendor stated. Nothing was audited.`,
    );
  }
  const negative = /^\(.*\)$/.test(cleaned) || cleaned.startsWith("-");
  const unsigned = cleaned.replace(/[()]/g, "").replace(/^-/, "");
  if (!/^\d+(\.\d+)?$/.test(unsigned)) {
    throw new CaseProofInputError(
      "cp-quote-amount",
      `quoteCsv.row[${rowNumber}].${column}`,
      `Row ${rowNumber}: '${value}' is not a dollar amount this engine can read. Nothing was audited.`,
    );
  }
  const cents = roundCents(Number(unsigned) * 100);
  return negative ? -cents : cents;
}

/**
 * Normalizes a quote CSV into echoable lines.
 *
 * The header must carry `item` and `amount_usd`; `category` and `note` are optional. A row whose
 * item reads as a total is captured as the quote's **stated total** rather than double-counted as
 * a line (a vendor total that disagrees with the itemized rows is a finding, not a rounding error).
 */
export function normalizeQuote(csv: string): NormalizedQuote {
  const rows = parseQuoteCsv(csv);
  if (rows.length === 0) {
    throw new CaseProofInputError(
      "cp-quote-empty",
      "option.quoteCsv",
      "The quote CSV is empty. Paste the vendor's line items (or remove the quote and let every cost line be reported unstated). Nothing was audited.",
    );
  }

  const header = rows[0]!.map((cell) => cell.trim().toLowerCase());
  const itemIndex = header.indexOf("item");
  const amountIndex = header.indexOf("amount_usd");
  if (itemIndex === -1 || amountIndex === -1) {
    throw new CaseProofInputError(
      "cp-quote-header",
      "option.quoteCsv",
      `The quote CSV must start with a header row containing 'item' and 'amount_usd' (e.g. \`${QUOTE_CSV_HEADER}\`); found: ${header.join(",") || "(empty)"}. Nothing was audited.`,
    );
  }
  const categoryIndex = header.indexOf("category");
  const noteIndex = header.indexOf("note");

  const lines: QuoteLine[] = [];
  const unmappedRows: number[] = [];
  const unpricedRows: number[] = [];
  const totalsByCategoryCents: Partial<Record<QuoteCategory, number>> = {};
  let statedTotalCents: number | null = null;
  let itemizedTotalCents = 0;

  for (let index = 1; index < rows.length; index += 1) {
    const cells = rows[index]!;
    const rowNumber = index + 1;
    const item = (cells[itemIndex] ?? "").trim();
    if (item === "") {
      throw new CaseProofInputError(
        "cp-quote-item-missing",
        `quoteCsv.row[${rowNumber}].item`,
        `Row ${rowNumber} has an amount but no item name — a line with no name cannot be categorized or confirmed. Nothing was audited.`,
      );
    }
    const amountCell = (cells[amountIndex] ?? "").trim();
    const category = categorize(item, categoryIndex === -1 ? undefined : cells[categoryIndex]);
    const note = noteIndex === -1 ? undefined : (cells[noteIndex] ?? "").trim() || undefined;

    // A blank amount is the vendor pricing nothing: the line is recorded as unpriced and its category
    // stays unstated (never zero). A non-numeric amount is a real failure and is refused.
    if (amountCell === "") {
      if (!TOTAL_PATTERN.test(item)) {
        unpricedRows.push(rowNumber);
        lines.push({
          row: rowNumber,
          item,
          cents: null,
          category: category === "unmapped" ? "other" : category,
          ...(note ? { note } : {}),
        });
        continue;
      }
      statedTotalCents = null;
      continue;
    }

    const cents = parseUsdToCents(amountCell, rowNumber, "amount_usd");
    if (TOTAL_PATTERN.test(item)) {
      statedTotalCents = cents;
      continue;
    }
    lines.push({ row: rowNumber, item, cents, category, ...(note ? { note } : {}) });
    if (category === "unmapped") {
      unmappedRows.push(rowNumber);
    } else {
      totalsByCategoryCents[category] = (totalsByCategoryCents[category] ?? 0) + cents;
    }
    itemizedTotalCents += cents;
  }

  return {
    lines,
    unmappedRows,
    unpricedRows,
    totalsByCategoryCents,
    statedTotalCents,
    itemizedTotalCents,
  };
}

export interface QuoteApplication {
  /** The option with the vendor's own line items filled in. */
  option: BidOption;
  /** The normalized quote when one was supplied (the lines as the vendor stated them). */
  quote: NormalizedQuote | null;
  /** One line per cost term: where the value came from (the quote, the case, or nowhere). */
  notes: string[];
  /** Cost terms neither the quote nor the case prices. */
  missingCategories: QuoteCategory[];
}

/**
 * Fills an option's cost terms from its quote.
 *
 * The quote is authoritative for what it prices (it is the vendor's own document and its values are
 * echoed, never re-priced); a cost term the case states *and* the quote prices differently is
 * reported as a divergence rather than silently overwritten. A term neither prices stays absent, so
 * the cash model reports it `unstated` instead of guessing.
 */
export function applyQuote(option: BidOption): QuoteApplication {
  if (!option.quoteCsv || !option.quoteCsv.trim()) {
    return { option, quote: null, notes: [], missingCategories: [] };
  }

  const quote = normalizeQuote(option.quoteCsv);
  const notes: string[] = [];
  const totals = quote.totalsByCategoryCents;
  const missingCategories: QuoteCategory[] = [];

  if (quote.statedTotalCents !== null && quote.statedTotalCents !== quote.itemizedTotalCents) {
    notes.push(
      `The quote states a total of $${(quote.statedTotalCents / 100).toLocaleString("en-US")} while its itemized rows sum to $${(
        quote.itemizedTotalCents / 100
      ).toLocaleString("en-US")} (difference $${((quote.statedTotalCents - quote.itemizedTotalCents) / 100).toLocaleString("en-US")}). The itemized rows are audited; the difference is a question for the vendor.`,
    );
  }
  if (quote.unmappedRows.length > 0) {
    notes.push(
      `${quote.unmappedRows.length} quote row${quote.unmappedRows.length === 1 ? "" : "s"} (row ${quote.unmappedRows.join(
        ", ",
      )}) could not be mapped to a cost category. The money still counts toward the project total; it is not assigned to a line the audit reads.`,
    );
  }
  if (quote.unpricedRows.length > 0) {
    notes.push(
      `${quote.unpricedRows.length} quote row${quote.unpricedRows.length === 1 ? "" : "s"} (row ${quote.unpricedRows.join(
        ", ",
      )}) carry no amount: the vendor priced nothing there, so the term stays unstated rather than being read as $0.`,
    );
  }

  const capex: CapexLines = {
    equipmentCents: option.capex?.equipmentCents ?? 0,
    ...(option.capex?.installCents === undefined ? {} : { installCents: option.capex.installCents }),
    ...(option.capex?.freightCents === undefined ? {} : { freightCents: option.capex.freightCents }),
    ...(option.capex?.recoveryYears === undefined ? {} : { recoveryYears: option.capex.recoveryYears }),
  };

  const take = (
    category: QuoteCategory,
    current: number | undefined,
    label: string,
    field: string,
  ): number | undefined => {
    const quoted = totals[category];
    if (quoted === undefined) {
      if (current === undefined) missingCategories.push(category);
      return current;
    }
    if (current !== undefined && current !== quoted) {
      notes.push(
        `${label}: the case states $${(current / 100).toLocaleString("en-US")} and the quote's own '${category}' line(s) total $${(
          quoted / 100
        ).toLocaleString("en-US")} — the quote is used and the divergence is reported (${field}).`,
      );
    }
    return quoted;
  };

  capex.equipmentCents = take("equipment", capex.equipmentCents, "Equipment", "capex.equipmentCents") ?? 0;
  const install = take("install", capex.installCents, "Installation", "capex.installCents");
  if (install !== undefined) capex.installCents = install;
  const freight = take("freight", capex.freightCents, "Freight", "capex.freightCents");
  if (freight !== undefined) capex.freightCents = freight;

  const integration = take("integration", option.integrationCostCents, "Integration", "integrationCostCents");
  const facility = take("facility", option.facilityCostCents, "Facility work", "facilityCostCents");
  const training = take("training", option.trainingCostCents, "Training", "trainingCostCents");
  const software = take("software", option.softwareAnnualCents, "Software", "softwareAnnualCents");
  const maintenance = take(
    "maintenance",
    option.maintenanceAnnualCents,
    "Maintenance",
    "maintenanceAnnualCents",
  );

  const next: BidOption = {
    ...option,
    capex,
    ...(integration === undefined ? {} : { integrationCostCents: integration }),
    ...(facility === undefined ? {} : { facilityCostCents: facility }),
    ...(training === undefined ? {} : { trainingCostCents: training }),
    ...(software === undefined ? {} : { softwareAnnualCents: software }),
    ...(maintenance === undefined ? {} : { maintenanceAnnualCents: maintenance }),
  };

  if (totals.maintenance !== undefined) {
    // The quote prices maintenance in dollars, so a percentage of capex would double-count it.
    if (option.maintenancePctOfCapex !== undefined) {
      notes.push(
        "Maintenance is priced by the quote's own line in dollars; no percentage of capex is applied.",
      );
    }
    delete next.maintenancePctOfCapex;
  }

  return { option: next, quote, notes, missingCategories };
}
