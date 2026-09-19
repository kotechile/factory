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
    status: "beta",
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
    status: "beta",
    description:
      "Deterministic audit of UPS/FedEx/USPS parcel invoices against the shipment records behind them: billable weight recomputed with the carrier × service × ship-date divisor (USPS 166 → 139 on 2026-07-12) and the round-up rule, accessorial eligibility re-evaluated with the trigger that failed named, late-delivery refund eligibility and the per-line dispute window (UPS ≈30 / FedEx ≈21 days), and a per-line recovery ledger with a dispute CSV. No LLM and no invented rates: a line your contract rate card cannot price is reported unverifiable, never guessed.",
    route: "/parcelproof",
    webmcpTools: ["audit_carrier_invoice", "compute_billable_weight"],
    launchedAt: "2026-09-18",
    category: "Logistics",
    visibility: "public",
  },
];
