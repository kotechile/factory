import { activeProducts } from "@/products/registry";
import { agentRateForTool } from "@/products/pricing";
import { DEFAULT_AGENT_TOOL } from "./agentTools";
import { WEBMCP_TOOL_SUMMARIES } from "./register";
import type { WebMCPToolParameters } from "./types";

/**
 * The published agent-discovery listing served at /.well-known/mcp.json.
 *
 * GENERATED, never hand-written: every field below is derived from the products **still in
 * inventory** (src/products/registry.ts, `killed` entries excluded) and the tool definitions in
 * ./register.ts. Regenerate with `npm run mcp:sync`; ./manifest.test.ts fails the build if the
 * published file drifts from this function's output, or if a retired product's tool reappears.
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
    currency: string;
    unit: string;
    rate_range_usd: { min: number; max: number };
    /** The metered rate for every advertised tool, USD per successful call. */
    rates_by_tool: Record<string, number>;
    note: string;
  };
  tools: McpManifestTool[];
}

/**
 * Maps every registered WebMCP tool name to the slug of the product that owns it.
 *
 * Only products still in inventory are listed: a retired product's tools must not be advertised,
 * so the exclusion lives here (and in the agent allowlist) rather than in the published file.
 * Throws on a tool claimed by two products — an ambiguous owner is a registry bug, not something
 * to paper over in the listing.
 */
export function toolOwnerMap(): Map<string, string> {
  const owner = new Map<string, string>();
  for (const product of activeProducts) {
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

/**
 * The metered rate for every tool the manifest advertises, in USD per successful call, sourced from
 * the single pricing catalog (src/products/pricing.ts).
 *
 * The manifest used to publish a flat `rate_per_query_usd: 0.25` while the API charged $0.05–$0.50
 * depending on the tool, so an agent reading it was quoted the wrong price for five of the nine
 * tools. Deriving the rates here keeps the published contract and the charged price identical; a
 * tool with no catalog rate throws rather than publishing an unpriceable surface.
 */
export function meteredRatesByTool(): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [name] of toolOwnerMap()) {
    rates[name] = agentRateForTool(name);
  }
  return rates;
}

export function buildMcpManifest(): McpManifest {
  const ratesByTool = meteredRatesByTool();
  const rateValues = Object.values(ratesByTool);
  if (rateValues.length === 0) {
    throw new Error(
      "The manifest would advertise no metered rates at all; check src/products/pricing.ts.",
    );
  }

  return {
    name: "factory-agent-tools",
    description:
      "Deterministic agent tools shipped by the Autonomous Product & Software Factory " +
      "(apps.giniloh.com), one product subpath per tool: Stripe payout -> GL reconciliation " +
      "(LedgerLink), EU e-invoice EN 16931 / CIUS-FR validation, Factur-X conversion and EU " +
      "VAT-id checks (FacturGate), carrier invoice DIM-weight / surcharge auditing with " +
      "billable-weight computation (ParcelProof), buyer-side warehouse-automation case " +
      "auditing with multi-bid comparison and after-tax payback (CaseProof), and AI provider " +
      "invoice -> tagged-usage reconciliation with a variance classification (SpendProof). " +
      "Products retired in the registry are not listed.",
    // 2.0.0: the flat rate_per_query_usd was replaced by per-tool rates — a consumer reading the
    // old field must re-read pricing, so this is a breaking change, not a silent one.
    // 2.1.0: SpendProof's reconcile_ai_invoice added (a new product's tool, so the published
    // tool list grows; additive, but the list IS the contract an agent reads).
    version: "2.1.0",
    endpoint: "https://apps.giniloh.com/api/agent/calculate",
    tool_selector: {
      header: "x-webmcp-tool",
      default: DEFAULT_AGENT_TOOL,
      note: "Name of the tool to invoke; must be one of the tools listed below. Omit for the default.",
    },
    auth: {
      type: "api_key",
      header: "x-customer-id",
      note: "Optional Stripe customer id. Sending it meters the call and bills it to that customer; omitting it runs the tool unbilled and uncapped.",
    },
    pricing: {
      mode: "metered",
      currency: "USD",
      unit: "per successful call",
      rate_range_usd: {
        min: Math.min(...rateValues),
        max: Math.max(...rateValues),
      },
      rates_by_tool: ratesByTool,
      note: "Metered per successful call and billed monthly to your Stripe customer. /billing shows the live rate per tool, your usage history and your spend cap.",
    },
    tools: manifestTools(),
  };
}

/** Serialized manifest exactly as it is published (2-space JSON + trailing newline). */
export function serializeMcpManifest(): string {
  return `${JSON.stringify(buildMcpManifest(), null, 2)}\n`;
}
