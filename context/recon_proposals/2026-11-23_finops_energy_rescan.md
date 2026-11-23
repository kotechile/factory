# Re-scan record — 2026-11-23 (Weekly Market Recon, two verticals)

**Sweep window:** 2026-10-24 → 2026-11-23 (30 days). **Date anchor:** 2026-11-23.
**VERTICAL_A:** `enterprise_ai_finops` (last scanned 2026-10-05; slot 1, least-recently-scanned).
**VERTICAL_B:** `energy_interval_data` (last scanned 2026-10-19; slot 2).
Neither slot re-declares the 2026-11-09 pair (`warehouse_automation_robotics_capex`,
`supplier_risk_reshoring_decision`). Queue for never-scanned is empty, so both slots came from the
least-recently-scanned rows. **No new candidate ≥60 was produced this sweep; this record is the
evidence-weight update for the two PRDs already at the gate.**

Tool-class note (standing): both existing PRDs are **LLM/parse-backed** — band $0.50–$3.00/call;
SpendProof measured ≈$0.14/call ($1.50/call rate, clears 3×); RatchetProof modelled ≈$0.30/call
($1.50/call, ~5× headroom; re-measure on the first live tariff). No number a product reports may
come from a model — extraction only.

## VERTICAL_A — enterprise_ai_finops: verdict NEW-SIGNAL (SpendProof strengthened)

No new product-shaped candidate ≥60 distinct from SpendProof; the window delivered dated triggers
and market-structure changes that strengthen the existing PRD (79). Two amendments fold into the PRD
before it faces the owner again:

1. **Dot/agent-billing variance class.** OpenAI "dots" start billing on Enterprise invoices
   **2026-11-18** (admin default-on; dot billing itself free until 2027-01-13) — a new always-on
   agent SKU with **no attribution dimension** on the same invoice finance already reconciles.
   Add a dot/agent line class to the invoice schema (flat-rate-by-work-type vs consumption).
   Sources: beri.net (2026-11); help.openai.com/en/articles/20001641.
2. **FOCUS 1.5 version stamp.** FOCUS v1.5 ratification December 2026 adds model identity, cache
   status and requester attribution (PrincipalId/CredentialId). Version-stamp the engine against
   FOCUS 1.5's published scope and treat pre-1.5 exports (the majority through the window) as the
   design target. Sources: finops.org/wg/finops-for-ai-overview; arXiv 2611.06989 (Nov 2026).

Other in-window structure: ChatGPT Enterprise listed on AWS Marketplace 2026-11-09 — billed by AWS
and counts toward EDP/PPA commitments, so enterprise AI spend now splits across three billing paths
(provider API / subscription / cloud bill) with different grain — deepens the exact join SpendProof
owns. Gartner published the first Emerging Market Quadrant for AI FinOps Tools 2026-10-28 (18
vendors) and Revefi launched closed-loop AI FinOps 2026-11-16 — the crowd thickens at the
attribution/enforcement layer, which reinforces that SpendProof's unowned slice is revenue-side
invoice reconciliation, not attribution middleware. AWS shipped free Bedrock cost breakdown in Cost
Explorer (Oct 2026) — free-incumbent pressure on the dashboard layer only (the 2026-09-14 rejection
territory); SpendProof must never drift toward "an attribution dashboard". Anthropic hard-caps
enterprise discounts at the commit (The Information 2026-09-28; amended S-1 2026-11-02) — exceeding
the commit flips billing mid-period from discounted to list: classify as "commit-boundary rate
change", not phantom variance.

**Considered and dropped:** standalone EDP/commit drawdown tracker for AI Marketplace purchases —
repeat-intent ~55, friction ~35 (forecasting dashboards crowd it; EDP terms per-agreement and
unpublished) — fails the ≥60 bar and the Vantage-Autopilot free-incumbent check.

**Failed queries (A):** `"OpenAI compliance API dots export SIEM"`; `"Anthropic committed spend
renegotiate November 2026"`.

## VERTICAL_B — energy_interval_data: verdict NO-NEW-CANDIDATE — PRD WEAKENED

**Clear Current** (clearcurrent.ai; Clear Current Inc., Beaverton OR, founded 2024, funded B2B SaaS,
free front door, "No account required") is now live in the exact slice RatchetProof's §4 called
unowned: demand & ratchet analysis that "recalculates it and flags every month the ratchet is
misapplied", power-factor penalties, billed-vs-recomputed demand audit at filed rates ("$115.20/kW
— $25.20 over the filed rate"), dispute docs; portfolio/enterprise posture (67-site / $6.2M example
audits). The PRD's §4 free-incumbent table is **stale**: the multi-month billed-demand
reconstruction + carry-over ledger is at least partially owned. Remaining differentiation is thin —
multi-meter coincidence of the ratchet-setting interval across meters, and the per-month variance
table as a portable auditor finding set at a self-serve price band. **Decision for the owner stays
as-is (RatchetProof was already awaiting review with a channel gap), but the PRD must not proceed
on the old §4 analysis: re-cut against Clear Current, or drop.** Channel rule still unsolved.

Urgency does strengthen: CPUC approved PG&E's 2027 GRC interim decision — up to **$456M interim
revenue requirement effective 2027-01-01** (Stoel Rives 2026-11-18, vote ~2026-11-19); United Power
(CO) legal notice **2026-11-09** raising energy, demand and fixed charges on/after 2027-01-01;
record **$4.5B** in Q3 2026 US rate-increase requests, $23.1B YTD (RTO Insider 2026-10-07).
EnergyCAP worked the same ratchet arithmetic in an education video 2026-11-13 (no self-serve audit).
Data access is no longer the structural blocker (Bayou instant interval data ~66–71% of US meters,
targeting 80% by fall 2026; Arcadia acquired ENGIE Impact; RateAcuity change API) — which removes a
feasibility risk *and* lowers the moat.

**New candidate ≥60:** none. Clear Current closes rather than opens the slice.

**Failed queries (B):** `Con Edison SCE PGE winter demand ratchet season 2026` (stale PR/rate-guide
noise); `demand charge new tariff effective December 2026/January 2027` (customs-tariff pollution;
only United Power usable); `PG&E commercial rate schedule demand charge ratchet effective November
2026` (tariff sheets and earnings, no clause change).

## Stage-0 / cadence ledger

Both verticals get `last_scanned: 2026-11-23` rows in `context/vertical_coverage.md` in this run;
`node scripts/check-recon-cadence.mjs` should pass with the newest scan date carrying two verticals.
Next-sweep candidates by least-recently-scanned: `legal_ops` (2026-10-12, retired with re-open
triggers) and `agriculture_eudr` (2026-10-12, PRD approved — re-scan only adds evidence), then
`enterprise_ai_finops` (2026-11-23). The 2026-11-23 slots may not be re-declared next week.

## Freshness-rule statement

Freshness rule met without a new build: VERTICAL_A produced the dated-trigger evidence set that
strengthens a PRD already at the gate (top-three scored candidates include SpendProof at 79 from
VERTICAL_A). VERTICAL_B produced a retirement-grade weakening of its PRD — an honest, useful result
that prevents a build against an owned incumbent slice.
