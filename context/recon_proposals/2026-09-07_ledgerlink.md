# Proposal: LedgerLink — Stripe Payout → GL Reconciliation Engine
**Date Discovered:** 2026-09-07
**Signal Vector:** B (operational & data transformation pain — reconciliation / journal transform)
**Primary Source:** https://smallaccountants.co.uk/blog/posts/stripe-payouts-xero-reconciliation.html (linked dis-aggregation of a single payout into 87 charges / 4 refunds / 3 chargebacks / 162 fees / currency-conversion adjustment); corroborated by reconkept.com, thebookkeeper.ai, growthy.com, invimarko.com (Sep 1, 2026).
**Signal Intensity Score:** **76 / 100**
- Repeat search intent (30%): **85** — 5+ independent bookkeeper/ops sources in the last 30 days, all describing the same failure mode (a payout is NOT one accounting event). Recurring, not a one-off.
- Incumbent pricing friction (25%): **80** — incumbents PayTraQer/Synder/Bookkeep charge $30–60/mo and each requires its own setup/connected-account flow; the "free" fallback is manual spreadsheets and end-of-period panic.
- Willingness-to-pay (25%): **90** — bookkeepers, ecommerce ops, small-biz finance, and increasingly bookkeeping AI agents; GL-level accuracy is a hard requirement for a clean month-end.
- Urgency window (20%): **40** — evergreen recurring (monthly/quarterly) cycle, no imminent hard deadline; the pain is chronic and periodic.
**Target Persona:** Ecommerce/Stripe-dependent bookkeepers, small-business finance ops, and bookkeeping automation agents.

---

### 1. The Bottleneck & Market Context
- **Current State:** A single Stripe payout that lands in the bank feed is a *netted bundle* of many events — charges, refunds, disputes, dispute reversals, Stripe fees, Connect transfers, top-ups, and currency-conversion adjustments. Example from the field: one £4,378.21 payout = 87 charges + 4 refunds + 3 chargebacks + 162 separate fees + one FX adjustment. Xero/QuickBooks have no native integration that decomposes bundled payouts into GL lines, so bookkeepers either hand-build journals in spreadsheets (slow, error-prone) or pay for a full sync connector (Synder/PayTraQer/Bookkeep) that pulls *entire* transaction feeds and needs onboarding + settings.
- **Validation Intensity:** High. Five-plus independent sources in the 30-day window across bookkeeping/accounting sites, each independently stating "a Stripe payout is not one accounting event." This is a structurally repeatable, high-frequency pain that No-code/micro-tooling has not fully collapsed into a single deterministic engine.

### 2. Architecture & Technical Blueprint
- **Engine Type:** Schema Transpiler / Micro-Bridge (ledger transform) — archetype (b).
- **Deterministic Core (`src/lib/calc/stripeRecon.ts`):** pure-TypeScript decomposition of Stripe `balance_transactions` + `payout` objects into categorized GL journal lines that **sum to the payout net**. Core transform:
  - Fetch `payout` (period, amount, currency) + its `balance_transactions`.
  - Categorize each balance transaction by type: `charge` (gross `amount`, `fee`, `net`), `refund` (negative, contra-revenue), `dispute` (chargeback expense), `dispute_reversal`, `fee` (Stripe fees expense), `transfer` (Connect payout), `topup`, `adjustment` / FX conversion.
  - Allocate: **Revenue** = gross charge amount; **Stripe Fees (expense)** = `fee`; **Refunds (contra-revenue)** = negative refund amount; **Chargebacks** = dispute amount (+ fee); **Clearing/Other** = remaining adjustments.
  - **Invariant that earns trust:** `Σ(net across all balance_transactions) == payout.amount` exactly. Report the reconciliation as a pass/fail with a delta of zero — no silent fallback.
- **Inputs / Outputs:** `{ account_id, payout_id | period_start/end, currency }` → structured JSON `{ reconciled: bool, delta, journalLines: [{ date, account, debit, credit, reference }], summary: { revenue, fees, refunds, chargebacks, clearings } }` + a journal CSV import file (Xero/QB-ready) + branded reconciliation report.

### 3. Dual-Pronged Monetization
- **Web Tier (Stripe):** free interactive preview (paste payout ID, view decomposed GL lines). $9 one-off branded reconciliation PDF; $29/mo for multi-account/period batch (bookkeeper roster).
- **Agentic Tier (WebMCP):** `reconcile_stripe_payout(account_id, period)` → metered $0.10–$0.25/invocation via Stripe meter. A bookkeeping copilot can call it headless to drop journal lines straight into its ledger — this is the differentiated moat against Synder/PayTraQer, which are UI-first sync tools with no deterministic agent endpoint.

### 4. Zero-Friction Viral Hook
- **Reconciliation Scorecard + embeddable widget:** a 0–100 "clean reconciliation" score (mismatches found, un-categorized lines, FX surprises) with a shareable `?payout=` base64 deep-link. Bookkeepers embed a live "Stripe deposits waiting to reconcile" iframe on their client portal; every embed carries branded attribution → backlink + signup.

### 5. Build Notes
- Route `src/app/ledgerlink/`; registry entry `slug: "ledgerlink"` in `src/products/registry.ts`; telemetry `track(..., "ledgerlink")`.
- WebMCP: `navigator.modelContext.registerTool` → `reconcile_stripe_payout` (see `skills/webmcp_integration.md`).
- **Validation (known-answer test vectors):** seed a fixture `payout` + `balance_transactions`; assert `Σnet == payout.amount` and that revenue/fees/refunds/chargebacks map to the expected accounts (mirror the £4,378.21 worked example: 87/4/3/162 → curated GL totals).
- **Scope guard:** v1 reads Stripe via the factory's existing Stripe key, outputs CSV (no Xero/QB OAuth needed to ship value); connect-account OAuth is a later P1, not MVP. ≤4-hour budget with `agy` holds for the deterministic engine + UI + one WebMCP tool.
- Gate: `scripts/verify-build.sh` must pass before push. **Not approved yet — awaits `@Simon approve` (hard gate).**
