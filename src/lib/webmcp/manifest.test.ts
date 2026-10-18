import { describe, expect, it } from "vitest";

import { activeProducts, products, retiredProducts } from "@/products/registry";
import { agentRateForTool } from "@/products/pricing";
import { WEBMCP_TOOL_SUMMARIES } from "./register";
import { DEFAULT_AGENT_TOOL, SUPPORTED_AGENT_TOOLS } from "./agentTools";
import { siteOrigin } from "@/lib/site-origin";
import { GET as serveMcpManifest } from "@/app/.well-known/mcp.json/route";
import {
  buildMcpManifest,
  meteredRatesByTool,
  serializeMcpManifest,
  toolOwnerMap,
} from "./manifest";

/**
 * Drift guard for the published agent-discovery listing.
 *
 * The manifest is generated from the products **in inventory** in src/products/registry.ts
 * (non-`killed`) plus the tool summaries in register.ts. This suite fails the build if an
 * in-inventory tool has no definition, if a definition belongs to no registry product at all, if
 * the API allowlist and the manifest disagree, if the selector default points at an unadvertised
 * tool, if a **retired** product's tool is served or advertised (the regression that left two dead
 * names live for three days), or if the route that publishes it stops serving the generator's
 * output on the host this deploy actually answers from.
 *
 * There is no published file to keep in sync any more: /.well-known/mcp.json is served by
 * src/app/.well-known/mcp.json/route.ts, because a static copy cannot read the deploy's own origin.
 */

describe("WebMCP tool surface", () => {
  const inventoryTools = activeProducts.flatMap((product) => product.webmcpTools);
  const retiredTools = retiredProducts.flatMap((product) => product.webmcpTools);
  const defined = WEBMCP_TOOL_SUMMARIES.map((tool) => tool.name);

  it("gives every in-inventory tool exactly one owning product", () => {
    const owner = toolOwnerMap();
    expect([...owner.keys()].sort()).toEqual([...inventoryTools].sort());

    const allRegistryTools = products.flatMap((product) => product.webmcpTools);
    expect(new Set(allRegistryTools).size).toBe(allRegistryTools.length);
  });

  it("has a tool definition for every name the inventory advertises", () => {
    for (const name of inventoryTools) {
      expect(defined, `inventory tool '${name}' has no WebMCPToolSummary`).toContain(name);
    }
  });

  it("defines no tool that belongs to no product at all", () => {
    const allRegistryTools = products.flatMap((product) => product.webmcpTools);
    for (const name of defined) {
      expect(
        allRegistryTools,
        `tool '${name}' is defined but belongs to no product (active or retired)`,
      ).toContain(name);
    }
    expect(new Set(defined).size).toBe(defined.length);
  });

  it("keeps the API allowlist and the manifest on the same list", () => {
    const manifestNames = buildMcpManifest().tools.map((tool) => tool.name);
    expect([...manifestNames].sort()).toEqual([...inventoryTools].sort());
    expect([...SUPPORTED_AGENT_TOOLS].sort()).toEqual([...inventoryTools].sort());
  });

  it("serves and advertises nothing owned by a retired product", () => {
    const manifestNames = buildMcpManifest().tools.map((tool) => tool.name);
    for (const name of retiredTools) {
      expect(
        manifestNames,
        `retired product's tool '${name}' is still advertised in the manifest`,
      ).not.toContain(name);
      expect(
        SUPPORTED_AGENT_TOOLS,
        `retired product's tool '${name}' is still accepted by /api/agent/calculate`,
      ).not.toContain(name);
    }
  });

  it("points the selector default at an advertised tool", () => {
    const manifest = buildMcpManifest();
    const manifestNames = manifest.tools.map((tool) => tool.name);
    expect(manifestNames).toContain(manifest.tool_selector.default);
    expect(manifest.tool_selector.default).toBe(DEFAULT_AGENT_TOOL);
    expect(retiredTools).not.toContain(DEFAULT_AGENT_TOOL);
  });

  it("advertises a usable schema and description for every tool", () => {
    for (const tool of buildMcpManifest().tools) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema.type).toBe("object");
      expect(Object.keys(tool.inputSchema.properties).length).toBeGreaterThan(0);
      for (const required of tool.inputSchema.required ?? []) {
        expect(
          Object.keys(tool.inputSchema.properties),
          `'${tool.name}': required param '${required}' is not in properties`,
        ).toContain(required);
      }
      expect(tool.product.length).toBeGreaterThan(0);
      expect(activeProducts.map((product) => product.slug)).toContain(tool.product);
    }
  });

  it("never advertises a tool name the tool surface does not define", () => {
    for (const tool of buildMcpManifest().tools) {
      expect(defined).toContain(tool.name);
    }
    expect(defined).not.toContain("calculate_self_employment_2026");
  });

  it("publishes a real rate for every advertised tool instead of one flat guess", () => {
    const manifest = buildMcpManifest();
    const rates = meteredRatesByTool();
    expect(Object.keys(rates).sort()).toEqual(manifest.tools.map((tool) => tool.name).sort());

    for (const tool of manifest.tools) {
      expect(rates[tool.name], `'${tool.name}' is advertised with no published rate`).toBeGreaterThan(0);
    }
    const values = Object.values(rates);
    expect(manifest.pricing.rate_range_usd.min).toBe(Math.min(...values));
    expect(manifest.pricing.rate_range_usd.max).toBe(Math.max(...values));
    expect(manifest.pricing.mode).toBe("metered");
    expect(manifest.pricing.unit).toBe("per successful call");
  });

  it("quotes exactly the per-tool rates the API charges, and never resurrects a flat rate", () => {
    for (const [tool, rate] of Object.entries(meteredRatesByTool())) {
      expect(rate, `the manifest quotes a different rate for '${tool}' than the catalog`).toBe(
        agentRateForTool(tool),
      );
    }
    // The flat `rate_per_query_usd: 0.25` was wrong for five of nine tools; it must not come back.
    expect(JSON.stringify(buildMcpManifest())).not.toContain("rate_per_query_usd");
  });

  it("publishes the generator's output from the route, on the host this deploy answers from", async () => {
    const served = await serveMcpManifest().text();
    expect(served).toBe(serializeMcpManifest());
    expect(JSON.parse(served).endpoint).toBe(`${siteOrigin()}/api/agent/calculate`);
    // The descriptor must never name a host the app does not serve from: the 2026-10-18 defect was
    // 30 sitemap URLs, a canonical and this endpoint all pointing at the domain the app had left.
    expect(JSON.parse(served).endpoint.startsWith(siteOrigin())).toBe(true);
  });
});
