---
name: webmcp-integration
description: "Use when embedding browser-native WebMCP tool registration."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: WebMCP Integration

## 1. Objective
Expose every tool's deterministic core to in-browser AI agents via `navigator.modelContext.registerTool`.

## 2. Registration
- Register on load (and on route change) with a stable tool name `calculate_[niche_metric]`.
- Provide a JSON Schema for parameters (type/description/required).

## 3. Schema shape
```json
{
  "name": "calculate_[niche_metric]",
  "description": "Calculates [metric] from [inputs]",
  "parameters": {
    "type": "object",
    "properties": { "input_a": { "type": "number", "description": "..." } },
    "required": ["input_a"]
  }
}
```

## 4. Handler rules
- The handler calls the pure TS engine in `src/lib/calc/[engine].ts` — never duplicated logic.
- Free-tier agents get a limited preview; metered calls hit the Stripe agent tier.
- Return structured JSON (and/or a branded PDF for exports).

## 5. Discovery
- Ship an agent-discovery listing so consumer/enterprise agents can find the tool.
- Echo publishes the listing post-launch.

## 6. Failure handling
- Broken MCP/WebMCP endpoints → Toby logs and patches this skill.
