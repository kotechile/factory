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

**Rule for advertising a price on a product surface (2026-10-04, FacturGate launch):** every number a
product surface shows — the header fee line, the `METERED … / CALL` band, the footer rate list — must be
READ from `src/products/pricing.ts` (`SUITE_PRO_MONTHLY_USD`, `lowestAgentRate(slug)`,
`agentRatesForProduct(slug)`), never typed as a literal next to it. The catalog's drift suite fails the
build when an in-inventory product or tool has no price, but it cannot see a second hand-written copy
that merely *agrees* today, so `src/products/pricing.test.ts` also asserts the consumer still calls the
lookup (the same wiring guard the agent route has). A displayed rate that disagrees with the charged one
is invisible until a customer is billed.

**Rule for promoting a product's status (`beta` → `live`) (2026-10-04, FacturGate, then ParcelProof +
CaseProof in one commit):** `status` in `registry.ts` is the only switch. `activeProducts` (the
sell/advertise surfaces) already includes `beta`, so a promotion changes exactly two things: (a) the
directory badge on `/showcase`, and (b) which product an unscoped, product-scoped request resolves to —
`defaultInventoryProduct` is the first `live` entry in registry order, so promoting an entry EARLIER in
the array than the current default silently moves it. State that check explicitly per product ("both
sit after LedgerLink, so the default is unchanged") — a promotion report that does not name the default
has not verified the one blast radius a flipped status has.
Before flipping: verify (do not assume) that the page carries the agent-surface/MCP guide and the
pricing block the older `live` products carry — `<ProductPricing slug>` plus a paragraph naming the
product's WebMCP tools and linking `/.well-known/mcp.json` is the shape LedgerLink (the older live
product) has, so grep the page for it rather than rebuilding parity that already exists — and probe
`POST /api/checkout` with that `app` for a `cs_live_…` session (skill `stripe-go-live`) from OUTSIDE the
container: the repo's local `.env` is sandbox, so a local probe proves nothing about the live key.
Add one launch-surface e2e spec pair per promoted product (pricing block + billing entry; agent surface
+ manifest link) so the promoted surface is what the gate asserts.
After flipping: re-run the gate — the `/showcase` Playwright snapshot IS a baseline to regenerate, so
read the diff image before accepting it (it must be the badge and nothing else; prove it by measuring,
not by eye) — and close the launch decision in `context/pending_approval.md` in the same pass. The
launch call is the founder's: an agent never promotes a product's status on its own.

**Snapshot baselines are per-platform and the platform token is a trap (2026-10-04).** Playwright's
default `snapshotPathTemplate` appends `-{platform}`, so `/showcase` had a `-linux` and a `-darwin`
file; a UI redesign then refreshed only the darwin copy and left the Linux baseline stale, which read as
this host's gate failing on a change the owner had already visually approved. `playwright.config.ts`
now pins ONE baseline (`{testDir}/{testFilePath}-snapshots/{arg}{ext}`) and the darwin file is deleted,
because the deploy target and the only test host are Linux — a baseline no run on the host can validate
is worse than none. Keep it that way: on macOS, regenerate with `--update-snapshots` (the render differs
by font) rather than reintroducing a second file. Corollary for the badge flip: because a promotion
changes the render, regenerate the baseline as the LAST step before committing, and separate the
redesign's diff from the badge's — regenerate once on the pre-flip tree, then run the snapshot test in
COMPARE mode after the flip and measure the diff bounding box (it must be the pills only).

## 6. Failure handling
- Broken MCP/WebMCP endpoints → Toby logs and patches this skill.

## 7. The first LLM/parse-backed tool (2026-10-09, SpendProof)

A tool whose pipeline needs a model or a document parse (owner policy 2026-10-05,
`context/tech_stack_capabilities.md` §2) carries FOUR extra contracts on top of everything above.
Skipping any one of them is how the posture breaks:

1. **The key is read from the deploy env, server-side, and the refusal is LOUD.** Resolve the
   credentials in one function that throws naming every missing variable, and return that refusal
   **before the cap gate and before any `track()`/metering** — so an unconfigured deploy can never look
   like a serviced call and a probe writes no telemetry row. A stub, a fabricated field or a degraded
   substitute is the one thing the posture forbids: assert the failure path in the test instead
   (`expect(() => resolveExtractionCredentials({})).toThrow(ExtractionUnavailableError)`), and probe the
   live 503 post-deploy rather than faking a key.
2. **Extraction is declared, and it BLOCKS.** Fill a declared field set, carry
   `extracted`/`unreadable`/`unstated` per field, label it on the page AND in the artifact, and return
   **no record at all** when any field is not `extracted`. Never derive the number under audit — a
   refusal to compute `amount` from `quantity × unit_price` is the rule, not a nicety: the amount is
   the evidence the reconciliation exists to check.
3. **The network sits behind an injected transport.** Keep `fetch` out of the engine folder and let the
   route supply a transport function. That is what keeps the deterministic core fixture-testable
   offline and makes the extraction contract testable without a model key.
4. **The class decides the price, and the price must clear the measured cost.** `usesLlmPrimitive: true`
   in `registry.ts` puts every tool of that product in the $0.50–$3.00 band; pair it with a test that
   asserts the rate is at least 3× the PRD's measured per-call cost, or the product ships at a loss.

When the tool list grows, three mechanical traps:

- **APPEND to `WEBMCP_TOOL_SUMMARIES`.** `DEFAULT_AGENT_TOOL` is the first ADVERTISED tool in the list,
  so prepending a new tool silently moves the selector default.
- **Bump the manifest version and `npm run mcp:sync`** — the published tool list IS the contract an
  agent reads, and `manifest.test.ts` fails the build on drift (including the published file).
- **Add the slug to the `pricing.test.ts` wiring list** so no page can re-inline a rate that the API
  charges differently, and add the product to `REVIEWED_PRODUCTS` in `scripts/visual-qa.mjs` **plus** a
  capture in `tests/e2e/qa-screenshot.spec.ts` — a product with no tiles fails the step loudly.
