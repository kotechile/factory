# Company Goals & Strategic Boundaries

## Strategic priorities
- Continuous, automated digital assembly line (not artisan one-off dev).
- Near-zero marginal build cost: MVP + tests in ≤ 4 hours via Antigravity.
- Proactive, signal-driven discovery (30-day market recon), not reactive ideation.
- Agent-native monetization via WebMCP on every tool.

## Margin & pricing thresholds
- Web tier: free instant preview; paid $29/mo or $9 one-off export (Stripe).
- Agent tier (WebMCP): $0.25/query via Stripe meter / API credits (range $0.10–$1.00).
- **LLM/parse-backed tools price higher (owner, 2026-10-05): $0.50–$3.00 per call**, and the candidate must
  clear **3× its measured per-call cost** (parse + generate + retries) at plausible volume.
- Drop any candidate whose margin can't clear $0.25/query at plausible volume (deterministic tools) or the
  LLM margin rule (LLM-backed tools). Bands and the class declaration live in
  `context/tech_stack_capabilities.md` §3 and are enforced by `src/products/pricing.test.ts`.

## Tech stack rules
- The canonical primitives list is **`context/tech_stack_capabilities.md`** (deterministic core +
  extraction-only LLM/document-parsing services + the price bands). When these two disagree, that file wins.
- Frontend: Next.js (App Router, TypeScript).
- Styling: Tailwind CSS + Lucide Icons + React Flow.
- DB/Auth: Supabase (PostgreSQL + RLS).
- Payments: Stripe Checkout + metered billing + webhooks.
- Email: Resend.
- Agents: MCP (backend) + WebMCP (browser `navigator.modelContext.registerTool`).
- Hosting: Coolify on VPS (Docker, git-push deploy, Let's Encrypt SSL).
- Antigravity build via `agy` CLI (headless, `--mode accept-edits`). Gemini default — no Claude models (too expensive).

## Runtime fleet (Hermes)
- Bots: simon, scout, phoebe, toby, product-director, echo.
- Current model: the fleet is tiered (owner, 2026-10-05). Frontier `deepseek-v4-pro` = simon, phoebe,
  product-director + the Build/Growth Watchdog crons; everything else (`deepseek-flash`) includes the
  editorial pipeline fleet. Target tiers in `.agents/` pin per-bot once Anthropic/OpenRouter keys are added.
- Fleet workers (Coder/QA/Copywriter) = transient delegate_task subagents, not persistent bots.

## Hard rules
- No silent fallbacks — failures surface explicit errors.
- No fabricated signals/metrics — cite sources.
- Secrets are env-only (Supabase service_role, Stripe keys); never hardcoded.
- Self-healing: every failure patches a `skills/*.md`.
- Hard approval gate: development starts only after the founder's `@Simon approve`. Auto-publish (push to `main` after `verify-build.sh` passes → Coolify deploy) applies to approved work only — no build or ship ahead of the go/no-go.
