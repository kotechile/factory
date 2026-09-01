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
    webmcpTools: ["calculate_self_employment_2026"],
    launchedAt: "2026-08-31",
    category: "Finance",
  },
];
