/**
 * EN 16931 core rules, ordered by measured rejection frequency (PRD §2):
 * specification identifier → dates → currency → party names → reconciliation totals → VAT
 * category/rate coherence.
 *
 * Rule ids are the EN 16931 specification's own identifiers (`BR-*`, `BR-CO-*`, the per-category
 * `BR-S-*` / `BR-Z-*` / `BR-E-*` / `BR-AE-*` / `BR-IC-*` / `BR-G-*` / `BR-O-*` families). Checks this
 * engine implements that are not pinned to a numbered EN 16931 rule use the documented
 * `BR-FG-*` factory namespace (see types.ts).
 */
import { toCents } from "../reconcile";
import { isIso4217 } from "../vat";
import type { InvoiceTotals, ProfileCode, Reconciliation, VatCategory } from "../types";
import { isFilled, isFiniteNumber, isIsoDate, type Rule, type RuleFinding } from "./engine";

/** Profile codes below EN 16931 are rejected by the French mandate (see rules/ciusFr.ts). */
export function parseSpecificationProfile(specificationId?: string): ProfileCode {
  const value = (specificationId ?? "").trim().toLowerCase();
  if (!value) return "UNRECOGNISED";
  if (/factur-x\.eu:1p0:minimum|zugferd.*minimum/.test(value)) return "MINIMUM";
  if (/factur-x\.eu:1p0:basic-wl/.test(value)) return "BASIC_WL";
  if (/factur-x\.eu:1p0:basic\b/.test(value)) return "BASIC";
  if (/extended-ctc-fr/.test(value)) return "EXTENDED_CTC_FR";
  if (/factur-x\.eu:1p0:extended/.test(value)) return "EXTENDED";
  if (/factur-x\.eu:1p0:en16931/.test(value)) return "EN16931";
  if (value === "urn:cen.eu:en16931:2017") return "EN16931";
  if (/urn:cen\.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung/.test(value)) {
    return "EN16931";
  }
  if (/urn:cen\.eu:en16931:2017#compliant#urn:mf\.gov\.pl/.test(value)) return "EN16931";
  if (/peppol\.eu:2017:poacc:billing:(3\.0|01:1\.0)/.test(value)) return "EN16931";
  return "UNRECOGNISED";
}

/** EN 16931 accepts this subset of UNTDID 1001 document type codes. */
export const EN16931_TYPE_CODES: readonly string[] = [
  "326", "380", "384", "385", "386", "387", "388", "389", "390", "393", "394", "395", "396",
  "420", "456", "457", "458", "527", "575", "623", "780", "817", "870", "875", "876", "877",
];

/** UN/ECE Recommendation 20 unit codes accepted in v1 (BT-130). */
export const REC20_UNIT_CODES: readonly string[] = [
  "ANN", "C62", "DAY", "EA", "E48", "GRM", "H87", "HUR", "KGM", "KWH", "LTR", "MIN", "MON",
  "MTK", "MTQ", "MTR", "NAR", "PCE", "SEC", "SET", "SMI", "TNE", "WEE",
];

/** VAT-category prefixes used by the per-category rule families. */
export const CATEGORY_RULE_PREFIX: Record<VatCategory, string> = {
  S: "BR-S",
  Z: "BR-Z",
  E: "BR-E",
  AE: "BR-AE",
  K: "BR-IC",
  G: "BR-G",
  O: "BR-O",
};

/** Categories for which EN 16931 requires an exemption reason (BT-120) on the VAT breakdown. */
export const CATEGORIES_REQUIRING_EXEMPTION_REASON: readonly VatCategory[] = ["E", "AE", "K", "G", "O"];

/** Every VAT category this engine models, in canonical order. */
export const ALL_CATEGORIES: readonly VatCategory[] = ["S", "Z", "E", "AE", "K", "G", "O"];

/** A rated category that must carry a rate > 0. */
const RATED_CATEGORIES: readonly VatCategory[] = ["S"];
/** Categories that must carry a rate of exactly 0. */
const ZERO_RATE_CATEGORIES: readonly VatCategory[] = ["Z", "E", "AE", "K", "G", "O"];

const PROFILE_LABELS: Record<ProfileCode, string> = {
  MINIMUM: "Factur-X MINIMUM",
  BASIC_WL: "Factur-X BASIC WL",
  BASIC: "Factur-X BASIC",
  EN16931: "EN 16931",
  EXTENDED: "Factur-X EXTENDED",
  EXTENDED_CTC_FR: "Factur-X EXTENDED-CTC-FR",
  UNRECOGNISED: "unrecognised",
};

const BELOW_EN16931: readonly ProfileCode[] = ["MINIMUM", "BASIC_WL", "BASIC"];

function linePath(index: number, field: string): string {
  return `invoice.lines[${index}].${field}`;
}

function groupPath(index: number, field: string): string {
  return `invoice.vatBreakdown[${index}].${field}`;
}

/** Per-category VAT rate coherence, checked on every line and every declared VAT group. */
function categoryRateRule(category: VatCategory, expected: "positive" | "zero"): Rule {
  const prefix = CATEGORY_RULE_PREFIX[category];
  return {
    ruleId: `${prefix}-05`,
    severity: "blocking",
    fieldPath: "invoice.lines[].vatRate",
    message:
      expected === "positive"
        ? `VAT category ${category} requires a VAT rate greater than zero.`
        : `VAT category ${category} requires a VAT rate of exactly 0.`,
    fix:
      expected === "positive"
        ? `Set the line VAT rate (BT-152) above 0 for category ${category}, or move the line to the category that matches its rate.`
        : `Set the VAT rate (BT-152 / BT-119) to 0 for category ${category}; if VAT is charged, use category S.`,
    check: ({ input }) => {
      const raised: RuleFinding[] = [];
      (input.invoice?.lines ?? []).forEach((line, index) => {
        if (line.vatCategory !== category || !isFiniteNumber(line.vatRate)) return;
        const ok = expected === "positive" ? line.vatRate > 0 : line.vatRate === 0;
        if (!ok) raised.push({ fieldPath: linePath(index, "vatRate") });
      });
      (input.invoice?.vatBreakdown ?? []).forEach((group, index) => {
        if (group.category !== category || !isFiniteNumber(group.rate)) return;
        const ok = expected === "positive" ? group.rate > 0 : group.rate === 0;
        if (!ok) raised.push({ fieldPath: groupPath(index, "rate") });
      });
      return raised;
    },
  };
}

/** EN 16931 requires the street, post code and city of a party postal address (BG-5 / BG-8). */
const ADDRESS_FIELDS = ["line1", "postCode", "city"] as const;

function addressRule(party: "seller" | "buyer", ruleId: string): Rule {
  return {
    ruleId,
    severity: "blocking",
    fieldPath: `${party}.address.line1`,
    message: `The ${party} postal address is incomplete — EN 16931 requires street, post code and city.`,
    fix: `Populate ${party}.address.line1, ${party}.address.postCode and ${party}.address.city from the ERP master data; a partially mapped address is rejected by the platform.`,
    check: ({ input }) => {
      const address = (party === "seller" ? input.seller : input.buyer)?.address;
      return ADDRESS_FIELDS.filter((field) => !isFilled(address?.[field])).map((field) => ({
        fieldPath: `${party}.address.${field}`,
      }));
    },
  };
}

/**
 * Per-category taxable amount (BT-116) reconciliation: the sum of the invoice lines carrying that
 * category + rate, compared with the declared VAT breakdown group.
 */
function categoryTaxableAmountRule(category: VatCategory): Rule {
  const prefix = CATEGORY_RULE_PREFIX[category];
  return {
    ruleId: `${prefix}-08`,
    severity: "blocking",
    fieldPath: "invoice.vatBreakdown[].taxableAmount",
    message: `The VAT breakdown taxable amount (BT-116) for category ${category} does not equal the sum of the matching invoice lines.`,
    fix:
      "Recompute BT-116 from the lines carrying this category and rate (lines − line allowances + line charges) — the platform recomputes it and will not accept a cached figure.",
    requiresReconciliation: true,
    check: ({ input, reconciliation }) => {
      if (!reconciliation) return [];
      const declared = input.invoice?.vatBreakdown ?? [];
      const raised: RuleFinding[] = [];
      reconciliation.vatByBreakdown.forEach((computed) => {
        if (computed.category !== category) return;
        const index = declared.findIndex(
          (group) => group.category === computed.category && isFiniteNumber(group.rate) && group.rate === computed.rate,
        );
        if (index === -1) return;
        const group = declared[index];
        if (!isFiniteNumber(group.taxableAmount)) return;
        if (toCents(group.taxableAmount) !== toCents(computed.taxableAmount)) {
          raised.push({ fieldPath: groupPath(index, "taxableAmount") });
        }
      });
      return raised;
    },
  };
}

function exemptionReasonRule(category: VatCategory): Rule {
  const prefix = CATEGORY_RULE_PREFIX[category];
  return {
    ruleId: `${prefix}-10`,
    severity: "blocking",
    fieldPath: "invoice.vatBreakdown[].exemptionReason",
    message: `VAT category ${category} requires an exemption reason (BT-120) on the VAT breakdown group.`,
    fix: `Add the legal exemption reference to the category ${category} VAT group, e.g. "VAT exempt — art. 261 CGI" or the reverse-charge/export wording your platform expects.`,
    check: ({ input }) => {
      const raised: RuleFinding[] = [];
      (input.invoice?.vatBreakdown ?? []).forEach((group, index) => {
        if (group.category !== category) return;
        if (!isFilled(group.exemptionReason)) raised.push({ fieldPath: groupPath(index, "exemptionReason") });
      });
      return raised;
    },
  };
}

/**
 * BR-CO-* totals reconciliation: the *declared* value is compared against the recomputed one.
 * A value the document did not declare is never invented — those cases are covered by the
 * BR-FG-09 presence rule, and the recomputed figure is always visible in `reconciliation`.
 */
function totalsRule(
  ruleId: string,
  fieldPath: string,
  message: string,
  fix: string,
  compare: (declared: InvoiceTotals, computed: Reconciliation) => boolean,
  isDeclared: (declared: InvoiceTotals) => boolean,
): Rule {
  return {
    ruleId,
    severity: "blocking",
    fieldPath,
    message,
    fix,
    requiresReconciliation: true,
    check: ({ input, reconciliation }) => {
      if (!reconciliation) return [];
      const declared = input.invoice?.totals ?? {};
      if (!isDeclared(declared)) return [];
      return compare(declared, reconciliation) ? [] : [{}];
    },
  };
}

export const EN16931_RULES: readonly Rule[] = [
  {
    ruleId: "BR-01",
    severity: "blocking",
    fieldPath: "invoice.specificationId",
    message: "The invoice must carry a current specification identifier (BT-24).",
    fix:
      'Set specificationId to the identifier of the guideline you target — e.g. "urn:cen.eu:en16931:2017" (core CII/UBL), "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:en16931" (Factur-X EN 16931) or the Peppol BIS 3.0 identifier.',
    check: ({ input }) => {
      const id = input.invoice?.specificationId;
      if (!isFilled(id)) {
        return [{ message: "Specification identifier (BT-24) is missing." }];
      }
      const profile = parseSpecificationProfile(id);
      if (profile === "UNRECOGNISED") {
        return [
          {
            message: `Specification identifier "${id}" is stale or unrecognised; a platform cannot resolve the profile from it.`,
            fix: 'Replace BT-24 with a current guideline identifier ("urn:cen.eu:en16931:2017", a Factur-X 1.0 profile, Peppol BIS 3.0 or the national CIUS identifier) — hard-coded template values are the usual cause.',
          },
        ];
      }
      return [];
    },
  },
  {
    ruleId: "BR-02",
    severity: "blocking",
    fieldPath: "invoice.number",
    message: "The invoice must carry an invoice number (BT-1).",
    fix: "Populate invoice.number from the issuing system; do not let the serializer emit an empty <cbc:ID>/<ram:ID>.",
    check: ({ input }) => (isFilled(input.invoice?.number) ? [] : [{}]),
  },
  {
    ruleId: "BR-03",
    severity: "blocking",
    fieldPath: "invoice.issueDate",
    message: "The issue date (BT-2) must be an ISO 8601 calendar date (YYYY-MM-DD).",
    fix:
      'Convert locale-formatted dates ("21/04/2026", "04/21/2026") to ISO 8601 before serializing — XSD date validation rejects everything else.',
    check: ({ input }) => {
      const value = input.invoice?.issueDate;
      if (!isFilled(value)) return [{ message: "Issue date (BT-2) is missing." }];
      return isIsoDate(value) ? [] : [{}];
    },
  },
  {
    ruleId: "BR-04",
    severity: "blocking",
    fieldPath: "invoice.typeCode",
    message: "The invoice must carry a document type code (BT-3) from the EN 16931 subset of UNTDID 1001.",
    fix: "Set invoice.typeCode to 380 (commercial invoice) unless the document really is a credit note (381) or another listed code.",
    check: ({ input }) => {
      const value = input.invoice?.typeCode;
      if (!isFilled(value)) return [{ message: "Document type code (BT-3) is missing." }];
      return EN16931_TYPE_CODES.includes(value.trim()) ? [] : [{}];
    },
  },
  {
    ruleId: "BR-05",
    severity: "blocking",
    fieldPath: "invoice.currency",
    message: "The invoice currency (BT-5) must be an ISO 4217 three-letter code.",
    fix: 'Send "EUR", not "Euro", "€" or a locale display name — display strings are rejected by every platform.',
    check: ({ input }) => {
      const value = input.invoice?.currency;
      if (!isFilled(value)) return [{ message: "Invoice currency code (BT-5) is missing." }];
      return isIso4217(value) ? [] : [{}];
    },
  },
  {
    ruleId: "BR-06",
    severity: "blocking",
    fieldPath: "seller.name",
    message: "The invoice must contain the seller name (BT-27).",
    fix: "Map the ERP's legal-entity name to seller.name — the trade name alone is not enough for a compliant invoice.",
    check: ({ input }) => (isFilled(input.seller?.name) ? [] : [{}]),
  },
  {
    ruleId: "BR-06",
    severity: "advisory",
    fieldPath: "seller.legalName",
    message: "No separate registered/trading name (BT-28) is present for the seller; the party name (BT-27) is all the document carries.",
    fix: "Add seller.legalName when the ERP holds a registered name distinct from the invoicing name — buyer AP matching and the FR identity check use it.",
    check: ({ input }) => (isFilled(input.seller?.name) && !isFilled(input.seller?.legalName) ? [{}] : []),
  },
  {
    ruleId: "BR-07",
    severity: "blocking",
    fieldPath: "buyer.name",
    message: "The invoice must contain the buyer name (BT-44).",
    fix: "Map the counterparty's legal name to buyer.name.",
    check: ({ input }) => (isFilled(input.buyer?.name) ? [] : [{}]),
  },
  {
    ruleId: "BR-07",
    severity: "advisory",
    fieldPath: "buyer.legalName",
    message: "No separate registered/trading name (BT-28) is present for the buyer.",
    fix: "Add buyer.legalName (BT-28) so the recipient's AP system can match the invoice to its register entry.",
    check: ({ input }) => (isFilled(input.buyer?.name) && !isFilled(input.buyer?.legalName) ? [{}] : []),
  },
  addressRule("seller", "BR-08"),
  {
    ruleId: "BR-09",
    severity: "blocking",
    fieldPath: "seller.address.country",
    message: "The seller country code (BT-40) is missing.",
    fix: "Set seller.address.country to the ISO 3166-1 alpha-2 code (e.g. FR) — country names are rejected.",
    check: ({ input }) => (isFilled(input.seller?.address?.country) ? [] : [{}]),
  },
  addressRule("buyer", "BR-10"),
  {
    ruleId: "BR-11",
    severity: "blocking",
    fieldPath: "buyer.address.country",
    message: "The buyer country code (BT-55) is missing.",
    fix: "Set buyer.address.country to the ISO 3166-1 alpha-2 code.",
    check: ({ input }) => (isFilled(input.buyer?.address?.country) ? [] : [{}]),
  },
  {
    ruleId: "BR-CO-26",
    severity: "blocking",
    fieldPath: "seller.vatId",
    message: "The seller cannot be automatically identified: none of seller identifier (BT-29), legal registration id (BT-30) or VAT id (BT-31) is present.",
    fix: "Send the seller VAT identifier (and the SIRET for France). Without one, the platform cannot resolve the issuer.",
    check: ({ input }) =>
      isFilled(input.seller?.vatId) || isFilled(input.seller?.siret) || isFilled(input.seller?.legalRegistrationId)
        ? []
        : [{}],
  },
  {
    ruleId: "BR-16",
    severity: "blocking",
    fieldPath: "invoice.lines",
    message: "The invoice must contain at least one invoice line (BG-25).",
    fix: "Send the invoice lines; an empty document cannot be validated or converted.",
    check: ({ input }) => ((input.invoice?.lines ?? []).length > 0 ? [] : [{}]),
  },
  {
    ruleId: "BR-21",
    severity: "blocking",
    fieldPath: "invoice.lines[].id",
    message: "Each invoice line must carry a line identifier (BT-126).",
    fix: "Number the lines from the source document; do not rely on document order.",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) => (isFilled(line.id) ? [] : [{ fieldPath: linePath(index, "id") }])),
  },
  {
    ruleId: "BR-22",
    severity: "blocking",
    fieldPath: "invoice.lines[].quantity",
    message: "Each invoice line must carry an invoiced quantity (BT-129).",
    fix: "Populate the quantity (and unit code) per line — a line without a quantity cannot be recalculated by the platform.",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFiniteNumber(line.quantity) ? [] : [{ fieldPath: linePath(index, "quantity") }],
      ),
  },
  {
    ruleId: "BR-23",
    severity: "blocking",
    fieldPath: "invoice.lines[].unitCode",
    message: "Each invoice line must carry a unit of measure code (BT-130).",
    fix: "Send the UN/ECE Rec 20 unit code (C62 = piece/unit, HUR = hour, KGM = kilogram).",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFilled(line.unitCode) ? [] : [{ fieldPath: linePath(index, "unitCode") }],
      ),
  },
  {
    ruleId: "BR-24",
    severity: "blocking",
    fieldPath: "invoice.lines[].lineNetAmount",
    message: "Each invoice line must carry an invoice line net amount (BT-131).",
    fix: "Provide lineNetAmount, or the quantity + item net price the platform can multiply — never leave it to the receiver to guess.",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFiniteNumber(line.lineNetAmount) ? [] : [{ fieldPath: linePath(index, "lineNetAmount") }],
      ),
  },
  {
    ruleId: "BR-26",
    severity: "blocking",
    fieldPath: "invoice.lines[].description",
    message: "Each invoice line must carry an item name (BT-153).",
    fix: "Add the line description; an empty <ram:Name> / <cbc:Name> is rejected.",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFilled(line.description) ? [] : [{ fieldPath: linePath(index, "description") }],
      ),
  },
  {
    ruleId: "BR-27",
    severity: "blocking",
    fieldPath: "invoice.lines[].unitPrice",
    message: "Each invoice line must carry a non-negative item net price (BT-146).",
    fix: "Set the item net price (0 is allowed for free-of-charge lines; negative prices are not).",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFiniteNumber(line.unitPrice) && line.unitPrice >= 0 ? [] : [{ fieldPath: linePath(index, "unitPrice") }],
      ),
  },
  {
    ruleId: "BR-FG-01",
    severity: "blocking",
    fieldPath: "invoice.lines[].vatCategory",
    message: "Each invoice line must carry a VAT category code (BT-151).",
    fix: "Set the line VAT category: S (standard), Z (zero), E (exempt), AE (reverse charge), K (intra-community), G (export), O (out of scope).",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFilled(line.vatCategory) ? [] : [{ fieldPath: linePath(index, "vatCategory") }],
      ),
  },
  {
    ruleId: "BR-FG-02",
    severity: "blocking",
    fieldPath: "invoice.lines[].vatRate",
    message: "Each invoice line must carry the VAT rate that applies to it (BT-152).",
    fix: "Send the numeric rate (20, 10, 5.5, 2.1 or 0). A missing rate is not read as 0.",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFiniteNumber(line.vatRate) ? [] : [{ fieldPath: linePath(index, "vatRate") }],
      ),
  },
  {
    ruleId: "BR-FG-03",
    severity: "blocking",
    fieldPath: "invoice.lines[].unitCode",
    message: "The line unit of measure code is not a UN/ECE Rec 20 code this engine recognises.",
    fix: `Use a Rec 20 code (${REC20_UNIT_CODES.join(", ")}). Free-text units ("pcs", "Stk") are rejected by the platform.`,
    check: ({ input }) =>
      (input.invoice?.lines ?? []).flatMap((line, index) =>
        isFilled(line.unitCode) && !REC20_UNIT_CODES.includes(line.unitCode.trim()) ? [{ fieldPath: linePath(index, "unitCode") }] : [],
      ),
  },
  ...RATED_CATEGORIES.map((category) => categoryRateRule(category, "positive")),
  ...ZERO_RATE_CATEGORIES.map((category) => categoryRateRule(category, "zero")),
  {
    ruleId: "BR-FG-05",
    severity: "blocking",
    fieldPath: "invoice.vatBreakdown",
    message: "The invoice must contain at least one VAT breakdown group (BG-23).",
    fix: "Group the lines by VAT category + rate into the VAT breakdown; the platform recomputes the totals from it.",
    check: ({ input }) =>
      (input.invoice?.lines ?? []).length > 0 && (input.invoice?.vatBreakdown ?? []).length === 0 ? [{}] : [],
  },
  {
    ruleId: "BR-FG-04",
    severity: "blocking",
    fieldPath: "invoice.vatBreakdown[]",
    message: "A line's VAT category + rate has no matching VAT breakdown group.",
    fix: "Add a VAT breakdown group for every distinct (category, rate) pair used by the lines, with its taxable amount and tax amount.",
    check: ({ input }) => {
      const groups = input.invoice?.vatBreakdown ?? [];
      const seen = new Set<string>();
      const raised: RuleFinding[] = [];
      (input.invoice?.lines ?? []).forEach((line, index) => {
        if (!isFilled(line.vatCategory) || !isFiniteNumber(line.vatRate)) return;
        const key = `${line.vatCategory}@${line.vatRate}`;
        if (seen.has(key)) return;
        seen.add(key);
        const match = groups.some(
          (group) => group.category === line.vatCategory && isFiniteNumber(group.rate) && group.rate === line.vatRate,
        );
        if (!match) {
          raised.push({
            fieldPath: linePath(index, "vatCategory"),
            message: `No VAT breakdown group for category ${line.vatCategory} at rate ${line.vatRate}%.`,
          });
        }
      });
      return raised;
    },
  },
  {
    ruleId: "BR-FG-06",
    severity: "advisory",
    fieldPath: "invoice",
    message: "An amount or rate carries more than two decimals — the platform will round it and may disagree with the lines.",
    fix: "Send amounts at cent precision: pre-round in the ERP instead of letting the validator round for you.",
    check: ({ input }) => {
      const amounts: Array<[string, number | undefined]> = [];
      (input.invoice?.lines ?? []).forEach((line, index) => {
        amounts.push([linePath(index, "unitPrice"), line.unitPrice]);
        amounts.push([linePath(index, "lineNetAmount"), line.lineNetAmount]);
      });
      amounts.push(["invoice.totals.taxExclusive", input.invoice?.totals?.taxExclusive]);
      amounts.push(["invoice.totals.grandTotal", input.invoice?.totals?.grandTotal]);
      const offenders = amounts.filter(([, value]) => isFiniteNumber(value) && Math.abs(value * 100 - Math.round(value * 100)) > 1e-9);
      if (offenders.length === 0) return [];
      return [
        {
          fieldPath: offenders[0][0],
          message: `Sub-cent precision on ${offenders.map(([path]) => path).join(", ")}.`,
        },
      ];
    },
  },
  ...CATEGORIES_REQUIRING_EXEMPTION_REASON.map((category) => exemptionReasonRule(category)),
  ...ALL_CATEGORIES.map((category) => categoryTaxableAmountRule(category)),
  {
    ruleId: "BR-FG-09",
    severity: "blocking",
    fieldPath: "invoice.totals",
    message: "The document omits a mandatory header monetary total (BT-106 / BT-109 / BT-110 / BT-112).",
    fix:
      "Declare the sum of line net amounts, the total without VAT, the total VAT and the total with VAT. The converter recomputes them, but a document that omits them is rejected upstream.",
    check: ({ input }) => {
      const totals = input.invoice?.totals ?? {};
      const required: Array<[string, number | undefined]> = [
        ["invoice.totals.lineNetSum", totals.lineNetSum],
        ["invoice.totals.taxExclusive", totals.taxExclusive],
        ["invoice.totals.vatTotal", totals.vatTotal],
        ["invoice.totals.grandTotal", totals.grandTotal],
      ];
      return required
        .filter(([, value]) => !isFiniteNumber(value))
        .map(([fieldPath]) => ({ fieldPath }));
    },
  },
  totalsRule(
    "BR-CO-10",
    "invoice.totals.lineNetSum",
    "The declared sum of invoice line net amounts (BT-106) does not equal the sum of the lines.",
    "Make the ERP recompute BT-106 from the lines it serializes; a stale cached total is the usual cause.",
    (declared, computed) => toCents(declared.lineNetSum ?? 0) === toCents(computed.lineNetSum),
    (declared) => isFiniteNumber(declared.lineNetSum),
  ),
  totalsRule(
    "BR-CO-11",
    "invoice.totals.allowances",
    "The declared sum of document-level allowances (BT-107) does not equal the allowances in the document.",
    "Recompute BT-107 from the document-level allowances.",
    (declared, computed) => toCents(declared.allowances ?? 0) === toCents(computed.allowances),
    (declared) => isFiniteNumber(declared.allowances),
  ),
  totalsRule(
    "BR-CO-12",
    "invoice.totals.charges",
    "The declared sum of document-level charges (BT-108) does not equal the charges in the document.",
    "Recompute BT-108 from the document-level charges.",
    (declared, computed) => toCents(declared.charges ?? 0) === toCents(computed.charges),
    (declared) => isFiniteNumber(declared.charges),
  ),
  totalsRule(
    "BR-CO-13",
    "invoice.totals.taxExclusive",
    "The declared invoice total without VAT (BT-109) does not equal lines − allowances + charges.",
    "Recompute BT-109 as BT-106 − BT-107 + BT-108; totals drift to the cent when a template caches one of the three.",
    (declared) => {
      const expected =
        toCents(declared.lineNetSum ?? 0) - toCents(declared.allowances ?? 0) + toCents(declared.charges ?? 0);
      return toCents(declared.taxExclusive ?? 0) === expected;
    },
    (declared) => isFiniteNumber(declared.taxExclusive),
  ),
  totalsRule(
    "BR-CO-14",
    "invoice.totals.vatTotal",
    "The declared invoice total VAT amount (BT-110) does not equal the sum of the VAT breakdown tax amounts.",
    "Recompute BT-110 as the sum of BT-117 across the VAT breakdown groups — and mind the country's rounding rule.",
    (declared, computed) => toCents(declared.vatTotal ?? 0) === toCents(computed.vatTotal),
    (declared) => isFiniteNumber(declared.vatTotal),
  ),
  totalsRule(
    "BR-CO-15",
    "invoice.totals.grandTotal",
    "The declared invoice total with VAT (BT-112) does not equal total without VAT + total VAT.",
    "Recompute BT-112 as BT-109 + BT-110.",
    (declared) => toCents(declared.grandTotal ?? 0) === toCents(declared.taxExclusive ?? 0) + toCents(declared.vatTotal ?? 0),
    (declared) => isFiniteNumber(declared.grandTotal),
  ),
  totalsRule(
    "BR-CO-16",
    "invoice.totals.amountDue",
    "The declared amount due for payment (BT-115) does not equal total with VAT − paid + rounding.",
    "Recompute BT-115 as BT-112 − BT-113 + BT-114. An absent prepayment or rounding amount means zero, never an invented figure.",
    (declared) => {
      const expected =
        toCents(declared.grandTotal ?? 0) - toCents(declared.paidAmount ?? 0) + toCents(declared.roundingAmount ?? 0);
      return toCents(declared.amountDue ?? 0) === expected;
    },
    (declared) => isFiniteNumber(declared.amountDue),
  ),
  {
    ruleId: "BR-CO-17",
    severity: "blocking",
    fieldPath: "invoice.vatBreakdown[].taxAmount",
    message: "A VAT breakdown tax amount (BT-117) does not equal its taxable amount × rate.",
    fix: "Recompute BT-117 = BT-116 × BT-119 ÷ 100, applying the target country's rounding rule.",
    requiresReconciliation: true,
    check: ({ input, reconciliation }) => {
      if (!reconciliation) return [];
      const declared = input.invoice?.vatBreakdown ?? [];
      const raised: RuleFinding[] = [];
      reconciliation.vatByBreakdown.forEach((computed) => {
        const index = declared.findIndex(
          (group) => group.category === computed.category && isFiniteNumber(group.rate) && group.rate === computed.rate,
        );
        if (index === -1) return;
        const group = declared[index];
        if (!isFiniteNumber(group.taxAmount)) return;
        if (toCents(group.taxAmount) !== toCents(computed.taxAmount)) {
          raised.push({ fieldPath: groupPath(index, "taxAmount") });
        }
      });
      return raised;
    },
  },
  {
    ruleId: "BR-CO-25",
    severity: "blocking",
    fieldPath: "invoice.dueDate",
    message: "The amount due is positive but neither a payment due date (BT-9) nor payment terms (BT-20) is present.",
    fix: "Send the payment due date or the payment terms — a positive amount due without either is a documented rejection.",
    requiresReconciliation: true,
    check: ({ input, reconciliation }) => {
      if (!reconciliation) return [];
      const declaredDue = input.invoice?.totals?.amountDue;
      const due = isFiniteNumber(declaredDue) ? declaredDue : reconciliation.grandTotal;
      if (due <= 0) return [];
      const hasTerms = isFilled(input.invoice?.paymentTerms) || isFilled(input.invoice?.dueDate);
      return hasTerms ? [] : [{}];
    },
  },
  {
    ruleId: "BR-FG-08",
    severity: "advisory",
    fieldPath: "invoice.specificationId",
    message: "The document declares a profile below EN 16931 (MINIMUM / BASIC WL / BASIC).",
    fix:
      "Emit at the EN 16931 profile or above: library defaults to MINIMUM/BASIC are one of the top three e-invoicing integration failures.",
    check: ({ input, country }) => {
      if (country === "FR") return []; // FR blocks a sub-EN16931 profile outright (BR-FR-01)
      const profile = parseSpecificationProfile(input.invoice?.specificationId);
      return BELOW_EN16931.includes(profile)
        ? [{ message: `Declared profile: ${PROFILE_LABELS[profile]} — below EN 16931.` }]
        : [];
    },
  },
];

export { BELOW_EN16931, PROFILE_LABELS };
