import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { activeProducts, products, retiredProducts } from "@/products/registry";
import { WEBMCP_TOOL_SUMMARIES } from "./register";
import { DEFAULT_AGENT_TOOL, SUPPORTED_AGENT_TOOLS } from "./agentTools";
import { MCP_MANIFEST_PATH, buildMcpManifest, serializeMcpManifest, toolOwnerMap } from "./manifest";

/**
 * Drift guard for the published agent-discovery listing.
 *
 * The manifest is generated from the products **in inventory** in src/products/registry.ts
 * (non-`killed`) plus the tool summaries in register.ts. This suite fails the build if an
 * in-inventory tool has no definition, if a definition belongs to no registry product at all, if
 * the API allowlist and the manifest disagree, if the selector default points at an unadvertised
 * tool, if a **retired** product's tool is served or advertised (the regression that left two dead
 * names live for three days), or if public/.well-known/mcp.json no longer matches the generator.
 *
 * Regenerate the file with: npm run mcp:sync
 */
const MANIFEST_FILE = path.join(process.cwd(), MCP_MANIFEST_PATH);
const WRITE = process.env.MCP_MANIFEST_WRITE === "1";

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

  it("keeps the published .well-known/mcp.json byte-identical to the generator", () => {
    if (WRITE) {
      writeFileSync(MANIFEST_FILE, serializeMcpManifest());
      return;
    }
    const published = readFileSync(MANIFEST_FILE, "utf8");
    expect(
      published,
      "public/.well-known/mcp.json has drifted from buildMcpManifest(); run `npm run mcp:sync`",
    ).toBe(serializeMcpManifest());
  });
});
