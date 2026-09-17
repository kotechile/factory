/**
 * Programmatic-SEO presets for FacturGate (PRD §4): one page per high-frequency rejection rule and
 * per country/format combination. Each slug is a pre-rendered `/facturgate/calc/<slug>` landing page
 * that pre-loads a document valid for that target, so the visitor lands on a working gate rather
 * than an empty textarea.
 *
 * Deliberately a handful of the highest-intent pages, not the full cross-product (PRD §5 scope
 * guard: no per-country coverage claim beyond FR/PL/BE/DE).
 */
import type { TargetCountry, TargetFormat } from "@/lib/calc/einvoice";

export interface EinvoiceSeoPreset {
  slug: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  bullets: string[];
  targetFormat: TargetFormat;
  targetCountry: TargetCountry;
}

export const einvoicePresets: EinvoiceSeoPreset[] = [
  {
    slug: "br-01-specification-identifier",
    title: "E-Invoice BR-01 Error: Missing or Stale Specification Identifier (BT-24)",
    description:
      "BR-01 explained: the invoice must carry a current specification identifier (BT-24). Check and fix a stale or empty CustomizationID, then emit Factur-X EN 16931.",
    heading: "BR-01 — Specification identifier missing or stale",
    intro:
      "A hard-coded or missing BT-24 is one of the most common rejection causes: the platform cannot resolve which guideline the document claims to follow.",
    bullets: [
      "Detects an empty or unrecognised BT-24 and names it as BR-01, with the identifier to send instead.",
      "Recognises the EN 16931 core, Factur-X 1.0 profiles, Peppol BIS 3.0 and the national CIUS identifiers.",
      "Blocks the Factur-X MINIMUM / BASIC profiles that a PDF library silently defaults to.",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "br-05-iso-4217-currency",
    title: "E-Invoice BR-05: Currency Must Be an ISO 4217 Code (not \u201cEuro\u201d)",
    description:
      "BR-05 explained: BT-5 must be an ISO 4217 three-letter code. Detect and fix display strings such as \u201cEuro\u201d or \u201c\u20ac\u201d before submission.",
    heading: "BR-05 — The currency is a display string, not ISO 4217",
    intro:
      "Templates render the currency for humans: \u201cEuro\u201d, \u20ac, \u201cEUR (2 d.p.)\u201d. XSD and platform validation accept only the three-letter ISO 4217 code.",
    bullets: [
      "Reports the offending value and the field path BT-5 sits at.",
      "Recomputes the totals in the corrected currency rather than copying a cached figure.",
      "Converts the document once the currency is a valid code.",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "br-06-seller-name",
    title: "E-Invoice BR-06 / BR-07: Seller and Buyer Names Required",
    description:
      "BR-06 and BR-07 explained: the seller (BT-27) and buyer (BT-44) names are mandatory. ERPs commonly export the trade name instead of the registered entity name.",
    heading: "BR-06 / BR-07 — Seller and buyer names",
    intro:
      "The single most common mapping failure: the ERP export carries the trading name where the standard requires the party name, and the platform rejects the document outright.",
    bullets: [
      "Flags a missing BT-27 / BT-44 as blocking and shows exactly which side is incomplete.",
      "Adds an advisory when no separate registered/trading name (BT-28 / BT-45) is present.",
      "Also checks the postal address the name pairs with (street, post code, city, country).",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "br-co-13-total-reconciliation",
    title: "E-Invoice BR-CO-13: Total Without VAT Must Equal Lines − Allowances + Charges",
    description:
      "BR-CO-13 explained: BT-109 = BT-106 − BT-107 + BT-108. See the exact cent drift between declared totals and the invoice lines, then emit corrected totals.",
    heading: "BR-CO-13 — Totals that drift from the lines",
    intro:
      "Cached totals drift to the cent when a template recomputes only one of the three figures. The gate recomputes every total from the lines and reports the exact delta.",
    bullets: [
      "Recomputes BT-106 / BT-109 / BT-110 / BT-112 from the lines and reports the drift delta.",
      "Names the specific read rule that failed (BR-CO-10 through BR-CO-17) with its field path.",
      "Applies the destination country's VAT rounding rule (per line vs at the total).",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "br-co-15-grand-total",
    title: "E-Invoice BR-CO-15: Grand Total Must Equal Total + VAT",
    description:
      "BR-CO-15 explained: BT-112 = BT-109 + BT-110. Catch a one-cent grand-total drift and emit a document whose summation is internally consistent.",
    heading: "BR-CO-15 — Grand total off by a cent",
    intro:
      "One cent is enough to reject an invoice — and the penalty for a non-compliant French B2B invoice is levied on the sender.",
    bullets: [
      "Reports the declared grand total, the recomputed one and the delta.",
      "Checks the whole chain in one pass: lines, VAT breakdown, total VAT, amount due.",
      "Emits the corrected artifact only when nothing blocks.",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "cius-fr-siret",
    title: "CIUS-FR SIRET Check: 14 Digits, Luhn-Valid, Both Parties",
    description:
      "The French mandate identifies both parties by SIRET. Validate the 14 digits and the Luhn check digit (La Poste SIREN 356000000 excepted) before you submit.",
    heading: "CIUS-FR — SIRET missing or failing the Luhn check",
    intro:
      "Since 2026-09-01 every French VAT-registered business must be able to receive structured e-invoices, and the CIUS-FR overlay requires a valid SIRET for both parties.",
    bullets: [
      "Blocks a missing or wrong-length SIRET and a SIRET that fails the Luhn check digit.",
      "Applies the La Poste SIREN 356000000 exception instead of flagging a false positive.",
      "For a non-French buyer, requires its VAT identifier and validates the national format.",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "cius-fr-vat-key",
    title: "French VAT Number Check: FR + VAT Key + SIREN (Key Formula)",
    description:
      "Validate a French VAT identifier offline: FR + 2-character key + 9-digit SIREN, with the key recomputed from the SIREN via the VAT-key formula.",
    heading: "CIUS-FR — French VAT identifier and VAT key",
    intro:
      "The key is not decorative: (12 + 3 \u00d7 SIREN mod 97) mod 97. A wrong key is a first-pass rejection, and it is cheap to catch before submission.",
    bullets: [
      "Recomputes the expected key and reports the mismatch when the key is numeric.",
      "Accepts alphabetically-keyed identifiers that exist but cannot be formula-checked.",
      "The same offline checker is exposed to agents as check_eu_vat_id.",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "factur-x-minimum-basic-blocked",
    title: "Factur-X MINIMUM / BASIC Profile Blocked: Emit at EN 16931 Instead",
    description:
      "PDF libraries default to the Factur-X MINIMUM or BASIC profiles, which the French mandate does not accept. Detect the profile and emit at EN 16931 instead.",
    heading: "Factur-X MINIMUM / BASIC — illegal for the French mandate",
    intro:
      "\u201cMany PDF libraries default to MINIMUM or BASIC\u201d is one of the top three integration failures. The gate resolves the profile from BT-24 and blocks anything below EN 16931 for France.",
    bullets: [
      "Blocks MINIMUM, BASIC WL and BASIC for a French target (BR-FR-01).",
      "Warns instead of blocking outside France, where the profile is legal.",
      "Emits the corrected artifact at the EN 16931 profile.",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "factur-x-fr-2026",
    title: "Factur-X / CII Converter for France (EN 16931, 2026 Mandate)",
    description:
      "Convert a canonical invoice into Factur-X/CII at the EN 16931 profile with the CIUS-FR checks applied: SIRET, French VAT key, mandatory totals and payment terms.",
    heading: "Factur-X / CII for France",
    intro:
      "The French receive obligation has applied since 2026-09-01, with large and mid-size issuers live on the same date and SMEs following in 2027. This page runs the full CIUS-FR gate.",
    bullets: [
      "CIUS-FR overlay: SIRET, French VAT identifier and VAT key, profile gate.",
      "Totals reconciled to the cent with per-line VAT rounding (French practice).",
      "Output: standalone CII XML at the EN 16931 profile (PDF/A-3 container is P1).",
    ],
    targetFormat: "facturx",
    targetCountry: "FR",
  },
  {
    slug: "ksef-fa3-pl",
    title: "Polish KSeF Invoice Check: VAT Rounding at the Total",
    description:
      "KSeF's grace period ends and penalties resume in 2027. Check a Polish-targeted invoice with rounded-at-total VAT, from a valid NIP to the reconciled grand total.",
    heading: "Poland (KSeF) — VAT rounded at the total",
    intro:
      "Poland rounds VAT at the total, not per line. An invoice built with per-line rounding drifts by a cent and is rejected; the gate applies the country's policy explicitly.",
    bullets: [
      "Applies total-level VAT rounding for a PL target and reports the policy it used.",
      "Validates NIP formats and checksums offline.",
      "States plainly that the national KSeF FA(3) XML is not emitted in v1 (EN 16931 CII/UBL only).",
    ],
    targetFormat: "ubl",
    targetCountry: "PL",
  },
  {
    slug: "peppol-bis-3-be",
    title: "Belgium Peppol BIS 3.0 E-Invoice Check (EN 16931 / UBL)",
    description:
      "Validate a Belgian Peppol BIS 3.0 invoice: EN 16931 rules, VAT-identifier formats and checksums, and a reconciled amount due.",
    heading: "Belgium — Peppol BIS 3.0 / EN 16931",
    intro:
      "Belgian B2B flows ride Peppol BIS 3.0 at the EN 16931 profile. The gate checks the UBL body, the VAT identifiers and the totals before the invoice leaves.",
    bullets: [
      "VAT identifier formats and checksums (BE mod 97) checked offline.",
      "EN 16931 core rules for lines, VAT breakdown and totals.",
      "Emits UBL 2.1 with the Peppol BIS 3.0 ProfileID.",
    ],
    targetFormat: "ubl",
    targetCountry: "BE",
  },
  {
    slug: "xrechnung-de",
    title: "German XRechnung / EN 16931 Pre-Send Check",
    description:
      "Germany's send obligation lands in 2027. Pre-check an XRechnung-style EN 16931 document: mandatory fields, VAT coherence and totals reconciliation.",
    heading: "Germany — XRechnung / EN 16931",
    intro:
      "XRechnung is a CIUS of EN 16931, so the same core rule set applies: mandatory parties and addresses, ISO currency and dates, VAT breakdown coherence and totals that reconcile.",
    bullets: [
      "Rejects the Factur-X MINIMUM / BASIC profiles as an advisory outside France.",
      "Checks the whole mandatory-field set with per-field rule ids and fixes.",
      "Emits UBL 2.1 or CII at the EN 16931 profile.",
    ],
    targetFormat: "ubl",
    targetCountry: "DE",
  },
];

export function getEinvoicePreset(slug: string): EinvoiceSeoPreset | undefined {
  return einvoicePresets.find((preset) => preset.slug === slug);
}
