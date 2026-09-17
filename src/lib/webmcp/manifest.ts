import { products } from "@/products/registry";
import { WEBMCP_TOOL_SUMMARIES } from "./register";
import type { WebMCPToolParameters } from "./types";

/**
 * The published agent-discovery listing served at /.well-known/mcp.json.
 *
 * GENERATED, never hand-written: every field below is derived from the products in
 * src/products/registry.ts and the tool definitions in ./register.ts. Regenerate with
 * `npm run mcp:sync`; ./manifest.test.ts fails the build if the published file drifts
 * from this function's output.
 */
export const MCP_MANIFEST_PATH = "public/.well-known/mcp.json";

export interface McpManifestTool {
  name: string;
  description: string;
  product: string;
  inputSchema: WebMCPToolParameters;
}

export interface McpManifest {
  name: string;
  description: string;
  version: string;
  endpoint: string;
  tool_selector: {
    header: string;
    default: string;
    note: string;
  };
  auth: {
    type: string;
    header: string;
    note: string;
  };
  pricing: {
    mode: string;
    rate_per_query_usd: number;
    currency: string;
  };
  tools: McpManifestTool[];
}

/**
 * Maps every registered WebMCP tool name to the slug of the product that owns it.
 * Throws on a tool claimed by two products — an ambiguous owner is a registry bug,
 * not something to paper over in the listing.
 */
export function toolOwnerMap(): Map<string, string> {
  const owner = new Map<string, string>();
  for (const product of products) {
    for (const toolName of product.webmcpTools) {
      const existing = owner.get(toolName);
      if (existing && existing !== product.slug) {
        throw new Error(
          `WebMCP tool '${toolName}' is claimed by both '${existing}' and '${product.slug}'; ` +
            "each tool must have exactly one owning product in src/products/registry.ts.",
        );
      }
      owner.set(toolName, product.slug);
    }
  }
  return owner;
}

/** Every tool the manifest advertises: the registry's tools, with their real schemas. */
export function manifestTools(): McpManifestTool[] {
  const owner = toolOwnerMap();
  const byName = new Map(WEBMCP_TOOL_SUMMARIES.map((tool) => [tool.name, tool]));
  return [...owner.entries()].map(([name, product]) => {
    const definition = byName.get(name);
    if (!definition) {
      throw new Error(
        `Registry advertises WebMCP tool '${name}' (product '${product}') but no WebMCPToolDefinition ` +
          "exports it from src/lib/webmcp/register.ts.",
      );
    }
    return {
      name,
      description: definition.description,
      product,
      inputSchema: definition.parameters,
    };
  });
}

export function buildMcpManifest(): McpManifest {
  return {
    name: "factory-agent-tools",
    description:
      "Deterministic agent tools shipped by the Autonomous Product & Software Factory " +
      "(factory.aichieve.net): 2026 US self-employment, Section 199A QBI, and quarterly " +
      "estimated-tax calculations (QuarterLine), and Stripe payout -> GL reconciliation (LedgerLink).",
    version: "1.1.0",
    endpoint: "https://factory.aichieve.net/api/agent/calculate",
    tool_selector: {
      header: "x-webmcp-tool",
      default: "calculate_qbi_deduction",
      note: "Name of the tool to invoke; must be one of the tools listed below. Omit for the default.",
    },
    auth: {
      type: "api_key",
      header: "x-customer-id",
      note: "Optional Stripe customer id for $0.25/query metered billing.",
    },
    pricing: {
      mode: "metered",
      rate_per_query_usd: 0.25,
      currency: "USD",
    },
    tools: manifestTools(),
  };
}

/** Serialized manifest exactly as it is published (2-space JSON + trailing newline). */
export function serializeMcpManifest(): string {
  return `${JSON.stringify(buildMcpManifest(), null, 2)}\n`;
}
