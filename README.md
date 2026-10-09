# software-factory-core — Agent Operating Constitution

This repository is the shared brain of the **Autonomous Product & Software Factory**:
a dark-headless, multi-agent assembly line that discovers acute B2B/B2C bottlenecks,
scaffolds deterministic micro-SaaS utilities, embeds WebMCP agent endpoints, and ships
them with near-zero marginal build cost.

> `AGENTS.md` (repo root) auto-injects these rules into any agent working inside this repo.

## Directory map
- `.agents/`     — persona & role contracts (canonical; mirrored into each Bot's SOUL.md)
- `skills/`      — Standard Operating Procedures (SOPs). Canonical source of truth.
- `context/`     — shared long-term memory (goals, pain points, recon proposals, voice journal)
- `scripts/`     — verification + manual cron triggers
- `src/`         — (future) generated product code from the Antigravity build line

## Non-negotiable factory rules
1. **Deterministic core only.** A product is in-scope only if its value is a deterministic
   algorithm, multi-variable model, or structured document transform. No long-term human service.
2. **Primitives fit.** Must build from Next.js + Tailwind + Supabase + Stripe + Resend. No native
   hardware/mobile sensors.
3. **≤ 4-hour build budget** for MVP + test suite (via Google Antigravity).
4. **WebMCP monetization.** Every tool exposes `navigator.modelContext.registerTool` for agents.
5. **No silent fallbacks.** Failures surface explicit errors — never degraded substitutes.
6. **Self-healing SOPs.** Every build/runtime failure must patch a `skills/*.md` file so it never recurs.

## Runtime model note
DeepSeek is the only configured provider; the fleet runs it on two tiers.
**Frontier — `deepseek-v4-pro`:** Simon, Phoebe, Product Director, and the Friday Growth Watchdog cron.
**Non-frontier — `deepseek-flash` (DeepSeek V4.1 Flash, 1M context, vision):** Scout, Echo, Toby,
Judge, Publisher, Radar, the default profile, the 52 editorial pipeline jobs, and the Weekly Market
Recon / Daily Proactive Sweep / Build Watchdog crons. **A job keeps the frontier tier only when its run
needs frontier reasoning** (owner directive, 2026-10-05; applied to the watchdogs 2026-10-09): the Build
Watchdog runs `verify-build.sh` and reports the result, its own contract in `.agents/meta_auditor.md`
targets the Flash tier, and it was green on every one of its last 18 runs, so it left the pro tier.
DeepSeek serves exactly two ids — `deepseek-flash` and `deepseek-v4-pro`; the older
`deepseek-v4-flash*` ids are server-side aliases of `deepseek-flash`. The persona contracts in
`.agents/` record target model tiers (Claude 3.7/Opus, Sonnet/Flash, etc.) to pin once those
providers' keys are added.

## Build verification
`scripts/verify-build.sh` — strict typecheck, lint, production build. Runs on every Antigravity
build completion (Phase 5) and is invoked by Toby before signoff.

## Guide
`GUIDE.md` — Part 1: how to operate the live fleet. Part 2: step-by-step to implement the
remaining phases (Slack, model tiers, Next.js scaffold, Coolify, WebMCP).
