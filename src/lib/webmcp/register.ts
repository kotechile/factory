import { executeCalculation, stubEngine, type StubCalculationInput } from "@/lib/calc";
import type { WebMCPToolDefinition } from "./types";

/**
 * Default WebMCP tool definition wired to the factory calculation engine.
 */
export const defaultCalcTool: WebMCPToolDefinition<StubCalculationInput> = {
  name: "calculate_metric",
  description: "Calculates a deterministic metric from provided numerical inputs via the factory engine.",
  parameters: {
    type: "object",
    properties: {
      baseValue: {
        type: "number",
        description: "The base numeric value to perform calculation upon.",
      },
      multiplier: {
        type: "number",
        description: "Optional multiplier coefficient.",
      },
      offset: {
        type: "number",
        description: "Optional additive offset.",
      },
    },
    required: ["baseValue"],
  },
  handler: (params: StubCalculationInput) => {
    return executeCalculation(stubEngine, params);
  },
};

/**
 * Registers a WebMCP tool on navigator.modelContext in browser runtime.
 */
export function registerWebMCPTool<
  TInput = Record<string, unknown>,
  TOutput = unknown,
>(tool: WebMCPToolDefinition<TInput, TOutput>): boolean {
  if (typeof window === "undefined" || !navigator.modelContext?.registerTool) {
    return false;
  }

  try {
    navigator.modelContext.registerTool({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: async (params: Record<string, unknown>) => {
        return await tool.handler(params as TInput);
      },
    });
    return true;
  } catch (error) {
    console.error(`Failed to register WebMCP tool: ${tool.name}`, error);
    return false;
  }
}

/**
 * Registers all factory WebMCP tools in the current browser session.
 */
export function registerDefaultWebMCPTools(): void {
  registerWebMCPTool(defaultCalcTool);
}
