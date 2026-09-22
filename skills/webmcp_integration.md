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
- **Retiring a product delists its tools (2026-09-22, `b6e6555`).** Both the manifest and the allowlist
  read `activeProducts` from `src/products/registry.ts` — every product whose status is not `killed` — so
  flipping a status to `killed` removes its tools from the published listing **and** from the accepted set
  in the same moment, with no per-tool edit and no window where a retired tool is still served. The
  selector default (`DEFAULT_AGENT_TOOL`) is derived from that inventory and throws if nothing is in it.
  `manifest.test.ts` asserts that nothing owned by a retired product is served or advertised and that the
  selector default is an advertised tool; both assertions were proven by injection before shipping
  (counting `killed` products as inventory → the test names the retired tool and fails).

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

**Rule for a product that ships more than one tool (2026-09-22, CaseProof):** a product's tools are
declared once in `registry.ts` (`webmcpTools: [...]`) and defined once in `register.ts`, and BOTH the
published manifest and the agent allowlist derive from the registry — so shipping three tools is the
same ride as shipping one, *provided* every name also has a server branch. Checklist: (a) definitions
with `required` params that exist in `properties` (the manifest test asserts this); (b) the registry
entry at the intended status (`beta` for a new product — the launch call is the founder's);
(c) a branch in `/api/agent/calculate` that validates the payload and returns an explicit 400 carrying
the rule id — registering a name is not implementing it; (d) `npm run mcp:sync` **and a `version` bump
in `manifest.ts`** (a new product changes the tool list, so the published version must move);
(e) `npm run test`. When the selector argument is a JSON string, parse and validate it with the
ENGINE's own reader (`readCaseInput`), never a shallow `if (!body.case)` check: the engine's error
carries the field path the agent needs to fix its own call.

**Rule for an engine that resolves an input twice (2026-09-22, CaseProof):** when a module resolves a
caller input at compute time — CaseProof resolves a bid's quote CSV into cost terms inside
`computeOption` — every other reader of those terms must resolve it the same way first. The audit
levers initially read the raw bid, so three lines the quote priced read as `unstated` and the findings
contradicted the verdict the cash model had just produced. Resolve once at the audit's entry point
(`auditOption` → `applyQuote(input.option).option`) and make the resolver idempotent (a second pass
that changes nothing must add no note). Symptom to recognise: a verdict that disagrees with its own
findings.

## 6. Failure handling
- Broken MCP/WebMCP endpoints → Toby logs and patches this skill.
