export type ProductStatus = "live" | "beta" | "killed";

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  status: ProductStatus;
  description: string;
  route: string;
  webmcpTools: string[];
  launchedAt: string;
  category: string;
  visibility?: "public" | "internal";
  /**
   * True when this product's pipeline calls an LLM or a document-parsing service (e.g. LlamaParse) as an
   * EXTRACTION layer, in front of its deterministic engine (owner, 2026-10-05 —
   * `context/tech_stack_capabilities.md` §2). Absent means deterministic-only.
   *
   * It is a pricing declaration, not a description: `src/products/pricing.test.ts` fails the build when an
   * LLM-backed product's metered rate undercuts the LLM floor, or when a deterministic product's rate
   * exceeds the deterministic ceiling. Declare it in the PRD at recon time so the price and the class ship
   * together instead of being reconciled later.
   */
  usesLlmPrimitive?: boolean;
}

// Single source of truth for every product the factory has shipped.
// The root directory page, telemetry, and the WebMCP catalog all read from here.
// Add a product by appending an entry — its route lives at src/app/<slug>/.
export const products: Product[] = [
  {
    slug: "quarterline",
    name: "QuarterLine",
    tagline: "2026 Self-Employment & QBI Tax Calculator",
    status: "killed",
    description:
      "Deterministic 2026 self-employment tax, Section 199A QBI deduction (statutory 20% rate), and safe-harbor estimated-payment calculator. Retired from active inventory following the Q3 2026 tax deadline window.",
    route: "/quarterline",
    webmcpTools: ["calculate_qbi_deduction", "calculate_quarterly_estimate"],
    launchedAt: "2026-08-31",
    category: "Finance",
    visibility: "public",
  },
  {
    slug: "ledgerlink",
    name: "LedgerLink",
    tagline: "Stripe Payout → GL Reconciliation Engine",
    status: "live",
    description:
      "Decomposes a netted Stripe payout (charges, refunds, chargebacks, fees, Connect transfers, FX) into categorized GL journal lines that sum to the payout net exactly. Xero/QuickBooks-ready CSV. Accepts a customer read-only Stripe restricted key or a pasted JSON export — never the factory account.",
    route: "/ledgerlink",
    webmcpTools: ["reconcile_stripe_payout"],
    launchedAt: "2026-09-09",
    category: "Finance",
    visibility: "public",
  },
  {
    slug: "facturgate",
    name: "FacturGate",
    tagline: "EU E-Invoice Pre-Send Gate & Factur-X / UBL Converter",
    status: "live",
    description:
      "Deterministic EN 16931 + CIUS-FR pre-send gate and converter for EU e-invoicing: the exact blocking rule list with field paths and fixes, totals reconciled to the cent with the drift delta, a 0-100 readiness score, and an artifact at the EN 16931 profile (Factur-X/CII or UBL 2.1). No LLM, no invented defaults — an unreadable or incomplete document fails loudly with its rule id.",
    route: "/facturgate",
    webmcpTools: ["validate_einvoice", "convert_invoice_to_facturx", "check_eu_vat_id"],
    launchedAt: "2026-09-17",
    category: "Compliance",
    visibility: "public",
  },
  {
    slug: "parcelproof",
    name: "ParcelProof",
    tagline: "Carrier Invoice DIM-Weight & Surcharge Audit",
    status: "live",
    description:
      "Deterministic audit of UPS/FedEx/USPS parcel invoices against the shipment records behind them: billable weight recomputed with the carrier × service × ship-date divisor (USPS 166 → 139 on 2026-07-12) and the round-up rule, accessorial eligibility re-evaluated with the trigger that failed named, late-delivery refund eligibility and the per-line dispute window (UPS ≈30 / FedEx ≈21 days), and a per-line recovery ledger with a dispute CSV. Reads the carrier's export as it comes — a UPS Billing Data / FedEx billing CSV or a shipping-platform manifest — mapping the common header names (Tracking Number, Billed Weight, Net Amount, Ship Date) automatically and reporting any column it cannot map. No LLM and no invented rates: a line is priced from your contract rate card, or, without one, from the charge the carrier itself billed for that same weight in the same lane (labelled an observation, never interpolated); a line neither can price is reported unverifiable, never guessed.",
    route: "/parcelproof",
    webmcpTools: ["audit_carrier_invoice", "compute_billable_weight"],
    launchedAt: "2026-09-18",
    category: "Logistics",
    visibility: "public",
  },
  {
    slug: "caseproof",
    name: "CaseProof",
    tagline: "Buyer-Side Audit of a Warehouse Automation Business Case",
    status: "live",
    description:
      "Re-runs a vendor's own quoted warehouse-automation numbers against the buyer's case: labour at the fully loaded rate (payroll burden, benefits, overtime, turnover replacement), the lines a quote omits (integration, facility work, maintenance, training, ramp and downtime), §179 then bonus depreciation by tax year, and 2–3 competing bids normalized onto one after-tax cash model with payback, IRR, NPV, the break-even of every assumption, and a ranked list to confirm in writing before signature. A cost line the case does not state is reported unstated and blocks a pass — never defaulted, never estimated.",
    route: "/caseproof",
    webmcpTools: ["audit_automation_case", "compare_automation_bids", "after_tax_payback"],
    launchedAt: "2026-09-22",
    category: "Industrial",
    visibility: "public",
  },
  {
    slug: "spendproof",
    name: "SpendProof",
    tagline: "AI Provider Invoice ↔ Tagged-Usage Reconciliation",
    status: "live",
    description:
      "Reconciles an AI provider invoice against your own tagged-usage ledger: every line is recomputed at the rate the invoice itself declares, each variance is classified as rounding, a period-boundary overlap, missing or late usage, untagged spend or a mid-period rate change, and a clean close is withheld whenever a bucket does not reconcile or usage carries no tag. The invoice document is read by a model as DECLARED fields only — every field is labelled extracted/unreadable/unstated, an unreadable region blocks the verdict, and no number in the report comes from a model.",
    route: "/spendproof",
    webmcpTools: ["reconcile_ai_invoice"],
    launchedAt: "2026-10-09",
    category: "Finance",
    usesLlmPrimitive: true,
    visibility: "public",
  },
  {
    slug: "ratchetproof",
    name: "RatchetProof",
    tagline: "Commercial Electric Billed-Demand & Ratchet Audit",
    status: "live",
    description:
      "Reconstructs billed demand from a commercial account's own interval data and the filed tariff: every meter aligned onto one grid and summed per coincident interval, the peak searched only in the days and hours the tariff bills, then billed = max(month peak, ratchet % × the highest peak in an explicit lookback, contract minimum). Prices the carry-over of the interval that set the floor and the saving from shaving it, and reports where the bill disagrees with the tariff. The tariff and bills may be read by a model as DECLARED fields only — every field is labelled extracted/unreadable/unstated, an unreadable clause blocks that month, and no number in the report comes from a model.",
    route: "/ratchetproof",
    webmcpTools: ["audit_demand_billing"],
    launchedAt: "2026-10-19",
    category: "Energy",
    usesLlmPrimitive: true,
    visibility: "public",
  },
  {
    slug: "claimproof",
    name: "ClaimProof",
    tagline: "Warranty-Claim Short-Payment Audit for HVAC & Refrigeration Shops",
    status: "beta",
    description:
      "Re-derives a manufacturer's published labour-payment schedule (allowed hours per repair code, the multiple-repair increment, the travel rule, per-claim fee caps) against what the remittance actually paid, per line, with the schedule version and the page cited. Sells the finding set and a resubmission packet, never the human chase. The claim and remittance are read by a model as DECLARED fields only — every field is labelled extracted/unreadable/unstated, a repair code outside the version-stamped schedule is reported unstated and blocks that line, and no number in the report comes from a model.",
    route: "/claimproof",
    webmcpTools: ["audit_warranty_remittance"],
    launchedAt: "2026-11-18",
    category: "Trades",
    usesLlmPrimitive: true,
    visibility: "public",
  },
  {
    slug: "ffrproof",
    name: "FFRProof",
    tagline: "SF-425 Federal Financial Report Pre-Flight Audit",
    status: "beta",
    description:
      "Cross-foots the SF-425's four published line identities (10c = 10a − 10b, 10g = 10e + 10f, 10h = 10d − 10g, 10k = 10i − 10j), reconciles line 10a to the federal payment system's drawdown statement by subaccount and to the cent, tests the recipient match and the final-report zero rules (10f/10h must be zero on a final), checks the budget variance against the prior-approval threshold the award's own terms state (unstated when they do not), and catches period-vs-cumulative and double-counted dollars — every finding with its form line and source page. The award terms and drawdown statement are read by a model as DECLARED fields only — a field the terms do not state blocks the check that depends on it, and no number in the report comes from a model. It never files or certifies for the recipient.",
    route: "/ffrproof",
    webmcpTools: ["audit_federal_financial_report"],
    launchedAt: "2026-11-18",
    category: "Compliance",
    usesLlmPrimitive: true,
    visibility: "public",
  },
];

/**
 * Products still in inventory — everything the factory may still sell or advertise.
 *
 * A `killed` entry stays in `products` so the directory can show its retirement notice and the
 * trail keeps the record, but it must NOT reach a paid or agent surface. Every generated surface
 * (the checkout product lookup, the WebMCP manifest, the agent allowlist, telemetry attribution)
 * derives from this list so a retirement cannot be half-applied: flipping `status` is enough.
 */
export const activeProducts: Product[] = products.filter((product) => product.status !== "killed");

/** Products the factory has retired. Their tools may exist in code but may not be advertised. */
export const retiredProducts: Product[] = products.filter((product) => product.status === "killed");

/** Slugs a caller may name when a surface sells or meters: the inventory, in registry order. */
export const activeProductSlugs: readonly string[] = activeProducts.map((product) => product.slug);

/**
 * The product an unattributed, product-scoped request resolves to: the first `live` product in
 * registry order. `beta` products are deliberately not a default — a default must be a product the
 * factory has already launched, and there is no default when nothing is live.
 */
export const defaultInventoryProduct: Product | undefined = activeProducts.find(
  (product) => product.status === "live",
);

/** True when the slug names a retired product — an explicit failure at any sell/advertise boundary. */
export function isRetiredProduct(slug: string): boolean {
  return retiredProducts.some((product) => product.slug === slug);
}
