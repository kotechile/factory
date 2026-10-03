import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { activeProducts, products } from "@/products/registry";
import {
  PRODUCT_PRICING,
  agentRateForTool,
  agentRatesForProduct,
  lowestAgentRate,
  pricingFor,
  unpricedProducts,
  unpricedTools,
} from "./pricing";

/**
 * Drift guard for the pricing catalog.
 *
 * Pricing used to live in two places (the agent API's price maps and a hardcoded string in the
 * /billing matrix) and they disagreed: the matrix said "$0.25 / query" on every product while five
 * of the ten tools charged something else. This suite fails the build if a product or a tool can
 * reach a paid surface without a price, if a price belongs to nothing, or if the agent API stops
 * reading its rates from the catalog.
 */
describe("product pricing catalog", () => {
  it("prices every in-inventory product", () => {
    for (const product of activeProducts) {
      expect(PRODUCT_PRICING[product.slug], `product '${product.slug}' has no pricing`).toBeDefined();
    }
    expect(unpricedProducts()).toEqual([]);
  });

  it("prices every tool the inventory advertises, so a new tool cannot ship free", () => {
    expect(unpricedTools()).toEqual([]);
  });

  it("gives every metered rate a positive, plausible USD value", () => {
    for (const [slug, pricing] of Object.entries(PRODUCT_PRICING)) {
      for (const [tool, usd] of Object.entries(pricing.agentRates)) {
        expect(usd, `${slug}/${tool} must be positive`).toBeGreaterThan(0);
        expect(usd, `${slug}/${tool} looks like a typo`).toBeLessThanOrEqual(5);
        expect(agentRateForTool(tool), `${tool} lookup disagrees with the catalog`).toBe(usd);
      }
    }
  });

  it("prices no tool that belongs to no registry product", () => {
    const registryTools = new Set(products.flatMap((product) => product.webmcpTools));
    for (const [slug, pricing] of Object.entries(PRODUCT_PRICING)) {
      for (const tool of Object.keys(pricing.agentRates)) {
        expect(registryTools.has(tool), `'${slug}' prices '${tool}', which no product advertises`).toBe(
          true,
        );
      }
    }
  });

  it("throws rather than inventing a price for an unknown product or tool", () => {
    expect(() => pricingFor("not-a-product")).toThrow(/No pricing/);
    expect(() => agentRateForTool("not_a_tool")).toThrow(/No agent rate/);
    expect(() => lowestAgentRate("not-a-product")).toThrow(/No pricing/);
  });

  it("reports the lowest agent rate, which is what 'from $X.XX/query' means", () => {
    expect(lowestAgentRate("facturgate")).toBe(0.05);
    expect(lowestAgentRate("parcelproof")).toBe(0.05);
    expect(lowestAgentRate("ledgerlink")).toBe(0.25);
    expect(lowestAgentRate("caseproof")).toBe(0.5);
  });

  it("keeps the agent API's price tables sourced from this catalog", () => {
    const route = readFileSync(
      path.join(process.cwd(), "src/app/api/agent/calculate/route.ts"),
      "utf8",
    );
    for (const slug of ["facturgate", "parcelproof", "caseproof"]) {
      expect(
        route,
        `the agent route must read '${slug}' rates from the pricing catalog, not inline them`,
      ).toContain(`agentRatesForProduct("${slug}")`);
      expect(agentRatesForProduct(slug).constructor).toBe(Object);
    }
  });
});
