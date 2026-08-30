# Company Goals & Strategic Boundaries

## Strategic priorities
- Continuous, automated digital assembly line (not artisan one-off dev).
- Near-zero marginal build cost: MVP + tests in ≤ 4 hours via Antigravity.
- Proactive, signal-driven discovery (30-day market recon), not reactive ideation.
- Agent-native monetization via WebMCP on every tool.

## Margin & pricing thresholds
- Web tier: free instant preview; paid $29/mo or $9 one-off export (Stripe).
- Agent tier (WebMCP): $0.25/query via Stripe meter / API credits (range $0.10–$1.00).
- Drop any candidate whose margin can't clear $0.25/query at plausible volume.

## Tech stack rules
- Frontend: Next.js (App Router, TypeScript).
- Styling: Tailwind CSS + Lucide Icons + React Flow.
- DB/Auth: Supabase (PostgreSQL + RLS).
- Payments: Stripe Checkout + metered billing + webhooks.
- Email: Resend.
- Agents: MCP (backend) + WebMCP (browser `navigator.modelContext.registerTool`).
- Hosting: Coolify on VPS (Docker, git-push deploy, Let's Encrypt SSL).

## Runtime fleet (Hermes)
- Bots: simon, scout, phoebe, toby, product-director, echo.
- Current model: deepseek-v4-pro (only configured provider). Target tiers in `.agents/` are
  pinned per-bot once Anthropic/OpenRouter keys are added.
- Fleet workers (Coder/QA/Copywriter) = transient delegate_task subagents, not persistent bots.

## Hard rules
- No silent fallbacks — failures surface explicit errors.
- No fabricated signals/metrics — cite sources.
- Secrets are env-only (Supabase service_role, Stripe keys); never hardcoded.
- Self-healing: every failure patches a `skills/*.md`.
- Experimental auto-publish: agents push to `main` directly after `verify-build.sh` passes; Coolify auto-deploys.
