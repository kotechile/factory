/**
 * CanopyProof — the commodity-scope screen against a VENDORED, VERSION-STAMPED SUBSET of Annex I to
 * Regulation (EU) 2023/1115 as consolidated on 18 September 2026.
 *
 * Entry points:
 * - `screenCommodity(code, operatorSize, commodity, asOf)` — in_scope / out_of_scope / unknown_code
 *   / not_yet_applicable, with the day the obligation starts for that line.
 * - `matchCnCode(code)` — the longest-heading prefix match, or null.
 * - `applicabilityDateFor(entry, operatorSize)` — the dated rule, isolated so it can be tested.
 * - `CN_TABLE` / `CN_TABLE_VERSION` / `CN_TABLE_SOURCE` — the table the report cites.
 *
 * ── What this table is, and what it is not ─────────────────────────────────────────────────────
 * It is a SUBSET: twelve headings covering the seven in-scope commodities (wood 4401/4403/4407/4410,
 * cocoa 1801, coffee 0901, palm oil 1511, soy 1201, rubber 4001, cattle 0102/0102 21/0102 29), plus
 * three headings vendored only as out-of-scope controls so the screen is demonstrably capable of
 * saying "no" (tea 0902, coconut/palm-kernel oil 1513, rice 1006).
 *
 * A CN code that is not in this table — including any of the 64 lines Delegated Regulation (EU)
 * 2026/2102 amended on 18 September 2026 — comes back `unknown_code`, which BLOCKS. It is never
 * resolved by prefix guesswork against a neighbouring heading and never treated as out of scope.
 * Refreshing the table is a deliberate, dated act; the report prints the stamp it ran against, so
 * an auditor can see exactly which list the verdict was produced on.
 *
 * ── The dated rule (Art. 38 as amended by Regulation (EU) 2025/2650) ──────────────────────────
 * - 30 December 2026 — large and medium operators, and timber SMEs (wood, whatever their size);
 * - 30 June 2027 — micro and small operators for the non-timber commodities;
 * - 30 December 2027 — lines added to Annex I by Delegated Regulation (EU) 2026/2102.
 * The date depends only on the operator's size band and the commodity, never on the plot. `asOf` is
 * supplied by the caller: the engine has no clock.
 */
import type { CnCodeEntry, Commodity, OperatorSize, ScopeResult } from "./types";
import { CanopyProofInputError } from "./errors";

export const CN_TABLE_VERSION = "2026-09-18 consolidated, subset";

export const CN_TABLE_SOURCE =
  "Annex I to Regulation (EU) 2023/1115, consolidated 18 September 2026 (Delegated Regulation (EU) 2026/2102), vendored subset";

export const APPLICABILITY_DATES = {
  /** Large and medium operators, and timber SMEs. */
  standard: "2026-12-30",
  /** Micro and small operators, non-timber commodities. */
  microSmallNonTimber: "2027-06-30",
  /** Lines added to Annex I by Delegated Regulation (EU) 2026/2102. */
  addedBy2026Act: "2027-12-30",
} as const;

function entry(
  code: string,
  commodity: Commodity | null,
  description: string,
  inScope = true,
): CnCodeEntry {
  return {
    code,
    normalized: code.replace(/[^0-9]/g, ""),
    commodity,
    description,
    inScope,
    // No line of the subset is one of the 64 amended by the 2026 act. The date rule below is live
    // for the day a refreshed table carries one; marking a real heading as "added" without the
    // consolidated text would be inventing a legal date, which this product refuses to do.
    addedBy2026Act: false,
  };
}

export const CN_TABLE: readonly CnCodeEntry[] = [
  // wood
  entry(
    "4401",
    "wood",
    "Fuel wood, in logs, in billets, in twigs, in faggots or in similar forms; wood in chips or particles; sawdust and wood waste and scrap, whether or not agglomerated in logs, briquettes, pellets or similar forms",
  ),
  entry(
    "4403",
    "wood",
    "Wood in the rough, whether or not stripped of bark or sapwood, or roughly squared",
  ),
  entry(
    "4407",
    "wood",
    "Wood sawn or chipped lengthwise, sliced or peeled, whether or not planed, sanded or end-jointed, of a thickness exceeding 6 mm",
  ),
  entry(
    "4410",
    "wood",
    "Particle board, oriented strand board (OSB) and similar board of wood or other ligneous materials, whether or not agglomerated with resins or other organic binding substances",
  ),
  // cocoa
  entry("1801", "cocoa", "Cocoa beans, whole or broken, raw or roasted"),
  // coffee
  entry(
    "0901",
    "coffee",
    "Coffee, whether or not roasted or decaffeinated; coffee husks and skins; coffee substitutes containing coffee in any proportion",
  ),
  // palm oil
  entry(
    "1511",
    "palm_oil",
    "Palm oil and its fractions, whether or not refined, but not chemically modified",
  ),
  // soy
  entry("1201", "soy", "Soya beans, whether or not broken"),
  // rubber
  entry(
    "4001",
    "rubber",
    "Natural rubber, balata, gutta-percha, guayule, chicle and similar natural gums, in primary forms or in plates, sheets or strip",
  ),
  // cattle
  entry("0102", "cattle", "Live bovine animals"),
  entry("0102 21", "cattle", "Live bovine animals: pure-bred breeding animals"),
  entry("0102 29", "cattle", "Live bovine animals: other than pure-bred breeding animals"),
  // out-of-scope controls — vendored so the screen can prove it says "no"
  entry("0902", null, "Tea, whether or not flavoured — not listed in Annex I", false),
  entry(
    "1513",
    null,
    "Coconut (copra), palm kernel or babassu oil and fractions thereof — not listed in Annex I",
    false,
  ),
  entry("1006", null, "Rice — not listed in Annex I", false),
];

/** Digits only: the form a supplier's `4407 11 90` and the table's `4407` are compared in. */
export function normalizeCnCode(code: string): string {
  return code.replace(/[^0-9]/g, "");
}

/**
 * Longest-heading prefix match. A 10-digit CN subheading matches its heading; a code shorter than
 * every candidate heading matches nothing and is `unknown_code`.
 */
export function matchCnCode(code: string): CnCodeEntry | null {
  const normalized = normalizeCnCode(code);
  if (normalized.length === 0) return null;
  let best: CnCodeEntry | null = null;
  for (const candidate of CN_TABLE) {
    if (normalized.startsWith(candidate.normalized)) {
      if (best === null || candidate.normalized.length > best.normalized.length) best = candidate;
    }
  }
  return best;
}

/** ISO `YYYY-MM-DD`, calendar-valid. Throws rather than coercing a date the caller got wrong. */
export function assertIsoDate(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CanopyProofInputError(
      "cp-asof-format",
      field,
      `\`${field}\` must be an ISO date (YYYY-MM-DD); received ${JSON.stringify(value)}. Nothing was audited.`,
    );
  }
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const parsed = new Date(Date.UTC(year!, month! - 1, day!));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month! - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new CanopyProofInputError(
      "cp-asof-format",
      field,
      `\`${field}\` is not a calendar date (${value}). Nothing was audited.`,
    );
  }
  return value;
}

/**
 * The day the obligation starts for a matched heading. Timber SMEs keep the 30 December 2026 date:
 * the SME deferral to 30 June 2027 is for the non-timber commodities only.
 */
export function applicabilityDateFor(entryValue: CnCodeEntry, operatorSize: OperatorSize): string {
  if (entryValue.addedBy2026Act) return APPLICABILITY_DATES.addedBy2026Act;
  if (operatorSize === "micro" || operatorSize === "small") {
    return entryValue.commodity === "wood"
      ? APPLICABILITY_DATES.standard
      : APPLICABILITY_DATES.microSmallNonTimber;
  }
  return APPLICABILITY_DATES.standard;
}

const OPERATOR_SIZES: readonly OperatorSize[] = ["large", "medium", "small", "micro"];

export function screenCommodity(
  code: string,
  operatorSize: OperatorSize,
  commodity: Commodity,
  asOf: string,
): ScopeResult {
  if (typeof code !== "string" || code.trim() === "") {
    throw new CanopyProofInputError(
      "cp-cn-code-missing",
      "cnCode",
      "`cnCode` is required to screen a product line; nothing was screened and nothing was guessed.",
    );
  }
  if (!OPERATOR_SIZES.includes(operatorSize)) {
    throw new CanopyProofInputError(
      "cp-operator-size",
      "operator.size",
      `\`operator.size\` must be one of ${OPERATOR_SIZES.join(", ")}; received ${JSON.stringify(operatorSize)}. Nothing was audited.`,
    );
  }
  const date = assertIsoDate(asOf, "asOf");
  const normalizedCode = normalizeCnCode(code);
  const matched = matchCnCode(code);

  if (matched === null) {
    return {
      code,
      normalizedCode,
      status: "unknown_code",
      commodity,
      tableCommodity: null,
      matchedCode: null,
      description: null,
      appliesFrom: null,
      blocks: true,
      reason:
        `CN code ${code} is not in the vendored Annex I subset (${CN_TABLE_VERSION}). Its status is ` +
        "unverifiable: the engine neither guesses it from a neighbouring heading nor calls it out of scope.",
    };
  }

  if (!matched.inScope) {
    return {
      code,
      normalizedCode,
      status: "out_of_scope",
      commodity,
      tableCommodity: matched.commodity,
      matchedCode: matched.code,
      description: matched.description,
      appliesFrom: null,
      blocks: false,
      reason: `${matched.code} — ${matched.description}. No due-diligence statement is due for this line.`,
    };
  }

  const appliesFrom = applicabilityDateFor(matched, operatorSize);
  if (date < appliesFrom) {
    return {
      code,
      normalizedCode,
      status: "not_yet_applicable",
      commodity,
      tableCommodity: matched.commodity,
      matchedCode: matched.code,
      description: matched.description,
      appliesFrom,
      blocks: false,
      reason:
        `CN ${matched.code} is in Annex I, but a ${operatorSize} operator's obligation for ` +
        `${matched.commodity} starts on ${appliesFrom}; the batch is screened as of ${date}.`,
    };
  }

  return {
    code,
    normalizedCode,
    status: "in_scope",
    commodity,
    tableCommodity: matched.commodity,
    matchedCode: matched.code,
    description: matched.description,
    appliesFrom,
    blocks: false,
    reason: `CN ${matched.code} is in Annex I; the ${operatorSize} operator's obligation applies from ${appliesFrom}.`,
  };
}
