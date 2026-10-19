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

## healthcare_rcm
- **Trigger surface:** X12 835 (005010X221A1) / 837 / 277, CARC/RARC code lists, CMS
  administrative-simplification rules, CAQH CORE operating rules, payer provider manuals,
  clearinghouse changelogs.
- **Dated triggers:** the payer contract-renewal cycle turning on **1 January**; **2027-01-01**
  CY2027 Medicare PFS effective date (conversion factor proposed **−1.19%** to $33.17 qualifying /
  **−1.69%** to $32.84 non-qualifying as the one-year **+2.50%** bump expires; same-day E/M billed
  with a global-period service to pay 50% each); CMS-0057-F payer prior-auth metrics first due
  **2026-03-31**; payer claim-filing (90–365 days) and appeal (60–180 days) windows, payer- and
  state-specific. **Vector A is empty here:** the 835 has no version churn (CMS adopted-standards
  table keeps 835 at Version 5010; the 2026-03-24 claims-attachments final rule adopts X12 6020 for
  275/277 only) — do not search for an 835 migration.
- **Query shapes that returned in-window (measured 2026-09-28):**
  `835 remittance ERA denial reconciliation small practice manual posting 2026` → 6/6 on-topic, but
  5/6 are vendors selling the fix; `payer underpayment audit contract variance medical practice
  spreadsheet 2026 revenue cycle` → 6/6, all sellers; `appeal filing deadline calculator payer
  timely filing limit free tool 2026` → 6/6 incl. two free calculators; `payer underpayment recovery
  software pricing per month contract management small practice 2026` → 6/6 incl. published prices.
  **Screening rule this vertical teaches:** on a vertical whose suppliers publish heavily, only
  *non-seller* sources may count toward the repeat-intent weight — otherwise service-vendor content
  marketing manufactures the score.
- **Buyer & budget:** billing/practice manager at 3–15 provider practices and third-party billing
  companies. Real money at risk ($30K–$150K/yr per small practice; $46K/provider/yr recovered per a
  2024 MGMA survey) but the self-serve price band is already occupied free or at $5/letter.
- **Incumbent / free check (measured 2026-09-28):** **free** — AMA Claims Workflow Assistant (ERA
  code combinations + member appeal templates), Healthcare Data Insight free EDI viewer (25 KB /
  3 claims), eMedcoders free in-browser 835 parser, Stedi free validator tier, `pyx12`,
  `era_835_parser` gem, free timely-filing calculators (legitmedbilling, nextrcm), free appeal-letter
  generators; **cheap self-serve** — EZAppeal $5/appeal letter with a BAA; **paid, sales-led** —
  Waystar Revenue Capture, MD Clarity RevFind / PayerMonitor ($500/mo/team; enterprise CLMs
  $30K–$200K+ first year), Rivet Health, Vera Signals, DataRovers Denials 360; plus the PM/EHR's own
  fee-schedule and contract-variance reporting (athenahealth reporting packs).
- **Funnel risk:** **Filter 1** — the value is the appeals chase (MD Clarity, Revecore, Advantum,
  StafGo, Sirius all sell people pursuing the variance), which rule 1 forbids; and the Stage 0
  **channel rule** — no editorial vertical and no owned audience for a medical-billing buyer. Retired
  2026-09-28; re-open only on a *dated* payer/provider mandate reaching practices, never for
  underpayment detection.

---

## energy_interval_data
- **Trigger surface:** filed utility rate schedules and their riders, state PUC tariff filings, Green Button (ESPI/NAESB) exports, utility bill-audit practice literature.
- **Dated triggers:** annual tariff changes (1 Jan / 1 Jul effective dates on supplier pass-throughs), rate-case restructures — **2026**: PG&E/SDG&E commercial EV rates replaced per-kW demand charges with reserved capacity + overage penalties, SCE commercial EV demand charges return **1 Jan 2030** — and the ratchet's own clock: a summer peak sets a **11–12 month** billing floor, so the decision window closes at the peak, not at a deadline.
- **Query shapes that returned in-window (measured 2026-10-19):** `Green Button interval data demand charge audit 2026 spreadsheet` → on-topic but tool-vendor shaped (EnergyCAP, Energy Toolbase, Green Button Alliance, DOE); `utility bill demand charge ratchet audit commercial building 2026 manual spreadsheet` → 6/6 on the pain (Elexity, Envigilance, DemandQ, Tactical Energy Group, Energy Toolbase, a YouTube explainer); `"ratchet" demand charge audit tool "interval data" automatically compute billed demand 11 months lookback software` → mechanics + a regulation-grade spec (UtilityBilling.org invariants) and one bill-audit practitioner thread, no self-serve audit product; `utility bill audit ratchet error overcharge refund energy manager finds ratchet mistake 2026` → the contingency-fee audit industry (OEO, Energy Professionals, Inertia, AAUBA: $200–$2,000/month typical ratchet miscalculation).
- **Buyer & budget:** facilities/energy manager at a multi-site commercial portfolio ($100k+/yr electric spend is the audit firms' own qualifier); secondary: independent utility-bill auditors/ESCOs who run audits for clients. Real budget, recurring (the ratchet re-prices monthly).
- **Incumbent / free check (measured 2026-10-19):** *free* — Commercial Energy Advisors' demand-charge calculator with a ratchet floor (one month, hand-typed peak and floor; no file, no history), phantomgrid.io's free interval analyzer + demand-charge reconcile (one ComEd Green Button export, one meter, no lookback), EnergyCAP's free annual cost estimate; *paid, portfolio-priced* — EnergyCAP, DemandQ, Enviglance, Energy Toolbase; *service* — utility-bill audit firms on contingency (the human chase rule 1 forbids). **The unowned slice is the multi-month, multi-meter reconstruction of billed demand plus the carry-over cost of the interval that set the floor** — not "a demand charge calculator".
- **Funnel risk:** Filter 2 data access (interval exports arrive per utility, sometimes by request — scope to uploaded files, never an integration) and **the channel rule** (no editorial vertical, no owned audience for a facilities buyer). Rule 5: an unreadable tariff clause must surface `unstated` and block the month's verdict, never default to 0%. First scan 2026-10-19 → **RatchetProof**, class LLM/parse-backed, $1.50/call vs modelled ≈$0.30; record `context/recon_proposals/2026-10-19_ratchetproof.md`.

## food_service_ops
- **Trigger surface:** distributor price files and contract terms (Sysco/US Foods/PFG and regional houses), franchise compliance packs, health-department and invoice-format rules; operator trade press (National Restaurant Association State of the Industry).
- **Dated triggers:** distributor contract-renewal and annual pricing-review windows; food-cost shocks (NRA 2026: food **34% above pre-pandemic**; USMCA review in 2026); no legislative cut-off — urgency is the operator's margin, not a date.
- **Query shapes that returned in-window (measured 2026-10-19):** `restaurant invoice price variance food cost audit 2026 manual spreadsheet` → 5/5 on-topic but every source sells the fix (MarginEdge-adjacent blogs, Jelly, ImageToTable, Prostay); `food distributor price increase restaurant operator invoice audit 2026` → NRA, CBIZ, FEDA (34% above pre-pandemic; 90%+ of operators cite food/labour/insurance/energy as pressures); `free restaurant invoice price variance checker contracted price vs invoice audit tool 2026` → the decisive pass: MarginEdge and MarketMan are described by their own comparison guides as flagging price variance "against historical invoice data and expected contract pricing", at $300–350 and $199–249 per location per month, with cheap extraction tools at $9–40/mo.
- **Buyer & budget:** owner/operator of 1–20 units. Thin: a single location's software budget is $0–50/mo pre-revenue and $200–400/mo once stable — which is the incumbent's price.
- **Incumbent / free check (measured 2026-10-19):** MarginEdge, MarketMan, xtraCHEF (Toast), Restaurant365, CrunchTime, Karu, Ottimate — all do contract-to-invoice price variance; free/cheap extraction (ImageToTable free tier, Jelly/other price-alert tools) plus free food-cost calculators cover the operator who would not buy the paid layer.
- **Funnel risk:** the incumbent owns the exact proposed shape at the buyer's existing price; WTP weight is low. **First scan 2026-10-19 — candidate scored 64 and was dropped at the incumbent filter, vertical retired** (record `context/recon_proposals/2026-10-19_ratchetproof.md` §6). Re-open only on a dated trigger that resets distributor pricing floors, with a channel attached.

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
- **First scan (measured 2026-10-05) — candidate dropped:** `multi-scenario tariff adjusted landed cost
  comparison tool 2026 free spreadsheet decision` and `US tariff escalation November 2026 importers
  re-quote sourcing` confirmed the pain (SupplyChainBrain, Thomson Reuters, Allianz, AAF, goflow/
  Tax Foundation, gingercontrol) and the dated trigger — but the **free-incumbent check killed it**:
  free origin-scenario simulators already weigh sourcing options (tariffstool scenario simulator,
  CargoTrans "$0", Gateway Lines free AI calculator refreshed within 24–48h, ustariffrates, paidnice,
  FreightFigures). A factory engine additionally needs a live duty-rate feed it cannot maintain in
  ≤4h, and a stale rate table is a fabricated number (rule 5) — the engine degrades into the free
  simulators. **Do not propose a landed-cost calculator here.** Re-open only for a *neutral buyer-side*
  case (re-run a supplier's quoted landed cost against the buyer's own basis) on a dated escalation.
  Dated triggers confirmed: §301 exclusions to **2026-11-10**; Chinese-rate escalation **to 44% by
  Nov 2026**; 12.5% forced-labor duty since **2026-07-24**.

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
- **First scan (measured 2026-10-05) — candidate found:** `AI token cost attribution showback business
  unit 2026 finops manual chargeback` and `reconcile OpenAI invoice against usage logs free 2026`
  returned the pain from **non-seller** sources (FinOps Foundation *State of Tokenomics* Sept 2026;
  *State of FinOps 2026* — 98% manage AI spend, granular monitoring the #1 requested capability;
  tianpan.co; dev.to; Spendline's *AI Month Close*). Confirmed: free tools **log usage** (provider
  dashboards, Costs API, Helicone/Langfuse) but do **not** reconcile the invoice; the paid layer is
  sales-led enterprise. The self-serve **invoice ↔ tagged-usage variance report** is the unowned slice
  → **SpendProof** proposed, class **LLM/parse-backed**, $1.50/call vs measured ≈$0.14 (clears 3×).
  Record: `context/recon_proposals/2026-10-05_spendproof.md`.

## legal_ops
- **Trigger surface:** court e-filing portals and their return-for-correction lists, state bar bulletins,
  procedural rule amendments (uscourts.gov pending-amendments table), local-rule standing orders.
- **Dated triggers:** federal rules take effect **1 December** each year (the 2026 package: Appellate
  Form 4, Bankruptcy Rules 1007/3018/5009/9006/9014/9017 + new Rule 7043, Evidence Rule 801; the
  civil-rules package — 7.1, 26, 41, 45, 81 — is **1 December 2027**); state rule amendments and
  e-filing format mandates land with their own effective dates.
- **Query shapes (measured 2026-10-12):** `court e-filing rejected document formatting deadline
  calculation paralegal 2026` (on-topic but vendor-heavy: EFSP and filing-service blogs); `free FRCP
  6(a) deadline calculator court rules date computation` (free-tool results, not pain); `missed deadline
  malpractice claim law firm calendaring error statistics 2026` (attorney-assistant, CARET, TLIE,
  Attorney at Work — malpractice share ~28–33%, but most publishers sell the fix).
- **Buyer & budget:** solo/small-firm attorney, paralegal or legal-ops lead; real recurring budget
  ($50–$100+/user/mo at the rules-based layer), but the buyer with money has usually already bought.
- **Incumbent / free check:** *free* — `deadlinecalculator.com` (free since 2007), LawToolBox free
  calculator, a free FRCP 6 calculator with holiday logic, a free court-date calculator with the 11
  federal holidays, Esquire Deposition's free filing-date calculator; **veraPDF** is free and
  open-source PDF/A validation, and the e-filing portals ship their own auto-redaction and
  sensitive-data designation. *Paid* — LawToolBox, CompuLaw/ALN (2,500+ jurisdictions, in-house
  attorney rules team), CalendarRules/Clio, DocketCalendar, MatterAlert.
- **Funnel risk:** Filters 1 + 3 + the channel rule. A rules-based deadline engine needs a maintained
  per-jurisdiction ruleset; a stale rule is a **wrong deadline** — the highest-consequence fabricated
  number (rule 5) — and no editorial vertical exists for this buyer, so there is no owned channel.
- **First scan (measured 2026-10-12) — nothing scored ≥60, no build:** two candidates, a rules-based
  deadline ledger (53: repeat 80 / friction 25 / WTP 65 / urgency 30) and a filing pre-flight (46).
  Both die below the Stage-3 threshold and structurally at the free-incumbent rule, and there is no
  in-window dated trigger (the December 2026 package is not a computation-of-time change). Re-open only
  against a dated court-rule or filing-format change **with a channel attached**.

## agriculture_eudr
- **Trigger surface:** Regulation (EU) 2023/1115 (EUDR) as amended by Regulation (EU) 2025/2650 and the
  Annex I delegated acts; the EU Information System (TRACES) user guide and API validation rules; the
  Commission's EUDR FAQ and guidance; national competent-authority guidance.
- **Dated triggers:** **30 December 2026** — application for large and medium operators and traders, and
  for micro/small operators already covered by the EU Timber Regulation; **30 June 2027** — micro and
  small operators, non-timber; **18 September 2026** — Delegated Regulation (EU) 2026/2102 in force
  (Annex I amended in 64 places: 41 replaced, 18 inserted, 5 deleted), with some added CN codes
  regulated only from **30 December 2027**.
- **Query shapes (measured 2026-10-12):** `EUDR due diligence statement geolocation upload supplier
  rejection 2026` → 6/6 on-topic; `EUDR geolocation polygon file validation free tool pre-check
  rejected error` → surfaced both the free validators and the paid platforms in one pass (the
  free-incumbent check); `EUDR overlapping polygons duplicate plots double counting volume vs area` →
  the portfolio-invariant pain from platform and practitioner sources; `EUDR penalties fines percentage
  turnover 2026` → the 4%-of-EU-turnover floor, confiscation and market bans, from six independent
  sources.
- **Buyer & budget:** the EU operator/first placer (importer, EU producer or exporter) — compliance or
  procurement lead filing the statement; real budget, and a 4%-of-EU-turnover exposure behind it.
  Downstream operators and traders do **not** file a statement, so they are not the buyer.
- **Incumbent / free check:** *free* — Silvatrace free GeoJSON validator (single-file technical
  conformance to the v1.5 spec: JSON, WGS84, geometry types, coordinate order, closed rings,
  self-intersection, holes, 25 MB — it computes no area, so it cannot check the four-hectare rule, and
  it compares nothing across files); Trusty free obligations checker; EUDR Navigator free scope
  assessment, country-risk list and supplier templates; TraceX free single-product scope tool.
  *Paid, sales-led* — osapiens, Coolset, ESF:ONE, LiveEO, TraceX, Trusty EUDR Passport (from €90 per
  product profile per year, €290–€490/yr when risks are flagged), Polygon One, eudr.io.
  **The free tools each own one single-item check; the unowned slice is the buyer-side audit across a
  whole supplier submission set** (overlap/duplication between suppliers, declared-vs-computed area,
  yield plausibility vs the operator's own yield figure) plus the fix-request pack.
- **Funnel risk:** Filter 3 — geometry and scope arithmetic is pure TypeScript (spherical-excess area,
  pairwise polygon intersection with a bounding-box prefilter), but the vendored Annex I table must be
  version-stamped with its date and must surface `unverifiable` (never a guess) for codes whose status
  the 2026 act changed. Country-boundary containment and satellite forest-cover screening are **out of
  the 4-hour cap** — do not scope them in.
- **First scan (measured 2026-10-12) — candidate found:** **CanopyProof** proposed, class
  **LLM/parse-backed**, $1.50/call vs a measured ≈$0.18 (clears 3×). Score 79 (repeat 90 / friction 45
  / WTP 85 / urgency 100). The 45 is deliberate and load-bearing: a free single-file validator exists,
  so the product is the portfolio audit, never "a validator". Record:
  `context/recon_proposals/2026-10-12_canopyproof.md`.

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
| `energy_interval_data` | ✅ pack (2026-10-19) — scanned, see pack | `Green Button interval data demand charge audit 2026 spreadsheet` | RatchetProof at owner gate; channel rule is the open risk |
| `food_service_ops` | ✅ pack (2026-10-19) — scanned, **retired** | `restaurant invoice price variance food cost audit 2026 manual` | Incumbent (MarginEdge/MarketMan) owns the price-variance slice at the buyer's price |
| `media_production_qc` | broadcaster/platform delivery specs (AS-11, IMF, Netflix/Amazon specs) | `delivery spec QC captions timestamps rejected 2026 post house` | deterministic and dated (spec versions) — genuinely new territory |
| `trades_service_ops` | ServiceTitan/Housecall Pro changelogs, warranty rules, permit portals | `work order invoice warranty claim reconciliation 2026 trades` | check incumbent field-service suites |
| `public_sector_grants` | grants.gov, state grant portals, uniform guidance | `grant reporting format rejection deadline 2026 manual reconcile` | procurement cycles; deterministic rules are published — verify incumbents |

## Adding a pack
New verticals open by adding a pack here (same six lines) and a row in `context/vertical_coverage.md`.
Unverified verticals start `never` in the ledger; a vertical that produces no ≥60 candidate twice, or
fails a filter for a structural reason (hardware, enterprise-only sales, free incumbent), is recorded
as retired with the reason — a cheap, honest "no" is a result, not a failure.

## Resolved edge-case — a live registry row that exists only in a working tree (2026-10-18)
`npm run verticals:check` compares this repo's vendored `context/editorial_verticals.json` against the
live `/root/editorial-factory/context/verticals.json`. When the live file carries an entry that is
**uncommitted**, the guard exits 1 (`N live vs M vendored`) and — because `scripts/verify-build.sh`
runs under `set -e` — every step after it (tests, build, browser suite, visual review) is skipped, so
one uncommitted row in a sibling repo reads as a total build failure.

Do **not** clear it with `--vendor`. The vendored provenance records the live file's last **committed**
blob hash; vendoring an uncommitted row writes a commit id that does not contain that row, so the
coverage ledger then claims a topic no commit supports (the same lesson as the 2026-10-18 entry in
`self_improvement_eval.md`). Keep the guard red, verify the row is genuinely uncommitted
(`git -C /root/editorial-factory status --short context/verticals.json`), and escalate the vertical as
one owner decision — finish it or drop it. Vendor only after the editorial entry is committed, and
check the destination row exists in `vertical_sites` and a cron job exists before calling it live.
