# Pending Approval — @Simon approve queue

Single source of truth for work blocked on the founder's `@Simon approve` (hard gate,
AGENTS.md rule 7 / company_goals.md rule 5). Simon does not build code and does not dispatch
build/ship actions ahead of the gate. Read this instead of re-deriving from journals/sweeps.

_Last updated: 2026-09-11 (Daily Proactive Sweep)_

---

## SHIPPED + VERIFIED (2026-09-10 sweep)

All items approved on 09-09 have landed on `main` and are deployed. Nothing here is open.

- **P0 WebMCP metering + tool-name fix — SHIPPED** (`05ac8ae`). Verified live:
  `POST /api/agent/calculate` + `x-webmcp-tool: calculate_qbi_deduction` → 200, writes
  `agent_query` with `payload.tool = "calculate_qbi_deduction"` (probe row deleted; metric stays
  honest at 0 real agent queries). `reconcile_stripe_payout` without a customer key → HTTP 500 with
  an explicit error (no factory-key fallback). All 4 tools registered via `WebMCPProvider`.
  ⚠️ One leg left open — see "NEW/OPEN" item 1 (stale published manifest).
- **LedgerLink — SHIPPED** (`967a1f2`): engine + fixtures/tests + `/ledgerlink` UI + WebMCP tool,
  registered in `registry.ts` (status `live`). 200 on `https://factory.aichieve.net/ledgerlink`.
- **Day-7 instrumentation — SHIPPED** (`36ea75c`): `ql_session_id` cookie → `payload.session_id`,
  present in the deployed bundle; `growth-check.mjs` reports `unique_sessions`. Migration itself
  still unapplied — see item 2.
- **Design backlog P2 — SHIPPED** (`05ac8ae`): CTA copy unified to "Export Report ($9)" top+bottom,
  currency formatting with commas, "Total 2026 Tax Liability" card promoted (`border-primary/50
  bg-primary/5 shadow-md`), alert-banner button border raised to `border-foreground/50`.
- **Build Watchdog — RECOVERED**: last run 09-09 10:13 `ok` (had failed 5× on fire-claim TTL).

## OPEN (2026-09-11 sweep — live-verified)

1. **[P0 — verdict is in: MISSED, and the metric is self-generated]** Day-7 gate scored
   `unique_sessions=8` vs the ≥50 criterion, and **every one of the 8 sessions was produced by the
   factory itself**: 4 from the 09-09 deploy smoke (20:52:00–20:52:04) and 4 from the 09-10 10:01
   Build Watchdog Playwright run (raw `events` provenance read this sweep; 214 rows total, nothing
   written since 09-10 12:04). `agent_query` = 0 all-time; the only `checkout_click` (3) and
   `export_click` (2) rows in the table are a single 42-minute window on 09-02. **Implication: the
   gate cannot be honestly scored until internal traffic is excluded — a CI run can "pass" the gate
   for the wrong reason.** Verdict logged in `skills/self_improvement_eval.md`; SOP patched
   (`skills/marketing_engineering_playbook.md` §3 measurement rule + §5 edge-case 2026-09-11).
   **Two code fixes needed (approval):** (a) tag internal traffic at source (CI/deploy/QA probes)
   so the gate query can filter it; (b) re-base the gate window to instrumentation start (09-09
   20:52). Until then the Growth Watchdog (Fri 17:00) is evaluating a number we generate ourselves.
2. **[P0 — code, approval needed] `public/.well-known/mcp.json` still advertises a dead tool name.**
   Verified live again this sweep: the working-tree file and `https://factory.aichieve.net/.well-known/mcp.json`
   are byte-identical, still listing only `calculate_self_employment_2026` (registered nowhere) and
   omitting `calculate_qbi_deduction`, `calculate_quarterly_estimate`, `format_article_for_linkedin`,
   `reconcile_stripe_payout`. Unchanged since `4b3abfd`; no producer script. **Fix:** generate the
   manifest from `src/products/registry.ts` (route handler or build step) + a test asserting
   registry ↔ registered tool names ↔ manifest agree. GTM Vector 4 would publish the dead name.
3. **[P0 — founder, ~5 min, manual] Apply `supabase/migrations/0002_events_session_id.sql` in the
   Supabase SQL editor.** `session_id_column: false` again this sweep. Confirmed this run that it
   **cannot** be applied with the service-role key: PostgREST exposes no DDL and `rpc/exec_sql`
   returns 404. Not verdict-blocking (the payload fallback works — 8 sessions were readable), but
   every gate query is a full-scan jsonb extraction until the indexed column exists.
4. **[P1 — code, approval needed] Author the pSEO fallback presets — the gap is bigger than
   recorded.** `src/lib/seo/presets.ts` holds **9** presets, not 11 → **11 short** of the 20-route
   fallback target (the 09-10 record said 9 short). The route
   (`src/app/quarterline/calc/[slug]/page.tsx`) is generic, so this is preset data only. Also
   reconcile the playbook's two different targets (20 routes in the journals vs "50 pages" in §4)
   before dispatching.
5. **[P1 — no approval needed, expires Sept 15] Echo outreach still has ZERO execution record.**
   Approved 09-09; the only artifact remains the blueprint
   (`context/growth_blueprints/2026-08-31_quarterline.md`, Vectors 1 & 5, copy "ready now").
   4 days to the Q3 estimated-tax deadline — the product's entire urgency moat. Distribution only.
6. **[P2 — CLOSED, no action] `context/design_backlog.md` triage.** The 09-10 item claiming the
   2026-09-01 suggestions are still untriaged is **stale**: the file already marks all four
   ✅ accepted & implemented in `05ac8ae`. No re-flag risk; item dropped from the queue.


## DECISION — Approval granted by @Simon approve (2026-09-09)

ALL software next steps APPROVED. Gate lifted; proceed to build/ship.

- **P0 WebMCP metering fix — APPROVED**
- **P1 Echo outreach — APPROVED**
- **P1 Day-7 gate (unique-session instrumentation) — APPROVED**
- **P2 Design backlog — APPROVED**
- **LedgerLink — APPROVED** (keep scope note: customer Stripe key / JSON export, not the factory's own account)
- **MCPV2 — DEFER** (unchanged; weak moat, no build)

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

## P1 — Day-7 gate (PAST DUE — was 09-07, no verdict logged)

- **What:** Day-7 gate is ≥50 unique sessions + ≥1 export. Latest (09-09): page_view=134,
  export_click=2, checkout_click=3, charge_count=9 / $161 (flat 7 days). Export criterion likely
  met (2 clicks + 9 charges); sessions criterion unverifiable (see gap). If judged missed, the
  playbook says "deploy 20 pSEO routes" — only ~11 presets exist (`src/lib/seo/presets.ts`),
  ~9 short. Author the remainder now.
- **Measurement gap (fix needed for honest gate):** `scripts/growth-check.mjs` counts raw
  `page_view` events, not unique sessions/visitors, so "≥50 unique sessions" cannot be honestly
  evaluated. Add unique-visitor/session instrumentation. Growth Watchdog (next run Fri 09-11)
  should log the verdict — the growth-gate audit log currently ends 09-04.

## P2 — Design backlog (code, batch into any approval)

From `context/design_backlog.md` (2026-09-01, `visual-qa --suggest`):
1. Unify CTA copy to "Export Report ($9)" top & bottom (low effort, kills price-shock drop-off).
2. Currency input mask (commas + persistent `$`) — high impact / medium effort.
3. Emphasize "Total 2026 Tax Liability" card as the primary focal point.
4. Fix Alert-banner button contrast (currently fails WCAG 2.1 AA 3:1).

## Recon 2026-09-07 — weekly sweep → Proposals queued for @Simon approve

- **LedgerLink** — Stripe payout → GL reconciliation engine (Vector B). Score 76.
  `context/recon_proposals/2026-09-07_ledgerlink.md`. B2B bookkeeper WTP high; deterministic
  `Σnet == payout.amount` invariant; WebMCP `reconcile_stripe_payout`. No code built — awaits gate.
- **MCPV2** — 2026-07-28 stateless migration scanner (Vector A×D). Score 62 (barely over the 60 bar).
  `context/recon_proposals/2026-09-07_mcpv2.md`. Timely but WTP moderate; flag for Toby to vet the
  score before dispatch, since it just clears 60 and repeats a one-time (fast-decaying) urgency window.
- **Rejected in sweep:** OpenAI Assistants→Responses wire-compatible bridge (incumbent Ragwalla +
  free OAI guide; no deterministic engine; fails filter 3). Google Content API→Merchant API (deadline
  08-18 passed; incumbent feed-network moat). Both logged in `context/audience_pain_points.md`.

**Simon recommendation (2026-09-07):**
- **LedgerLink — APPROVE (primary).** Score 76, real recurring pain, WTP 90, sound `Σnet ==
  payout.amount` invariant. One scope note before build: "reads Stripe via the factory's existing
  Stripe key" is imprecise — that key reads the factory's own account, not a customer's payouts.
  MVP should accept a customer read-only Stripe restricted key OR a pasted/uploaded Stripe JSON
  export; the deterministic engine is fixture-testable either way.
- **MCPV2 — DEFER.** Score 62 barely clears the bar; WTP 40 (one-time migration, narrow dev
  segment) and a fast-decaying urgency window = weak recurring moat. Not worth a build slot now.

## Resolved (no action)

- Fleet provider outage (09-06 → 09-07) — RESOLVED. DeepSeek 402 → global config drift → unpinned
  jobs skipped. Founder pinned all jobs; sweep + weekly recon + editorial now `ok`.
  Follow-up: Build Watchdog (`3157deecdeb5`) failing 5× with "Interrupted by shutdown before
  terminal completion" (long verify-build.sh exceeds the run/fire-claim limit) — Toby's quality
  gate is down; triage + raise the run limit.
- Approval-gate tightening — DONE 2026-09-01 (commit `1a60b9f`); gate is already hard.
- Stranded 09-03 lint fix + SOP note — landed in commits `48486f0` / `64796ee`; tree clean.
