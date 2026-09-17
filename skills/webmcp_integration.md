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

### Resolved edge-case (2026-09-10) — CLOSED 2026-09-17
`public/.well-known/mcp.json` was written by hand in Phase 3 and never regenerated, so after the
P0 tool-name fix (`05ac8ae`) it still advertised `calculate_self_employment_2026` — a name no
browser tool registers — while omitting `calculate_quarterly_estimate` and
`reconcile_stripe_payout`. GTM Vector 4 would have published that dead name to Smithery/Glama.

**Fix as shipped (`a57539f`):** the listing is generated from the registry, and the guard is a test —
- `src/lib/webmcp/manifest.ts` — `buildMcpManifest()` / `serializeMcpManifest()`. Single source of
  truth is `registry.ts` (which product owns which tool) + `WEBMCP_TOOL_SUMMARIES` in `register.ts`
  (name, description, JSON Schema). Never edit `public/.well-known/mcp.json` by hand.
- `npm run mcp:sync` — regenerates the published file from the generator.
- `src/lib/webmcp/manifest.test.ts` — asserts registry ↔ definitions ↔ `SUPPORTED_AGENT_TOOLS` ↔
  manifest ↔ published file all agree, that every `required` param exists in `properties`, and that
  no dead name is advertised. It runs in the normal `npm run test` gate.
- `agentTools.ts` — the API allowlist reads the same summaries, so `/api/agent/calculate` returns 400
  for a name the listing does not advertise (factory rule 5), including the whole `calculate_*` family
  if someone renames a tool without updating the registry.

**Rule for the next tool:** add the definition in `register.ts` + the `webmcpTools` entry in
`registry.ts`, run `npm run mcp:sync`, then `bash scripts/verify-build.sh`. If a tool is added
without its registry entry, the test fails with "defined but registered under no product"; if a
registry entry has no definition, it fails with "has no WebMCPToolSummary". Also: when the manifest
grows past one tool it must document the `x-webmcp-tool` selector header — an agent cannot choose a
tool it cannot name.

**Rule for a tool's server branch (2026-09-17, FacturGate):** a name advertised in the registry must
also be *handled* in `src/app/api/agent/calculate/route.ts`. Registration and the manifest test only
prove the name exists — not that calling it does the right thing. Before this rule, the route ran
the QuarterLine engine for any allowlisted name it had no branch for, so a newly advertised tool
would have returned a tax calculation instead of an error. The route now ends its tool dispatch with
an explicit `501` for an advertised-but-unimplemented name (factory rule 5: no silent fallback), and
each new tool gets its own branch + metered event name before `mcp:sync` is run.

## 6. Failure handling
- Broken MCP/WebMCP endpoints → Toby logs and patches this skill.
