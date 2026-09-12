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
    status: "live",
    description:
      "Deterministic 2026 self-employment tax, Section 199A QBI deduction (statutory 20% rate), and safe-harbor estimated-payment calculator. Catches the 23%-vs-20% QBI trap.",
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
];
