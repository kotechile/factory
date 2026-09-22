import { activeProducts } from "@/products/registry";
import { WEBMCP_TOOL_SUMMARIES } from "./register";

/**
 * The agent-facing tool surface of /api/agent/calculate.
 *
 * Derived from the WebMCP tool summaries in ./register.ts **and** the registry's inventory
 * (`activeProducts` — everything that is not `killed`), so a name can never be accepted here
 * (x-webmcp-tool) or advertised (/.well-known/mcp.json) without a real tool definition behind it,
 * and a retired product's tools leave the surface when its registry status changes instead of
 * needing a separate edit here — the gap that left two retired tools served and advertised for
 * three days after the retirement.
 */
const ACTIVE_TOOL_NAMES: readonly string[] = activeProducts.flatMap(
  (product) => product.webmcpTools,
);

export const SUPPORTED_AGENT_TOOLS: readonly string[] = WEBMCP_TOOL_SUMMARIES.map(
  (tool) => tool.name,
).filter((name) => ACTIVE_TOOL_NAMES.includes(name));

/**
 * Default tool when the caller sends no `x-webmcp-tool` selector: the first tool of a product in
 * inventory. Throws rather than falling back — an empty surface means every product is retired and
 * the endpoint has nothing to serve, which must fail loudly (AGENTS.md rule 5).
 */
export const DEFAULT_AGENT_TOOL: string = (() => {
  const [first] = SUPPORTED_AGENT_TOOLS;
  if (!first) {
    throw new Error(
      "No agent tool is in inventory: every product in src/products/registry.ts is retired.",
    );
  }
  return first;
})();

export function isSupportedAgentTool(name: string): boolean {
  return SUPPORTED_AGENT_TOOLS.includes(name);
}
