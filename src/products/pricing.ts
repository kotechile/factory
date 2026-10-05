import { products } from "@/products/registry";

/**
 * Single source of truth for what every factory product costs.
 *
 * Four surfaces read this and must never disagree:
 *   1. the agent API — the metered rate per tool (src/app/api/agent/calculate/route.ts),
 *   2. the /billing pricing matrix,
 *   3. each product page's pricing block (src/components/product-pricing.tsx),
 *   4. the showcase directory.
 *
 * Before this module the rates lived in the API route and the matrix hardcoded "$0.25 / query" on
 * every product, which was already wrong for five of the ten tools. Adding a product or a tool
 * without a price here now fails the build (src/products/pricing.test.ts).
 */

/** The suite-wide Pro subscription: unlimited web use + exports across every live product. */
export const SUITE_PRO_MONTHLY_USD = 29;

/** The one-off export / report price used by the checkout catalog (plan `pdf_audit_export`). */
export const ONE_OFF_EXPORT_USD = 9;

/**
 * Metered price bands by tool class (owner instruction, 2026-10-05: *"add more tools (at higher price
 * maybe) to include LLM, llamaparse, etc."*).
 *
 * The class comes from the registry's `usesLlmPrimitive` declaration, never from the price — so a tool
 * cannot be priced into a class it does not belong to, and a tool cannot be added without its class and
 * its band being decided together (`src/products/pricing.test.ts`). $0.50 is deliberately the shared
 * boundary: the deterministic ceiling and the LLM floor.
 *
 * The reasoning, so a future edit does not undo it: a deterministic tool has no marginal cost per call, so
 * its price is set by buyer value; an LLM/parse-backed tool pays a real per-call cost, so its floor must
 * cover a worst-case parse + generate + retries with margin. Pricing an LLM-backed tool at deterministic
 * rates sells at a loss, which is what the floor exists to prevent.
 */
export const DETERMINISTIC_RATE_BAND_USD = { min: 0.05, max: 0.5 } as const;
export const LLM_RATE_BAND_USD = { min: 0.5, max: 3 } as const;

export interface ProductPricing {
  /** What the browser tier gives away, in one line. */
  freeTier: string;
  /** One-off export price, or null when the product sells no priced one-off export. */
  exportUsd: number | null;
  /** What the export/report artifact is. */
  exportLabel: string;
  /** Metered agent rate per WebMCP tool, USD per successful call. */
  agentRates: Record<string, number>;
}

/**
 * Per-product pricing. The free/export split mirrors what the /billing matrix already advertised
 * before this module existed (free client-side CSV on LedgerLink, Free-or-Pro on FacturGate, a $9
 * one-off on ParcelProof and CaseProof); the agent rates are the values the API actually charges.
 */
export const PRODUCT_PRICING: Record<string, ProductPricing> = {
  ledgerlink: {
    freeTier: "Reconcile a payout and read the GL journal — free, in your browser",
    exportUsd: null,
    exportLabel: "Journal CSV, generated in your browser",
    agentRates: { reconcile_stripe_payout: 0.25 },
  },
  facturgate: {
    freeTier: "Validate an EN 16931 invoice and list every blocking rule — free, in your browser",
    exportUsd: null,
    exportLabel: "Factur-X (CII) / UBL 2.1 artifact — included with Pro",
    agentRates: {
      validate_einvoice: 0.1,
      convert_invoice_to_facturx: 0.25,
      check_eu_vat_id: 0.05,
    },
  },
  parcelproof: {
    freeTier: "Recompute billable weight and read the audit findings — free, in your browser",
    exportUsd: ONE_OFF_EXPORT_USD,
    exportLabel: "Recovery ledger + dispute CSV",
    agentRates: { audit_carrier_invoice: 0.25, compute_billable_weight: 0.05 },
  },
  caseproof: {
    freeTier: "NPV, payback and the bid comparison — free, in your browser",
    exportUsd: ONE_OFF_EXPORT_USD,
    exportLabel: "Decision pack",
    agentRates: {
      audit_automation_case: 0.5,
      compare_automation_bids: 0.5,
      after_tax_payback: 0.5,
    },
  },
  quarterline: {
    // Retired: kept so the legacy agent tools still price, and so tool lookups never dangle.
    freeTier: "Retired product — kept on the trail only",
    exportUsd: null,
    exportLabel: "Retired",
    agentRates: { calculate_qbi_deduction: 0.25, calculate_quarterly_estimate: 0.25 },
  },
};

/** Pricing for a product. Throws when a product is unpriced rather than inventing a default. */
export function pricingFor(slug: string): ProductPricing {
  const pricing = PRODUCT_PRICING[slug];
  if (!pricing) {
    throw new Error(`No pricing is defined for product '${slug}' (src/products/pricing.ts).`);
  }
  return pricing;
}

/** The metered rates for a product, keyed by tool name. Throws when the product is unpriced. */
export function agentRatesForProduct(slug: string): Record<string, number> {
  return pricingFor(slug).agentRates;
}

/**
 * The metered rate for a single tool. Throws when the tool is unpriced — an unpriced tool must not
 * run for free (AGENTS.md rule 5, no silent fallbacks).
 */
export function agentRateForTool(tool: string): number {
  for (const pricing of Object.values(PRODUCT_PRICING)) {
    if (tool in pricing.agentRates) return pricing.agentRates[tool];
  }
  throw new Error(`No agent rate is defined for tool '${tool}' (src/products/pricing.ts).`);
}

/** The cheapest agent call for a product — what "from $X.XX/query" should say. */
export function lowestAgentRate(slug: string): number {
  const rates = Object.values(pricingFor(slug).agentRates);
  if (rates.length === 0) {
    throw new Error(`Product '${slug}' has no agent rates, so it has no agent price to show.`);
  }
  return Math.min(...rates);
}

/**
 * The metered rate range across every priced tool, for copy that must not hardcode a rate
 * ("from $0.05 a call", "$0.05–$0.50 by tool").
 */
export function agentRateRange(): { min: number; max: number } {
  const rates = Object.values(PRODUCT_PRICING).flatMap((pricing) =>
    Object.values(pricing.agentRates),
  );
  if (rates.length === 0) {
    throw new Error("No agent rates are defined anywhere; there is no range to describe.");
  }
  return { min: Math.min(...rates), max: Math.max(...rates) };
}

/**
 * Display helpers for the directory and product surfaces. These are deliberately tolerant: a
 * directory card must still render for a retired product with no price, where the sell/serve
 * boundaries call the throwing lookups above instead.
 */

/** e.g. "Free in the browser · $9 one-off export · agents from $0.05/call". Null when unpriced. */
export function priceSummary(slug: string): string | null {
  const pricing = PRODUCT_PRICING[slug];
  if (!pricing) return null;
  const rates = Object.values(pricing.agentRates);
  const parts = ["Free in the browser"];
  if (pricing.exportUsd !== null) parts.push(`$${pricing.exportUsd} one-off export`);
  if (rates.length > 0) parts.push(`agents from $${Math.min(...rates).toFixed(2)}/call`);
  return parts.join(" · ");
}

/** The rate for a tool, or null for a display surface. The API uses agentRateForTool (throwing). */
export function agentRateOrNull(tool: string): number | null {
  for (const pricing of Object.values(PRODUCT_PRICING)) {
    if (tool in pricing.agentRates) return pricing.agentRates[tool];
  }
  return null;
}

/** Tool names a product advertises that are missing a price — used by the drift guard. */
export function unpricedTools(): { slug: string; tool: string }[] {
  const missing: { slug: string; tool: string }[] = [];
  for (const product of products) {
    const pricing = PRODUCT_PRICING[product.slug];
    if (!pricing) {
      for (const tool of product.webmcpTools) missing.push({ slug: product.slug, tool });
      continue;
    }
    for (const tool of product.webmcpTools) {
      if (!(tool in pricing.agentRates)) missing.push({ slug: product.slug, tool });
    }
  }
  return missing;
}

/**
 * The metered band a product's tools must price inside, from the registry's declared tool class.
 * Throws for a slug with no registry entry: an unknown product has no class, and guessing one would let a
 * tool be priced into the wrong band (rule 5).
 */
export function rateBandForProduct(slug: string): {
  min: number;
  max: number;
  class: "deterministic" | "llm";
} {
  const product = products.find((entry) => entry.slug === slug);
  if (!product) {
    throw new Error(`No registry entry for product '${slug}', so its rate band cannot be decided.`);
  }
  return product.usesLlmPrimitive
    ? { ...LLM_RATE_BAND_USD, class: "llm" }
    : { ...DETERMINISTIC_RATE_BAND_USD, class: "deterministic" };
}

/** Products whose metered rates sit outside their class's band — used by the drift guard. */
export function ratesOutsideTheirBand(): {
  slug: string;
  tool: string;
  rate: number;
  class: "deterministic" | "llm";
  min: number;
  max: number;
}[] {
  const outside: {
    slug: string;
    tool: string;
    rate: number;
    class: "deterministic" | "llm";
    min: number;
    max: number;
  }[] = [];
  for (const product of products) {
    const pricing = PRODUCT_PRICING[product.slug];
    if (!pricing) continue;
    const band = rateBandForProduct(product.slug);
    for (const [tool, rate] of Object.entries(pricing.agentRates)) {
      if (rate < band.min || rate > band.max) {
        outside.push({ slug: product.slug, tool, rate, class: band.class, min: band.min, max: band.max });
      }
    }
  }
  return outside;
}

/** Products in the registry with no pricing entry at all. */
export function unpricedProducts(): string[] {
  return products.filter((product) => !PRODUCT_PRICING[product.slug]).map((p) => p.slug);
}
