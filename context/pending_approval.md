# Pending Approval — @Simon approve queue

Single source of truth for work blocked on the founder's `@Simon approve` (hard gate,
AGENTS.md rule 7 / company_goals.md rule 5). Simon does not build code and does not dispatch
build/ship actions ahead of the gate. Read this instead of re-deriving from journals/sweeps.

_Last updated: 2026-09-17 (manifest item closed by hand, not by a sweep) — item 3 is DONE and verified in
production (`a57539f`); the remaining open items are unchanged from the 2026-09-16 sweep below. Owner
instruction 2026-09-17: fix the manifest, then proceed to deliver and drain the queue — so items 4 and 5
(item 5 = the internal-traffic marker, requires a migration on the production Supabase) are the next
software-factory slots; item 2's distribution queue is editorial-gated (needs the editorial gate, not this
one) and item 1's live Stripe key is a founder credential action, not a build._

---

## OPEN — 2026-09-16 sweep (live-verified this run)

1. **[P0 — founder, ~5 min]** `sk_live` in the deploy env **or** record test-mode as intended.
   Live today: `POST /api/checkout` → 200, `cs_test_a1UlRlIvfpCJFByrZEUjbNkIuUaYSgDuc3F9IQUziIosJCixXeST38wqhv`;
   `purchases` = 4 rows, all `cs_test_*`, all 2026-09-02; the only `subscriptions` row is `canceled`.
   Real collected revenue **$0**. Day-14 already scored an honest MISS (row in
   `skills/self_improvement_eval.md`); Day-30 (≈09-30) inherits the same $0 unless answered.
2. **[P0 — no approval needed, expired 09-15]** Echo: post GTM Vectors 1 & 5 / work the queue.
   `factory_config.distribution_queue` live: **36 items, all `ready`, 0 published, 0 deleted**,
   `updated_at` still 2026-09-12T14:48:22Z. The Q3 estimated-tax wedge expired with nothing posted;
   16 days live has produced **0 provably-external sessions** (see item 5's honest form).
3. **[RESOLVED 2026-09-17 — shipped `a57539f`, live-verified]** `.well-known/mcp.json` is now
   generated, never hand-written: `src/lib/webmcp/manifest.ts` derives it from `src/products/registry.ts`
   + `WEBMCP_TOOL_SUMMARIES` (the new canonical surface in `register.ts`). It advertises all three real
   tools — `calculate_qbi_deduction`, `calculate_quarterly_estimate`, `reconcile_stripe_payout` — with
   their true JSON Schemas and product attribution, plus the previously undocumented `x-webmcp-tool`
   selector header (with three tools an agent cannot pick one without it), and no dead name.
   `manifest.test.ts` (7 assertions: registry ↔ definitions ↔ allowlist ↔ manifest ↔ published file)
   fails the build on drift — verified by re-injecting the original regression before committing.
   `/api/agent/calculate` now returns 400 + the supported list for an unadvertised name instead of
   silently running the tax engine (rule 5). Post-deploy probes: prod manifest byte-identical to the
   tree (4 polls, ~60 s); `calculate_self_employment_2026` → 400; `reconcile_stripe_payout` with no
   key/export → explicit 500. Neither probe wrote telemetry, so `agent_query` remains 0 all-time.
4. **[APPROVED 2026-09-17 — build dispatched; was P0 — decision]** FacturGate / ParcelProof pair, queued by
   the 09-14 recon (`91b6c50`). Owner instruction 2026-09-17 ("proceed to implement to deliver solutions")
   is the go/no-go: **FacturGate (83) APPROVED primary** and dispatched as a build job against
   `context/recon_proposals/2026-09-14_facturgate.md` (v1 scope guard only, registry status `beta` — the
   public launch call stays with the founder). **ParcelProof (80) SHORTLISTED**, not started. The build
   line's 8-day idle ends here (`91b6c50` 09-14 06:03 → first FacturGate commit).
5. **[P1 — @Simon approve, code]** Tag internal/QA traffic on `events` at source + re-base the gate
   window to instrumentation start (09-09 20:52) + extend `scripts/growth-check.mjs` beyond
   `quarterline` (LedgerLink's 29 rows and the only 3 `reconcile_click` rows are invisible to every
   gate). Honest traffic form as of today: quarterline 34/34 factory-generated, **2 sessions outside
   every CI cluster and unattributable** (`30eb9935…` 09-10 12:04 → 09-14 02:33 with 3×
   `reconcile_click`; `3f26bb8f…` 09-13 20:34:49), 0 provably external.
6. **[P1 — Simon / SOP]** Make the sweep's durable record non-optional. The 09-14 and 09-15 sweeps both
   ran `completed`, delivered full reports to Slack, and wrote **nothing** into the repo — the only
   copies are `/root/.hermes/cron/output/7804a08125ce/2026-09-1{4,5}_*.md`. This sweep reconstructed
   both entries and the four missing gate rows; the structural fix (a producer for
   `context/daily_voice_journal/`, or an explicit "write the entry + commit" step in the sweep SOP)
   is still open.
7. **[P1 — Hermes fork, DONE this sweep, needs a gateway restart to load]** The recurring
   `Interrupted by shutdown before terminal completion` label is a **bookkeeping** failure, not a run
   failure: today's `Full Pipeline: gpu_hardware` logged `completed successfully` (06:11:28) and
   `delivered to slack` (06:12:25), then `Timed out waiting for local fire fence … failing closed`
   (06:12:25.613) → recorded `failed`. Cause: `cron/jobs.py::heartbeat_fire_claim` wrapped the claim
   refresh in `_fire_job_lock`, which delivery holds for the whole network send (30 s timeout).
   **18 occurrences since 09-03 across 8 days.** Patch re-applied (`cron/jobs.py.bak.20260916`),
   `pytest tests/cron/` re-run; not restarted mid-run because the cron scheduler is in-process with
   this sweep. Operator action: restart `hermes-gateway.service` when no run is in flight.

---

## OPEN (2026-09-12 sweep — live-verified)

1. **[RESOLVED 2026-09-12 13:22 UTC — owner decision, no approval record; kept here for the trail]
   The shared working tree was dirty with an unfinished, unapproved feature and failed the build gate.**
   Original escalation: 7 modified files (2,267 insertions / 596 deletions) +
   new `src/app/api/distribution/tasks/route.ts` + `supabase/migrations/0003_distribution_tasks.sql`;
   mtimes 02:20–02:23 UTC 09-12, written while an Antigravity IDE server held this workspace
   (`file_root_software_factory_core`, started 02:11). Content: a PressFlow "Weekly
   Multi-Platform Distribution & To-Do Queue". Live measurements at sweep time:
   - `npm run lint` → **exit 1** (1 error `src/app/pressflow/page.tsx:316` `react-hooks/set-state-in-effect`
     + 5 warnings). `verify-build.sh` uses `set -e` → **the 10:00 Build Watchdog fails at step 2**, not a
     regression from `main`.
   - `npx tsc --noEmit` clean; `check:tokens` clean; content-distributor vitest 8/8 pass.
   - `src/app/pressflow/page.tsx` rewrite (1515 → 2359 lines) removed copy asserted by
     `tests/e2e/pressflow.spec.ts` ("Editorial Factory Suite", "Load Sample",
     "LinkedIn Format Generator & Publisher") → e2e test 1 fails even after the lint fix.
   - `public.distribution_tasks` **absent in production** (PostgREST `PGRST205`) → the new route 500s; the
     UI to-do list cannot load.
   - No approval record for this feature (AGENTS.md rule 7 / goals rule 5).
   **Resolution (measured 2026-09-12 13:45 UTC, independent re-verification):** the dirty tree was
   committed as `791d6cd` (11:33 UTC, owner) and then removed from this repo with the whole PressFlow
   app in `65f4042` (13:22 UTC, owner, "remove pressflow from software-factory-core into standalone
   Editorial-Factory"). Tree is clean; `main` in sync with origin; deployed image is `65f4042` and
   `/pressflow` now 404s in production. HEAD re-verified green this audit: `tsc --noEmit` 0 errors,
   `eslint` 0 errors (1 unused-var warning), `check:tokens` clean, vitest 28/28, `next build` OK.
   **Two caveats that stay open:** (a) no written approval record was ever created — the commit *is*
   the decision, recorded in "DECISION — owner action (2026-09-12)" below; (b) the commit message
   claims the code moved "into standalone Editorial-Factory", but no `pressflow` app exists in
   `kotechile/Editorial-Factory` (verified locally and against origin) — the code was deleted, and the
   only surviving copies are Docker overlay layers. Treat it as a deletion, not a migration.
   **CORRECTED 2026-09-13:** that reading is right about the *Next.js page* and wrong about the *feature*.
   `kotechile/Editorial-Factory` landed `a6ff966` + `7651104` (09-12 14:43–14:48) — `site/distribution.mjs`
   + the dashboard Reddit/LinkedIn publication to-do queue, live behind auth
   (`pressflow.aichieve.net` `/` → 401, `/healthz` → 200, `/api/articles.json` → 200, 12 published
   articles) and populating Supabase `factory_config.distribution_queue`. Nothing needs restoring from
   `git show 791d6cd:…`; the feature exists, it was rebuilt rather than migrated.
2. **[P0 — founder, ~5 min; NOW GATE-BLOCKING: Day-14 gate due 2026-09-14] Revenue is Stripe test-mode.**
   `STRIPE_SECRET_KEY=sk_test` in the repo `.env`,
   so `charge_count=9` / `gross_revenue_usd=161` from `growth-check.mjs` are test-mode charges; real
   collected revenue is $0. The Day-14 gate (≥$50 gross, due ~09-14 Mon) is unmeetable as configured, and
   the Growth Watchdog only runs Fridays (next 09-18) so nothing evaluates it on time. Set a live key in
   the deploy env, or explicitly record test-mode as intended.
   **Re-verified live 2026-09-13 (not inferred from `.env`):** `POST https://factory.aichieve.net/api/checkout`
   → HTTP 200 with `sessionId: "cs_test_a1NyVAs…"` and `url: checkout.stripe.com/c/pay/cs_test_…`, i.e. the
   deployed app creates **test-mode** sessions. In the DB, all **4 `purchases` rows are `cs_test_*`**
   ($9.00, all 2026-09-02) and the only `subscriptions` row is `canceled` (09-02) → $0 real revenue and
   every monetization signal 11 days stale. Day-14 therefore scores a MISS on both criteria: $0 real
   revenue **and** 0 `agent_query` rows all-time. The §3 fallback ("run A/B copy test") is also
   unscoreable without traffic — it must be paired with distribution (item 5), not scheduled instead of it.
3. **[P0 — code, approval needed] `public/.well-known/mcp.json` still advertises a dead tool name.**
   Re-verified live: prod (200) is byte-identical to the working tree, lists only
   `calculate_self_employment_2026` (registered nowhere), omits `calculate_qbi_deduction`,
   `calculate_quarterly_estimate`, `format_article_for_linkedin`, `reconcile_stripe_payout`. Unchanged
   since `4b3abfd`. **Fix:** generate the manifest from `src/products/registry.ts` + a test asserting
   registry ↔ registered names ↔ manifest agree. _Re-verified 2026-09-13: prod 200, still byte-identical to
   the working tree, still only `calculate_self_employment_2026`; the 20 live pSEO routes are now pushing
   traffic at it._
4. **[P1 — approval needed, and now the fallback has already fired] The Day-7 pSEO fallback shipped ahead
   of its own preconditions.** `dd1251a` (09-11 17:06) took presets 9 → 20 and all new slugs are live (200).
   The 09-11 08:00 sweep required two preconditions first — (a) internal sessions tagged/excluded,
   (b) gate window re-based to instrumentation start (09-09 20:52). Neither exists. 20 indexable routes are
   now justified by a metric that is 100% factory traffic (15/15 sessions internal, 0 external, all-time).
   **Need:** an internal-traffic marker on `events` + a re-based window, then a re-scored verdict.
   _Re-verified 2026-09-13: 20/20 presets HTTP 200 live; `unique_sessions=23` for quarterline and all 23 are
   factory-generated (deploy smoke + Build/Growth Watchdog Playwright + the 09-12 post-removal
   verification); external sessions all-time = 0; `agent_query` = 0. 4 rows / 2 sessions on the `factory`
   directory (09-09 21:22 → 09-10 00:25, 09-10 12:04) sit outside every CI cluster but store no UA, so they
   remain unattributable — the only candidate external traffic ever recorded._
5. **[P1 — no approval needed, 2 days left (expires 2026-09-15)] Echo outreach still has ZERO execution
   record.** Approved
   09-09; the only artifact is `context/growth_blueprints/2026-08-31_quarterline.md` (Vectors 1 & 5, copy
   "ready now"). Sept 15 Q3 estimated-tax deadline is the product's entire urgency moat. Distribution only.
   _New 2026-09-13: the hand-execution tooling now exists — but in the other repo. `editorial-factory`'s
   Supabase `factory_config.distribution_queue` holds **36 items, all status `ready`, 0 published,
   0 deleted** (generated 09-12 14:48, `site/distribution.mjs`, live behind auth at
   `pressflow.aichieve.net`). So even the content queue has never been worked by hand: the blocker is
   execution discipline, not tooling._

## CLOSED this cycle (found 2026-09-12)
- **Dirty-tree P0 (item 1) — CLOSED by owner action, 13:22 UTC.** Committed `791d6cd` then removed with
  the PressFlow app in `65f4042`; tree clean, `main` in sync, deployed `65f4042`, `/pressflow` → 404.
  HEAD re-verified green (tsc/lint/tokens/vitest 28/28/build). Rule-7 deviation recorded in the
  "DECISION — owner action (2026-09-12)" section: no approval record was written before the commits.
- **`0002_events_session_id.sql` — APPLIED** (was 09-11 item 3). Independent probe: `select session_id
  from events limit 1` → HTTP 200 (no more `42703`); `growth-check.mjs` → `session_id_column: true`.
  Re-confirmed this audit: `session_id_column: true`, 15/15 instrumented rows.
- **pSEO presets 9 → 20 — DELIVERED** (`dd1251a`, pushed; new slugs verified 200 in production).
  Re-confirmed this audit: `california-freelancer-tax-2026`, `new-york-schedule-c-qbi`,
  `texas-1099-estimated-tax` → 200 on `factory.aichieve.net`.
- **Cron incident ledger — reconciled 2026-09-12.** All 9 open `cron_incidents` rows were stale
  (7 config-drift skips from 09-06/09-07 that were cured by pinning, 1 HTTP-402 balance outage,
  1 `unknown` post-restart execution); none were acked or closed by the fleet, so the ledger read
  "unhealthy" while every job ran `ok`. All 9 acknowledged via `hermes cron incidents ack`; the two
  `unknown` rows remain the only genuinely unknowable side-effect windows (long-run fire-claim issue,
  see `skills/self_improvement_eval.md`).

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

## OPEN (2026-09-11 sweep — historical; items 3 & 4 now closed, see above)

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
3. **[RESOLVED 2026-09-12 — verified applied] Apply `supabase/migrations/0002_events_session_id.sql` in the
   Supabase SQL editor.** `session_id_column: false` again this sweep. Confirmed this run that it
   **cannot** be applied with the service-role key: PostgREST exposes no DDL and `rpc/exec_sql`
   returns 404. Not verdict-blocking (the payload fallback works — 8 sessions were readable), but
   every gate query is a full-scan jsonb extraction until the indexed column exists.
4. **[DELIVERED 2026-09-12 by `dd1251a` — but see 09-12 item 4: it fired ahead of its preconditions] Author the pSEO fallback presets — the gap is bigger than
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


## DECISION — owner action (2026-09-12)

Recorded during the 2026-09-12 integrity audit. **No `@Simon approve` record was created for either
action** — this section records what the owner actually did, so the trail stops being ambiguous. It is
an *audit note*, not a retroactive approval.

1. **PressFlow "Weekly Multi-Platform Distribution & To-Do Queue" — committed then deleted.**
   `791d6cd` (11:33 UTC) committed the rewrite that the 08:00 sweep had escalated as unapproved and
   gate-failing; `65f4042` (13:22 UTC) removed the entire PressFlow app from this repo. Both authored by
   the owner. Outcome: the feature no longer exists here, the tree is clean, and the build gate is green.
   Deviation: AGENTS.md rule 7 requires the approval *before* development/ship, and neither commit has a
   corresponding approval entry — the commit is the de-facto decision.
2. **Consequence to check before re-adding PressFlow anywhere:** the removal commit message says the code
   moved "into standalone Editorial-Factory", but `kotechile/Editorial-Factory` contains no `pressflow`
   app (verified locally and against `origin/main`; only `site/server.mjs` + `published/`). If PressFlow is
   supposed to live there, it was lost in the move and must be restored from git history
   (`git show 791d6cd:src/app/pressflow/page.tsx`) rather than assumed present.

---

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

## Recon 2026-09-14 — weekly sweep → Proposals queued for @Simon approve

Scan window 2026-08-15 → 2026-09-14. Four vectors searched; two candidates cleared the ≥60 signal
bar and all four viability filters, three signals rejected with reasons. No code built — awaits gate.

- **FacturGate** — EU e-invoice pre-send compliance gate + format converter (Vector A×B). **Score 83.**
  `context/recon_proposals/2026-09-14_facturgate.md`. France's B2B mandate went live **2026-09-01**
  (receive obligation, all VAT businesses; large + mid-size issuing; SMEs 2027-09-01); EN 16931
  profile minimum + CIUS-FR (SIRET, FR VAT codes); penalty raised €15 → **€50/invoice** on the sender.
  Deterministic core = measured high-frequency EN 16931 + CIUS-FR rule set over a canonical invoice
  model, plus Factur-X/CII and UBL 2.1 emitters that *fix* what the existing free validators only
  diagnose. WebMCP `validate_einvoice` / `convert_invoice_to_facturx` / `check_eu_vat_id`.
  Honest limits stated in the PRD: v1 covers the high-frequency rule families only (rest reported as
  `unsupported-rule`), PDF/A-3 hybrid authoring is P1.
- **ParcelProof** — carrier invoice DIM-weight & surcharge audit engine (Vector C×B). **Score 80.**
  `context/recon_proposals/2026-09-14_parcelproof.md`. USPS DIM divisor **166 → 139** effective
  2026-07-12 with fractional dims rounding up (UPS/FedEx already 139); published dim-weight error
  rates 0.1–0.4% of lines and 2–8% of carrier spend recovered; disputes expire in ~21 (FedEx) /
  ~30 (UPS) days. Deterministic core = recompute billable weight from declared shipment records
  against billed invoice lines + accessorial eligibility + dispute clock, with unverifiable lines
  flagged, never guessed. WebMCP `audit_carrier_invoice` / `compute_billable_weight`.
- **Rejected in sweep (logged in `context/audience_pain_points.md`):** Shopify Storefront-MCP → UCP
  conformance checker (free vendor + community tooling already covers it); agent-payment metering /
  governance bridge (Cloudflare Monetization Gateway + AWS WAF Monetize shipped July 2026; Stripe
  MPP / Nevermined / Orb / Metronome own the billing layer); Google Ads API v22 sunset migration
  scanner (third code-migration scanner in three weeks, one-time WTP, free upstream guides —
  archetype saturation with MCPV2 still unbuilt).
- **SOP patched (rule 6):** `skills/market_recon_last30days.md` Stage 2 now carries the measured query
  corrections — the `after:` operator is not honoured by the backend, bare deprecation booleans
  return consumer-media noise, and the two highest-yield phrasings found are regulation+deadline+pain
  (A/B) and billable-quantity+dated-rule-change (C). Failed patterns also logged in
  `skills/self_improvement_eval.md` → "Recon zero-result log".

**Simon recommendation:**
- **FacturGate — APPROVE (primary).** Score 83 with a live, dated regulatory trigger and a
  quantified rejection set (ten named rules dominate failures); the differentiator is *conversion +
  fix*, not another validator, and the agent tier is genuinely metered. Scope note before build:
  hold the rule set to the measured high-frequency families and emit `unsupported-rule` for the
  rest — do not imply full EN 16931 (~1,300 rules) coverage.
- **ParcelProof — SHORTLIST / APPROVE (secondary).** Score 80, recovers cash directly, weakest factor
  is urgency (evergreen). Would reuse the `ledgerlink` CSV-import + reconciliation shape.
- Neither proposal is a build instruction; both wait on `@Simon approve`.

---

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
