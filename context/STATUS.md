# Factory Status Map

_Last updated: 2026-09-24 (08:00 sweep, every surface re-measured live on `apps.giniloh.com` · nothing was built or shipped in 24 h · the live payment key slot still holds a key ID Stripe rejects (401, re-verified) · the written-and-waiting social queue went from empty to 15 ready items, none published · 6 days to the Day-30 gate) · canonical source of truth for the fleet's current state_

## Fleet — 6 bots + 8 contracts

| Bot | Contract | Role | Model |
|---|---|---|---|
| `simon` | `chief_of_staff.md` | Orchestrator, go/no-go, PRD merge | deepseek-v4-pro (→ Claude 3.7 target) |
| `scout` | `market_scout.md` | 30-day signal discovery | deepseek-flash (V4.1 Flash) |
| `phoebe` | `challenger_10x.md` | 10x viral-loop injection | deepseek-v4-pro |
| `product-director` | `director_product.md` | Builds via `agy` (Gemini-only) | deepseek-v4-pro |
| `toby` | `meta_auditor.md` + `growth_watchdog.md` | Quality gate + self-healing + growth gates | deepseek-flash (V4.1 Flash) |
| `echo` | `growth_engine.md` | GTM blueprints + distribution | deepseek-flash (V4.1 Flash) |
| _(transient)_ | `seeder.md` | Ground-zero payload drafts | `delegate_task` subagent |

Supporting profiles on the non-frontier tier (same `deepseek-flash`): `judge`, `publisher`, `radar`
and the default profile. DeepSeek serves exactly two ids — `deepseek-flash` and `deepseek-v4-pro`;
older `deepseek-v4-flash*` ids are server-side aliases of `deepseek-flash`. Frontier crons
(Build Watchdog, Growth Watchdog, the 5 Full-Pipeline editors) stay pinned to `deepseek-v4-pro`.

## Knowledge — 9 SOPs

`market_recon_last30days` · `recon_vertical_packs` · `marketing_engineering_playbook` ·
`voice_content_engine` · `ui_component_standards` · `design_review` · `stripe_gating_workflow` ·
`webmcp_integration` · `self_improvement_eval`

## Heartbeat — 9 crons (Simon gateway)

All nine deliver to `slack:C0BTPDKQXU2:1788974638.867929`; the flash-tier jobs are pinned to
`deepseek-flash` and the rest to `deepseek-v4-pro` (see the model note above).

⚠️ **Gateway restart still owed (operator action, no visible symptom left).** The `cron/jobs.py` fire-claim fix is
applied in the tree (`heartbeat_fire_claim` no longer takes the delivery-held `_fire_job_lock`) but the running
gateway process is still the one started **2026-09-12 15:13**. The last stale `Interrupted by shutdown` label
(`gpu_hardware`) **recorded `ok` on 2026-09-23 07:13:13Z**, so the mislabel has now gone a full week without a
recurrence and nothing on the board is mislabelled. Restart `hermes_cli.main gateway run` while no cron run is in
flight when convenient; see `hermes-cron-debugging/references/fire-claim-misreport.md`.

| Job | Schedule | Model | Workdir |
|---|---|---|---|
| Weekly Market Recon | Mon 06:00 | deepseek-flash | `software-factory-core` |
| Full Pipeline: agentic_ai | Mon + Thu 06:00 | deepseek-v4-pro | `editorial-factory` |
| Full Pipeline: enterprise_tech_leadership | Tue 06:00 | deepseek-v4-pro | `editorial-factory` |
| Full Pipeline: gpu_hardware | Wed 06:00 | deepseek-v4-pro | `editorial-factory` |
| Full Pipeline: supply_chain | Thu 06:00 | deepseek-v4-pro | `editorial-factory` |
| Full Pipeline: home_systems_reno | Fri 06:00 | deepseek-v4-pro | `editorial-factory` |
| Daily Proactive Sweep | daily 08:00 | deepseek-flash | `software-factory-core` |
| Build Watchdog (Toby) | daily 10:00 | deepseek-v4-pro | `software-factory-core` |
| Growth Watchdog | Fri 17:00 | deepseek-v4-pro | `software-factory-core` |

## Closed loop

```
Scout (Mon) → Simon PRD → [@Simon approve] ─┬─ Product Director (agy, Gemini)
                                             └─ Echo (GTM blueprint)          ← parallel
   Seeder (drafts) → Growth Watchdog (Fri) → Day 7/14/30 gates
   Telemetry (Supabase events) ───────────────▲
   pSEO / embed / .well-known → traffic ──────┘
```

## Recon vertical scoping (landed 2026-09-20)

Discovery is now vertical-scoped: a sweep declares one vertical before searching (`Stage 0`), draws its
query phrasings from `skills/recon_vertical_packs.md`, and updates the rotation queue in
`context/vertical_coverage.md`. The factory's 26 audience verticals come from a vendored snapshot of the
editorial registry (`context/editorial_verticals.json`, provenance included — source repo, file commit,
sha256, fetch time), so the guard runs without a sibling checkout; `scripts/vertical-sync.mjs`
regenerates the inventory and `--check` (wired into `scripts/verify-build.sh` as `npm run verticals:check`)
fails on a stale inventory block, a missing/unknown verdict row, or a snapshot behind the live registry.
Reason: 4 of 5 PRDs sat in one vertical cluster (money/document reconciliation) while the archetypes were
domain-agnostic — the prior query book had been pruned by its own improvement loop onto two
compliance-shaped phrasings. Only verticals with an existing distribution channel advance to a build
recommendation.

**First vertical-scoped run (2026-09-21 06:00, on time, `ok`):** declared `warehouse_automation_robotics_capex`
(out of the never-scanned queue), produced one candidate — **CaseProof (78)**, the buyer-side audit of a
warehouse-automation business case (`context/recon_proposals/2026-09-21_caseproof.md`, build ≈3.5 h) — now
open as approval item 9. The free-incumbent check excluded the naive calculator (free vendor ROI
calculators exist) and left the adversarial re-run + multi-quote comparison in scope. Runners-up: 66
(sustained-throughput validator, shortlist) and 63 (peak-labour vs rented capacity, defer).
`scripts/vertical-sync.mjs --check` → exit 0 (26 verticals, no drift).

## Architecture — subpaths under one deploy (moved 2026-09-23)

**Host: `https://apps.giniloh.com`.** `9eb43a5` (2026-09-23 01:57 UTC, owner) migrated the deploy off
`factory.aichieve.net`, which now returns **503 on every path**; `/` 307s to `https://giniloh.com`.

- `/` — 307 → `https://giniloh.com` (the primary brand site).
- `/showcase` — Factory Showcase / directory (search, status badges, WebMCP agent catalog).
- `/<slug>/` — each product's UI; `/ledgerlink/` is live, `/facturgate/` and `/parcelproof/` are beta,
  `/quarterline/` is retired (registry status `killed` since 2026-09-19, `bc3d556`) but still served.
- `/<slug>/calc/*` — per-product pSEO; `/api/*`, `/embed/*`, `/.well-known/*` are shared.
- Payments are product-generic since `bc3d556`: `/api/checkout` and the Stripe webhook resolve the product
  from the request (`app`) or the registry, with the receipt email templated per product. **One residual
  default**: an `app`-less request still resolves to `quarterline`, i.e. the retired product.

## Retired product — QuarterLine (retired 2026-09-19, `bc3d556`)

`https://apps.giniloh.com/quarterline` — 2026 self-employment tax + QBI + estimated-payment
calculator. The owner retired it from active inventory after the Q3 2026 tax deadline window
(registry status `live` → `killed`, retirement copy live on the showcase). The route, the calculator and
the 20 `/quarterline/calc/*` presets are untouched and still 200; `/.well-known/mcp.json` is generated
from `registry.ts` since 2026-09-17 (`a57539f`) — do not hand-edit. **Two surfaces were not retired with
it** (measured 2026-09-20): the manifest still advertises its two tools (`calculate_qbi_deduction`,
`calculate_quarterly_estimate`), and the default `pdf_audit_export` checkout still carries
`app=quarterline` in the Stripe session metadata.

## Beta product — FacturGate (built 2026-09-17, deliberately not launched)

`https://apps.giniloh.com/facturgate` — EN 16931 / CIUS-FR e-invoice pre-send gate and
Factur-X (CII) / UBL 2.1 converter, built from queue item 4 (`e77db64`, owner-approved 2026-09-17).
Registry status is **beta**: the public launch call is the founder's, so nothing here claims traction.

- Engine `src/lib/calc/einvoice/` — 65 implemented rule checks (55 EN 16931 core ids + the 10
  `BR-FR-*` CIUS-FR overlay ids), totals recomputed from the lines in integer cents with an explicit
  `delta` and the destination country's VAT rounding policy (PL at the total, EN 16931 core per
  line). 25 known-answer vitest vectors pin the exact finding list per rule family; an absent or
  unmappable field throws `EinvoiceFieldError` naming its rule id — no invented defaults.
- Surfaces: `/facturgate`, 12 `/facturgate/calc/*` presets, and `validate_einvoice`,
  `convert_invoice_to_facturx`, `check_eu_vat_id` registered via `navigator.modelContext.registerTool`
  and advertised in the generated `/.well-known/mcp.json` (v1.2.0).
- Stated v1 limits (published in the product's own coverage panel, not hidden): EN 16931's ~1,300
  rules are covered by the measured high-frequency families only; PDF/A-3 hybrid authoring,
  EXTENDED-CTC-FR lifecycle fields, e-reporting/CDAR and national serializations (PL KSeF FA(3) XML)
  are P1; `check_eu_vat_id` is offline format + checksum — VIES status is not queried.

## Beta product — CaseProof (built 2026-09-22, deliberately not launched)

`https://apps.giniloh.com/caseproof` — the buyer's side of a warehouse-automation business case,
built from approval item 9 (`78d0739`, owner-approved 2026-09-22, PRD `context/recon_proposals/2026-09-21_caseproof.md`,
§5 v1 scope guard only). Registry status is **beta**: the public launch call is the founder's, so nothing
here claims traction.

- Engine `src/lib/calc/caseproof/` — pure, no I/O, no clock, no LLM: the **fully loaded** labour rate with its
  component breakdown (wage + employer payroll burden + benefits + FLSA overtime premium + turnover
  replacement); the vendor's quote line items as CSV rows, echoed and categorized, never re-priced (an
  unmapped row is surfaced, a blank amount is an unpriced line — never $0); §179 (with its phase-out) then
  100% bonus then straight-line **by tax year**, from a cited rule table (2026 only; an uncited year is
  refused, never estimated); the after-tax cash flow per bid (ramp, downtime at the contracted availability,
  error saving, maintenance/licence, amortized one-time lines, lease/RaaS escalation and the peak-fleet
  weight, debt service) with payback in months, IRR and NPV at the hurdle rate; the audit (the vendor's own
  assumptions re-run through the same engine, then the buyer's applied one input group at a time, break-even
  per assumption, ranked confirm-in-writing list); and 2–3 bids on one cash model with the solved crossing
  point and the volume −10/−20/−30%, capex +15%, maintenance +25% sensitivity grid.
- **29 known-answer vectors** pin the PRD's arithmetic: a proposal claiming **14 months** reproduced at
  **14.1** and audited at **41.0**, with the driver chain reconciling month for month; the §179 phase-out
  ($5,000,000 basis → $1,650,000 allowed, −$910,000, $0 at $6,650,000); the capex-vs-subscription crossing at
  a **40.0% seasonal premium**; a fully stated quote producing **zero flags**; an empty maintenance field
  reported **`unstated`** and blocking a pass.
- Surfaces: `/caseproof`, **6** `/caseproof/calc/*` presets, and `audit_automation_case` +
  `compare_automation_bids` + `after_tax_payback` ($0.50/call) registered via
  `navigator.modelContext.registerTool` and advertised in the generated `/.well-known/mcp.json`
  (**v1.5.0, 9 tools**).
- Stated v1 limits (PRD §5 scope guard, published in the product's own coverage panel): no PDF/OCR
  extraction of a proposal, no rate tables or benchmarks of our own, no throughput *sizing* model, the §179
  taxable-business-income limitation and MACRS conventions are not modelled, and a paid decision-pack export
  / Stripe checkout is not wired (the CSV pack ships free).

## Beta product — ParcelProof (built 2026-09-18, deliberately not launched)

`https://apps.giniloh.com/parcelproof` — carrier invoice DIM-weight / surcharge audit, built from
queue item 4's ParcelProof half (`3584a62`, owner-approved 2026-09-18, docs `73cad11` + `19d9529`).
Registry status is **beta**: the public launch call is the founder's, so nothing here claims traction.

- Engine `src/lib/calc/parcelaudit/` — billable weight recomputed as `max(actual, ceil(L)*ceil(W)*ceil(H)/divisor)`
  with the divisor resolved by carrier × service × ship date (UPS/FedEx 139; USPS 166 before 2026-07-12,
  then 139), the round-up rule applied to every dimension, and the cubic-inch threshold enforced. An
  unmapped service or out-of-range date throws with its rule id — no divisor is ever defaulted. Accessorial
  eligibility, service-commitment refunds and the per-carrier dispute clock (UPS ~30 / FedEx ~21 days) are
  recomputed from the record; unpriceable lines report `unverifiable-rate`, never $0. 32 known-answer
  vitest vectors pin the arithmetic.
- Surfaces: `/parcelproof`, **6** `/parcelproof/calc/*` presets (all probed 200 on 2026-09-19), and
  `audit_carrier_invoice` + `compute_billable_weight` registered via `navigator.modelContext.registerTool`
  and advertised in the generated `/.well-known/mcp.json` (**v1.3.0, 8 tools**).
- Stated v1 limits (PRD §5 scope guard): zone-matrix derivation, published fuel tables, LTL/ocean modes and
  rate-card auto-mapping stay P1; every line outside v1 is reported `unverifiable-rate` rather than passed.
- **Open question for the owner:** the tariff table makes UPS's AHS-Dimension trigger a longest side > 96″
  while FedEx triggers at > 48″, so a 40″ parcel is ineligible at *both* carriers. If the intended UPS
  trigger is 48″, that is a one-line change in `src/lib/calc/parcelaudit/surcharges.ts` and the vectors follow.

## Infrastructure

- **Quality gate** — `scripts/verify-build.sh`: tsc → eslint → token-lint → vitest →
  build → Playwright (visual + axe a11y) → Gemini vision-QA (`visual-qa`).
- **Design flywheel** — `visual-qa --suggest` → `context/design_backlog.md` → Toby triage.
- **Telemetry** — `src/lib/telemetry.ts` → Supabase `events` (page_view, export_click,
  checkout_click, agent_query, reconcile_click). `scripts/growth-check.mjs` now takes the product as an
  argument (`process.argv[2] || GROWTH_PRODUCT || "quarterline"`, `bc3d556`) instead of being hard-scoped,
  but `reconcile_click`/`agent_query` still are not counted by it, and the internal-traffic marker (queue
  item 5) remains unbuilt.
- **Growth surfaces** — pSEO routes, embed widget, `.well-known` A2A manifests.
- **Config-as-data** — Gemini key/model/prompt live in Supabase `factory_config`
  (modifiable without redeploy).

## Database — Supabase (all applied, no pending migration)

| Table | Purpose | Status |
|---|---|---|
| `factory_config` | runtime secrets/config (Gemini key, QA model) | ✅ live |
| `events` | growth telemetry | ✅ live (read 2026-09-23) — **1419 rows** (parcelproof 440 / facturgate 297 / quarterline 228 / factory 219 / ledgerlink 121 / caseproof 114), last write 2026-09-23T02:42:28Z; **858 session ids**, 198 null-session rows; **standalone session ids outside every CI cluster — all unattributable**: the returning browser `30eb9935` (24 rows across four products on seven separate days 09-10 → 09-22, **did not return 09-23**), `3b3193ce` (09-19), `e41dfb4c` (09-19) and **five new ones in the 26 h to 08:00 09-23** (`3eb270ce` 09-22 21:48:52Z, `ac8303ae` 09-23 01:38:00Z, `59a27597` 01:39:39 factory + 01:39:50 ledgerlink, `24c8fd67` 01:40:10, `a3f8de07` 02:41:57 factory + 02:42:28 ledgerlink) — they straddle the 01:57 domain migration and read like the owner checking the site, but carry no UA/referrer → **0 provably external in 23 days**. **4 `agent_query` rows, all factory ship probes** (facturgate ×3, 2026-09-17 03:50; parcelproof ×1, 2026-09-18 22:07) — organic agent queries 0; `product=caseproof` reads **114** rows, all factory verification runs (the 09-22 build's own 90-row deletion was not repeated) |
| `subscriptions` | Stripe subscription records (webhook) | ✅ live |
| `purchases` | one-off PDF-export purchases (webhook) | ✅ live |

`supabase/schema.sql` is the complete, re-runnable source of truth for all four tables.

## Environment

Coolify env vars **added** (Supabase URL/service-role/anon, Stripe, Resend). Local `.env`
mirrors them.

## Remaining / dormant

1. Distribution is the binding constraint — **0 provably-external sessions / 0 organic `agent_query` / $0 real
   revenue in 23 days live**; production Stripe is still practice mode (`cs_test_` checkout sessions, `livemode:false`
   read back from the Stripe API — fresh probe 2026-09-23, `cs_test_a1l9pF2VmGwT3oDxyoyh5dvCJ199BQZYGbjPH4ccQGlqX4l3mv6hGtO0p7`
   via `app=ledgerlink`; 4 `cs_test_*` purchases all 09-02). **The mode split now exists** (`dfc2851`): deploy env has
   `STRIPE_MODE=test`, `STRIPE_SECRET_KEY_TEST=sk_test_…` and a **live pair whose secret `mk_1UAeGxJaTDc3aAp0lG3UwbFj`
   is the key's ID, not the key** — read-only `GET /v1/balance` → HTTP 401 *"This looks like the ID of an API key rather
   than the key itself"*; `src/lib/stripe/mode.ts` needs the `sk_live_` prefix, so `STRIPE_MODE=live` with that value is
   an explicit throw. The remaining step to real revenue is one paste.
   Eleven standalone session ids sit outside every CI cluster but carry no UA/referrer, so they are unattributable,
   not provably external (`30eb9935` is a returning browser, 09-10 → 09-22, **24 rows across four products on
   seven separate days** — it did **not** return on 09-23; `3b3193ce` returned 09-19; `e41dfb4c` 09-19 21:50;
   **five new single-visit sessions in the 26 h to 08:00 09-23**, two of them showing the directory-then-product
   click pattern no factory test run produces); 198 null-session rows carry every `agent_query`,
   `checkout_click` and `export_click` row. The agent tier's only rows are the 4 factory ship-probe `agent_query`
   rows (3 FacturGate + 1 ParcelProof), so it is factory-exercised, not demanded. The pSEO footprint is 44
   indexable routes (20 quarterline + 12 facturgate + 6 parcelproof + 6 caseproof, all 200 on 2026-09-23 on the new
   host) justified by traffic that is still 100 % factory-generated, and **nothing maps them for crawlers**
   (`/robots.txt` and `/sitemap.xml` 404, no producer in the repo — item 11); the Day-7 fallback shipped before its
   preconditions and remains unreviewed; the Day-14 gate scored an honest MISS on 09-14 and Day-30 (≈09-30, 7 days out)
   inherits the same $0 and is formally gated on the still-unbuilt internal-traffic marker. The `distribution_queue` was
   **deleted unposted by the owner on 09-19 22:42 (`[]`, 0 items ever published, unchanged since)** — the 36 posts
   prepared on 09-12 all expired unused. **Three products are built and remain `beta`** (FacturGate, ParcelProof,
   CaseProof) — the public launch calls are the founder's. The build line ran twice on 2026-09-22 (item 8 `b6e6555`,
   item 9 `78d0739`); the open queue holds item 1 (the live payment key — one paste), item 5 (internal-traffic
   marker + migration), item 6 (durable record), item 7 (gateway restart, no visible symptom left), **item 10**
   (the three public QuarterLine surfaces) and **item 11** (the migration leftovers: a descriptor file naming the
   dead host + no crawler map).
2. Dynamic OG images — deferred (metadata OG ships; `@vercel/og` route is a later nicety).
3. DeepSeek reliability — daily-sweep cron failed once ("can't reach model provider");
   monitor fleet-wide.
4. Front-end login UI — not built (optional per PRD); subscription/export gating is
   service-role only until it ships.
