# Factory Status Map

_Last updated: 2026-09-01 · canonical source of truth for the fleet's current state_

## Fleet — 6 bots + 8 contracts

| Bot | Contract | Role | Model |
|---|---|---|---|
| `simon` | `chief_of_staff.md` | Orchestrator, go/no-go, PRD merge | deepseek-v4-pro (→ Claude 3.7 target) |
| `scout` | `market_scout.md` | 30-day signal discovery | deepseek-v4-pro |
| `phoebe` | `challenger_10x.md` | 10x viral-loop injection | deepseek-v4-pro |
| `product-director` | `director_product.md` | Builds via `agy` (Gemini-only) | deepseek-v4-pro |
| `toby` | `meta_auditor.md` + `growth_watchdog.md` | Quality gate + self-healing + growth gates | deepseek-v4-pro |
| `echo` | `growth_engine.md` | GTM blueprints + distribution | deepseek-v4-pro |
| _(transient)_ | `seeder.md` | Ground-zero payload drafts | `delegate_task` subagent |

## Knowledge — 8 SOPs

`market_recon_last30days` · `marketing_engineering_playbook` · `voice_content_engine` ·
`ui_component_standards` · `design_review` · `stripe_gating_workflow` ·
`webmcp_integration` · `self_improvement_eval`

## Heartbeat — 4 crons (Simon gateway)

| Job | Schedule | Deliver |
|---|---|---|
| Weekly Market Recon | Mon 06:00 | Slack |
| Daily Proactive Sweep | daily 08:00 | local |
| Build Watchdog (Toby) | daily 10:00 | local |
| Growth Watchdog | Fri 17:00 | Slack |

## Closed loop

```
Scout (Mon) → Simon PRD → [@Simon approve] ─┬─ Product Director (agy, Gemini)
                                             └─ Echo (GTM blueprint)          ← parallel
   Seeder (drafts) → Growth Watchdog (Fri) → Day 7/14/30 gates
   Telemetry (Supabase events) ───────────────▲
   pSEO / embed / .well-known → traffic ──────┘
```

## Live product — QuarterLine

`https://factory.aichieve.net` — 2026 self-employment tax + QBI + estimated-payment
calculator. Live surfaces (all HTTP 200): main app, `/calc/*` pSEO (9 presets),
`/embed/countdown`, `/.well-known/mcp.json`.

## Infrastructure

- **Quality gate** — `scripts/verify-build.sh`: tsc → eslint → token-lint → vitest →
  build → Playwright (visual + axe a11y) → Gemini vision-QA (`visual-qa`).
- **Design flywheel** — `visual-qa --suggest` → `context/design_backlog.md` → Toby triage.
- **Telemetry** — `src/lib/telemetry.ts` → Supabase `events` (page_view, export_click,
  checkout_click, agent_query).
- **Growth surfaces** — pSEO routes, embed widget, `.well-known` A2A manifests.
- **Config-as-data** — Gemini key/model/prompt live in Supabase `factory_config`
  (modifiable without redeploy).

## Database — Supabase (all applied, no pending migration)

| Table | Purpose | Status |
|---|---|---|
| `factory_config` | runtime secrets/config (Gemini key, QA model) | ✅ live |
| `events` | growth telemetry | ✅ live (empty — awaiting traffic) |
| `subscriptions` | Stripe subscription records (webhook) | ✅ live |
| `purchases` | one-off PDF-export purchases (webhook) | ✅ live |

`supabase/schema.sql` is the complete, re-runnable source of truth for all four tables.

## Environment

Coolify env vars **added** (Supabase URL/service-role/anon, Stripe, Resend). Local `.env`
mirrors them.

## Remaining / dormant

1. `events` table empty — telemetry wired but no traffic yet; first Growth Watchdog run
   (Fri 2026-09-04) will report ~zero until visitors arrive.
2. Dynamic OG images — deferred (metadata OG ships; `@vercel/og` route is a later nicety).
3. DeepSeek reliability — daily-sweep cron failed once ("can't reach model provider");
   monitor fleet-wide.
4. Front-end login UI — not built (optional per PRD); subscription/export gating is
   service-role only until it ships.
