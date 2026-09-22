# Pending Approval — @Simon approve queue

Single source of truth for work blocked on the founder's `@Simon approve` (hard gate,
AGENTS.md rule 7 / company_goals.md rule 5). Simon does not build code and does not dispatch
build/ship actions ahead of the gate. Read this instead of re-deriving from journals/sweeps.

_Last updated: 2026-09-22 (CaseProof shipped `78d0739`, live-verified — item 9 closed; item 8 shipped
`b6e6555` earlier the same day) — **owner instruction 2026-09-22 in
`loop-ai` (Jorge Fernandez): "Pending developments are approved. Tomorrow I will take care of my pending actions
(stripe, to-do's list, etc)"** → item 8 approved and shipped (`b6e6555`, live-verified) and item 9 (CaseProof)
approved, dispatched (dispatch record `ea56aaf`) and **built + shipped this pass**. The owner's own actions — the
live Stripe key (item 1) and the editorial to-do list, which lives in `kiosk/editorial-factory` — stay his, and
were not touched. Items 5, 6, 7 are unchanged (item 5 also needs a production Supabase migration only the owner
can apply); **item 10 remains open** with the QuarterLine surfaces the registry retirement does not cover._

_**2026-09-22 — CASEPROOF SHIPPED `78d0739`, live-verified.** The one-shot build job landed the 09-21 weekly
recon's single candidate (score 78) at `https://factory.aichieve.net/caseproof` as a **`beta`** product — the
public launch call stays with the founder, as every build does. PRD `context/recon_proposals/2026-09-21_caseproof.md`,
**§5 v1 scope guard only**: line items are pasted/uploaded as CSV rows (no PDF/OCR), no rate table of our own, no
throughput sizing model, and an unstated cost line blocks a pass verdict rather than being estimated._

- **Engine** `src/lib/calc/caseproof/` (pure: no I/O, no clock, no LLM): fully loaded labour rate with its
  component breakdown (wage + employer burden + benefits + FLSA overtime premium + turnover replacement); the
  quote-line normalizer (echoed, categorized, never re-priced — an unmapped row is surfaced, a blank amount is an
  unpriced line, never $0); §179 (with its phase-out) → bonus → straight-line **by tax year** from a cited rule
  table (2026 only; an uncited year is refused, never estimated); the after-tax cash flow per bid (ramp, downtime
  at the contracted availability, error saving, maintenance/licence, amortized one-time lines, lease/RaaS
  escalation and peak-fleet weight, debt service) with payback in months, IRR and NPV at the hurdle rate; the
  audit (vendor's own assumptions re-run, buyer's applied one input group at a time, break-even per assumption,
  ranked confirm-in-writing list); and 2–3 bids on one cash model with the solved crossing and the PRD's
  sensitivity grid.
- **Known-answer vectors (29 tests, `npm run test` 123/123):** the PRD's flip is **reproduced exactly** — a
  proposal claiming **14 months** is re-run by the same engine at **14.1** and audits at **41.0** on the buyer's
  numbers, with the driver chain reconciling month for month (the test asserts `14.1 + Σ deltas == 41.0` and that
  the chain's last value equals the buyer's run); §179 phase-out at a $5,000,000 basis cuts the $2,560,000 limit to
  **$1,650,000** (−$910,000, $0 at $6,650,000); the capex-vs-subscription ranking flips at a **40.0% seasonal
  premium** (1.400 ± 0.005); a fully stated quote produces **zero flags and nothing unstated**; an empty
  maintenance field reports **`unstated`, charges $0 and blocks a pass**.
- **Two PRD lines reported with their own honest verdict, not bent to the prose:** (a) the §2 vector 3 direction —
  the crossing is at 40.0% as written, but the measured direction is the reverse of the PRD's phrasing
  ("subscribing wins only past a 40% seasonal premium"): a fixed-price capex bid has no peak exposure while a
  per-unit subscription is charged for the peak fleet, so the subscription leads *below* 40% and the capex bid
  leads above it. The engine publishes the direction it solved; the prose claim is unverifiable as written.
  (b) the flip's attribution — the three inputs the PRD names do move it (loaded labour **−10.3** months, turnover
  **−0.9**, maintenance **+19.7**), but the largest single driver is the headcount claim itself: the proposal's
  **52 FTE** vs the buyer's own **18** accounts for **+26.6** of the 27-month gap. Reported as measured.
- **Surface:** `/caseproof` + **6** `/caseproof/calc/*` preset pages; registry entry at `beta`; telemetry under the
  `caseproof` slug; **3** metered WebMCP tools (`audit_automation_case`, `compare_automation_bids`,
  `after_tax_payback` at **$0.50/call**) registered via `navigator.modelContext` **and** handled in the server
  branch of `/api/agent/calculate` (explicit 400 + rule id on a malformed case: live `cp-options-empty` /
  `case.options`). Published manifest generated (**v1.5.0, 9 tools**, `npm run mcp:sync`; `manifest.test.ts` is the
  drift guard) — never hand-edited.
- **Gate:** `scripts/verify-build.sh` **green end to end** — tsc 0 / eslint 0 errors / design tokens /
  `verticals:check` / **vitest 123** / `next build` / **Playwright 41** (13 new: 10 CaseProof e2e incl. axe WCAG
  2.1 AA, 2 layout guards, 1 QA capture; the directory visual snapshot regenerated **and reviewed**) / Gemini
  visual-QA **PASS ×4** including CaseProof on the first verdict.
- **Live, after the deploy (not the push):** deployed image tag
  `af8yqbwrrnyyfgs9wcg0intj:78d073988131be39e48ad6ae955db7ce983e6eea` == pushed HEAD; `/caseproof` **200**;
  published manifest **byte-identical to the tree** (sha256 `f3be55bc…`, v1.5.0, 9 tools, CaseProof's 3 advertised);
  the 400 rejection paths (unknown tool → the 9-tool list; malformed case → `ruleId` + `fieldPath`) returned before
  any telemetry write; and one **metered** success-path probe (`audit_automation_case`) returned **payback 41**,
  `costPerQueryUsd 0.50`, meter event `agent_case_audit` — **its `agent_query` row and the 90 `page_view`/
  `audit_click` rows my own verification runs wrote under `product=caseproof` (ids 1006–1189, 01:56–01:59 UTC,
  51 Playwright sessions, all created before the product existed in production) were deleted afterwards**, so
  `product=caseproof` reads **0 rows** and the growth metric is not reading our own tests as usage.
- **Docs in the same pass:** `skills/webmcp_integration.md` (multi-tool product checklist + the resolve-once rule),
  `skills/ui_component_standards.md` (directory snapshot, repeated-number locators, no clock in the deterministic
  core), `skills/self_improvement_eval.md` (7 rows). Code and docs are separate commits.
- **Open for the owner:** the public launch call for CaseProof (status stays `beta`); the paid decision-pack export
  and its Stripe checkout are **not** part of v1 (CSV pack ships; PRD §3 pricing is unchanged and unwired).

_**2026-09-22 — OWNER APPROVAL RECORDED + ITEM 8 SHIPPED (by hand, not a sweep).** Owner instruction in `loop-ai`
(Jorge Fernandez, software-factory approver), verbatim: **"Pending developments are approved. Tomorrow I will take
care of my pending actions (stripe, to-do's list, etc)"**. Read as the open *software* work this queue was waiting
on the approver for — item 8 (finish the retirement) and item 9 (CaseProof, the 09-21 recon candidate at the
go/no-go) — and applied to nothing else: the phrasing followed a list, so it was scoped to the two items named as
developments, one build slot at a time (item 5 was not dispatched; item 6 is SOP work; item 7 needs an operator
restart). The owner's own actions are explicitly his: item 1's live Stripe key and the editorial distribution
to-do list.

**Item 8 — SHIPPED `b6e6555`, live-verified.** Both halves the item named, plus every other stale literal of the
retired slug on a paid or agent surface:

- `src/products/registry.ts` now derives the inventory (`activeProducts` / `retiredProducts` /
  `activeProductSlugs` / `defaultInventoryProduct` / `isRetiredProduct`); generated surfaces read it, so one
  `status` change retires every surface instead of needing an edit per surface.
- `/api/checkout` (a): `app` no longer defaults to a product literal. An `app` naming a `killed` product is an
  explicit 400; an `app`-less product-scoped plan (`pdf_audit_export`, `cpa_monthly`) is an explicit 400 naming
  the inventory — **rejected, not silently substituted for a live product**, because re-attributing the retired
  product's own page to LedgerLink would be a silent fallback (rule 5). `factory` stays the directory sentinel for
  app-less generic plans; non-registry white-label app names stay accepted.
- WebMCP manifest + agent allowlist (b): both now derive from the inventory, so the retired product's two tools are
  neither served nor advertised. Manifest v1.4.0, **6 tools (was 8)**, and `tool_selector.default` is now the
  derived `DEFAULT_AGENT_TOOL` (`reconcile_stripe_payout`) instead of a retired tool name. `manifest.test.ts`
  asserts that nothing owned by a retired product is served or advertised, that the selector default is an
  advertised tool, and that no tool definition belongs to no product at all.
- **Guard proven by injection before committing:** (a) the previously published manifest file → the byte-identity
  test fails; (b) counting `killed` products as inventory → `retired product's tool 'calculate_qbi_deduction' is
  still advertised in the manifest` fails. 9/9 green after each restore.
- Same-class stale literals of the retired slug: telemetry's default product, the Stripe webhook's app fallback,
  and the billing portal's three redirects to the retired page (now the directory root).
- **Gate:** `scripts/verify-build.sh` green end to end (tsc 0 / eslint 0 errors / tokens / `verticals:check` /
  vitest 94 / build / Playwright 28 / visual-qa PASS ×3).
- **Live, after the deploy (not the push):** deployed image tag `af8yqbwrrnyyfgs9wcg0intj:a5c8c8971…` == pushed
  HEAD; published manifest byte-identical to the tree (sha256 `b5ca149c…`, v1.4.0, 6 tools, default
  `reconcile_stripe_payout`); app-less `pdf_audit_export` → **400** with the inventory list; `app=quarterline` →
  **400** "retired and cannot be purchased"; `app=ledgerlink` → 200 `cs_test_a1YNCQRO…` (one sandbox session from
  the verification probe; the route writes no telemetry); retired tool name → **400** + the 6-tool list; a live
  tool → 200 (its `agent_query` probe row id 1005 was deleted after the check — `agent_query` is back to 4, all
  pre-existing ship probes); `/api/portal` → 307 to `/`.

**Also shipped in the same pass — `a5c8c89`, the build gate itself.** `scripts/verify-build.sh` was **red on a clean
`main`** before any change was made: `verticals:check` compared the generated inventory block byte-for-byte
including the date it was generated, so it failed every calendar day until someone re-ran the sync. The check now
normalizes only the `_Generated <date> by` token (rows and the snapshot provenance line are still byte-compared) and
a plain `verticals:sync` keeps the date fresh. Proven: date-only staleness → exit 0, one character changed in an
inventory row → exit 1.

**Item 9 — APPROVED + DISPATCHED.** CaseProof (78) is dispatched as a one-shot cron job (see DISPATCH below)
against `context/recon_proposals/2026-09-21_caseproof.md`, **PRD §5 v1 scope guard only**, registry status
`beta` — the public launch call stays with the founder, as every build does.

**Item 10 — NEW, opened by this ship (owner decision).** The registry retirement is now complete on the paid and
agent surfaces, but three QuarterLine surfaces are still live for the public: (a) `/quarterline` still renders the
working calculator with a "$9 export" CTA that now returns an explicit 400 error instead of selling (honest, but a
dead end for a visitor); (b) the 20 `/quarterline/calc/*` preset pages are still served and indexable — 38
`/calc/*` routes were 200 in the 09-21 sweep; (c) `/embed/countdown` still links to `/quarterline`. Nothing was
changed here because each is a publish/unpublish decision, not a retirement leftover: recommend (a) replace the
calculator with the retirement notice the directory already carries, (b) keep or 301 the preset pages to the
directory, (c) repoint the embed. Awaiting the founder's call.


_**2026-09-21 08:00 sweep — measured live.** No product code and no `src/` change in the last day. The **Weekly
Market Recon ran on time at 06:00 (`ok`) — the first vertical-scoped run** — declaring
`warehouse_automation_robotics_capex` from the never-scanned rotation queue and producing **CaseProof (78)**
(`9bbb804`, PRD `context/recon_proposals/2026-09-21_caseproof.md`, build ≈3.5 h): the buyer-side audit of a
warehouse-automation business case, scoped away from the generic calculator by the free-incumbent check (free
vendor ROI calculators now exist: ISD 2026-07-10, Dexory, Kinexon, KUKA) toward the adversarial re-run of the
vendor's own numbers plus multi-quote comparison. Two further commits landed outside any scheduled run
(`1bc3a58` 09-20 13:32 vertical-scoped discovery; `ffebf51` 09-20 17:01 vendored registry). Item 8: the
published manifest still advertises `calculate_qbi_deduction` + `calculate_quarterly_estimate` and
`src/app/api/checkout/route.ts:40` still defaults `app="quarterline"` for `pdf_audit_export` (fresh `app`-less
probe → `cs_test_a1Ay2uDa…`). Item 1: `livemode:false`, 4 `purchases` all 09-02, **$0 real revenue**. Item 5:
`agent_query` still 4, every one a factory ship probe → organic 0 on day 21. Item 6: the durable record is
written a sixth day running without a producer. Item 7: patch still unloaded (gateway pid `1963330` from
09-12), no new mislabel; the two jobs that still display the 09-15/09-16 mislabels next run **09-22** and
**09-23**. New evidence for item 5: the one returning browser (`30eb9935`) made **8 page views on 09-20 and
09-21 across the showcase, LedgerLink and FacturGate** — the only visitor-like signal in 21 days and still
unattributable without tagging at source. Prod probes: all 38 `/calc/*` routes 200, manifest v1.3.0 / 8 tools /
sha256 `6ea29ed1…` byte-identical to the tree, retired tool name → 400; `vertical-sync.mjs --check` exit 0._

_**2026-09-20 08:00 sweep — measured live.** Two owner workstreams landed overnight. (a) `bc3d556`
(2026-09-19 23:43 UTC, Jorge Fernandez, by hand): **QuarterLine retired in the registry (`live` → `killed`)**
and `/api/checkout` + the Stripe webhook generalized to any product (`app` from the request or the registry,
per-product receipt email); `scripts/growth-check.mjs` now takes the product as an argument, a partial answer
to item 5. Deployed and live (showcase serves the retirement copy). **Item 8 opened:** a default checkout
request (`plan: "pdf_audit_export"`, no `app`) still resolves to the retired product — the session metadata
read back from the Stripe API says `app=quarterline, appName=QuarterLine` — and the published manifest still
advertises its two tools (`calculate_qbi_deduction`, `calculate_quarterly_estimate`). (b) `editorial-factory`
six commits 23:09 → 01:23: new verticals + Google Search Console wiring, and `fbc3606` removed all drafts and
published articles "to start fresh" — `published/` holds only `.gitkeep`, `/api/articles.json` → `[]`, and
**`factory_config.distribution_queue` is `[]` (updated 09-19 22:42:49Z)**, so the 36 posts prepared 09-12 are
deleted, not published. **Item 2 is therefore closed as resolved-by-removal**, with the honest residue that 0
items were ever published and the third wedge in a row expired unused. Item 1: prod checkout `cs_test_a1MlUGMq…`
with `livemode:false` (API-verified), 4 `purchases` all 09-02, $0 real revenue. Item 5: `agent_query` still 4,
every one our own ship probe; manifest byte-identical to the tree (sha256 `6ea29ed1…`, v1.3.0, 8 tools). Item
6: the durable record is now written a fifth day running without a producer. Item 7: patch still unloaded
(gateway pid `1963330` from 09-12), no new mislabel; it matters again on 09-22 (`enterprise_tech_leadership`)
and 09-23 (`gpu_hardware`), the two jobs that still display the 09-15/09-16 mislabels._

_**2026-09-19 08:00 sweep — measured live.** Item 4 closed on both halves: ParcelProof shipped 09-18 22:05
(`3584a62` + docs `19d9529`), `/parcelproof` 200, all 6 `/parcelproof/calc/*` 200, manifest v1.3.0 with 8
tools and byte-identical to the tree. **Item 2's clock has now run out: `distribution_queue` is 36/36
`ready`, 0 published, untouched since 09-12 14:48, and its lead item's event date (2026-09-18) passed with
nothing posted** — the third wedge in a row to expire. Item 1 re-measured: prod checkout still `cs_test_…`
(fresh probe 09-19; 4 `purchases`, all 09-02, $0 real revenue). Item 5 re-measured: **`agent_query` is now
4 rows and every one is our own ship probe** (3 FacturGate + 1 ParcelProof), so the Day-30 agent criterion
still has no organic reading; the 09-18 Growth Watchdog row formally gates Day-30 on this item. Item 6: the
sweep has now written a durable record four days running, still without a producer. Item 7: patch still
unloaded (gateway pid from 09-12), no new mislabel on 09-17/09-18/09-19. **New this sweep:** an open
correctness question on the shipped ParcelProof (UPS AHS-Dimension trigger 96″ as published vs 48″ as
possibly intended — one line in `src/lib/calc/parcelaudit/surcharges.ts`)._

---

_**2026-09-18 21:32 UTC — OWNER APPROVAL RECORDED (by hand, not a sweep).** Owner instruction in `loop-ai`
2026-09-18: **"approve ParcelProof"** → item 4's open ParcelProof go/no-go is answered. The ParcelProof (80)
build is dispatched as a one-shot cron job against `context/recon_proposals/2026-09-14_parcelproof.md`,
**PRD §5 v1 scope guard only** — DIM-weight recompute (UPS/FedEx/USPS domestic parcel, carrier × service ×
date divisors incl. USPS 166 → 139 on 2026-07-12), round-up + cubic-inch thresholds, AHS-Dimension
eligibility, service-commitment refund eligibility, dispute-window clock, CSV ingest, recovery ledger +
dispute CSV, and the two WebMCP tools; registry status `beta` (the **public launch call stays with the
founder**). Nothing outside that scope is approved — P1 items (zone-matrix derivation, published fuel
tables, LTL/ocean modes, rate-card auto-mapping) stay deferred. Item 4's FacturGate half is unchanged
(live as `beta`, launch call still open)._

_**2026-09-18 08:00 sweep re-verified every item below live.** Item 3 stays closed (prod manifest byte-identical
to the tree, sha256 `f3b4cbd2…327fea`; retired tool name → 400, second day). Item 4 is unchanged from 09-17:
**FacturGate live as `beta`** (all 12 `/facturgate/calc/*` → 200, enumerated from the preset file), **ParcelProof
still shortlisted with no go/no-go — the build line has been idle 28 h** (last product commit `e77db64`,
09-17 03:49; no commit at all since `c1b3139`). Item 2 is now **on the clock: `distribution_queue` is 36/36
`ready`, 0 published, untouched since 09-12, and its top item's event date is TODAY 2026-09-18** (the Q3 wedge
expired 09-15 unused). Items 1, 5, 6, 7 re-measured: prod checkout still `cs_test_…` (4 `purchases`, all 09-02,
$0 real revenue); `events` 374 rows / 149 sessions with **5 non-CI sessions** (new `d8e77f23`, 09-17 22:03:17)
→ 0 provably external in 18 days; **`agent_query` still 3, all FacturGate deploy smoke**; the **Growth Watchdog
fires today 17:00** (first run since 09-11) and will meet exactly those polluted inputs; fire-claim patch still
unloaded (gateway process from 09-12, no new mislabel)._

_**2026-09-18 22:07 UTC — PARCELPROOF SHIPPED (cron build run `3584a62`, live-verified).** Queue item 4's
ParcelProof half is now built and deployed to `https://factory.aichieve.net/parcelproof` at the approved
**beta** status: the deterministic audit engine (`src/lib/calc/parcelaudit/`, 32 known-answer vitest
vectors), the paste/upload recovery UI + dispute CSV, 6 `/parcelproof/calc/*` preset pages, and the two
WebMCP tools `audit_carrier_invoice` + `compute_billable_weight` advertised in the generated
`/.well-known/mcp.json` (v1.3.0, 8 tools). `scripts/verify-build.sh` passed end to end before the push
(tsc / eslint 0 err / tokens / 92 vitest / build / 28 Playwright / Gemini visual-QA PASS ×3). PRD §5's v1
scope guard is unchanged: zone-matrix derivation, published fuel tables, LTL/ocean modes and rate-card
auto-mapping stay P1, and every line outside v1 is reported `unverifiable-rate` rather than passed.
**Open for the owner:** the public launch call for ParcelProof is still his (status stays `beta`), and the
PRD's tariff table puts UPS's AHS-Dimension trigger at a longest side > 96″ (FedEx > 48″), so a 40″ parcel
is ineligible at *both* carriers — if the intended UPS trigger is 48″, that is a one-line change in
`src/lib/calc/parcelaudit/surcharges.ts` and the vectors follow it. Nothing else in the queue changed._

---

## DISPATCH — 2026-09-22 (approval item 9, CaseProof)

- **Job:** `38704fd5a527` — "CaseProof build (approval item 9)", one-shot (`in 2m`), workdir
  `software-factory-core`, `deliver=slack`, `attach_to_session=true`, skill `approval-gated-shipping`.
- **Fired:** 2026-09-22 01:35:42 UTC, execution `40042aae3e4b4e80a177ff7db1bb1c64` — verified via
  `hermes cron list` (`Execution: running …`, `Repeat: 1/1`), not from `jobs.json` (which keeps
  `last_run_at: null` until the run completes).
- **The dispatched prompt constrains the job to:** PRD §5 v1 scope guard only; registry status `beta`;
  the full `scripts/verify-build.sh` gate; push **only** on green; restore-a-clean-tree-and-report on a
  root cause it cannot fix; deploy verification by container image tag == `git rev-parse --short HEAD`;
  side-effect-free post-deploy probes; the durable record + the rule-6 SOP patch; and a report that
  passes `scripts/check-slack-report.mjs` before it is posted.
- **Known limitation (recorded, not hidden):** `cronjob_manage action='create'` ignores `model`/`provider`
  — the job persisted with `model: null`, so it runs on the **default fleet tier** (`deepseek-flash`)
  rather than the frontier builder tier the repo's "Runtime model note" assigns to Product Director
  work. One build slot is running; nothing else was dispatched in parallel.

## OPEN — 2026-09-16 sweep (live-verified this run)

1. **[P0 — founder, ~5 min]** `sk_live` in the deploy env **or** record test-mode as intended.
   Live today: `POST /api/checkout` → 200, `cs_test_a1UlRlIvfpCJFByrZEUjbNkIuUaYSgDuc3F9IQUziIosJCixXeST38wqhv`;
   `purchases` = 4 rows, all `cs_test_*`, all 2026-09-02; the only `subscriptions` row is `canceled`.
   Real collected revenue **$0**. Day-14 already scored an honest MISS (row in
   `skills/self_improvement_eval.md`); Day-30 (≈09-30) inherits the same $0 unless answered.
   _2026-09-22: the paid-surface probe must now name a product. An `app`-less product-scoped request is an explicit
   400 (item 8, shipped), so a sandbox/live reading needs `app=<inventory product>` — verified this pass with
   `app=ledgerlink` → 200 `cs_test_a1YNCQRO…`, `livemode:false`, and `app=quarterline` → 400._
2. **[CLOSED 2026-09-20 — resolved by owner removal, not by publishing]** Echo: post GTM Vectors 1 & 5 /
   work the queue. `factory_config.distribution_queue` is now **`[]`, `updated_at` 2026-09-19T22:42:49Z** —
   the owner deleted the 36 prepared posts (all `ready` since 09-12, 0 published) while resetting the
   editorial pipeline onto real search demand. Honest residue: **0 items were ever published**, and the third
   urgency wedge in a row (Q3 estimated tax 09-15, the 09-18 customs/CBP story) expired unused. No
   distribution work is owed from this repo; a new queue is the editorial engine's to regenerate.
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
   key/export → explicit 500. Those two probes wrote no telemetry; the guide/manifest probes at 03:50 did —
   see the 09-17 sweep note at the top of this file (`agent_query` = 3, all deploy smoke).
4. **[CLOSED 2026-09-19 — fully shipped: FacturGate `beta` (`e77db64`) + ParcelProof `beta` (`3584a62`);
   both launch calls remain open below]** FacturGate /
   ParcelProof pair, queued by the 09-14 recon (`91b6c50`). Owner instruction 2026-09-17 ("proceed to
   implement to deliver solutions") is the go/no-go: **FacturGate (83) APPROVED primary**, built and pushed
   by job `0da7fd6c8f68` (`e77db64` + docs `c1b3139`), deployed tag `c1b3139`; live-verified this sweep —
   `/facturgate` 200, all 12 `/facturgate/calc/*` 200, 3 metered WebMCP tools advertised, `verify-build.sh`
   green end to end. Registry status stays `beta`: the **public launch call is still the founder's**.
   **ParcelProof (80) APPROVED 2026-09-18** by owner instruction ("approve ParcelProof") → **build dispatched
   as a one-shot job** against `context/recon_proposals/2026-09-14_parcelproof.md`, PRD §5 v1 scope guard only,
   registry status `beta`. The build line's re-idle (28 h at the 08:00 sweep) ends with this dispatch.**
   The 8-day idle that ended here (`91b6c50` 09-14 06:03 → first FacturGate commit) had restarted on 09-17;
   this dispatch ends it again at ~42 h (last product commit `e77db64`, 09-17 03:49).
5. **[P1 — @Simon approve, code]** Tag internal/QA traffic on `events` at source + re-base the gate
   window to instrumentation start (09-09 20:52) + extend `scripts/growth-check.mjs` beyond
   `quarterline` (LedgerLink's 29 rows and the only 3 `reconcile_click` rows are invisible to every
   gate). Honest traffic form as of today (09-17 sweep): quarterline 51 session ids — 47 factory-generated
   inside CI clusters (deploy smoke + Build Watchdog + the 09-17 FacturGate verify runs), **4 sessions
   outside every CI cluster and all unattributable** (`3b3193ce…` 09-09 21:22 → 09-10 00:25; `30eb9935…`
   09-10 12:04 → **09-16 23:57**, a returning browser holding 3× `reconcile_click` and the only
   `checkout_click` outside the 09-02 window, 09-16 23:56:36; `3f26bb8f…` 09-13 20:34:49; `49d8211a…`
   **09-16 19:06:50**), **0 provably external in 17 days**. New this sweep: the marker must also cover
   **server-side route rows** — the 3 `agent_query` rows are all the FacturGate deploy smoke
   (09-17 03:50:21–22) with `session_id` null, indistinguishable from a real agent caller and sitting in
   the exact metric the Day-30 gate reads (see `skills/marketing_engineering_playbook.md` edge-case
   2026-09-17).
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
8. **[CLOSED 2026-09-22 — SHIPPED `b6e6555`, live-verified; full evidence in the 09-22 entry at the top]
   Finish the QuarterLine retirement the
   owner's `bc3d556` started, so no live surface sells or advertises a retired product:
   (a) `/api/checkout` still defaults `app = "quarterline"` for `plan: "pdf_audit_export"` — measured live:
   an `app`-less request produced `cs_test_a1MlUGMq…` whose Stripe metadata reads `app=quarterline,
   appName=QuarterLine`, and the receipt email is templated on that name; (b) `public/.well-known/mcp.json`
   (generated from `registry.ts` + `WEBMCP_TOOL_SUMMARIES`, so the fix is in the generator/registry, not the
   file) still advertises `calculate_qbi_deduction` and `calculate_quarterly_estimate`, both attributed
   `quarterline`. Suggested shape: filter the manifest and the product lookup to non-`killed` statuses and
   default the export plan to a `live` product (`ledgerlink`) or reject the default explicitly. Customer-facing
   risk is latent while checkout is sandbox, and becomes live the moment item 1 is answered. Both changes are
   `src/` work → rule 7 gate applies.
9. **[CLOSED 2026-09-22 — SHIPPED `78d0739`, live-verified; full evidence in the 09-22 CaseProof entry
   at the top]** **CaseProof (78)** — the 2026-09-21
   weekly recon's single candidate, full PRD at `context/recon_proposals/2026-09-21_caseproof.md`. First
   scan of the `warehouse_automation_robotics_capex` vertical (never scanned; ledger verdict A, pack now
   verified). The product is the **buyer's side of a warehouse-automation business case**: it re-runs a
   vendor's own quoted numbers against the buyer's fully loaded labour (turnover included), the lines
   vendors omit (integration, facility work, maintenance, commissioning ramp), the buyer's tax year
   (Section 179 limit $2,560,000 / phase-out $4,090,000, 100% bonus depreciation, equipment placed in
   service by **2026-12-31**), and normalizes 2–3 competing quotes onto one five-year cash model —
   returning payback, IRR, NPV at the buyer's hurdle rate, the assumptions that fail and at what value,
   a sensitivity grid, and an exportable decision pack. **The free-incumbent check shaped the scope and
   is the reason this is not another calculator:** free *vendor* ROI calculators now exist (ISD launched
   2026-07-10; Dexory, Kinexon and KUKA also publish one), so a generic calculator is excluded by the
   recon drop rule; the audit + multi-quote comparison is the unowned surface. Build estimate ≈3.5 h;
   **built and shipped 2026-09-22 (`78d0739`, live-verified, status `beta`); the public launch call
   remains the founder's.** Timeliness: the Sep–Oct peak-staffing commitment window, the 2026-12-31
   in-service date, and the
   2027-01-01 wage-floor step (CA $16.90 → $17.40, +2.99%). Runners-up scored this sweep and shortlisted:
   sustained-throughput validator (66) and peak-labour vs rented capacity (63), both blocked by weaker
   free-incumbent positions.

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
