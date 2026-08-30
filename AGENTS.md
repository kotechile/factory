# software-factory-core — Agent Operating Constitution

This repository is the shared brain of the **Autonomous Product & Software Factory**:
a dark-headless, multi-agent assembly line that discovers acute B2B/B2C bottlenecks,
scaffolds deterministic micro-SaaS utilities, embeds WebMCP agent endpoints, and ships
them with near-zero marginal build cost.

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
Current fleet runs on `deepseek-v4-pro` (only configured provider). The persona contracts in
`.agents/` record target model tiers (Claude 3.7/Opus, Sonnet/Flash, etc.) to pin once those
providers' keys are added.

## Build verification
`scripts/verify-build.sh` — strict typecheck, lint, production build. Runs on every Antigravity
build completion (Phase 5) and is invoked by Toby before signoff.
