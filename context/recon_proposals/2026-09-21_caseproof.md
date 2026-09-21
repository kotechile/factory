# Proposal: CaseProof — the buyer-side audit of a warehouse automation business case

**Date Discovered:** 2026-09-21 (scan window 2026-08-22 → 2026-09-21)
**Vertical:** `warehouse_automation_robotics_capex` (editorial vertical; recon verdict **A — pack probed**)
**Signal Vector:** C (high-intent calculator / audit workflow) × B (quote & document normalization) × A (dated trigger)
**Signal Intensity Score:** **78 / 100** (repeat-intent 80 / pricing-friction 70 / willingness-to-pay 90 / urgency 70)
**Target Persona:** warehouse and distribution ops leaders building a capital case for robots/goods-to-person (the editorial `ops_leader` persona); secondary buyer: supply-chain finance and the fractional logistics consultants who audit these cases for mid-market clients.

**Primary Source:** https://trymconsulting.com/warehouse-automation-roi (last updated 2026-07-03) — *"A well-constructed warehouse automation business case is not a vendor deliverable. Vendors have an interest in the project proceeding, their models will make generous assumptions on throughput, conservative assumptions on cost, and will not stress-test the result with any real enthusiasm."* The same page prescribes the audit the product automates: run the case at volume −10/−20/−30%, capex +15%, maintenance +25%.

**Corroborating sources (independent, same failure mode, dated):**
- https://www.monocleapp.co/blog/warehouse-automation-roi-models-fail (2026-03-28): "Only 10% of companies achieve sustained, large-scale success scaling automation beyond pilot programs... **Many operators in 2026 are now sitting on automation investments that underperformed — not because the systems failed, but because the business case was built on the wrong inputs.**"
- https://logio.com/resources/warehouse-automation-roi-how-to-build-the-business-case-before-you-invest (2026-07-30): "Most automation business cases overpromise because they are written by the party selling the technology. A vendor's calculation assumes ideal utilization, a smooth ramp-up, and a warehouse that behaves like the reference site in the brochure. **Your warehouse won't.**"
- https://goasrs.com/asrs-vs-amr (2026): "ROI calculations that exclude integration and software are the third trap; **hardware is usually 60–70% of total project cost**, and the rest is integration, training, software licensing, and the first year of operational tuning." Also names the throughput half of the same problem: "Throughput claims at peak burst rate, not sustained."
- https://www.rorixtech.com/blogs/warehouse/warehouse-automation-cost (2026): "**A $340,000 warehouse automation quote does not always mean a $340,000 project**" — ERP/WMS integration $25k–$100k over 6–14 weeks, plus 10–20% of equipment cost annually in maintenance and change.
- https://thenetworkinstallers.com/blog/warehouse-automation-statistics (2026): ongoing maintenance **15–20% of initial equipment cost annually**; "Infrastructure requirements: most existing facilities require network, power, and structural upgrades before automation can be deployed — **costs frequently missed in initial planning**."
- https://www.isddd.com/your-warehouse-automation-roi-calculator (page 2026-04-24; launch press release 2026-07-10, EINPresswire / Akron Beacon Journal): the incumbent vendor tool's own text concedes the gap it leaves — "Back-of-envelope spreadsheets usually model labor savings only. They ignore accuracy gains, error replenishment labour, and growth in order volume. **They apply a single blended labor rate, hiding where savings actually come from.**"

**Dated triggers (why now, not in six months):**
- **2026-12-31** — qualifying equipment must be *placed in service* by this date to claim the 2026 write-off: Section 179 limit **$2,560,000**, phase-out from **$4,090,000**, with 100% bonus depreciation on the remainder (OBBBA). With integration and install inside the project, the purchase decision for a December in-service date is being made in September/October. Source: section179.org 2026 limits + in-service deadline page.
- **2027-01-01** — wage floors step up again: California $16.90 → **$17.40** (+2.99%, announced 2026-07-31, DIR-confirmed), on top of the 2026 round that lifted 19 states and 49 localities (NELP). The largest input in every labour-saving case reprices at the turn of the year.
- **Sep–Oct 2026** — peak-season commitment window: staffing plans start 6–8 weeks before peak, so the labour-vs-robots comparison is on a desk now.
- **H1 2026 volume** — ~18,000 robot units worth ~$1.2B ordered in North America, **units +2% YoY but value +7%** (Association for Advancing Automation, via The Wall Street Journal 2026-08-17). Buyers are being quoted richer, more bundled projects — i.e. more cost lines that no one normalizes.

---

### 1. The Bottleneck & Market Context

- **Current State:** the automation decision is a capital decision made on a model the *seller* wrote. The buyer's side of the table has: a blended hourly wage rather than a fully loaded rate; no line for turnover (60%+/yr in warehousing), integration, facility work, commissioning downtime, or training ramp; no tax treatment; and no way to put two vendors' differently-structured quotes (capex vs lease vs per-pick subscription) on the same five-year cash flow. Vendor lead-magnet calculators now exist and are better than a spreadsheet — but they are single-vendor, form-gated and shaped to the sale, and the paid alternative is a consultant or the integrator's "human walkthrough", i.e. again the party with an interest.
- **Validation Intensity:** four independent 2026 sources describe the identical failure mode without selling anything ("the case was built on the wrong inputs", "written by the party selling the technology", "ROI calculations that exclude integration and software", "a $340k quote is not a $340k project"), and the incumbent vendor tool's own copy concedes the blended-rate and missing-line problems. That is a named, repeatable, arithmetic bug — which is what this factory builds.

### 2. Architecture & Technical Blueprint

- **Engine Type:** deterministic cash-flow engine (archetype **a**) + quote line-item normalizer (archetype **b**).
- **Deterministic Core (`src/lib/calc/caseproof/`):**
  - `types.ts` — `BidOption { id, vendor, model: "capex"|"lease"|"raas", capex{}, lease{}, raas{ monthlyPerUnit, units, termMonths, escalationPct, includedMaintenance, exitCost, uptimeSla }, maintenancePctOfCapex?, integrationCost?, facilityCost?, trainingCost?, softwareAnnual?, throughputClaim? { picksPerHour, basis: "sustained"|"peak", availabilityPct } }`; `Baseline { ordersPerDay, linesPerOrder, shifts, staffByFunction[], hourlyWage, payrollBurden, benefitsPct, overtimeHoursPerWeek, turnoverPct, costPerHire, errorRatePct, costPerError, peakFactor }`; `Finance { horizonYears, hurdleRate, taxRate, section179Election, financingRate }`.
  - `loadedLabor.ts` — derives the **fully loaded cost per productive hour** (wage + payroll burden + benefits + overtime premium + turnover replacement amortized over the productive hours a leaver costs + training ramp), and returns the component breakdown so the buyer's real rate can be shown against the single blended rate a vendor case assumed. A missing component is `unstated`, never defaulted.
  - `cashflow.ts` — per-option annual net cash flow: labour saving (FTE-equivalent removed × loaded rate, with a ramp factor and a redeployment-vs-cash-out distinction), error-cost saving, maintenance/licence, integration and facility amortization, downtime exposure; §179 then bonus depreciation then straight-line applied **by tax year**; lease/RaaS payments with escalation; outputs payback in months, IRR, and NPV at the buyer's hurdle rate.
  - `audit.ts` — the deliverable: for each assumption the vendor's case depends on, the value at which it stops clearing the hurdle (`breakEven(field)`), pass/fail against the buyer's own numbers, and a ranked list of the assumptions that must be confirmed **in writing** before signature. Invariant: every failed assumption is reproducible from the two input sets.
  - `compare.ts` — 2–3 options on one cash model: cost per pick / per order per option, crossing point where the ranking flips, and the sensitivity grid (volume −10/−20/−30%; capex +15%; maintenance +25%).
  - `taxLayer.ts` — tax-year data, not hardcoded facts: 2026 = 179 limit 2,560,000 / phase-out 4,090,000 / bonus 100%, with the source cited in the payload and older years explicit. No rule is guessed for a year without a cited entry.
- **Known-answer test vectors (`vitest`):** a vendor case that flips from a claimed 14 months to 41 months once loaded labour, turnover and an unstated 15% maintenance line are applied; a §179 phase-out case above $4.09M; an RaaS escalation case where subscribing wins only past a 40% seasonal premium; a fully stated clean quote that must produce **zero** flags; an empty maintenance field that must report `unstated`, not zero.
- **Inputs / Outputs:** `POST { baseline, options[] }` → `{ paybackByOption, irr, npvAtHurdle, ranking, failedAssumptions[], sensitivityGrid, unstated[], decisionPack: { csv|pdf } }`.

### 3. Dual-Pronged Monetization

- **Web tier (Stripe):** free single-option preview with the loaded-rate calculation; **$149 per decision pack**, or **$99/mo** for multi-site teams and consultants running several cases a quarter. Price sits deliberately under one consultant hour-projection and far under the contingency share a vendor audit firm takes.
- **Agentic tier (WebMCP):** `audit_automation_case`, `compare_automation_bids`, `after_tax_payback` at **$0.50/call**, metered — the natural call for an agent assembling a capital request or interrogating a supplier's proposal.

### 4. Zero-Friction Viral Hook

The scenario itself is shareable: a base64-encoded state URL carries the whole case, so an ops leader sends the CFO the exact model rather than a PDF snapshot; the decision pack exports branded for the capital committee; the embeddable widget targets the consultants and integrators who do this arithmetic by hand today.

### 5. Funnel & Scope Guards

1. **Archetype** ✓ deterministic engine + normalization rules; no judgement calls, no LLM in the calculation path.
2. **Stack** ✓ pure TypeScript on the existing Next.js + Tailwind + Supabase + Stripe + Resend deploy.
3. **Horizon** ✓ ≈3.5 h: engine 2 h, page 1 h, vectors 30 m.
4. **Dual interface** ✓ interactive UI + REST/WebMCP.
- **Scope guard (v1):** line items are pasted or uploaded as CSV rows — **no PDF/OCR extraction**, no rate tables of our own, no throughput *sizing* model (that is the separate candidate below). Line-item values are only ever echoed back as the vendor stated them.
- **Rule-5 guard:** an unstated cost line is reported `unstated` and blocks a pass verdict; the tool never invents maintenance percentages, utilisation or rates.

### 6. Free-incumbent check (measured 2026-09-21 — this is what shaped the scope)

Free, self-serve calculators **do** exist in this vertical and killed the naive version of this idea: ISD's free Warehouse Automation ROI Calculator (payback, IRR, NPV, emailed PDF), Dexory's Forrester-TEI calculator, Kinexon's AMR/AGV fleet-size + ROI calculator, KUKA's free AMR fleet calculator. A generic "warehouse automation ROI calculator" is therefore **not** a product under the recon drop rule. What no free or paid self-serve tool does — and what the sources above describe as the actual failure — is take *the vendor's own quoted numbers* and re-run them against the buyer's loaded labour, hidden costs and tax position, or normalize two or three competing quotes onto one cash model. The unowned surface is the **adversarial re-run and the comparison**, not the calculator.

### 7. Two further candidates scored this sweep (declared vertical)

| Candidate | Shape | Score | Verdict |
|---|---|---|---|
| **Sustained-throughput validator** — takes a proposal's claimed picks/hour, order profile, availability and station count and reports the sustained and peak throughput it actually implies, plus the volume at which the claim breaks | deterministic engineering model; the "burst rate vs sustained" trap in §1 | **66** (repeat 65 / friction 60 / WTP 80 / urgency 55) | **shortlist** — free vendor fleet calculators exist but only size their own robots; none audits a competitor's claim. Better as a second product than as v1 scope |
| **Peak-labour vs rented capacity** — Q4 staffing plan (agency bill rate, peak premium, attendance risk) against three months of rented robots on one cost-per-order basis | deterministic decision model; peak window is now | **63** (repeat 60 / friction 40 / WTP 75 / urgency 80) | **defer** — staffing-cost calculators are free and plentiful (the free-incumbent rule bites) |

**Stage 0 record:** declared vertical `warehouse_automation_robotics_capex`, chosen from the ledger's never-scanned rotation queue (highest priority, verdict A, pack probed). It is not one of the last two declared verticals. **Channel:** the editorial vertical of the same id (persona `ops_leader`, 7 sources, Wednesday cadence) plus LinkedIn ops/supply-chain audiences — recorded honestly as a persona, a source list and a publishing surface, since the editorial pipeline's published set is currently empty (ledger, channel-honesty note).

### 8. Build Notes

- Route `src/app/caseproof/`; registry entry in `src/products/registry.ts` (slug `caseproof`, status `beta`); telemetry `track(event, payload, "caseproof")`.
- WebMCP tools registered via `navigator.modelContext.registerTool` and advertised in the generated manifest.
- Gate: `scripts/verify-build.sh` must pass before push. Nothing is built until the founder's `@Simon approve`.
