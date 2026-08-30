# Antigravity Build Prompts

Reusable prompts for driving the Google Antigravity build line against this repo.

**Before running either, open THIS repo in Antigravity** so it auto-loads
`AGENTS.md` (the constitution) and can read `skills/*.md` (SOPs) and
`context/company_goals.md`. Both prompts below also tell it to read them
explicitly, so they work even if auto-loading is off.

---

## 1. Baseline scaffold (Phase 1 — run once, now)

```text
Working in this repo (github.com/kotechile/factory). Before writing anything,
read AGENTS.md (the constitution), context/company_goals.md (stack + margin rules),
and these SOPs: skills/ui_component_standards.md, skills/stripe_gating_workflow.md,
skills/webmcp_integration.md.

Scaffold the baseline Next.js factory shell — NO product-specific features yet,
just the shared primitives every future tool inherits:

1. Next.js App Router + TypeScript (src/ directory, @/* import alias, ESLint).
2. Tailwind CSS with design tokens + lucide-react + @xyflow/react (React Flow),
   following skills/ui_component_standards.md (accessibility, contrast, cn() helper).
3. Supabase SSR client + auth helpers in src/lib/ (server + browser clients).
4. Stripe: Checkout session helper, metered-usage helper, and a webhook route at
   src/app/api/webhooks/stripe/route.ts following skills/stripe_gating_workflow.md
   (verify signature, handle checkout.session.completed / subscription.updated /
   subscription.deleted / invoice.payment_failed, idempotent, return 200 fast).
5. Resend email client in src/lib/.
6. A STUB calculation engine at src/lib/calc/index.ts (typed input/output contract
   + one trivial example engine) — this is where each product's deterministic core
   lives. Leave it generic; do not invent a product.
7. WebMCP registration scaffold following skills/webmcp_integration.md
   (navigator.modelContext.registerTool with JSON-Schema parameters, handler calls
   the calc engine).
8. Dockerfile (multi-stage) + docker-compose.yml for Coolify deploy.
9. Make scripts/verify-build.sh pass: npx tsc --noEmit && npm run lint && npm run build.

Hard rules (from AGENTS.md): all secrets env-only — add a .env.example with the
VARIABLE NAMES only (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY) and NEVER hardcode values
(this org has push protection that rejects committed secrets). No silent fallbacks.
Reuse primitives. After `scripts/verify-build.sh` passes, commit and push to main.
```

## 2. Per-product build (Phase 4 — run for each approved PRD)

```text
Build the product described in context/recon_proposals/<PRD_FILE>.md.

First read that PRD, AGENTS.md, context/company_goals.md, and the SOPs the PRD
touches (skills/ui_component_standards.md, skills/stripe_gating_workflow.md,
skills/webmcp_integration.md).

Deliverables:
1. The deterministic calculation engine in src/lib/calc/<product>.ts (pure TS,
   no side effects) — implement the PRD's "Calculation / Logic Core".
2. Jest test vectors matching the PRD's validation cases (known industry-standard
   inputs/outputs).
3. UI: free interactive preview + gated export, per the two UI/stripe SOPs.
4. Stripe Checkout + metered agent tier + webhook handling per the PRD's
   "Monetization & Paywall Boundaries".
5. WebMCP registerTool schema per skills/webmcp_integration.md, named
   calculate_<niche_metric>.
6. Make scripts/verify-build.sh pass.

Hard rules: env-only secrets (values never committed), no silent fallbacks,
deterministic core only, stay within the 4-hour build budget. After
`scripts/verify-build.sh` passes, commit and push to main.
```

## Gotchas
- **Secrets are env-only.** Values go in `.env.local` (gitignored); the repo only
  ever carries `.env.example` names. kotechile has secret-scanning push protection.
- **`verify-build.sh` must exit 0** before the build is done — Toby audits this.
- **Deterministic core only.** If the product needs non-deterministic human service,
  it failed the funnel and shouldn't be built.
