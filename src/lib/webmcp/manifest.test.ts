import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { products } from "@/products/registry";
import { WEBMCP_TOOL_SUMMARIES } from "./register";
import { SUPPORTED_AGENT_TOOLS } from "./agentTools";
import { MCP_MANIFEST_PATH, buildMcpManifest, serializeMcpManifest, toolOwnerMap } from "./manifest";

/**
 * Drift guard for the published agent-discovery listing.
 *
 * The manifest is generated from src/products/registry.ts + the tool summaries in
 * register.ts. This suite fails the build if a registered tool has no definition, if a
 * definition is registered under no product, if the API allowlist and the manifest
 * disagree, or if public/.well-known/mcp.json no longer matches what the generator
 * produces (the exact failure that left a dead tool name live for weeks).
 *
 * Regenerate the file with: npm run mcp:sync
 */
const MANIFEST_FILE = path.join(process.cwd(), MCP_MANIFEST_PATH);
const WRITE = process.env.MCP_MANIFEST_WRITE === "1";

describe("WebMCP tool surface", () => {
  const registered = products.flatMap((product) => product.webmcpTools);

  it("gives every registry tool exactly one owning product", () => {
    const owner = toolOwnerMap();
    expect([...owner.keys()].sort()).toEqual([...registered].sort());
    expect(new Set(registered).size).toBe(registered.length);
  });

  it("has a tool definition for every name the registry advertises", () => {
    const defined = WEBMCP_TOOL_SUMMARIES.map((tool) => tool.name);
    for (const name of registered) {
      expect(defined, `registry tool '${name}' has no WebMCPToolSummary`).toContain(name);
    }
  });

  it("registers no tool that the registry does not advertise", () => {
    const defined = WEBMCP_TOOL_SUMMARIES.map((tool) => tool.name);
    for (const name of defined) {
      expect(registered, `tool '${name}' is defined but registered under no product`).toContain(name);
    }
    expect(new Set(defined).size).toBe(defined.length);
  });

  it("keeps the API allowlist and the manifest on the same list", () => {
    const manifestNames = buildMcpManifest().tools.map((tool) => tool.name);
    expect([...SUPPORTED_AGENT_TOOLS].sort()).toEqual([...manifestNames].sort());
    expect([...SUPPORTED_AGENT_TOOLS].sort()).toEqual([...registered].sort());
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
    }
  });

  it("never advertises a tool name the tool surface does not define", () => {
    const defined = WEBMCP_TOOL_SUMMARIES.map((tool) => tool.name);
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
