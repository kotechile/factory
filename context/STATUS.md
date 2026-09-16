# Factory Status Map

_Last updated: 2026-09-16 (daily sweep) · canonical source of truth for the fleet's current state_

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
- `/<slug>/` — each product's UI; `/quarterline/` is the only live product.
- `/<slug>/calc/*` — per-product pSEO; `/api/*`, `/embed/*`, `/.well-known/*` are shared.

## Live product — QuarterLine

`https://factory.aichieve.net/quarterline` — 2026 self-employment tax + QBI + estimated-payment
calculator. Live surfaces (all HTTP 200): directory, calculator, `/quarterline/calc/*` pSEO
(20 presets, 308-redirected from the old `/calc/*`), `/embed/countdown`, `/.well-known/mcp.json` (stale — see below).

## Infrastructure

- **Quality gate** — `scripts/verify-build.sh`: tsc → eslint → token-lint → vitest →
  build → Playwright (visual + axe a11y) → Gemini vision-QA (`visual-qa`).
- **Design flywheel** — `visual-qa --suggest` → `context/design_backlog.md` → Toby triage.
- **Telemetry** — `src/lib/telemetry.ts` → Supabase `events` (page_view, export_click,
  checkout_click, agent_query, reconcile_click — the last two are not in the growth-check script,
  which is hard-scoped to `quarterline`).
- **Growth surfaces** — pSEO routes, embed widget, `.well-known` A2A manifests.
- **Config-as-data** — Gemini key/model/prompt live in Supabase `factory_config`
  (modifiable without redeploy).

## Database — Supabase (all applied, no pending migration)

| Table | Purpose | Status |
|---|---|---|
| `factory_config` | runtime secrets/config (Gemini key, QA model) | ✅ live |
| `events` | growth telemetry | ✅ live — 281 rows, last write 2026-09-15 10:01:50 (Playwright); 34/34 quarterline sessions factory-generated, 2 sessions outside every CI cluster and unattributable, 0 provably external, 0 `agent_query` |
| `subscriptions` | Stripe subscription records (webhook) | ✅ live |
| `purchases` | one-off PDF-export purchases (webhook) | ✅ live |

`supabase/schema.sql` is the complete, re-runnable source of truth for all four tables.

## Environment

Coolify env vars **added** (Supabase URL/service-role/anon, Stripe, Resend). Local `.env`
mirrors them.

## Remaining / dormant

1. Distribution is the binding constraint — **0 provably-external sessions / 0 `agent_query` / $0 real
   revenue in 16 days live**; production Stripe is still test mode (`cs_test_` checkout sessions, 4
   `cs_test_*` purchases all 09-02). Two sessions sit outside every CI cluster but carry no UA/referrer,
   so they are unattributable, not provably external. The Day-7 fallback (20 pSEO routes) shipped
   before its preconditions and remains unreviewed; the Day-14 gate scored an honest MISS on 09-14.
2. Dynamic OG images — deferred (metadata OG ships; `@vercel/og` route is a later nicety).
3. DeepSeek reliability — daily-sweep cron failed once ("can't reach model provider");
   monitor fleet-wide.
4. Front-end login UI — not built (optional per PRD); subscription/export gating is
   service-role only until it ships.
