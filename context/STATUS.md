# Factory Status Map

_Last updated: 2026-09-20 (daily sweep, 08:00 UTC) · canonical source of truth for the fleet's current state_

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

## Knowledge — 8 SOPs

`market_recon_last30days` · `marketing_engineering_playbook` · `voice_content_engine` ·
`ui_component_standards` · `design_review` · `stripe_gating_workflow` ·
`webmcp_integration` · `self_improvement_eval`

## Heartbeat — 9 crons (Simon gateway)

All nine deliver to `slack:C0BTPDKQXU2:1788974638.867929`; the flash-tier jobs are pinned to
`deepseek-flash` and the rest to `deepseek-v4-pro` (see the model note above).

⚠️ **Gateway restart pending (operator action).** The `cron/jobs.py` fire-claim fix is applied in the tree
(`heartbeat_fire_claim` no longer takes the delivery-held `_fire_job_lock`) but the running gateway
process is still the one started **2026-09-12 15:13**, so a completed+delivered run can still be mislabelled
`Interrupted by shutdown before terminal completion` (last seen 2026-09-16 08:07; none on 09-17, 09-18 or
09-19). Restart `hermes_cli.main gateway run` while no cron run is in flight; see
`hermes-cron-debugging/references/fire-claim-misreport.md`.

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

## Architecture — subpaths under one deploy

- `/` — Factory Showcase (directory: search, status badges, WebMCP agent catalog).
- `/<slug>/` — each product's UI; `/ledgerlink/` is live, `/facturgate/` and `/parcelproof/` are beta,
  `/quarterline/` is retired (registry status `killed` since 2026-09-19, `bc3d556`) but still served.
- `/<slug>/calc/*` — per-product pSEO; `/api/*`, `/embed/*`, `/.well-known/*` are shared.
- Payments are product-generic since `bc3d556`: `/api/checkout` and the Stripe webhook resolve the product
  from the request (`app`) or the registry, with the receipt email templated per product. **One residual
  default**: an `app`-less request still resolves to `quarterline`, i.e. the retired product.

## Retired product — QuarterLine (retired 2026-09-19, `bc3d556`)

`https://factory.aichieve.net/quarterline` — 2026 self-employment tax + QBI + estimated-payment
calculator. The owner retired it from active inventory after the Q3 2026 tax deadline window
(registry status `live` → `killed`, retirement copy live on the showcase). The route, the calculator and
the 20 `/quarterline/calc/*` presets are untouched and still 200; `/.well-known/mcp.json` is generated
from `registry.ts` since 2026-09-17 (`a57539f`) — do not hand-edit. **Two surfaces were not retired with
it** (measured 2026-09-20): the manifest still advertises its two tools (`calculate_qbi_deduction`,
`calculate_quarterly_estimate`), and the default `pdf_audit_export` checkout still carries
`app=quarterline` in the Stripe session metadata.

## Beta product — FacturGate (built 2026-09-17, deliberately not launched)

`https://factory.aichieve.net/facturgate` — EN 16931 / CIUS-FR e-invoice pre-send gate and
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

## Beta product — ParcelProof (built 2026-09-18, deliberately not launched)

`https://factory.aichieve.net/parcelproof` — carrier invoice DIM-weight / surcharge audit, built from
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
| `events` | growth telemetry | ✅ live — 799 rows (quarterline 213 / parcelproof 208 / factory 169 / facturgate 153 / ledgerlink 56), last write 2026-09-19 23:42:28Z; 445 session ids, **7 session ids outside every CI cluster, all unattributable, plus 16 null-session rows** (0 provably external in 20 days); **4 `agent_query` rows, all factory deploy smoke** (facturgate ×3, 2026-09-17 03:50; parcelproof ×1, 2026-09-18 22:07) — organic agent queries 0 |
| `subscriptions` | Stripe subscription records (webhook) | ✅ live |
| `purchases` | one-off PDF-export purchases (webhook) | ✅ live |

`supabase/schema.sql` is the complete, re-runnable source of truth for all four tables.

## Environment

Coolify env vars **added** (Supabase URL/service-role/anon, Stripe, Resend). Local `.env`
mirrors them.

## Remaining / dormant

1. Distribution is the binding constraint — **0 provably-external sessions / 0 organic `agent_query` / $0 real
   revenue in 20 days live**; production Stripe is still test mode (`cs_test_` checkout sessions, `livemode:false`
   read back from the Stripe API — fresh probe 2026-09-20, 4 `cs_test_*` purchases all 09-02). Seven session ids
   sit outside every CI cluster but carry no UA/referrer, so they are unattributable, not provably external
   (`3b3193ce` is a returning browser, 09-09 → 09-19; `30eb9935` holds the only `checkout_click` outside the
   09-02 window; `e41dfb4c` is new, 09-19 21:50; `1199d4ed` sits 7 minutes after the 09-13 Build Watchdog run).
   The agent tier's only rows are the 4 factory deploy-smoke `agent_query` rows (3 FacturGate + 1 ParcelProof
   ship probe), so it is factory-exercised, not demanded. The pSEO footprint is 38 indexable routes (20
   quarterline + 12 facturgate + 6 parcelproof) justified by traffic that is still 100 % factory-generated; the
   Day-7 fallback shipped before its preconditions and remains unreviewed; the Day-14 gate scored an honest MISS
   on 09-14 and Day-30 (≈09-30, 10 days out) inherits the same $0 and is formally gated on the still-unbuilt
   internal-traffic marker. The `distribution_queue` was **deleted unposted by the owner on 09-19 22:42
   (`[]`, 0 items ever published)** — the 36 posts prepared on 09-12 all expired unused, and the editorial
   pipeline was reset on real search demand. Both shipped products (FacturGate, ParcelProof) remain `beta` —
   the public launch calls are the founder's.
2. Dynamic OG images — deferred (metadata OG ships; `@vercel/og` route is a later nicety).
3. DeepSeek reliability — daily-sweep cron failed once ("can't reach model provider");
   monitor fleet-wide.
4. Front-end login UI — not built (optional per PRD); subscription/export gating is
   service-role only until it ships.
