export interface WebMCPToolProperty {
  type: string;
  description: string;
  enum?: string[];
}

export interface WebMCPToolParameters {
  type: "object";
  properties: Record<string, WebMCPToolProperty>;
  required?: string[];
}

export interface WebMCPToolDefinition<
  TInput = Record<string, unknown>,
  TOutput = unknown,
> {
  name: string;
  description: string;
  parameters: WebMCPToolParameters;
  handler: (params: TInput) => Promise<TOutput> | TOutput;
}

export interface ModelContext {
  registerTool: (tool: {
    name: string;
    description: string;
    parameters: WebMCPToolParameters;
    handler: (params: Record<string, unknown>) => Promise<unknown> | unknown;
  }) => void;
  unregisterTool?: (name: string) => void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}
