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
- `src/`         — product code (Next.js App Router, calc engines, UI primitives)

## Non-negotiable factory rules
1. **Deterministic core only.** A product is in-scope only if its value is a deterministic
   algorithm, multi-variable model, or structured document transform. No long-term human service.
2. **Primitives fit.** Must build from Next.js + Tailwind + Supabase + Stripe + Resend. No native
   hardware/mobile sensors.
3. **≤ 4-hour build budget** for MVP + test suite (via Google Antigravity).
4. **WebMCP monetization.** Every tool exposes `navigator.modelContext.registerTool` for agents.
5. **No silent fallbacks.** Failures surface explicit errors — never degraded substitutes.
6. **Self-healing SOPs.** Every build/runtime failure must patch a `skills/*.md` file so it never recurs.
7. **Experimental auto-publish.** Agents may commit + push to `main` directly after
   `scripts/verify-build.sh` passes; Coolify auto-deploys. The human is the fallback reviewer.

## Runtime model note
Current fleet runs on `deepseek-v4-pro` (only configured provider). The persona contracts in
`.agents/` record target model tiers (Claude 3.7/Opus, Sonnet/Flash, etc.) to pin once those
providers' keys are added.

## Product structure — subpaths under one deploy

Every product ships to a subpath of the single Coolify app (`factory.aichieve.net`):

- `/` — Factory Showcase (directory: search, status, WebMCP catalog) rendered from `src/products/registry.ts`.
- `/<slug>/` — a product's UI (e.g. `/quarterline/`).
- `/<slug>/calc/*` — a product's programmatic-SEO pages.
- `/api/*`, `/embed/*`, `/.well-known/*` — SHARED across all products.

### Adding a product (mechanical checklist)

1. **Build** the deterministic engine in `src/lib/calc/<slug>/` (with known-answer test vectors).
2. **Scaffold** the UI in `src/app/<slug>/page.tsx` (reuse `src/components/ui/*` primitives).
3. **pSEO presets** (optional) in `src/lib/seo/<slug>/` + a `src/app/<slug>/calc/[slug]/page.tsx` route.
4. **Register** the product in `src/products/registry.ts` (slug, name, status, description, route, webmcpTools, launchedAt, category).
5. **WebMCP** — expose the tool via `navigator.modelContext.registerTool` (see `skills/webmcp_integration.md`).
6. **Telemetry** — pass the product slug to `track(event, payload, "<slug>")`.
7. **Gate** — `scripts/verify-build.sh` must pass (tsc → lint → tokens → vitest → build → Playwright → Gemini visual-QA).
8. **Push** — commit + push to `main`; Coolify auto-deploys; the product appears on the directory automatically.

## Build verification
`scripts/verify-build.sh` — strict typecheck, lint, production build. Runs on every build and is
invoked by Toby before signoff.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
