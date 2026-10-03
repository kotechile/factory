---
name: stripe-gating-workflow
description: "Use when adding Stripe gating, PDF gating, or webhooks."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Stripe Gating Workflow

## 1. Objective
Pre-wire subscription verification, PDF/report gating, and webhook handling into every product.

## 2. Pricing boundary
- Free tier: instant interactive preview.
- Paid: $29/mo subscription OR $9 one-off export (branded PDF, raw CSV, certificates).
- Agent tier: $0.25/query via Stripe metered billing.

## 3. Subscription verification
- Supabase `subscriptions` table (user_id, stripe_customer_id, status, plan).
- RLS: owner-only reads; server actions verify status server-side.
- Checkout sessions create/update rows on `checkout.session.completed`.

## 4. PDF gating
- Free preview renders the computation live; export is gated behind an active subscription.
- Gate check happens server-side before PDF generation — never client-only.

## 5. Webhooks (`src/app/api/webhooks/stripe/route.ts`)
- Verify with `stripe.webhooks.constructEvent` and the signing secret (env-only).
- Handle: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`.
- Idempotent handlers; return 200 fast, process async.

## 6. Metered agent tier
- Report usage via Stripe metering API or a Supabase usage ledger; bill at $0.25/query.

## 7. Failure handling
- Unhandled webhook event types → Toby patches this skill with the new event's handling pattern.

## 8. Entitlement-gate invariants (from the 2026-09-01 review)
- **Never grant entitlement on a client-passed token prefix** (`cs_`, `test_`, `simulated_`).
  The gate MUST verify against `subscriptions`/`purchases` rows server-side. A `cs_`-prefixed
  Stripe session ID must be confirmed in `purchases`, never trusted implicitly.
- **Dev/test bypasses must be gated behind `NODE_ENV !== "production"`.**
- **On a DB/entitlement-check error, return an explicit 500** — never silently deny (402) or
  silently allow. A paying user must never be denied because of a transient DB failure
  (rule #5: no silent fallbacks).

## 9. Checkout & PDF export invariants (2026-09-01 learnings)
- **Stripe API Version**: Never hardcode fictitious dates or versions (`2026-03-25.acacia`). Use the Stripe Node SDK default.
- **Reverse-Proxy Public Origin**: Never rely on `req.nextUrl.origin` inside Docker containers (it resolves to `0.0.0.0:3000`, which browsers block). Always resolve the origin via `x-forwarded-host` + `x-forwarded-proto` or fall back to the production domain.
- **Managed Payments & Product Tax Codes**: Stripe accounts with Managed Payments reject products without a tax code. Always set `tax_code` on `product_data` (`txcd_10000000` for digital reports/exports, `txcd_10202000` for SaaS). Explicitly pass `managed_payments: { enabled: false }` on checkout sessions to prevent MoR onboarding blocks.
- **Independent Plan Loading**: In checkout modals, track loading by specific plan (`checkingOutPlan: string | null`) instead of a generic boolean so multiple checkout buttons don't enter loading state simultaneously.
- **True Binary PDF Delivery**: Never substitute `.txt` text blobs for advertised PDF exports. Build official documents with `pdf-lib`. TypeScript 5.5+ invariant: cast `pdfBytes as unknown as BlobPart` when creating the browser `Blob`.

## 10. Stripe mode invariants (2026-09-22 — the sandbox/live split)

- **The mode comes from the env, never from the dashboard toggle.** `src/lib/stripe/mode.ts` is the
  single resolver: `STRIPE_MODE=test|live` plus a mode-paired `STRIPE_SECRET_KEY_TEST`/`_LIVE` and
  `STRIPE_WEBHOOK_SECRET_TEST`/`_LIVE`. Never read `process.env.STRIPE_SECRET_KEY` directly in a
  route/gate — use `isStripeConfigured()` (gate) or `getStripe()` (client).
- **A key from the wrong mode is a hard error, not a warning.** `sk_test_…` under `STRIPE_MODE=live`
  (and vice versa) throws with the variable name and the expected prefix. Never fall back to a
  sandbox key to keep a live deploy "working": that deploy accepts checkouts, records rows and
  collects $0 — the failure that was misreported as $161 of revenue on 2026-09-11.
- **Never infer the mode from whichever key happens to be present.** Missing `STRIPE_MODE` =
  explicit failure. Both key pairs stay configured so the switch is one env write.
- **Production never simulates a checkout.** The simulated-session branch in `/api/checkout` is
  gated behind `NODE_ENV !== "production"`; a live deploy with no usable Stripe config returns 500.
- **Webhook secrets are mode-paired too.** Only the mode's own signing secret may verify an
  inbound event; secret keys are prefix-checkable, webhook secrets are not, so the pairing is the
  only guard — a mismatch shows up as a signature failure, so log the mode with it.
- **Never echo key material — not even a prefix — from an unauthenticated endpoint.** The Stripe
  webhook route used to return the first 8 characters of the signing secret in its 400 body;
  log the mode instead.
- **Revenue metrics must state their mode.** `scripts/growth-check.mjs` reports `stripe_mode` and
  refuses to present sandbox charges as revenue (`revenue_is_sandbox`). Any gate evaluation that
  reads a dollar amount has to say which mode produced it.

## 11. Identity & pricing invariants (2026-10-03 — the billing-portal audit)

- **A billing-portal session is a bearer capability; only ever resolve it from an explicit token the
  customer already holds.** `/api/portal` accepts a `cus_…` customer id or a `cs_…` checkout session id
  (both arrive in the customer's own emailed link) and nothing else. Never resolve a customer from an
  **email address**, and never from **"the newest active subscription"** — both are enumerable, and either
  one hands any caller another customer's payment methods, invoices and cancellation controls. An absent
  reference is an explicit 400 (POST) / error redirect (GET), never a guess (rule 5).
- **The server, never the client, decides the price.** `/api/checkout` resolves amount, mode and product
  name from a server-side plan catalog (`PLAN_CATALOG`). A client `amount` is ignored and logged; client
  `lineItems` are rejected outright. Forwarding `body.amount` to Stripe lets a caller buy anything at any
  price — on a LIVE account that is a real charge, not a test.
- **A "metered" tier must actually be metered.** Stripe Checkout does not accept an inline metered
  `price_data` (the `recurring` object exposes only `interval`, no `usage_type`), so a metered plan
  references a pre-created metered Price id + Billing Meter from env (`STRIPE_AGENT_METER_PRICE_ID`). When
  it is unset the request fails explicitly — never a silent flat subscription that contradicts the price
  advertised on the card.
- **One meter, `value` = cents owed.** A Stripe meter is bound to ONE event name and a price to ONE unit
  amount, so N per-tool prices cannot map to meters 1:1 without N meters and N prices. Report a single
  event name whose `value` is the charge in **integer cents**, against a meter that SUMS the value and one
  **$0.01/unit** metered Price — a $0.25 query reports 25. Per-tool detail belongs in our own ledger (the
  surface the customer reads); Stripe only needs the money. Keep the event name env-overridable
  (`STRIPE_METER_EVENT_NAME`) because it must match the meter EXACTLY, and refuse to report a
  non-positive amount rather than send `value: 0` and bill nothing.
- **Card copy is a claim about the checkout payload.** Before shipping a pricing card, read the request
  body its button sends and confirm amount/mode match the words on the card; a card that says "$0 base +
  $0.25/query" while the payload sends a flat `$25/mo` is a billing defect, not a copy nit.

## 12. Usage ledger & spend cap (2026-10-03 — billing v1.2/v1.3/v1.4)

- **Ledger in the table that already exists.** Usage rows go to `public.events`
  (`event='agent_usage'`, `payload={customer_id,tool,cost_usd,meter_event_id}`), with the caps document in
  `factory_config['billing_caps']`. PostgREST exposes no DDL, so designing for a table that already exists
  beats requiring an owner-applied migration for no benefit (`supabase-persistence` §7).
- **Enforce the cap BEFORE the engine runs, and after identity — never after the work.** An over-cap call
  is an explicit 402 naming the cap and the reset instant; a billing-DB failure is an explicit 500, never a
  silent allow (the §8 invariant applies to the cap exactly as it does to entitlement).
- **A ledger write is not best-effort.** `track()` may swallow errors; the usage row may not — a lost row
  silently under-counts the next cap check. Surface `usageRecorded` on the response so the failure is
  visible instead of silent.
- **Never sum a page.** PostgREST cannot aggregate, so the period total is computed in Node; read with
  `count: exact` and refuse loudly when the count exceeds the read limit rather than reporting a truncated
  total that under-enforces the cap.
- **Sum money in integer cents**, never floats: repeated $0.25 charges drift otherwise.
- **A cap without identity is advisory.** The published manifest marks `x-customer-id` optional, so only
  identified callers are capped and anonymous calls stay free. Requiring identity is a contract change —
  update `/.well-known/mcp.json` and its drift test in the same pass, never a quiet code tweak.

