# Proposal: QuarterLine — 2026 Self-Employment Tax, QBI & Estimated-Payment Calculator
**Date Discovered:** 2026-08-31
**Source Signal:** OBBBA (Pub. L. 119-21) first fully effective tax year = 2026; Q3 estimated-tax deadline Sept 15, 2026 (2 weeks out); live 20%-vs-23% QBI rate confusion across published guides.
**Target Audience:** U.S. self-employed freelancers, independent contractors, gig workers, and single-member LLC owners (Schedule C filers); secondary: CPAs/bookkeepers running multi-client estimates.

---

### 1. The Core Bottleneck

2026 is the first tax year the One Big Beautiful Bill Act (OBBBA) fully applies, and it rewrote the
freelancer's math: the QBI (Section 199A) deduction became permanent, the phase-in range widened from
$50K/$100K to $75K/$150K, a new $400 minimum deduction and a $6,000 senior deduction appeared, SALT
capped at $40,400, the 1099 threshold tripled to $2,000, "No Tax on Tips" opened a $25K deduction, and
the SS wage base rose to $184,500. Freelancers still do this in broken spreadsheets, and the accuracy
situation is actively dangerous: the House-passed 23% QBI rate never made it into the enacted law (it
**stayed 20%** — confirmed by Warren Averett, ACTEC, Blue J, and Manay CPA), yet prominent articles
(e.g. selfemployed.com) still tell readers to "recalculate at the new 23% rate." People are overstating
their deduction and under-paying their Q3 estimate **right now**, with the Sept 15 deadline two weeks out.

### 2. The Deterministic Solution

- **Inputs (user/agent parameters):** filing status (single/MFJ/MFS/HOH), gross 1099/NEC income,
  business expenses, W-2 wages (if any), prior-year AGI (safe-harbor), age (65+ senior deduction),
  tipped-occupation flag + qualified tip amount ("No Tax on Tips"), SSTB flag (consulting/law/health/etc.),
  UBIA (business property basis), retirement contributions, state/local tax paid (SALT itemize check).
- **Calculation / Logic Core (pure TS, `src/lib/calc/selfEmployment2026.ts`):**
  - **SE tax:** net earnings = Schedule C net × 92.35%; 15.3% (12.4% SS capped at $184,500 + 2.9% Medicare);
    +0.9% additional Medicare above $200K single / $250K MFJ; half-SE-tax adjustment.
  - **QBI deduction:** QBI = Schedule C net − half-SE-tax − SEHI − retirement; 20% × QBI; 2026 thresholds
    $201,750 single / $403,500 MFJ (Rev. Proc. 2025-32); phase-in band $75K/$150K; SSTB phase-out;
    W-2/UBIA limit = greater(50% W-2, 25% W-2 + 2.5% UBIA); $400 floor (≥$1,000 QBI); cap at 20% of
    (taxable income − net capital gain). **Rate pinned to 20% (enacted law), not 23%.**
  - **Income tax:** 2026 brackets (10%→$12,400, 12%→$50,400, 22%→$105,700 single…); standard deduction
    $16,100/$32,200; senior $6K above-the-line (phase-out 6¢/$ over $75K single / $150K joint);
    "No Tax on Tips" up to $25K income-tax-only (not SE), capped at net business income, tipped occupations.
  - **Estimated payments:** 4 installments (Apr 15 / Jun 15 / **Sep 15** / Jan 15); safe harbor = 100%
    of prior-year tax (110% if AGI > $150K); annualized-income installment method; underpayment flag.
- **Outputs:** interactive dashboard (SE tax, QBI deduction, effective rate, per-quarter payment),
  branded PDF "2026 Tax Readiness Report", and structured JSON for agent calls.

### 3. Monetization & Paywall Boundaries

- **Free Tier:** instant interactive preview — full SE-tax + QBI + estimated-payment numbers, no export.
- **Paid Tier (Stripe):** $9 one-off branded PDF audit export; $29/mo for accountants (multi-client roster).
- **Agent API Tier (WebMCP):** `calculate_qbi_deduction` + `calculate_quarterly_estimate` at $0.25/call
  via Stripe meter (batch endpoint for multi-client firms at volume discount).

### 4. Technical Blueprint & Dependencies

- Frontend: Next.js App Router + Tailwind + Lucide Icons; React Flow optional for bracket/phase-in viz.
- Engine: pure TypeScript in `src/lib/calc/selfEmployment2026.ts` — single source of truth.
- Auth/DB: Supabase (optional account save) + Stripe Checkout + metered billing + webhooks; Resend for PDF delivery.
- Validation: Jest test vectors vs published IRS worked examples —
  - biztaxcalc.com: $150K gross − $20K expenses → SE tax $18,368; QBI $120,816 → deduction $20,943 (saves $4,607).
  - unclekam.com: single $320K TI, $250K QBI, $80K W-2, $200K UBIA → W-2/UBIA limit $40,000 (deduction = $40,000).
  - indie-calc.com OBBBA savings table ($60K / $100K / $200K single-filer deltas).
- WebMCP: `navigator.modelContext.registerTool` with JSON-Schema params (see webmcp-integration skill);
  free-tier agents get preview, metered calls hit the Stripe agent tier.

---

## Phoebe 10x Enhancement Layer (pre-merged)

- **Asymmetric viral loop — "Tax Readiness Scorecard" + embeddable deadline widget:**
  A 0–100 benchmark score (QBI-eligibility, safe-harbor status, underpayment risk, tip-deduction capture).
  Users share the scorecard; CPAs and freelancer communities embed a live "Q3 estimated-payment countdown"
  iframe that deep-links to the calculator. Every embed carries branded attribution → backlink + signup.
- **Agentic API arbitrage — headless QBI/estimate engine:**
  Accounting/CPA copilots and bookkeeping agents need a verifiable, cited QBI + SE-tax engine they can call
  headless rather than scrape ad-laden calculators. $0.25/query with a correct-by-construction 20% rate
  and Rev. Proc. 2025-32 thresholds is a defensible premium — the accuracy gap is the moat.
- **Accuracy hook — "Your QBI is probably wrong" checker:**
  A one-field flag that detects the 23%-vs-20% trap and mis-set thresholds; drives shares and positions the
  product as the "correct 2026 law" source, not another content lead-gen calculator.
- **Scope guard:** all three vectors reuse the single engine — no new build beyond the PDF/scorecard
  renderer and the registerTool handler; ≤4-hour budget holds.

---

## Approval

- **Decision:** APPROVED — Jorge Fernandez (founder), 2026-09-01.
- **Dispatch:** Product Director + execution fleet (Antigravity `agy` build) and Echo (GTM blueprint), in parallel per `chief_of_staff.md` §6.
- **Status at approval:** build had already shipped via the experimental auto-publish policy and is live at `https://factory.aichieve.net/quarterline` (root `/quarterline` HTTP 200, `/.well-known/mcp.json` HTTP 200, `/embed/countdown` HTTP 200). GTM blueprint on file at `context/growth_blueprints/2026-08-31_quarterline.md`. Flag: auto-publish landed ahead of the explicit go/no-go. Resolved 2026-09-01 (commit 1a60b9f): founder reverted to the hard gate — auto-publish now applies to approved work only (AGENTS.md rule 7, company_goals.md rule 5).
