import { WEBMCP_TOOL_SUMMARIES } from "./register";

/**
 * The agent-facing tool surface of /api/agent/calculate.
 *
 * Derived from the WebMCP tool summaries in ./register.ts so a name can never be accepted
 * here (x-webmcp-tool) or advertised (/.well-known/mcp.json) without a real tool
 * definition behind it.
 */
export const DEFAULT_AGENT_TOOL = "calculate_qbi_deduction";

export const SUPPORTED_AGENT_TOOLS: readonly string[] = WEBMCP_TOOL_SUMMARIES.map(
  (tool) => tool.name,
);

export function isSupportedAgentTool(name: string): boolean {
  return SUPPORTED_AGENT_TOOLS.includes(name);
}
