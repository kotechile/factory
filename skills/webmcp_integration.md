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
- **The published listing must be derived from `src/products/registry.ts`, never hand-written.**
  Registered tool name, schema, and pricing all live there; a static copy under
  `public/.well-known/` silently drifts.

### Resolved edge-case (2026-09-10)
`public/.well-known/mcp.json` was written by hand in Phase 3 and never regenerated, so after the
P0 tool-name fix (`05ac8ae`) it still advertised `calculate_self_employment_2026` — a name no
browser tool registers — while omitting `calculate_quarterly_estimate` and
`reconcile_stripe_payout`. GTM Vector 4 would have published that dead name to Smithery/Glama.
Fix + guard: (a) regenerate the manifest from `registry.ts` (or a route handler that renders it),
(b) add a unit test asserting every `webmcpTools` name in the registry has a matching
`WebMCPToolDefinition.name` and appears in the manifest. Registry = single source of truth.

## 6. Failure handling
- Broken MCP/WebMCP endpoints → Toby logs and patches this skill.
