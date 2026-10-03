# Proposal: Factory Billing v1 — one verified ledger + one read surface (a contract, not a portal per app)

**Date:** 2026-10-03
**Status:** APPROVED for build — owner instruction (Jorge), 2026-10-03. §5 (v1 scope guard) is binding.
**D1–D3 fixed and live-verified in `7751fea`** (see `context/pending_approval.md`); V1.2–V1.4 remain open.
**Source signal:** Owner directive 2026-10-03 — *"I need to have a way for users to pay and check their
payment/usage history… Every app in the software factory can use the Billing portal."* Preceded by a
five-category audit of the existing billing surface. **This PRD supersedes that audit's phasing.** Every
claim below was re-read from the tree, and where the audit and the code disagree, the code wins (§1).
**Target consumer:** any app that charges through the factory — the products on the single Coolify deploy
(`apps.giniloh.com` subpaths) and, from Phase 2, external factory domains (e.g. `buildomain.com`).

---

## 1. State as of 2026-10-03 (re-read from the tree; includes the parallel build)

> **Corrected mid-draft.** A first draft of this PRD was written against a tree with no `/billing` route.
> Before it was committed, the owner shipped **`65a2407`** ("ship Factory Billing Portal at /billing…",
> 2026-10-03 19:10 UTC). Every claim below is re-measured against that commit; the earlier
> "no `/billing` page exists" is superseded, not deleted, so the record shows the correction.

**What `65a2407` shipped (owner):**

- `src/app/billing/page.tsx` + `src/components/factory-billing-portal.tsx` (498 lines) — a **pricing /
  onboarding page**: two checkout cards (*Agent Metered Pass*, *Factory Pro $29/mo*), a *Manage Account*
  portal-gateway form, and a static tool pricing matrix. `tests/e2e/billing.spec.ts` covers render + axe.
- `src/app/api/portal/route.ts` — added an **email → Stripe customer** lookup; error/return URLs repointed
  to `/billing`.

**What it still does not do (the v1 gap — unchanged from the audit's "missing"):** no usage meter, no
period history, no spending cap, no self-serve cancel/pause. The page tells agents they receive an
`x-customer-id` and that the per-tool breakdown lives in the "Detailed monthly Stripe statement" — i.e.
the visibility gap is now **advertised**, not closed.

**Defects found while reading (all verified in code):**

| # | Defect | Evidence |
| --- | --- | --- |
| D1 | **Unauthenticated billing-portal access — widened by `65a2407`.** Any caller can resolve *any* email to a Stripe customer and open that customer's billing portal; the older no-params fallback (newest `status='active'` subscription) is still present. Neither path proves the requester owns the account. | `src/app/api/portal/route.ts:33–43` (GET email), `:45–62` (GET fallback), `:93–105` (POST email) |
| D2 | **Client-supplied price.** `/api/checkout` reads `amount`, `currency`, `lineItems`, `productName`, `successUrl` from the request body and uses them as the Stripe line item. `{plan:"factory_pro", mode:"subscription", amount:1}` is a **$0.01/mo** subscription on a LIVE account. | `src/app/api/checkout/route.ts:79–93,128,149` |
| D3 | **The "metered" tier is not metered.** The Agent card says *"$0 base subscription • Billed monthly on usage"*, but the checkout payload sends `mode:"subscription", amount:2500` → a flat **$25/mo recurring** line item with no meter price attached. | `factory-billing-portal.tsx:126,115–135` + `checkout/route.ts:110,128–131` |
| D4 | **Unverified usage attribution** (unchanged). Usage is attributed from the client header `x-stripe-customer-id`, with no identity and no cap; a caller that omits it runs unbounded and pays $0. | `src/app/api/agent/calculate/route.ts:371–387` |
| D5 | **Single-tenant schema** (unchanged). `subscriptions.user_id text unique`, `purchases.user_id text`; no orgs/seats/RBAC. | `supabase/schema.sql:48–72` |

**Ledger note:** the usage data already exists — `track()` writes every `agent_query` to Supabase `events`
(`src/lib/telemetry.ts`), and Stripe Meter Events are the billing source of truth. It has no authenticated
reader and no identity binding. That is the work, not new storage.

---

## 2. Objective & non-goals

**Objective.** One billing contract every factory app consumes: identity already authenticated, usage and
caps readable by the customer, payment handled by Stripe. Subpaths consume it directly; external domains
consume it over a key (Phase 2).

**Non-goals (stay in Stripe / parked).** Card capture and payment methods, invoices/PDF/VAT, proration,
dunning — all remain Stripe's hosted portal (PCI scope; solved; zero upside to rebuild). Organizations,
seats, RBAC — parked (Phase 3).

---

## 3. Architecture — the reusable unit is a contract, not a portal

- **One ledger.** Supabase `events` (already written by `track()`) rolls up per customer per period into a
  `usage_ledger` view. Stripe Meter Events remain the billing source of truth.
- **One identity.** A same-site session (subpaths) or a per-app key `fkey_…` (external domains, Phase 2).
  **Never** a client-supplied customer id or an unverified email. This is the fix that makes everything
  downstream real.
- **Two endpoints.** `GET /api/v1/billing/summary` (read, customer-scoped) in v1; `POST
  /api/v1/billing/usage` (key-authenticated ingest) in Phase 2.
- **One surface.** Extend the shipped `/billing` page with a usage section (bar vs cap, history, cap
  editor), keeping its existing checkout + portal-gateway cards. Subpaths link to it; external apps
  deep-link/embed in Phase 2.

---

## 4. v1 scope (the build)

**V1.1 — Close the trust boundary (D1 + D2 + D4).**

- `/api/portal` (GET *and* POST) must resolve the customer only from a **verified identity** — a logged-in
  session or a signed, single-use link. Remove the unauthenticated email lookup and the newest-active
  fallback; a request that proves no identity is an explicit 400/401.
- `/api/checkout` must price from a **server-side plan table**, never from `body.amount` / `body.lineItems`
  / `body.successUrl`.
- Usage is attributed only from a verified identity, never from `x-stripe-customer-id`.
- *Acceptance:* `GET /api/portal?email=<stranger>` and paramless `/api/portal` → 401/400; a checkout with a
  client `amount` is rejected or ignored in favour of the server price; a request with no verified identity
  records no meter event.

**V1.2 — Server-enforced cap on the existing ledger (D4).**

- A per-customer monthly cap (default = plan allowance; customer-editable), enforced **before** the tool
  runs; over cap → explicit `402` naming the cap and the reset date (rule 5 — no silent allow/deny).
- *Acceptance:* a request at cap returns 402 with cap + reset; below cap runs normally; a DB error is a
  500, never a silent deny or allow.

**V1.3 — `GET /api/v1/billing/summary`.**

- Customer-scoped: current-period usage, cap, remaining, and history rows (timestamp, tool, cost, meter id).
- *Acceptance:* returns only the caller's own rows; JSON shape documented; unauthenticated → 401.

**V1.4 — usage section on the shipped `/billing` page.**

- Add usage-vs-cap bar, history table, cap editor; keep the existing checkout + portal-gateway cards.
- *Acceptance:* renders in the existing design system; the new section is customer-scoped; axe still clean.

**V1.5 — Resolve the D3 mismatch (owner decision).** Either the Agent card is wrong (it is a flat
$25/mo plan) or the checkout is (it should be a metered price with the base at $0). Pick one and make copy
and Stripe agree; do not ship a card that advertises metered billing while charging a flat subscription.

---

## 5. v1 scope guard (explicitly OUT — do not build in v1)

- No organizations / workspaces / seats / RBAC (`orgs`, `org_members`, invites, RLS).
- No external-app usage ingest (`POST /api/v1/billing/usage`) — Phase 2.
- No in-app card capture; no annual plans; no tiered/volume pricing; no multi-product cart; no
  cancellation surveys or retention discounts. Stripe's hosted portal is the only card/tax/invoice surface.

---

## 6. Parked, with revisit triggers

- **Phase 2 — external usage ingest.** Trigger: the first external factory domain needs to bill through the
  central ledger. Deliverable: `fkey_…` issuance + `POST /api/v1/billing/usage`.
- **Phase 3 — workspaces / multi-seat / RBAC.** Trigger: the first paying team (>1 seat) asks. Do not build
  ahead of it; with zero real customers this is over-build.

---

## 7. Invariants

- **Rule 5 — no silent fallbacks.** The cap reject is explicit; a DB/entitlement error is a 500, never a
  silent 402 or allow (`skills/stripe_gating_workflow.md` §8).
- **Rule 7 gate.** All `src/` work waits on `@Simon approve` (this document + the queue entry are the record).
- **Origin** via `x-forwarded-host`/`x-forwarded-proto`, never `req.nextUrl.origin` (§9).
- **Never echo key material** from any endpoint.
- **Money.** Stripe is LIVE since 2026-10-03; revenue is still $0 real, so no live customer data is at risk
  — but **D1 and D2 are live liabilities** the moment the first real customer lands.

---

## 8. Definition of done

`scripts/verify-build.sh` green end to end; `GET /api/portal?email=<stranger>` → 401/400 live; a client-priced
checkout rejected/ignored live; `/billing` → 200 with the caller's own usage rows; cap enforced in a live
probe; queue entry flipped with commit hash + live evidence; `skills/stripe_gating_workflow.md` patched with
the identity rule for the next instance.
