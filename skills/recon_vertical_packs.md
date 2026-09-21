---
name: recon-vertical-packs
description: "Use with market_recon_last30days — per-vertical query packs, dated triggers, buyers and incumbent checks."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Recon Vertical Packs

Companion to `skills/market_recon_last30days.md`. One pack per vertical. The sweep declares a
vertical (Stage 0), loads its pack, and instantiates the Stage 2 shape templates with that pack's
standards bodies, dated triggers and incumbent names.

**Why this file exists (measured 2026-09-20).** The sweep's compounding loop fed only its own winning
phrasings back, and both survivors of the zero-result log were compliance/finance-shaped. The
factory therefore re-discovered the same vertical five times (tax → payments → e-invoicing → freight
invoice). The archetypes were never the problem — the *query input* was. Packs keep compounding but
per vertical.

## Pack format (keep every entry to these six lines)
- **Trigger surface** — standards body / regulator / platform whose docs carry dates.
- **Dated triggers** — the cutoff, mandate, renewal cycle or window, with its date.
- **Query shapes that returned in-window** — measured phrasings (with the run date).
- **Buyer & budget** — who is on the hook for the failure, and who signs.
- **Incumbent / free-tool check** — named validators, connectors, open-source alternatives.
- **Funnel risk** — which of the 4 filters this vertical tends to fail, and why.

---

## healthcare_interop
- **Trigger surface:** ONC/HTI-1, CMS-0057-F, HL7 (v2, FHIR R4/US Core), 1EdTech; HIMSS/trade press.
- **Dated triggers:** HTI-1 USCDI v3 certification (2026-01-01); CMS-0057-F FHIR APIs for patient
  access, payer exchange and prior auth; hospital HL7v2→FHIR cutovers through 2027.
- **Query shapes (measured 2026-09-20):** `HL7 v2 to FHIR migration deadline 2026 hospital interface
  team manual mapping struggle` → 6/6 on-topic (qservicesit, anisolutions, vorro, nirmitee, opexia,
  mindbowser). Best pain quote: "20 years of local customizations that no automated mapping tool
  handles reliably."
- **Buyer & budget:** integration/interface teams, CMIO-adjacent ops, payer data teams. Enterprise budget.
- **Incumbent / free check:** Vorro, Redox, Mirth/NextGen, Epic/Cerner-native toolchains; HL7 publishes
  free validators. Check the free-conformance-tool rule before scoring.
- **Funnel risk:** **Filter 3** (4-hour MVP) — the value is in someone's messy local Z-segment
  conventions, and sales are enterprise. Only viable if scoped to a self-serve deterministic subset
  (e.g. a single-message-type US Core mapping check a developer can run without a sales call).

## payments_iso20022
- **Trigger surface:** SWIFT CBPR+ / SR2026, HVPS+, national RTGS operators, bank client bulletins.
- **Dated triggers:** **2026-11-14** — structured/hybrid postal addresses mandatory, unstructured
  addresses rejected; MT101 retirement (`pain.001.001.09`, FINplus); camt.110/111 receive mandate.
- **Query shapes (measured 2026-09-20):** `ISO 20022 CBPR+ migration November 2026 bank payment field
  truncation reconciliation ops` → 6/6 on-topic (redcompasslabs, jpmorgan, trovata, codegotech,
  kyriba, PaymentLabs) — a live cutoff 8 weeks out with named rejection mechanics.
- **Buyer & budget:** treasury/payments ops and PSP implementation teams; corporates sending CBPR+
  traffic. Enterprise-adjacent but with a technical, self-serve sub-buyer (integration engineers).
- **Incumbent / free check:** Kyriba, Trovata, bank-side readiness services; SWIFT publishes free
  validation rules — check whether a free MX conformance checker already exists.
- **Funnel risk:** **Filter 1** — the deterministic core is real (address structurer + pre-flight
  validator that maps unstructured to hybrid `TwnNm`/`Ctry`), but avoid drifting into "another invoice
  document tool". Different buyer from the money/document cluster; that is the point.

## contract_risk_insurance
- **Trigger surface:** ACORD forms (25/27/125/126), contract insurance requirements, certificate
  holders, broker renewal calendars.
- **Dated triggers:** policy expiry/renewal dates, contract-mandated notice of cancellation, annual
  vendor compliance audits (recurring rather than legislative — see the "urgency is not only
  regulation" note in the recon SOP).
- **Query shapes (measured 2026-09-20):** `certificate of insurance ACORD 25 tracking compliance 2026
  manual broker renewal headache` → 6/6 on-topic (subdoc, vertikalrms, docutrax, vendoraccess, pins).
  Measured pain: ACORD 25 carries 40+ fields; 100 subs = 400+ renewals/yr at 15–20 h/week of chasing;
  transposed policy numbers surface at claim time.
- **Buyer & budget:** GC/property-manager compliance teams, vendor-risk managers, brokers. Mid-market
  budget, recurring.
- **Incumbent / free check:** SubDoc, Vertikal RMS, myCOI, Docutrax, PINS, Jones — a crowded paid
  field; no free deterministic validator found. Pricing friction is the lever, not novelty.
- **Funnel risk:** **Rule 1** — vision/OCR extraction is probabilistic and banned as a core. The
  deterministic path is a fixed-template field extractor (ACORD 25 is a standard layout) plus a
  rules engine comparing extracted limits against the contract's requirements. Scope to the
  requirements-match (the judgment layer everyone does by hand), not to "read any PDF".

## multifamily_ops
- **Trigger surface:** RUBS/submeter billing providers, utility AP, utility commission tariff sheets.
- **Dated triggers:** the monthly billing cycle and the reconcile-before-invoice deadline (utility
  provider bill → tenant allocations → statements out); annual tariff changes.
- **Query shapes (measured 2026-09-20):** `multifamily utility submeter bill audit resident billing
  errors 2026 property manager spreadsheet` → 5/5 on-topic (ustechautomations, amcobi, munibilling,
  billee, gozego). Named invariant: "confirm total tenant allocations equal the provider's billed
  total" — a `Σallocations == invoice.total` check, the same shape as LedgerLink's payout invariant.
- **Buyer & budget:** property managers, multifamily ops, utility expense-management teams; per-unit
  monthly economics.
- **Incumbent / free check:** billing services (Muni, Billee, AMCOBI) bundle reconciliation as
  service; the "free" alternative is a spreadsheet template someone is *selling* — a demand tell.
- **Funnel risk:** low. Fits the stack and the archetypes; watch data access (bills arrive as PDFs
  from many utilities) — scope to a pasted/uploaded bill set rather than an integration.

## k12_edtech
- **Trigger surface:** 1EdTech (OneRoster 1.2), Ed-Fi Alliance (Ed-Fi 5.x / ODS API), state education
  agencies, SIS vendors (PowerSchool, Infinite Campus, Skyward, Aeries).
- **Dated triggers:** the school-year roster onboarding window (Aug–Sep), state reporting submission
  deadlines, OneRoster version adoption.
- **Query shapes (measured 2026-09-20):** `Ed-Fi OneRoster student data reporting pain 2026 district
  SIS manual CSV state reporting` → 5/5 on-topic (ofashandfire, mhs, docs.ed-fi.org, 1edtech, MN DOE).
  Measured pain: timezone/date ambiguity in roster timestamps, district-by-district pipelines,
  onboarding tickets every August.
- **Buyer & budget:** edtech vendors onboarding districts; district IT. Small budgets, long cycles.
- **Incumbent / free check:** **free open-source incumbent** — the Ed-Fi OneRoster service (Node.js,
  serves OneRoster v1.2 from an Ed-Fi ODS) and Clever/ClassLink sync. This is the "free incumbent"
  drop rule.
- **Funnel risk:** already **FAIL** on the free-tool rule. Retire cheaply; do not re-scan without a
  new event (e.g. a deprecated OneRoster version with no free converter).

## real_estate_data
- **Trigger surface:** RESO (Web API, Data Dictionary), MLS/certification reports, NAR mandates.
- **Dated triggers:** MLS-level RETS feed hard cutoff dates (published per MLS), RESO certification
  deadlines.
- **Query shapes (measured 2026-09-20):** `RESO Web API MLS feed data normalization 2026 brokerage
  listing compliance manual workaround` → 5/5 on-topic (cdatalabs, nar.realtor, reso.org, curiosum).
- **Buyer & budget:** IDX/VOW vendors, brokerages, MLS operators. Small market, largely consolidated.
- **Incumbent / free check:** 75%+ of MLSs already migrated; normalization is sold by data
  aggregators (Constellation, OyeLabs).
- **Funnel risk:** **decayed signal** — the migration is mostly done, WTP is vendor-side. Park it
  unless a new standard (e.g. Universal Parcel Identifier pilot) creates a fresh dated gap.

## construction_field_ops
- **Trigger surface:** Procore / Autodesk Forma (ACC) changelogs, spec sections (CSI), submittal & RFI logs.
- **Dated triggers:** procurement lead times (42–60 weeks), submittal required-by dates, contract milestones.
- **Query shapes (measured 2026-09-20):** `Procore Autodesk Construction Cloud API change 2026
  subcontractor submittal log manual workaround` → signal high, but every top result is a *vendor*.
- **Buyer & budget:** GC project teams, PMs, spec/closeout coordinators.
- **Incumbent / free check:** **funded incumbent already shipped the deterministic slice** — Datagrid
  (a Procore company) agent, Autodesk AutoSpecs. Same failure class as the 2026-09-14 Shopify-UCP
  rejection.
- **Funnel risk:** **FAIL** on incumbent moat. Log and move on.

## manufacturing_shopfloor
- **Trigger surface:** MTConnect, OPC-UA, MES/SCADA vendors, ISA-95.
- **Dated triggers:** none reliable — the driver is continuous loss, not a date.
- **Query shapes (measured 2026-09-20):** `manufacturing MES OEE downtime data reconciliation 2026
  manual spreadsheet plant managers` → 5/5 on-topic (harmoni, anexee, caddis, sepasoft, excellerant).
  Measured pain: manual OEE undercounts (data latency, attribution ambiguity); plants at 40–65% OEE
  vs 85% world-class; unplanned downtime = 34.2% of losses.
- **Buyer & budget:** plant/production managers; strong budget.
- **Incumbent / free check:** MachineMetrics, Evocon, Sepasoft — mature category.
- **Funnel risk:** **Filter 2** — real value needs machine connectivity/edge hardware, which the stack
  rule forbids. A deterministic *paper-log-to-OEE* calculator is possible but sits behind incumbents
  and offers no hook.

---

# Editorial-derived packs

These verticals come from the editorial factory's registry (`context/vertical_coverage.md` carries the
generated inventory and the recon verdicts for all 26; sync with `node scripts/vertical-sync.mjs`).
They are the factory's **audience menu**: each one already has a persona, a source list, a cadence —
and vector C seed material, because most editorial verticals carry unit-economics/TCO angles in
`primary_angles` (16 of 26; e.g. "amr fleet payback period calculator", "expedited freight vs safety
stock calculator", "total landed cost tlc calculator"). Those angles are pre-framed decisions with a
named buyer — i.e. vector C with the discovery work half done. Probed entries carry real in-window
sources; `seed` entries are hypotheses to verify in the first scan (never cite a seed as evidence).

## warehouse_automation_robotics_capex
- **Trigger surface:** MHI/MMH automation studies, RaaS vendor pricing, labor-market and minimum-wage
  data, capital-depreciation rules (Section 179 / bonus depreciation), automation order-lead-time reporting.
- **Dated triggers:** **2026-12-31** placed-in-service deadline for the year's Section 179 /
  bonus-depreciation claim (2026: limit $2,560,000, phase-out $4,090,000, bonus 100%) — the order has
  to commit weeks earlier; **2027-01-01** wage floors step up (CA $16.90 → $17.40, +2.99%, announced
  2026-07-31) after the 2026 round lifted 19 states / 49 localities; the Sep–Oct peak-staffing
  commitment window (recruit 6–8 weeks ahead). Urgency is the buyer's own approval cycle, but these
  dates give it a calendar — score 65–75, not 30.
- **Query shapes (measured):** 2026-09-20 — `AMR fleet payback period calculator warehouse automation
  ROI 2026 labor turnover manual spreadsheet` → 5/5 on-topic (swiftflutter, zcnest, cxtms, reemanbot,
  hachidori). 2026-09-21 — `warehouse automation ROI calculator 2026 labor cost payback spreadsheet
  manual` and `vendor ROI calculator biased warehouse automation business case finance rejected 2026`
  → 8/8 on the pain (trymconsulting, monocleapp, logio, goasrs, rorixtech, thenetworkinstallers), while
  every top result on the *tool* query is a vendor's own calculator. Best pain phrasing:
  `"vendor's business case" OR "vendor ROI model" warehouse automation audit second opinion 2026`.
  Measured numbers: payback 8–24 months by facility type; warehouse turnover >60%/yr; integration
  $25k–$100k over 6–14 weeks (6–14 systems), maintenance 10–20% of equipment cost per year, facility
  network/power upgrades routinely absent from quotes; hardware is only 60–70% of project cost.
- **Buyer & budget:** warehouse/production ops leaders building a CFO case; capex sign-off budget.
  Secondary: supply-chain finance, and fractional logistics consultants auditing for clients.
- **Incumbent / free check (corrected 2026-09-21):** free **vendor** calculators are now the incumbent
  and are CFO-grade — ISD (free payback/IRR/NPV tool, launched 2026-07-10), Dexory (Forrester-TEI
  calculator), Kinexon (AMR/AGV fleet-size + ROI), KUKA (AMR fleet). **A generic "warehouse automation
  ROI calculator" fails the free-tool rule — do not propose one.** The unowned surface is the
  adversarial re-run (the vendor's own quoted numbers against the buyer's loaded labour, hidden
  integration/maintenance and tax year) plus multi-quote normalization; the paid substitutes are
  consultants or the integrator's "human walkthrough". Pricing friction ≈70, not 90.
- **Funnel risk:** low on filters 1–4. Real risks: scope creep (accept pasted/CSV line items only — no
  PDF/OCR extraction) and rule 5 (an unstated vendor cost line must report `unstated` and block a pass
  verdict, never be defaulted). Verified 2026-09-21 — see `context/recon_proposals/2026-09-21_caseproof.md`.

## meio_working_capital_tco
- **Trigger surface:** freight-rate indices (Freightos/BAI), carrier surcharge tables, CSCMP/Gartner
  working-capital research, S&OP literature.
- **Dated triggers:** peak-season surcharges (Oct–Dec), annual carrier GRI dates, quarterly S&OP cycles.
- **Query shapes (measured 2026-09-20):** `expedited freight vs safety stock calculator air freight
  surcharge 2026 spreadsheet planners` → 5/5 on-topic (calculatecbm, freightsurcharge, cargomath,
  umbrex, rinchem). Measured mechanics: chargeable weight = max(actual, volumetric), FSC 18–28% of base
  on transpacific lanes, rate ranges per lane, minimum-charge floors.
- **Buyer & budget:** supply-chain planners, inventory/working-capital owners; ops budget, recurring use.
- **Incumbent / free check:** **partial free incumbent** — rate/surcharge calculators are free and
  plentiful; what nobody gives away is the decision (expected stock-out cost vs expected expedited
  spend at a given service level). Confine the product to the decision layer.
- **Funnel risk:** Filter 1 — must stay a deterministic decision model, not a rate aggregator (rates go
  stale, and a stale rate is a fabricated number under rule 5).

## supplier_risk_reshoring_decision
- **Trigger surface:** customs/tariff schedules and escalations, USITC/Fed tariff trackers, nearshoring
  indices, DCSA/open trade-data tooling.
- **Dated triggers:** scheduled US tariff escalations (e.g. Chinese rates slated to step up by
  **2026-11**), annual contract renewals, sourcing-cycle reviews. Cross-check: the average effective US
  import tariff rate is 7.2% (2026) vs 2.4% (2024) — a re-quoting forcing function.
- **Query shapes (measured 2026-09-20):** `total landed cost calculator tariff 2026 spreadsheet
  importers manual sourcing decision` → 5/5 on-topic (firstlink, ustariffrates, passportglobal,
  goflow, supplychainbrain). SupplyChainBrain's own advice for mid-size firms: "not enterprise
  software but disciplined manual processes: a spreadsheet-based model with two or three scenarios".
- **Buyer & budget:** sourcing/procurement and ops leaders re-awarding contracts. Real budget.
- **Incumbent / free check:** free landed-cost calculators exist (they compute a quote, not a sourcing
  decision); the paid layer is enterprise trade-management software. Multi-scenario comparison is the
  unowned step.
- **Funnel risk:** overlaps the money/commerce cluster — treat as **adjacent, not new** (the buyer is
  sourcing, not finance). Requires ≥3 scenarios and a dated escalation to differentiate from the free
  calculators.

## enterprise_ai_finops
- **Trigger surface:** FinOps Foundation (State of FinOps), provider invoice/pricing exports (OpenAI,
  Bedrock), OpenTelemetry GenAI semantics, cloud cost-management vendors.
- **Dated triggers:** monthly close/chargeback cycle; pricing changes on provider invoice exports.
- **Query shapes (measured 2026-09-20):** `AI token cost attribution showback per business unit 2026
  finops manual chargeback spreadsheets` → 5/5 on-topic (mavvrik ×2, dev.to ×2, appscale). Measured:
  98% of FinOps respondents now manage AI spend (was 31% two years ago) and granular AI cost
  monitoring is the **top requested tooling capability**; a 7% attribution error on $60k/mo = $4.2k of
  recurring close disputes; below ~$2k/mo spreadsheets are accepted, so the buyer threshold is real.
- **Buyer & budget:** FinOps/platform leads; the reconciliation runs every close → recurring.
- **Incumbent / free check:** CloudZero, Vantage, Finout, Mavvrik, Apptio — enterprise-priced;
  attribution middleware is **explicitly out of scope** (see the 2026-09-14 rejection: Cloudflare
  Monetization Gateway / AWS WAF Monetize / Stripe MPP own *metering*).
- **Funnel risk:** read the 2026-09-14 rejection before scoring. The unclaimed slice is narrow and
  defensible: **provider invoice → internal tagged-usage ledger reconciliation** (the value is the
  variance report that survives an audit), not another gateway or dashboard.

## Stub packs — seed only (verify in the first scan)
| Vertical | Trigger surface | Seed query shape | Known blocker / check first |
|---|---|---|---|
| `control_tower_exception_orchestration` | control-tower vendor changelogs, IoC logistics press | `cost of late shipment model 2026 demurrage penalty labor downtime` | needs a dated trigger; platforms own visibility |
| `demand_sensing_advanced_sop` | Gartner supply-chain, forecasting journals | `forecast accuracy MAPE carrying cost calculator 2026 spreadsheet` | planning suites own the surface; check free tools |
| `last_mile_routing_fleet_carbon` | EPA SmartWay, fleet press, scope-3 reporting rules | `EV delivery van 7 year total cost of ownership calculator depot charging 2026` | carrier/telematics incumbents; consumer-adjacent WTP |
| `enterprise_build_vs_buy` | Thoughtworks Radar, HN/Gartner cloud reports | `internal tooling maintenance cost calculator loaded salary 2026` | thin public tooling — verify no free internal-TCO calculator |
| `resilient_home_assets` | IBHS, insurance commissioners, NOAA | `home insurance insurability roof age premium penalty 2026` | prosumer WTP; only worth a scan on an active insurability event |
| `workstation_compute_economics` | Tom's Hardware, Puget benchmarks, local-LLM forums | `local llm workstation vs cloud api cost break-even 2026` | individual-engineer buyer (WTP weight low) |
| `home_infrastructure_lifecycle_tco` | Energy Star, NREL PVWatts, HVAC trade press | `10 year home capex roadmap hvac heat pump break-even 2026` | free calculators already cover payback math |
| `home_equity_tco` | JCHS/NAR reports, energy-star, TOU tariffs | `heloc vs cash remodel capital allocation 2026 calculator` | prosumer WTP; no dated driver most weeks |
| `home_ops_execution` | ICC codes, contractor-license boards, state AG/mechanic-lien rules | `mechanics lien waiver deadline by state 2026 contractor` | jurisdiction-by-jurisdiction determinism is fine; buyer is a homeowner |
| `legal_ops` | court e-filing portals, state bar bulletins, rule amendments | `court e-filing format rejection deadline calculation 2026 paralegal manual` | check free court-provided validators first |
| `energy_interval_data` | utility tariffs, Green Button Connect, PUC filings | `Green Button interval data demand charge audit 2026 spreadsheet` | data access per utility; sequence after the capex family |
| `food_service_ops` | distributor price lists, franchise compliance packs, health-department rules | `restaurant invoice price variance food cost audit 2026 manual` | thin margins, low per-seat WTP — check before scoring |
| `media_production_qc` | broadcaster/platform delivery specs (AS-11, IMF, Netflix/Amazon specs) | `delivery spec QC captions timestamps rejected 2026 post house` | deterministic and dated (spec versions) — genuinely new territory |
| `trades_service_ops` | ServiceTitan/Housecall Pro changelogs, warranty rules, permit portals | `work order invoice warranty claim reconciliation 2026 trades` | check incumbent field-service suites |
| `public_sector_grants` | grants.gov, state grant portals, uniform guidance | `grant reporting format rejection deadline 2026 manual reconcile` | procurement cycles; deterministic rules are published — verify incumbents |
| `agriculture_eudr` | EUDR, GPS/geolocation tooling, importer guidance | `EUDR due diligence statement geolocation upload supplier 2026 manual` | dated mandate (strong urgency); check trade-compliance incumbents |

## Adding a pack
New verticals open by adding a pack here (same six lines) and a row in `context/vertical_coverage.md`.
Unverified verticals start `never` in the ledger; a vertical that produces no ≥60 candidate twice, or
fails a filter for a structural reason (hardware, enterprise-only sales, free incumbent), is recorded
as retired with the reason — a cheap, honest "no" is a result, not a failure.
