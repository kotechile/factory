# Pending Approval — @Simon approve queue

Single source of truth for work blocked on the founder's `@Simon approve` (hard gate,
AGENTS.md rule 7 / company_goals.md rule 5). Simon does not build code and does not dispatch
build/ship actions ahead of the gate. Read this instead of re-deriving from journals/sweeps.

_Last updated: 2026-09-05_

---

## P0 — WebMCP monetization + telemetry fix (code)

- **What:** Route the two browser WebMCP tools (`calculate_qbi_deduction`,
  `calculate_quarterly_estimate` in `src/lib/webmcp/register.ts`) through the metered path —
  either `POST /api/agent/calculate` or mirror its `track("agent_query", …)` +
  `reportMeteredUsage(...)` calls — instead of computing client-side.
  This is a **3-way tool-name mismatch** to fix in one pass: (1) the browser tools compute
  client-side (no metering), (2) `src/products/registry.ts` advertises
  `calculate_self_employment_2026`, (3) `src/app/api/agent/calculate/route.ts` records the
  event with `tool: "calculate_self_employment_2026"` — while the only real registered names
  are `calculate_qbi_deduction` and `calculate_quarterly_estimate`.
- **Why:** This is the entire `$0.25/query` agent tier (company_goals.md hard rule #4 + the
  WebMCP monetization pillar). Currently `agent_query=0` and $0 collected; GTM Vector 4 would
  publish a dead tool name to Smithery/Glama.
- **Effort:** small, bounded — the metered route already exists and just needs to be hit.

## P1 — Echo outreach (ship, time-sensitive)

- **What:** Dispatch Echo to execute GTM Vectors 1 & 5 — the "23%-vs-20% QBI trap" drop
  (Reddit/X/HN) and the 25-CPA memo. Copy is already written in
  `context/growth_blueprints/2026-08-31_quarterline.md` ("ready now").
- **Why:** Sept 15 Q3 estimated-tax deadline (10 days out) is the product's entire urgency moat.
  Zero execution record to date; this cannot be done "after."
- **Effort:** distribution only, no code.

## P1 — Day-7 gate fallback prep (code, due 2026-09-07)

- **What:** Day-7 gate is ≥50 unique sessions + ≥1 export. Current: ~61 page_view events, 2
  export clicks, 9 charges / $161 (revenue flat 48h). If unmet, playbook says "deploy 20
  additional pSEO routes" — but only 9 presets exist in `src/lib/seo/presets.ts`. Author the 20
  now so the fallback ships instantly if the gate misses.
- **Measurement gap (fix needed for honest gate):** `scripts/growth-check.mjs` counts raw
  `page_view` events, not unique sessions/visitors, so "≥50 unique sessions" cannot be honestly
  evaluated. Add unique-visitor/session instrumentation.

## P2 — Design backlog (code, batch into any approval)

From `context/design_backlog.md` (2026-09-01, `visual-qa --suggest`):
1. Unify CTA copy to "Export Report ($9)" top & bottom (low effort, kills price-shock drop-off).
2. Currency input mask (commas + persistent `$`) — high impact / medium effort.
3. Emphasize "Total 2026 Tax Liability" card as the primary focal point.
4. Fix Alert-banner button contrast (currently fails WCAG 2.1 AA 3:1).

## Resolved (no action)

- Approval-gate tightening — DONE 2026-09-01 (commit `1a60b9f`); gate is already hard.
- Stranded 09-03 lint fix + SOP note — landed in commits `48486f0` / `64796ee`; tree clean.
