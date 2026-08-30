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
