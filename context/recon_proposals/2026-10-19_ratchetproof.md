# Proposal: RatchetProof — a billed-demand audit for commercial electric accounts

**Date Discovered:** 2026-10-19
**Verticals (this sweep):** `VERTICAL_A` = `energy_interval_data` (produced this candidate) · `VERTICAL_B` = `food_service_ops` (scanned, no build — see §6)
**Signal Vector:** B (operational/data transformation pain) + C (billable-quantity decision: billed demand vs metered demand)
**Primary Sources:** AAUBA, *10 Common Utility Billing Errors Businesses Miss* (ratchet miscalculation, typical overcharge $200–$2,000/month) https://aauba.org/blog/common-utility-billing-errors · DemandQ, *Decoding Your Electric Utility Bill* (1,000 kW peak under an 80% ratchet at $15/kW = $12,000/month floor, $144,000/year) https://www.demandq.ai/demandlab/decoding-your-utility-bill · Envigilance, *Retail Demand Charges* (ratchet penalty $5,760/yr on one building; manual bill review is monthly and 30+ days delayed; "ratchet detection: rarely identified") https://envigilance.com/blog/retail-demand-charges · Elexity, *Understanding Demand Charges* (demand = 50% of a commercial bill in its worked example; complex ratchet equations) https://www.elexity.io/elexity-resources/understanding-demand-charges-and-your-commercial-utility-bill · FEDS/PNNL, *What is a demand ratchet?* (80% of the prior 11 months' peak is the common form) https://feds.pnnl.gov/faq/what-demand-ratchet · EVready, *Demand Charges Are Being Restructured in 2026* (PG&E/SDG&E commercial EV rates moving to reserved-capacity + overage; SCE demand charges return 2030) https://evreadyenergy.com/blog/demand-charge-rate-changes-2026
**Signal Intensity Score:** **76 / 100** — repeat intent 85 / incumbent pricing friction 70 / willingness-to-pay 85 / urgency 60
**Target Persona:** Facilities or energy manager at a multi-site commercial portfolio (retail chain, grocery, light industrial, Self-Storage/hotel group) with $100k+/yr electric spend; secondary buyer: the independent utility-bill auditor / ESCO who runs these audits for clients on contingency.

---

## 1. The Bottleneck & Market Context

- **Current state.** A commercial electric bill's demand line is charged on *billed* demand, which is not the meter's peak. The tariff sets it to the greater of the month's peak, a percentage (commonly 70–90%) of the highest peak in the trailing 11–12 months, and a contract minimum. One hot afternoon therefore sets a floor the account pays against for a year, and the bill prints only the resulting number — never which interval set it, never which months were charged on the floor. Operators check the total against last month and pay it.
- **What the failure costs.** Measured examples in-window: a 1,000 kW peak at an 80% ratchet and $15/kW = a **$144,000/yr** exposure from a single event; a retail building's ratchet penalty **$5,760/yr**; ratchet miscalculation by the utility itself (wrong percentage, wrong lookback, failure to reset) typically **$200–$2,000/month**. Audit firms put billing errors at roughly one in three commercial bills and qualify accounts at $100k+ annual utility spend.
- **Validation intensity.** Six independent 2026 sources name the same arithmetic (AAUBA, DemandQ, Envigilance, Elexity, FEDS/PNNL, Tactical Energy Group), and the free-tool check (below) shows every one of them is describing work that is still done by hand or by a contingency-fee consultant. The dated driver is not a regulation but a **rate restructure cycle**: 2026 tariffs are being rebuilt (PG&E/SDG&E commercial EV rates → reserved capacity with overage penalties; SCE demand charges return 2030; supplier pass-through changes effective 1 Jan and 1 Jul 2026), so the ratchet clause an account was modelled on last year is not the clause it is billed under this year.

## 2. Architecture & Technical Blueprint

- **Engine type:** document-parse extraction **in front of** a deterministic billing-demand engine (AGENTS rule 1 extended archetype, `context/tech_stack_capabilities.md` §2). The model reads fields; **no number the product reports comes from the model.**
- **Deterministic core (`src/lib/calc/ratchetproof/`):**
  - `align(intervals[][])` — put every meter on one 15/30-minute grid, sum coincident intervals (a site's true peak exists only in the sum), reject gaps rather than interpolating.
  - `billingWindow(tariff)` — filter to the hours/days the tariff actually bills (a Saturday spike sets nothing).
  - `billedDemand(month, history, tariff)` = `max(monthPeak, ratchetPct × max(history[lookback]), contractMin)`; history is an explicit, ordered month-keyed array so "trailing 11 months" cannot drift.
  - `carryOver(ledger)` = Σ over months of `(billed − metered) × rate` — the dollar cost of the interval that set the floor, and the counterfactual: what shaving that one interval would have saved.
  - Decimal/fixed-point arithmetic throughout; `Σ(intervals read) == Σ(intervals in file)` is an enforced invariant.
- **Extraction (LLM/parse):** tariff PDF → demand rate by season/voltage class, ratchet %, lookback months, billing window, interval length, contract minimum; bill PDFs → billing period, printed billed demand, demand rate, printed ratchet line. Every extracted field carries provenance (page + verbatim quote). A clause the parser cannot read is `unstated`, **which blocks that month's verdict** — never defaulted to 0% (rule 5). An unreadable interval file is an explicit finding, not a partial answer.
- **Inputs → outputs:** interval CSV/Green Button XML + bill PDFs + the filed tariff PDF → per-month variance table (recomputed vs billed), the peak event (timestamp + which loads stacked into it), a ratchet ledger, and a portable PDF/CSV finding set an auditor can attach to a refund claim.
- **Interfaces:** `src/app/ratchetproof/` (Editorial Signature UI, upload → run → finding set), `POST /api/ratchetproof/audit`, WebMCP tool `audit_demand_billing`.

## 3. Dual-Pronged Monetization

- **Web tier (Stripe):** $12 one-off audit (one site, 12 months) · **$39/mo** per site for a rolling audit (monthly re-read of new bills against the standing floor). The recurring case is the ratchet itself: it re-prices every month until it expires.
- **Agentic tier (WebMCP / metered API):** **$1.50/call.**
- **Tool class: LLM / document-parse-backed** → band **$0.50–$3.00/call**; rate must clear **3× measured per-call cost**.
  **Modelled per-call cost ≈ $0.30** — tariff parse 40 pages @ $0.003 = $0.12; 12 bill PDFs × 2 pages = $0.072; extraction of the demand-charge clauses ≈ 6k in / 700 out ≈ $0.01–0.02; ×1.5 retry factor. **$1.50 clears 3× with ~5× headroom.** The first live tariff is the measurement run: re-cost before the tool is registered, and if the measured cost exceeds $0.50 the rate is wrong, not the class.
  `usesLlmPrimitive: true` at build time; `src/products/pricing.test.ts` holds the band.

## 4. Free-incumbent check (the rule that decides these)

| Tool | What it actually does | What it does not do |
|---|---|---|
| Commercial Energy Advisors *demand charge calculator with ratchet floor* (free) | One month, hand-typed measured peak + hand-typed floor → one monthly component | No file upload, no interval data, no history, no carry-over cost, no verdict against the bill |
| phantomgrid.io *interval analyzer* + demand-charge reconcile (free, ComEd only) | Reads one ComEd Green Button export, finds the interval that set that month's peak, reconciles one charge against one bill | Single meter, single utility, **no ratchet lookback**, no multi-meter coincidence, no portfolio |
| EnergyCAP *free 2026 utility cost estimate* | Aggregate budget estimate | Not an audit |
| Paid: EnergyCAP, DemandQ, Enviglance, Energy Toolbase | Portfolio energy management, monitoring, load control | Sales-led, portfolio-priced; the audit is a service engagement |
| Utility-bill audit firms (OEO, Energy Professionals, Inertia) | The audit itself — contingency fee on recovered refunds, "no upfront cost" | **A human chase (rule 1)**: they sell the recovery, not the arithmetic |

**The unowned surface** is therefore narrow but real: *the multi-month, multi-meter, tariff-clause-driven reconstruction of billed demand from the customer's own files, and the dollar carry-over of the interval that set the floor.* The free tools each answer one month with numbers typed by hand; nobody reconciles a year of billed demand to a year of interval data and prices the ratchet.

## 5. Build Notes & Effort

- Route `src/app/ratchetproof/`; engine `src/lib/calc/ratchetproof/` with known-answer vectors (a 75% ratchet case reproducing UtilityBasket's published four-month example to the cent; a multi-meter coincident-peak case; a no-ratchet tariff as the null); registry entry; telemetry `track(..., "ratchetproof")`; WebMCP registration.
- **Effort: ≈ 3.5–4 h** — engine 90 min, extraction contract + prompt 60 min, UI 60 min, vectors 40 min. Fits the cap only if scope stays at: interval files, bill PDFs, tariff PDF. No utility API integration, no Green Button Connect OAuth (data access per utility is the documented blocker for this vertical), no satellite/weather normalisation.
- **Gate:** `scripts/verify-build.sh` must pass before push.
- **Weakest link — the channel rule (Stage 0).** This vertical has **no editorial vertical and no owned audience**: the buyer is a facilities/energy manager, and the factory publishes to none of that persona's channels today. Under the channel rule the candidate cannot *earn* a build slot on its own; distribution would be search + the metered agent endpoint, i.e. a bet, not an owned channel. That trade-off is the owner's decision, and it is the reason this PRD carries both an approve and a skip reply.

## 6. `VERTICAL_B` — `food_service_ops`: scanned, **no build**

- **Pain is real and in-window:** distributor invoices carry unauthorised line-item increases; manual invoice audits burn 10–20 h/week; food is 28–35% of revenue and 34% above pre-pandemic levels (National Restaurant Association 2026; CBIZ; FEDA); an undetected $4/case variance is $80/week/location (ustechautomations); a UK venue loses £720–£1,440/yr on unclaimed credits (Jelly).
- **Candidate considered:** invoice → contracted-price variance audit (LLM/parse extraction of distributor invoices against the operator's own agreed price list, then a deterministic variance engine).
- **Score 64** (repeat 85 / friction 55 / WTP 55 / urgency 55) — it clears Stage 3 and then **dies at the incumbent filter, not at the score.**
- **Why no build:**
  1. **The slice is already occupied by the paid layer at the exact shape proposed.** MarginEdge ($300–350/location/mo), MarketMan ($199–249), xtraCHEF, Restaurant365, CrunchTime and Karu all flag price variance against expected contract pricing — the 2026 buyer guides say so plainly ("MarginEdge and MarketMan both flag price variances against historical invoice data and expected contract pricing"). We would be the cheap version of a product the target buyer already runs.
  2. **The free/cheap layer covers the operator who would not buy the above:** extraction tools at $9–40/mo (ImageToTable free tier), free food-cost calculators, and the spreadsheet the operator already has.
  3. **WTP is genuinely thin** — the pack's warning ("thin margins, low per-seat WTP — check before scoring") measured true: a single location's entire software budget is $0–50/mo pre-revenue and $200–400/mo once stable, which is the incumbent's price, not ours.
  4. **Channel rule fails too** — no editorial vertical for restaurant operators.
- **Retire the vertical** with this reason; re-open only on a dated trigger that changes the arithmetic (e.g. a USMCA review outcome that resets distributor pricing floors) and only with a channel attached.

## 7. What would make RatchetProof a bad bet (stated before the build, not after)

- Interval data access: many utilities release it slowly or per-request. That is why the product is **file-upload only** — no integration, no promise of automatic data.
- Tariff parsing is the risk surface: rate schedules are long, amended by riders, and the demand clause is often on page 30. Provenance + `unstated`-blocks-the-verdict is the mitigation; a wrong rate is a fabricated number and must fail loudly.
- The buyer may prefer the contingency-fee auditor (free to them, paid from the refund). The product's answer is the number *before* the auditor's call, and a finding set the auditor can use — not a replacement for the recovery.
