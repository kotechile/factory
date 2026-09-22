# Vertical Coverage Ledger

Rotation queue for the weekly recon sweep (Stage 0 of `skills/market_recon_last30days.md`). The sweep
declares one vertical, scans it, and updates this file **in the same run**. Ordering for the next
sweep: any `never` vertical first, then least-recently-scanned.

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
_Generated 2026-09-22 by `scripts/vertical-sync.mjs` from the
vendored snapshot `context/editorial_verticals.json` (source `/root/editorial-factory/context/verticals.json`, file commit fcdf814e64e8bfedf12c51b4e23c4b28910f8884, fetched 2026-09-21T06:00:37.727Z) — 26 verticals. Do not hand-edit this block._

| Vertical | Label | Editorial persona | Cadence | Sources | Decision-shaped angles |
|---|---|---|---|---|---|
| `agentic_ai` | Agentic Runtime & Architecture | `ai_architect` | `0 6 * * 1,4` | 5 | 1 |
| `agentic_resilience_failure` | Resilience & Failure Engineering | `infra_engineer` | `0 6 * * 3` | 6 | 0 |
| `ai_observability_qa` | Observability, Evals & Quality | `evals_infra_eng` | `0 6 * * 2` | 6 | 0 |
| `career_velocity_equity_engineering` | Career Velocity, Equity Liquidity & Offer Engineering | `equity_career_strategist` | `0 6 * * 5` | 6 | 2 |
| `control_tower_exception_orchestration` | Control Tower Visibility & Real-Time Exception Orchestration | `supply_chain_architect` | `0 6 * * 2` | 8 | 3 |
| `demand_sensing_advanced_sop` | Demand Sensing & Advanced Sales & Operations Planning (S&OP) | `ops_leader` | `0 6 * * 4` | 7 | 2 |
| `enterprise_ai_finops` | AI FinOps & Value Realization | `enterprise_cai` | `0 6 * * 4` | 5 | 5 |
| `enterprise_ai_governance` | Enterprise AI Governance & Control Planes | `enterprise_cai` | `0 6 * * 1` | 7 | 0 |
| `enterprise_build_vs_buy` | Enterprise Build-vs-Buy & Developer Tooling Architecture | `eng_leader` | `0 6 * * 3` | 6 | 3 |
| `enterprise_tech_leadership` | Technology & Architecture Decisions | `eng_leader` | `0 6 * * 2` | 4 | 1 |
| `expat_cross_border_relocation` | Advanced Expat, Cross-Border & Multi-Jurisdictional Relocation | `cross_border_expat` | `0 6 * * 4` | 7 | 2 |
| `gpu_hardware` | GPUs & AI Hardware | `infra_engineer` | `0 6 * * 3` | 5 | 1 |
| `home_equity_tco` | Home Capital Allocation & TCO Economics | `pro_homeowner` | `0 6 * * 1` | 6 | 1 |
| `home_infrastructure_lifecycle_tco` | Home Infrastructure & Major Asset Lifecycle TCO | `pro_homeowner` | `0 6 * * 1` | 8 | 2 |
| `home_ops_execution` | Home Operations, Permitting & Contractor Contracts | `pro_homeowner` | `0 6 * * 4` | 6 | 0 |
| `last_mile_routing_fleet_carbon` | Last-Mile Route Optimization & Fleet Carbon Accounting | `supply_chain_architect` | `0 6 * * 5` | 7 | 2 |
| `meio_working_capital_tco` | Multi-Echelon Inventory Optimization (MEIO) & Working Capital TCO | `ops_leader` | `0 6 * * 1` | 8 | 3 |
| `multi_agent_enterprise_fabric` | Multi-Agent Orchestration & Enterprise Fabrics | `ai_architect` | `0 6 * * 3` | 5 | 0 |
| `nhil_infrastructure_ops` | NHIL Infrastructure, NetOps & Power Strategy | `it_ops_leader` | `0 6 * * 2` | 6 | 0 |
| `personal_microeconomics_tinkering_tax` | Personal Asset Micro-Economics & 'Tinkering Tax' Audits | `systems_tinkerer_pro` | `0 6 * * 6` | 7 | 2 |
| `resilient_home_assets` | Climate Hardening, Insurability & Grid Resilience | `pro_homeowner` | `0 6 * * 5` | 6 | 0 |
| `smart_home_telemetry` | Local-First Smart Infrastructure & Telemetry | `pro_homeowner` | `0 6 * * 2` | 6 | 0 |
| `supplier_risk_reshoring_decision` | Supplier Risk Management & Reshoring/Nearshoring Decision Engines | `ops_leader` | `0 6 * * 6` | 8 | 3 |
| `supply_chain` | Supply Chain Orchestration & Physical Logistics | `ops_leader` | `0 6 * * 4` | 9 | 1 |
| `warehouse_automation_robotics_capex` | Warehouse Automation & Robotics CapEx Amortization | `ops_leader` | `0 6 * * 3` | 8 | 2 |
| `workstation_compute_economics` | Autonomous Tech Workstations & AI Compute Economics | `infra_engineer` | `0 6 * * 2` | 7 | 2 |
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
| `supplier_risk_reshoring_decision` | A — pack (probed) | Tariff-adjusted landed cost = the 2026 sourcing metric. Partly owned by free calculators; dated trigger 2026-11 tariff escalation. |
| `enterprise_ai_finops` | A — pack (probed) | Invoice ↔ attribution reconciliation. **Read the 2026-09-14 rejection first** (metering/governance is owned by Cloudflare/AWS/Stripe); attribution is a different layer. |
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

## Scanned / verified — editorial verticals

| Vertical | Pack | Last scanned | Best score | Status | Note |
|---|---|---|---|---|---|
| warehouse_automation_robotics_capex | ✅ | 2026-09-21 | 78 (CaseProof) | **open — PRD at the approve gate** | First scan of this vertical. Free vendor ROI calculators found (ISD, Dexory, Kinexon, KUKA), so the recommended product is the *audit of the vendor's case*, not a calculator; runners-up: sustained-throughput validator 66, peak labour vs rented capacity 63. Dated triggers: 2026-12-31 placed-in-service for the 2026 write-off, 2027-01-01 wage floors. |

## Never scanned — rotation queue (highest priority first)

| Vertical | Why it's plausible | First probe shape |
|---|---|---|
| healthcare_rcm | 835/ERA denial + deposit reconciliation, CARC/RARC interpretation; small practices post EOBs by hand | `835 remittance ERA denial reconciliation small practice manual posting 2026` |
| supplier_risk_reshoring_decision | Tariff-adjusted landed cost; dated 2026 tariff escalation; spreadsheets are the incumbent | `total landed cost calculator tariff 2026 spreadsheet importers sourcing decision` |
| enterprise_ai_finops | Finance-side reconciliation of provider invoices against tagged usage; FinOps Foundation names it the top tooling gap | `AI token cost attribution showback business unit 2026 finops manual chargeback` |
| legal_ops | Court e-filing formats per jurisdiction, deadline calculation (rule-based, dated) | `court e-filing format rejection deadline calculation 2026 paralegal manual` |
| agriculture_eudr | Geolocation due-diligence statements, batch → plot traceability | `EUDR due diligence statement geolocation upload supplier 2026 manual` |
| energy_interval_data | Interval/Green Button data → tariff and demand-charge audit; submeter reconciliation | `Green Button interval data demand charge audit 2026 spreadsheet` |
| food_service_ops | Invoice → price-list variance, yield/waste reports, franchise compliance packs | `restaurant invoice price variance food cost audit 2026 manual` |
| media_production_qc | Delivery-spec QC: captions, timestamps, platform rejects | `delivery spec QC captions timestamps reject 2026 post house` |
| trades_service_ops | Work-order/invoice reconciliation, warranty claim packets, permit closeout | `trade service work order invoice warranty claim reconciliation 2026` |
| public_sector_grants | Grant/claim reporting formats, eligibility rules, submission windows | `grant reporting format rejection 2026 manual reconcile` |

## Rules
- Update `last_scanned` and `best score` in the run that observes them (record hygiene rule 1).
- Run `node scripts/vertical-sync.mjs --check` in CI/sweeps; after an editorial vertical change run
  `node scripts/vertical-sync.mjs --vendor` (the snapshot is vendored in `context/editorial_verticals.json`
  with provenance, so no sibling checkout is needed). `--check` fails on a stale inventory block, a
  missing/unknown verdict row, or a vendored snapshot that is behind the live registry.
- A retired vertical needs its reason recorded; one that reappears with a *new* dated trigger is
  re-opened, not silently re-scanned.
- Only verticals with a plausible distribution channel advance to a build recommendation.
