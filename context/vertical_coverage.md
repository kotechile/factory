# Vertical Coverage Ledger

Rotation queue for the weekly recon sweep (Stage 0 of `skills/market_recon_last30days.md`). The sweep
declares two verticals (`VERTICAL_A` + `VERTICAL_B`), scans both, and updates this file **in the same run**.
Ordering for the next sweep: any `never` vertical first, then least-recently-scanned.

Why this file exists: the factory's PRD history is 4 of 5 PRDs in one vertical cluster
(money/document reconciliation) while the archetypes are domain-agnostic — a query-pattern log cannot
detect domain drift, only a coverage ledger can. The editorial factory's vertical registry is the
source of truth for the factory's audience menu (it defines the 26 verticals the fleet already
publishes into, with persona, sources and cadence), so the inventory below is generated from it:

```
node scripts/vertical-sync.mjs           # regenerate the inventory block from the vendored snapshot
node scripts/vertical-sync.mjs --check   # non-zero if stale, drifting, or the snapshot is behind live
node scripts/vertical-sync.mjs --vendor  # re-vendor from the live editorial checkout
```

**No sibling checkout required.** The registry is vendored into this repo as
`context/editorial_verticals.json` — a snapshot of `editorial-factory/context/verticals.json` with
provenance (`sourceRepo`, `sourceRepoHead`, `sourceFileCommit`, `sourceSha256`, `fetchedAt`), so the
ledger regenerates and the guard runs inside the deploy container where the sibling editorial checkout
does not exist. When the live checkout *is* reachable (`../editorial-factory`, or `EDITORIAL_REPO=`),
its sha256 is compared against `sourceSha256`: a snapshot behind live fails loudly with the added or
removed verticals named, and is fixed by `--vendor` (which rewrites both the snapshot and the block).
An absent vendored file is an error, never a skip — a guard that cannot verify must fail closed.

**Channel honesty (measured 2026-09-20):** the editorial pipeline is live but its published set is
currently empty (`editorial-factory/published/` holds only `.gitkeep` after the 09-19 reset onto real
search demand, and `distribution_queue` was deleted unposted). So an editorial vertical gives the
recon a **buyer persona, a source list, a publishing surface and GSC demand data** — not yet an
audience. Scoring a build on "we have a vertical" alone is the same error as scoring a gate on our
own CI traffic.

## Inventory (generated)

<!-- BEGIN:vertical-inventory (generated) -->
_Generated 2026-10-18 by `scripts/vertical-sync.mjs` from the
vendored snapshot `context/editorial_verticals.json` (source `/root/editorial-factory/context/verticals.json`, file commit 1546825e3f5b0866a0291e15b95879f9953f1d3a, fetched 2026-10-18T19:28:48.213Z) — 30 verticals. Do not hand-edit this block._

| Vertical | Label | Editorial persona | Cadence | Sources | Decision-shaped angles |
|---|---|---|---|---|---|
| `agentic_ai` | Agentic Runtime & Architecture | `ai_architect` | `30 10 * * 1,4` | 5 | 1 |
| `agentic_resilience_failure` | Resilience & Failure Engineering | `infra_engineer` | `30 10 * * 3` | 6 | 0 |
| `ai_observability_qa` | Observability, Evals & Quality | `evals_infra_eng` | `30 10 * * 2` | 6 | 0 |
| `career_velocity_equity_engineering` | Career Velocity, Equity Liquidity & Offer Engineering | `equity_career_strategist` | `0 11 * * 5` | 6 | 2 |
| `concentrated_equity_portfolio_capital` | Concentrated Equity, RSU De-risking & Portfolio Architecture | `financial_architect` | `0 12 * * 5` | 7 | 0 |
| `consumer_asset_repair_replace_tco` | Consumer Hardware Lifecycle & Cost-Per-Use | `systems_tinkerer_pro` | `30 12 * * 5` | 7 | 2 |
| `control_tower_exception_orchestration` | Control Tower Visibility & Real-Time Exception Orchestration | `supply_chain_architect` | `0 13 * * 2` | 8 | 3 |
| `demand_sensing_advanced_sop` | Demand Sensing & Advanced Sales & Operations Planning (S&OP) | `ops_leader` | `0 13 * * 4` | 7 | 2 |
| `enterprise_ai_finops` | AI FinOps & Value Realization | `enterprise_cai` | `0 11 * * 4` | 5 | 5 |
| `enterprise_ai_governance` | Enterprise AI Governance & Control Planes | `enterprise_cai` | `0 11 * * 1` | 7 | 0 |
| `enterprise_build_vs_buy` | Enterprise Build-vs-Buy & Developer Tooling Architecture | `eng_leader` | `0 12 * * 3` | 6 | 3 |
| `enterprise_tech_leadership` | Technology & Architecture Decisions | `eng_leader` | `30 11 * * 2` | 4 | 1 |
| `expat_cross_border_relocation` | Advanced Expat, Cross-Border & Multi-Jurisdictional Relocation | `cross_border_expat` | `30 12 * * 4` | 7 | 2 |
| `gpu_hardware` | GPUs & AI Hardware | `infra_engineer` | `30 11 * * 3` | 5 | 1 |
| `home_equity_tco` | Home Capital Allocation & TCO Economics | `pro_homeowner` | `30 11 * * 1` | 6 | 1 |
| `home_infrastructure_lifecycle_tco` | Home Infrastructure & Major Asset Lifecycle TCO | `pro_homeowner` | `0 12 * * 1` | 8 | 2 |
| `home_ops_execution` | Home Operations, Permitting & Contractor Contracts | `pro_homeowner` | `0 12 * * 4` | 6 | 0 |
| `last_mile_routing_fleet_carbon` | Last-Mile Route Optimization & Fleet Carbon Accounting | `supply_chain_architect` | `30 11 * * 5` | 7 | 2 |
| `meio_working_capital_tco` | Multi-Echelon Inventory Optimization (MEIO) & Working Capital TCO | `ops_leader` | `30 12 * * 1` | 8 | 3 |
| `multi_agent_enterprise_fabric` | Multi-Agent Orchestration & Enterprise Fabrics | `ai_architect` | `0 11 * * 3` | 5 | 0 |
| `nhil_infrastructure_ops` | NHIL Infrastructure, NetOps & Power Strategy | `it_ops_leader` | `0 11 * * 2` | 6 | 0 |
| `personal_microeconomics_tinkering_tax` | Personal Asset Micro-Economics & 'Tinkering Tax' Audits | `systems_tinkerer_pro` | `0 6 * * 6` | 7 | 2 |
| `property_loss_insurance_mitigation` | Property Loss, Insurance & Mitigation ROI | `pro_homeowner` | `0 13 * * 3` | 6 | 2 |
| `resilient_home_assets` | Climate Hardening, Insurability & Grid Resilience | `pro_homeowner` | `30 10 * * 5` | 6 | 0 |
| `sales_order_service_level_otif` | Sales Order Service Level, OTIF & ATP Execution | `ops_leader` | `0 13 * * 1` | 6 | 3 |
| `smart_home_telemetry` | Local-First Smart Infrastructure & Telemetry | `pro_homeowner` | `0 12 * * 2` | 6 | 0 |
| `supplier_risk_reshoring_decision` | Supplier Risk Management & Reshoring/Nearshoring Decision Engines | `ops_leader` | `30 6 * * 6` | 8 | 3 |
| `supply_chain` | Supply Chain Orchestration & Physical Logistics | `ops_leader` | `30 11 * * 4` | 9 | 1 |
| `warehouse_automation_robotics_capex` | Warehouse Automation & Robotics CapEx Amortization | `ops_leader` | `30 12 * * 3` | 8 | 2 |
| `workstation_compute_economics` | Autonomous Tech Workstations & AI Compute Economics | `infra_engineer` | `30 12 * * 2` | 7 | 2 |
<!-- END:vertical-inventory -->

## Recon verdicts (hand-maintained, drift-checked)

Eligibility is a **recon** judgement, not an editorial one: `A` = commercial buyer with budget and a
shape the factory can build; `B` = real capital decision but consumer/prosumer willingness-to-pay
(the Stage 3 WTP weight scores these low, scan only with a specific dated trigger); `C` = dev/AI topic
vertical — the audience is engineers, the product shape is developer tooling (see the archetype
saturation lesson: MCPV2 scored 62 and three dev-infra candidates were rejected 2026-09-14).

<!-- BEGIN:vertical-verdicts -->
| Vertical | Eligibility | Why / first move |
|---|---|---|
| `supply_chain` | A — adjacent, saturated | ParcelProof's vertical. Do not re-scan for *parcel/audit* shapes; the unclaimed surface is S&OE exception economics. |
| `meio_working_capital_tco` | A — pack (probed) | Safety-stock vs expedited-freight decision. Free freight-rate calculators exist; the unowned part is the decision, not the rate table. |
| `warehouse_automation_robotics_capex` | A — **scanned 2026-09-21** (best 78) | AMR/ASRS payback, capex case. Free **vendor** ROI calculators now exist (ISD, Dexory, Kinexon, KUKA) — so a plain calculator is not the product; the unowned surface is auditing the vendor's own case (loaded labour + turnover, hidden integration/maintenance, tax year) and normalizing competing quotes. CaseProof proposed. |
| `control_tower_exception_orchestration` | A — stub | Cost-of-late-shipment + build-vs-buy matrix; needs a dated trigger to score. |
| `demand_sensing_advanced_sop` | A — stub | Forecast-accuracy → carrying-cost model; crowded by planning suites. |
| `last_mile_routing_fleet_carbon` | A — stub | EV fleet 7-year TCO + scope-3 logistics carbon; sequence after the capex family. |
| `supplier_risk_reshoring_decision` | A — **scanned 2026-10-05** (best 80) | Tariff-adjusted landed cost = the 2026 sourcing metric, but free origin-scenario simulators (tariffstool, CargoTrans, Gateway) are the incumbent and a factory engine needs a live duty-rate feed it cannot maintain (rule 5). Scan returned a buildable candidate and dropped it; re-open only for a *neutral buyer-side* landed-cost case (not an origin simulator) on a dated escalation. |
| `enterprise_ai_finops` | A — **scanned 2026-10-05** (best 79, PRD at gate) | Invoice ↔ tagged-usage reconciliation. **Read the 2026-09-14 rejection first** (metering/governance is owned by Cloudflare/AWS/Stripe); attribution is a different layer. Free instrumentation logs usage; nobody self-serves the audit-survivable invoice-vs-ledger variance report. |
| `enterprise_build_vs_buy` | A — stub | Internal-tooling maintenance-tax calculator with loaded salaries; strong buyer, thin public tooling. |
| `workstation_compute_economics` | B/C — conditional | Build-vs-cloud GPU matrix; WTP is individual-engineer shaped. |
| `enterprise_tech_leadership` | C — conditional | Topic vertical ("cloud repatriation", "AI ROI"); no single buyer to bill. |
| `expat_cross_border_relocation` | B — conditional | Consumer buyer, and the economics re-enter the money cluster (dual-jurisdiction tax). |
| `home_equity_tco` | B | Prosumer capex; scan only on a dated driver (rate/tariff/rebate window). |
| `home_infrastructure_lifecycle_tco` | B | Same; heat-pump/solar payback models are well-covered by free calculators. |
| `resilient_home_assets` | B | Insurance/grid resilience; a strong dated trigger exists (insurability crises) — worth one scan. |
| `smart_home_telemetry` | B | Local-first telemetry; hardware-adjacent (Filter 2 risk). |
| `home_ops_execution` | B | Permitting/lien paperwork; jurisdiction-by-jurisdiction rules are deterministic but buyer is a homeowner. |
| `career_velocity_equity_engineering` | B | One-time decision per user, low recurring WTP. |
| `personal_microeconomics_tinkering_tax` | B — fails WTP | Hobbyist/consumer; the Stage 3 WTP weight scores 0. |
| `agentic_ai` | C — saturated | Dev-infra shape; MCPV2 already deferred at 62. |
| `ai_observability_qa` | C — conditional | Eval/observability tooling; funded incumbents, and the value is stateful infra, not a micro-engine. |
| `agentic_resilience_failure` | C | Topic vertical; no self-serve buyer for "resilience math". |
| `enterprise_ai_governance` | C | EU AI Act / governance replay — enterprise sales, Filter 3 risk. |
| `nhil_infrastructure_ops` | C — fails Filter 2 | Datacenter/netops/power; needs infrastructure access the stack forbids. |
| `multi_agent_enterprise_fabric` | C | Orchestration fabrics; funded platform territory (see the 2026-09-14 metering rejection). |
| `gpu_hardware` | C | Content vertical; no deterministic product surface. |
| `concentrated_equity_portfolio_capital` | B — **new (2026-10-18)** | Giniloh.com's sixth vertical: the buyer is one engineer with $300k+ of employer equity, so willingness-to-pay is tool-shaped (a $20–50 calculation), not enterprise-shaped. Scan only on a dated trigger — IPO lockup expiry, a tender offer, the §415(c) limit change — and only for calculator/decision demand. The owned surface is the RSU/secondary/Mega-Backdoor calculators on `/portfolio-capital/`, not a SaaS. |
| `consumer_asset_repair_replace_tco` | B — **new (2026-10-18)** | Giniloh.com's Major Purchases & Assets vertical (category 2, 14 dispatches but only 5 on this front). Consumer buyer, tool-shaped WTP: the owned surface is the Tech Repair vs Replace and espresso cost-per-use calculators, not a SaaS. Dated triggers are vendor launch cycles (battery/screen repairability, right-to-repair parts pricing). Scan for calculator demand only. |
| `sales_order_service_level_otif` | A — **new (2026-10-18)** | Retailer OTIF chargebacks are a named P&L line with a real buyer (VP supply chain), and the 2026 metric is penalty economics, not the KPI dashboard suites already ship. Nearest product: fill-rate vs safety-stock curve + chargeback auditor. Rule-5 check first — a per-retailer threshold/penalty table is a maintained feed (Walmart SQEP, Target, Kroger change annually), so scope to the buyer's own contract terms. |
| `property_loss_insurance_mitigation` | B — **new (2026-10-18)** | WellRoost's Home Cost Decisions vertical — the one live pillar with a single dispatch and no owning vertical. Consumer WTP, tool-shaped; a dated trigger exists (a claim, a non-renewal notice, renewal season). First move is one scan on a renewal-season trigger for deductible/spend payback demand, not a build. |
<!-- END:vertical-verdicts -->

## Scanned / verified — software-side verticals

| Vertical | Pack | Last scanned | Best score | Status | Note |
|---|---|---|---|---|---|
| money_document_recon | — (implicit) | 2026-08-31 → 2026-09-14 (5 sweeps) | 83 (FacturGate) | **saturated — rest 4 sweeps** | QuarterLine, LedgerLink, FacturGate, ParcelProof shipped; MCPV2 deferred. Six proposals in six weeks, one cluster. |
| healthcare_interop | ✅ | probe 2026-09-20 | — (probe only) | **open — needs a Stage 3 score** | HL7v2→FHIR / USCDI v3 / CMS-0057-F; 6/6 in-window sources. Funnel risk: Filter 3 (enterprise). |
| payments_iso20022 | ✅ | probe 2026-09-20 | — (probe only) | **open — needs a Stage 3 score** | 2026-11-14 structured-address cutoff; 6/6 in-window sources; rejection mechanics named. |
| contract_risk_insurance | ✅ | probe 2026-09-20 | — (probe only) | **open — needs a Stage 3 score** | ACORD 25 / COI requirements matching; crowded paid incumbents, no free deterministic tool; rule-1 scope caution. |
| multifamily_ops | ✅ | probe 2026-09-20 | — (probe only) | **open — needs a Stage 3 score** | RUBS/submeter bill-back; `Σallocations == invoice.total` invariant; recurring monthly urgency. |
| k12_edtech | ✅ | probe 2026-09-20 | 0 | **retired** | Free open-source incumbent covers it (Ed-Fi OneRoster service, Clever/ClassLink). |
| real_estate_data | ✅ | probe 2026-09-20 | 0 | **parked** | RETS→RESO migration ~75% done; buyer is vendor-side. Revisit only on a new dated standard event. |
| construction_field_ops | ✅ | probe 2026-09-20 | 0 | **retired** | Funded incumbent shipped the deterministic slice (Datagrid/Procore, Autodesk AutoSpecs). |
| manufacturing_shopfloor | ✅ | probe 2026-09-20 | 0 | **retired** | Fails Filter 2: value needs machine connectivity/edge hardware. |
| healthcare_rcm | ✅ (added 2026-09-28) | 2026-09-28 | 69 (PayerVariance, best) | **retired — no build** | First and only scan (pack added this run). Demand is the loudest of any scan so far (1–3% of net patient revenue lost to underpayments; $30K–$150K/yr per 3–5-provider practice; 8+ independent 2026 sources — but four of them sell the fix, so the repeat-intent reading is inflated). Dropped at the **free-incumbent rule**: the AMA's free Claims Workflow Assistant + free 835 parsers + free deadline/appeal generators + the practice system's own contract-variance reporting cover the self-serve layer, and the recovery layer is a human chase (**rule 1**). Also fails the **channel rule** — no editorial vertical, no owned audience. Runners-up: ERA/EFT reassociation checker 62, appeal-worth-it estimator 58, payer prior-auth metric aggregator 55. Record: `context/recon_proposals/2026-09-28_payervariance_no-build.md`. |
| legal_ops | ✅ (added 2026-10-12) | 2026-10-12 | 53 (Rule-set deadline ledger, best) | **scanned — nothing ≥60, no build** | First scan; **never-scanned queue row 1**. Two candidates scored 53 (rules-based deadline ledger) and 46 (filing pre-flight). Dropped below the Stage-3 threshold, and structurally at the **free-incumbent rule** (free FRCP 6 / court-date calculators and `deadlinecalculator.com` free since 2007; **veraPDF** free and open-source PDF/A validation; the e-filing portals ship the redaction tools), the **rule-5 data hazard** (a maintained rule pack for 2,500+ jurisdictions is a legal-liability-grade feed — a stale rule is a *wrong deadline*), and the **channel rule** (not one of the 26 editorial verticals; no owned audience). No dated trigger in-window: the 1 Dec 2026 federal package is appellate forms + bankruptcy rules + Evidence Rule 801, the civil-rules package is 1 Dec 2027. Paid incumbent layer: LawToolBox, CompuLaw, CalendarRules, DocketCalendar. Record: `context/recon_proposals/2026-10-12_canopyproof.md` §4. |
| agriculture_eudr | ✅ (added 2026-10-12) | 2026-10-12 | 79 (CanopyProof) | **open — PRD at the approve gate** | First scan; **never-scanned queue row 2**. Supplier geolocation set pre-flight audit (LLM/parse extraction of supplier packs in front of a deterministic geometry + scope engine). Free incumbents own the *single-item* checks (Silvatrace free GeoJSON validator; Trusty free obligations checker; EUDR Navigator free scope/obligations/templates), so the unowned slice is the **buyer-side portfolio audit** — overlap/duplication between suppliers' plots, declared-vs-computed area, yield plausibility, scope screen — plus the supplier fix-request pack; the paid platforms (osapiens, Coolset, ESF:ONE, LiveEO, TraceX, Trusty Passport from €90/product/yr) are sales-led. Class **LLM/parse-backed**, $1.50/call vs measured ≈$0.18 (clears 3×). Channel caveat: **no dedicated editorial vertical** — nearest owned channels are the sourcing/import-ops verticals (adjacent, not native). Dated triggers: **30 Dec 2026** application for large/medium operators + timber SMEs (30 Jun 2027 for micro/small non-timber); Annex I amended 64 times by Delegated Reg (EU) 2026/2102, in force **18 Sep 2026**. Record: `context/recon_proposals/2026-10-12_canopyproof.md`. |
| energy_interval_data | ✅ (added 2026-10-19) | 2026-10-19 | 76 (RatchetProof) | **open — PRD awaiting the owner (channel gap named)** | First scan; **never-scanned queue row 1**. Billed-demand (ratchet) audit: parse the filed tariff + the bill PDFs into structured fields, then a deterministic engine reconstructs billed demand month by month from the customer's own interval exports and prices the carry-over of the interval that set the floor. Free incumbents each answer one month with hand-typed numbers (Commercial Energy Advisors single-month ratchet-floor calculator; phantomgrid.io free ComEd interval reader + one-charge reconcile, single meter, no lookback); the paid layer (EnergyCAP, DemandQ, Enviglance, Energy Toolbase) is portfolio-priced and sales-led, and the audit itself is sold as a contingency-fee human service (rule 1). Class **LLM/parse-backed**, $1.50/call vs modelled ≈$0.30 (clears 3× with ~5× headroom; re-measure on the first live tariff). Dated trigger: 2026 rate restructures (PG&E/SDG&E commercial EV → reserved capacity + overage; SCE demand charges return 2030) plus annual 1 Jan / 1 Jul tariff changes. **Weakest link: the channel rule** — no editorial vertical and no owned audience for a facilities/energy manager; distribution would be search + the metered agent endpoint. Record: `context/recon_proposals/2026-10-19_ratchetproof.md`. |
| food_service_ops | ✅ (added 2026-10-19) | 2026-10-19 | 64 (invoice price-variance audit, dropped) | **retired — no build** | First scan; **never-scanned queue row 2**. Pain measured in-window (distributor line-item increases, 10–20 h/week of manual invoice auditing, food 28–35% of revenue and 34% above pre-pandemic). Candidate (invoice → contracted-price variance audit) scored 64 and died at the **incumbent filter, not the score**: MarginEdge ($300–350/location/mo), MarketMan ($199–249), xtraCHEF, Restaurant365, CrunchTime and Karu already flag price variance against expected contract pricing — the exact proposed shape, at the price the buyer already pays — and the free/cheap extraction layer ($9–40/mo) covers the operator who would not buy it. WTP thin (single location budget $0–50/mo pre-revenue), **channel rule fails** (no editorial vertical for operators). Re-open only on a dated trigger that resets distributor pricing floors, with a channel attached. Record: `context/recon_proposals/2026-10-19_ratchetproof.md` §6. |

## Scanned / verified — editorial verticals

| Vertical | Pack | Last scanned | Best score | Status | Note |
|---|---|---|---|---|---|
| warehouse_automation_robotics_capex | ✅ | 2026-09-21 | 78 (CaseProof) | **open — PRD at the approve gate** | First scan of this vertical. Free vendor ROI calculators found (ISD, Dexory, Kinexon, KUKA), so the recommended product is the *audit of the vendor's case*, not a calculator; runners-up: sustained-throughput validator 66, peak labour vs rented capacity 63. Dated triggers: 2026-12-31 placed-in-service for the 2026 write-off, 2027-01-01 wage floors. |
| supplier_risk_reshoring_decision | ✅ | 2026-10-05 | 80 (SourceProof, dropped) | **scanned — no build** | First scan. Multi-scenario tariff-adjusted landed-cost engine + supplier-quote extraction. Dropped at the **free-incumbent rule**: free origin-scenario tariff simulators already exist (tariffstool, CargoTrans, Gateway Lines, +6), and the deterministic core needs a live duty-rate feed the 4-hour budget cannot maintain — a stale rate table is a fabricated number (rule 5). The ledger also flags the vertical **"adjacent, not new"** to the money cluster. Dated triggers: §301 exclusion expiry **2026-11-10**, Chinese-rate escalation **to 44% by Nov 2026**, 12.5% forced-labor duty since **2026-07-24**. Record: `context/recon_proposals/2026-10-05_spendproof.md` §4. |
| enterprise_ai_finops | ✅ | 2026-10-05 | 79 (SpendProof) | **open — PRD at the approve gate** | First scan. Provider-invoice ↔ internal tagged-usage **reconciliation** (the audit-survivable variance report at close), LLM/parse extraction of the invoice in front of a deterministic variance engine. Unowned slice: free tools (provider dashboards, Helicone/Langfuse, Costs API) log usage but do **not** reconcile the invoice; the paid layer (Vantage/Amnic/Finout/CloudZero) is sales-led and enterprise-priced. Class **LLM/parse-backed**, $1.50/call vs measured ≈$0.14 (clears 3×). Record: `context/recon_proposals/2026-10-05_spendproof.md`. |

## Never scanned — rotation queue (highest priority first)

| Vertical | Why it's plausible | First probe shape |
|---|---|---|
| media_production_qc | Delivery-spec QC: captions, timestamps, platform rejects | `delivery spec QC captions timestamps reject 2026 post house` |
| trades_service_ops | Work-order/invoice reconciliation, warranty claim packets, permit closeout | `trade service work order invoice warranty claim reconciliation 2026` |
| public_sector_grants | Grant/claim reporting formats, eligibility rules, submission windows | `grant reporting format rejection 2026 manual reconcile` |

## Rules
- **Two verticals per sweep (owner, 2026-10-05).** A run declares `VERTICAL_A` and `VERTICAL_B` (two distinct
  verticals, neither among the last two declared) and records a `last_scanned` row for each. The newest scan
  date in this file must therefore carry **two** verticals; `node scripts/check-recon-cadence.mjs` (wired into
  `scripts/verify-build.sh`) fails the build when it carries one — a run that scanned a single vertical is a
  regression against the owner's cadence instruction, not a judgment call.
- Update `last_scanned` and `best score` in the run that observes them (record hygiene rule 1).
- Run `node scripts/vertical-sync.mjs --check` in CI/sweeps; after an editorial vertical change run
  `node scripts/vertical-sync.mjs --vendor` (the snapshot is vendored in `context/editorial_verticals.json`
  with provenance, so no sibling checkout is needed). `--check` fails on a stale inventory block, a
  missing/unknown verdict row, or a vendored snapshot that is behind the live registry.
- A retired vertical needs its reason recorded; one that reappears with a *new* dated trigger is
  re-opened, not silently re-scanned.
- Only verticals with a plausible distribution channel advance to a build recommendation.
