# Proposal: DutyProof — buyer-side audit of duty already paid on filed entries (scored, **no build**)

**Date Discovered:** 2026-11-09
**Verticals (this sweep):** `VERTICAL_A` = `warehouse_automation_robotics_capex` (**no build**, see §6) · `VERTICAL_B` = `supplier_risk_reshoring_decision` (**no build**, candidate below, killed at the incumbent filter — see §4)
**Signal Vector:** C (billable-quantity decision: what duty was owed on a line) + B (document/record pain: the entry summary nobody reads)
**Signal Intensity Score:** `DutyProof` **70 / 100** (repeat 80 / friction 25 / WTP 80 / urgency 100) · `RaaSBreakEven` **63 / 100** (repeat 65 / friction 20 / WTP 85 / urgency 85)
**Target Persona:** `DutyProof` — the controller or ops lead at a US importer of record doing $2M–$50M of imports a year, whose customs broker files the entries and who has never opened a CBP Form 7501. `RaaSBreakEven` — the warehouse/ops leader building a capex case for an AMR or goods-to-person fleet.

> **Verdict up front: neither candidate gets a build slot.** Both cleared the Stage-3 threshold (≥60) and both died at the **free-incumbent / owned-incumbent rule** — the same filter that killed `sales_order_service_level_otif` (71) on 2026-11-02, `media_production_qc` (68) on 2026-10-26 and `food_service_ops` (64) on 2026-10-19. The scores, the tool classes, the price bands and a **measured** extraction cost are recorded below so the next sweep does not re-derive them.

---

## 1. The Bottleneck & Market Context

### 1.1 `VERTICAL_B` — duty paid on filed entries

- **Current state.** The customs broker files CBP Form 7501 (the entry summary) in the importer's name, within 10 working days of release, and the duty is paid. The importer is the party legally responsible for its accuracy (19 U.S.C. 1484) and, in practice, the party that never reads it. A practitioner guide published in-window puts the two dominant error sources plainly: **wrong country of origin in box 27** (drives the wrong Section 301 / Section 232 / USMCA treatment) and **wrong HTS in box 28** — named as "single biggest source of duty overpayment and audit findings" (Peacock Tariff Consulting, 2026).
- **Why it is acute this week, not evergreens.** The **178 remaining Section 301 China exclusions** (HTSUS 9903.88.69 / 9903.88.70) expire at **11:59 p.m. ET on 2026-11-09**; entries filed from 2026-11-10 lose the exclusion and pay the underlying list rate — **25% on Lists 1–3, 7.5% on List 4A** — on top of MFN, with no phase-in (Coppersmith; Strix; TariffLens; Thomson Reuters, all in-window; USTR had announced no extension as of this scan). A $2M/yr importer of List 3 goods currently under an exclusion faces roughly **$500,000/yr** in new duty; at 15% gross margin that is a pricing and sourcing decision, not a line item.
- **The recovery mechanics are deterministic and dated.** A Post-Summary Correction is available **within 300 days of the entry date and no later than 15 days before scheduled liquidation**; after liquidation the route is a protest on CBP Form 19, **within 180 days of liquidation** (Caspian; USA Customs Clearance, 2026-10-29; Federal Register 2026-13574, the July 2026 PSC test modification). CBP's own statistics: **262 audits completed in FY2026 to 2026-07-27, $204.2M collected**; FY2025 $235.5M across 465 audits; FY2026 averages **over $1M per audit** (Strix, Carra Globe, in-window).
- **Validation intensity.** Six independent in-window sources describe the same arithmetic gap from different seats (two customs consultancies, a brokerage, two trade-compliance platforms, CBP's own audit statistics). Repeat intent scored **80**, not 100, because four of the six sell the fix — the healthcare_rcm screening rule applies.
- **Why it would not have been another invoiced-variance product.** The input is a government form with a printed rate and duty per line; the finding is "this line's duty does not equal this line's rate times this line's base, and this entry's window closes on this date" — not a variance narrative.

### 1.2 `VERTICAL_A` — warehouse automation capex

- **Current state.** The buyer-side case (CaseProof) is already a live factory product in this vertical since 2026-10-04, and the vendor-side calculators that made the first scan interesting are now the incumbent at the *front door*: ISD's free CFO-grade payback/IRR/NPV tool, Dexory's TEI calculator, Kinexon and KUKA fleet calculators.
- **What changed in-window (the only fresh angle).** The **financing** decision rather than the payback decision: 2026 RaaS pricing is now published per robot per month — AMRs **$550–$2,500**, goods-to-person **$1,600–$2,200**, heavy autonomous pickers **$1,900–$3,200**, pay-per-pick **$0.06–$0.15** (OrderPilots, 2026) — against purchase at **$25,000–$150,000/unit** and lease payments of **$600–$5,500/unit/month** (CHG-MERIDIAN; PickTheRobot). The industry KPI is **cost per pick**: manual **$0.35–$0.55**, AMR-assisted **$0.15–$0.25**, robotic **$0.08–$0.12** (Robotics Center, 2026).
- **Dated triggers.** 2026-12-31 placed-in-service deadline for the 2026 Section 179 / bonus-depreciation claim (order must commit weeks earlier); 2027-01-01 wage-floor step-ups (CA $16.90 → $17.40).

## 2. Architecture & Technical Blueprint (what would have been built)

- **Engine type (`DutyProof`):** document-parse extraction **in front of** a deterministic reconciliation engine — the allowed archetype under `context/tech_stack_capabilities.md` §2. The model reads fields off the entry summary; **every number reported is computed in TypeScript from parsed or printed values**, and a field the parser cannot read is `unstated` and blocks the check that depends on it.
- **Deterministic core (`src/lib/calc/dutyproof/`):**
  - `lineArithmetic(entry)` — for every line, `duty == enteredValue × printedRate` at fixed-point money precision; a break names the line, both sides and the difference, in cents.
  - `stackCheck(entry, exclusionRegister)` — the Chapter 99 layers claimed on a line against the entry date: an exclusion code claimed on or after its expiry date, an exclusion missing on a covered line before it, two layers on the same line where the schedules do not stack.
  - `mpfBounds(entry)` — 0.3464% of entered value against the minimum/maximum **in force on the entry date** (FY2026 $33.58/$651.50; FY2027 $34.58/$670.86 from 2026-10-01 — CBP Federal Register notice 2026-07-31), not today's bounds.
  - `clock(entry, liquidationDate?)` — PSC deadline (entry + 300 days, capped at liquidation − 15 days) or protest deadline (liquidation + 180 days), whichever window is still open, with days remaining.
  - `brokerStatement(statement, entries)` — duty advanced and fees billed per entry against the entry's own total.
- **Rule-5 posture (the load-bearing constraint).** No rate feed. Every rate and duty figure comes from **the entry summary's own printed columns**; the only table is the **frozen** exclusion register (a list that expires on a fixed date, so it never needs refreshing after 2026-11-09) and the two dated MPF bound pairs. Any line whose HTS is outside the register returns `unstated` — the engine never prices a forward scenario from a remembered tariff.
- **Inputs → outputs:** broker's ACE entry summary export (ES-003) or the PDF 7501s, plus the broker statement → per-entry finding list: which lines do not reconcile, which windows are open, what is recoverable, and the route (PSC / protest / none).
- **Interfaces:** `src/app/dutyproof/`, `POST /api/dutyproof/audit`, WebMCP `audit_filed_entry_duty`.
- **`RaaSBreakEven` (VERTICAL_A, if it had been built):** pure deterministic, four-way cost model (buy / lease / RaaS / pay-per-pick) on the buyer's own pick volume and utilisation, with the §179 after-tax year, useful-life and residual as explicit inputs; borrows CaseProof's cash-flow core rather than adding a second one.

## 3. Dual-Pronged Monetization — declared classes and bands

| Candidate | Tool class | Band | Proposed rate | Measured / modelled per-call cost | 3× clears? |
|---|---|---|---|---|---|
| `DutyProof` | **LLM / document-parse-backed** | **$0.50–$3.00/call** | $1.50/call | **measured $0.0013 per entry page**; a 40-entry audit set modelled **$0.02–$0.05** with a 1.5× retry factor | yes, by ~40× |
| `RaaSBreakEven` | deterministic | $0.05–$0.50/call | $0.20/call | no model call | n/a |

**The measurement (run 2026-11-09, not modelled):** one real extraction on `deepseek-v4-pro`, temperature 0, `response_format: json_object`, on a synthetic 6-line CBP Form 7501 (entry number, date, port, IOR, origin, three HTS lines with Chapter 99, duty total, MPF, HMF, broker statement) returned a clean 12-field JSON in **44.4 s** with **427 prompt / 2,747 completion tokens (2,437 of them reasoning)** and `finish_reason: stop`. At DeepSeek list rates ($0.28/M input, $0.42/M output) that is **≈$0.0013** for the page. **Two findings worth keeping:** (1) the LLM-class band floor of $0.50 is ~380× the measured cost of a real document extraction, so the band is a *pricing-floor* convention, not a cost constraint — the 3× rule cannot bind on extraction; (2) at `max_tokens: 900` the same call burned all 900 tokens as reasoning and returned null content with no error, exactly the AGENTS.md trap — the extraction path must budget **≥ 8k** even for a one-page document.

- **Web tier:** $29 one-off audit of a 25-entry set, or $99/mo for a rolling entry history with the clock on every entry (the recurring hook is the deadline, not the audit).
- **Agentic tier:** $1.50/call, Stripe-metered, `usesLlmPrimitive: true`.

## 4. Free-incumbent check — this is the section that decides it

- **`DutyProof` — the look-back audit shape is already sold, cheaply and self-serve.**
  - **CustomsGenius** (in-window, 2026-10-03) ships a tariff calculator that is free for three calculations, five a month on a free account, and **"bulk calculation across a whole ACE file is part of the paid app"** — i.e. the buyer-side re-computation of what they should have paid, over their own filed entries, at an app price.
  - **Caspian** runs **automated entry audit at scale**: agents check every entry against **100+ rules** and flag classification, valuation, origin/program and tariff errors, so the product's own marketing shows "4 entries have fixable errors, $38,400 recoverable, one PSC window closes in 12 days" — and it has **filed more than $40M in duty refund claims in 15 months**, with a licensed broker signing off before anything reaches CBP.
  - **Strix** (licensed brokerage, filer code 8ND) sells a **"PSC assessment"** front door and a comprehensive entry review that identifies entries still inside the PSC window.
  - Free, and it owns a different job: five free tariff calculators (HTS Hero, Gateway Lines, Drip Capital, AB Group, CustomsGenius's free tier) compute duty for a hypothetical line, and HTS Hero has announced **automatic savings detection and automatic auditing from October 2026** inside its paid Tracker plan.
  - **What is left:** the deadline-ledger-plus-finding packet for an importer with no platform — which Caspian's own demo line already shows. Scored 70 and dropped at the **owned-incumbent rule**, not at the score.
- **`RaaSBreakEven` — the front door is a vendor calculator, and the buyer-side re-run is our own live product.** ISD's free calculator already takes labour by function, current accuracy, investment estimate and hurdle rate and returns payback/IRR/NPV/ROI; RaaS vendors publish their own TCO comparisons. CaseProof (live since 2026-10-04) already performs the adversarial re-run of a vendor's payback case on the buyer's loaded costs in this vertical. A second product that models lease-vs-buy-vs-RaaS is the same arithmetic under a new title. Scored 63, dropped.

## 5. Funnel

| Filter | `DutyProof` | `RaaSBreakEven` |
|---|---|---|
| 1. Solution archetype | ✅ (e) extraction in front of a deterministic engine | ✅ (a) deterministic model |
| 2. Stack feasibility | ✅ no rate feed; frozen register + printed rates only | ✅ pure TypeScript |
| 3. ≤ 4-hour build | ✅ five engine functions, one parser, one page, one tool | ✅ but it duplicates CaseProof's core |
| 4. Dual interface | ✅ finding set + API + WebMCP | ✅ |
| **Free / owned incumbent** | ❌ **CustomsGenius bulk ACE-file calc + Caspian's 100-rule entry audit** | ❌ **ISD free calculator + our own live CaseProof** |
| **Channel rule** | ❌ no editorial vertical for importers; nearest owned surfaces are the sourcing/supply-chain verticals | ✅ (an editorial vertical exists — but it is the vertical CaseProof already serves) |

## 6. `VERTICAL_A` — `warehouse_automation_robotics_capex`: scanned (2nd), no build

- **What the re-scan added.** The RaaS/lease/purchase price ranges and the cost-per-pick benchmark above are new since the 2026-09-21 scan and are worth keeping in the pack. They do not change the verdict: the vertical's paid front door is a free vendor calculator, its buyer-side re-run is **CaseProof**, already live.
- **What "no build" means here.** Not retirement — the vertical is *served*. The trigger to watch is 2026-12-31 (Section 179 placed-in-service); if CaseProof converts cap-ex quotes only and the RaaS financing question keeps recurring, the correct move is an added **mode** inside CaseProof, not a new product. Recorded as such in `skills/recon_vertical_packs.md`.

## 7. What this sweep means for the rotation

- **Fourteen verticals scanned; every one now carries either a PRD at the gate or a dated drop.** The last six scans produced **one** build candidate (FFRProof, 74) and five honest no-builds (71, 68, 64, 70, 63). Idea supply is not the factory's binding constraint this week; the **approve/build queue** is.
- **Re-open triggers recorded (dated, not vague).**
  - `DutyProof` / `supplier_risk_reshoring_decision`: re-open if the cheap self-serve bulk layer closes (CustomsGenius bulk ACE pricing rises to platform level, or the free three-calculation tier is withdrawn) **or** an importer-facing machine-readable liquidation feed appears that the incumbents do not consume. The exclusion lapse itself is **not** a re-open trigger: the forward-modelling version needs a live HTS/Chapter-99 rate feed, and a stale rate table is a fabricated number (rule 5).
  - `RaaSBreakEven` / `warehouse_automation_robotics_capex`: re-open as a CaseProof mode if the RaaS share of quotes keeps rising past 2026-12-31; do not open a standalone product.
- **Next-sweep slots** (least-recently-scanned, excluding this run's two): `enterprise_ai_finops` (2026-10-05), then `legal_ops` and `agriculture_eudr` (2026-10-12).
