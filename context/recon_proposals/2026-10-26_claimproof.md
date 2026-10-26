# Proposal: ClaimProof — the warranty-claim short-payment audit

**Date Discovered:** 2026-10-26
**Verticals (this sweep):** `VERTICAL_A` = `media_production_qc` (scanned, **no build** — see §6) · `VERTICAL_B` = `trades_service_ops` (produced this candidate)
**Signal Vector:** B (operational/document pain: a filed claim paid less than the schedule allows) + C (billable-quantity decision: allowed hours vs paid hours)
**Signal Intensity Score:** **79 / 100** — repeat intent 80 / incumbent pricing friction 75 / willingness-to-pay 90 / urgency 70
**Target Persona:** Owner or service manager of a commercial refrigeration / HVAC shop (5–40 techs) that files manufacturer warranty claims and holds a labour-paying OEM schedule; secondary buyer: the extended-labour-plan administrator's contractor network.

---

## 1. The Bottleneck & Market Context

- **Current state.** Where a manufacturer pays labour on warranty, it pays against its **own published payment schedule**: an allowed time per repair code, a published hourly rate, per-claim caps on reclaim/nitrogen/materials, and arithmetic rules ("multiple repairs paid at the highest rate for the part changed, plus 1 hour for each additional component" — True Manufacturing's own labor-claim form). The shop files a claim; the OEM pays what *it* computes; the remittance arrives as an amount, not a line-by-line reconciliation. Nobody at the shop re-derives the schedule against the payment, so an underpayment looks like a smaller cheque, not a defect.
- **What the failure costs.** Measured, in-window: the average HVAC shop leaves **$8,000–$25,000 per truck per year** in unfiled, mis-coded or denied manufacturer claims; labour is paid at **$75–$185/hour** at the published flat-rate guide and is "the line item most shops underbill by **30–50%**"; claims filed later than 14 days are denied more often, and denied claims pushed back with serial number, install date and a documented failure code recover **40–60%** of the time (PipelineOn, 2026 guide — vendor content, so treat its rates as the seller's own numbers). The payer side already does this arithmetic **against** the contractor: "the administrator compares the invoice with authorized parts and labour, resolves any discrepancy" (WarrantyHub, 2026-09-28). The contractor side is the mirror image nobody runs.
- **Validation intensity.** Five independent 2026 sources name the same leak taxonomy — late registration, incomplete documentation, unsubmitted claims, and short-paid/denied lines (ClaimLane 2026; WarrantyHub 2026-09-28; ServiceBusinessAcademy 2026 vendor pricing verified 2026-06-10 → 2026-07-06; USTechAutomations 2026; PipelineOn 2026). Three of the five sell the fix, so the repeat-intent reading is discounted (80, not 100).
- **Why now (urgent, not evergreen).** Three dated mechanics, not a regulation: (a) the **filing clock** — claims go stale fast (the 14-day mark is where denials cluster), so an audit that runs monthly recovers what a year-end review cannot; (b) the **registration window** — 60 days at Goodman/Lennox/Trane/Daikin, 90 at Carrier/Rheem, and an unregistered unit's parts warranty drops from 10 years to 5 (NobleAdminNetwork read the published terms of 7 OEMs on **2026-09-27**); (c) **2026's schedule revisions** — OEMs revise payment schedules and caps on their own cycle, so last year's allowed hours are not this year's.
- **Scoping fact that decides the shape (measured, load-bearing).** Most **residential** OEM warranties pay **parts only**: Trane states labour is not covered under base or registered warranty, Mitsubishi's statement reads "NO LABOR", and only Carrier and Lennox carry a 3-year labour option tied to registration (NobleAdminNetwork, 2026-09-27). So "audit the labour payment" is only a real job where a labour-paying schedule exists — commercial refrigeration, commercial HVAC, and contractor extended-labour plans. **The MVP is scoped to schedules it can vendor and version-stamp; it must not claim residential labour recovery that the warranty terms exclude.**

## 2. Architecture & Technical Blueprint

- **Engine type:** document-parse extraction **in front of** a deterministic schedule engine (`context/tech_stack_capabilities.md` §2). The model reads fields; **no number the product reports comes from the model.**
- **Deterministic core (`src/lib/calc/claimproof/`):**
  - `allowanceFor(claim, schedule)` — base allowed hours for the repair code, plus the schedule's multiple-repair rule (highest-rate code first, then each additional component's incremental allowance), plus travel hours where the schedule pays them. A repair code absent from the **version-stamped** table is `unstated` — it blocks that line's verdict (rule 5), never defaults to zero.
  - `expectedPayment(claim, schedule)` = allowed hours × the schedule's published hourly rate + parts at the schedule's basis (distributor cost) + permitted fees, each **capped** by the schedule's own maxima (reclaim, nitrogen, miscellaneous materials). A fee over its cap is reported at the cap with the excess named, not silently dropped.
  - `variance(paid, expected)` per line and per batch → `underpaid | correctly-paid | overpaid | unverifiable`, with the schedule version and the page the rule came from attached to every line. Invariant: `Σ(line variances) == batch variance`, enforced in the engine and pinned by a test vector.
  - Fixed-point money arithmetic throughout; no floats in a reported dollar figure.
- **Extraction (LLM/parse):** the OEM remittance / payment-advice PDF and the filed claim form → claim id, model, serial, install date, repair code(s), hours claimed, hours paid, parts amount, fees and caps applied. Every field carries provenance (page + verbatim quote). A field the parser cannot read is `unstated`, which blocks that line — never a guess, and the count of blocked lines is reported on the face of the report (rule 5).
- **Inputs → outputs:** one or more remittance PDFs (+ optionally the shop's own claim export) + the vendored schedule → a per-claim variance table, the recoverable total at the schedule's rates, a per-line "what was short and why" note, and a portable PDF/CSV finding set the shop can attach to a resubmission. A claim whose schedule is not vendored is refused with the schedule named, not estimated.
- **Interfaces:** `src/app/claimproof/` (Editorial Signature UI: upload → schedule pick → finding set), `POST /api/claimproof/audit`, WebMCP tool `audit_warranty_remittance`.

## 3. Dual-Pronged Monetization

- **Web tier (Stripe):** **$9** one-off batch audit (up to 50 claim lines, export included) · **$29/mo** rolling audit (each month's remittances re-derived against the standing schedule, plus the 14-day clock on every open claim).
- **Agentic tier (WebMCP / metered API):** **$1.50/call.**
- **Tool class: LLM / document-parse-backed** → band **$0.50–$3.00/call**; the rate must clear **3× measured per-call cost** (`context/company_goals.md`).
  **Modelled per-call cost ≈ $0.22** — remittance PDF ~4 pages × $0.003 = $0.012; declared-field extraction ~6k in / 700 out ≈ $0.01–0.02; schedule-table extraction amortised over every call against the same vendored version ≈ $0.001; ×1.5 retry factor. **$1.50 clears 3× with ~6.8× headroom.** The first live remittance is the measurement run: re-cost before the tool is registered, and if measured cost exceeds $0.50 the rate is wrong, not the class.
  `usesLlmPrimitive: true` at build time; `src/products/pricing.test.ts` holds the band.

## 4. Free-incumbent check (the rule that decides these)

- **Free, and it owns the shape:** every OEM publishes the claim form and its payment schedule as a free PDF (True Manufacturing's labour-claim form is the worked example: allowance table, caps, multiple-repair rule, travel rule all on two pages). Free is enough to *file* a claim correctly; it is not an audit, because the form is a form, not a reconciliation over the shop's own paid claims.
- **Paid, and it owns a different job:** the field-service suites track warranty work and equipment serials (QuoteIQ $29.99–$699/mo, ServiceTitan $245+/tech/mo, BuildOps, Jobber/Housecall Pro; CompanyCam $99–$167/mo as the photo add-on — ServiceBusinessAcademy 2026 pricing verified in-window); WarrantyHub and ClaimLane are **administrator-side** claim platforms (coverage verification, dispatch, parts authorisation, payment); Rocky Solutions is a **human** claims-administration service at $900/mo for 20 claims → $2,900 for 100, with denied and out-of-window claims worked on **20% contingency** (`rockysolutionsllc.com`, 2026 pricing page). The unowned slice is the contractor-side **arithmetic**: re-derive the schedule against the payment, per claim, without a human and without a retainer.
- **Rule-1 check (this is the one that could kill it):** the recovery *last mile* — arguing with an OEM rep — is a human service and is **out of scope**. ClaimProof stops at a verifiable finding set (line, rule, page, dollars) and a resubmission packet. It sells the finding, never the chase.
- **Rule-5 check:** the schedule is a maintained feed. Mitigation is structural: schedules are vendored per OEM with a version stamp and an effective date; a code outside the vendored version is `unstated` and blocks the line; a schedule older than its stated revision date is reported as stale on the face of the report. A stale table can therefore *refuse* a claim, never invent one.

## 5. Funnel

| Filter | Verdict |
|---|---|
| 1. Solution archetype | ✅ (e) LLM/document-parse extraction in front of a deterministic engine. No reported number comes from the model. |
| 2. Stack feasibility | ✅ pure TypeScript arithmetic + LLM/LlamaParse extraction; no media, no hardware, no GPU. |
| 3. ≤ 4-hour build | ✅ 3–5 vendored schedules, one engine with test vectors, one page, one WebMCP tool. Extraction reuses the SpendProof declared-field path. |
| 4. Dual interface | ✅ visual finding set + `POST /api/claimproof/audit` + `audit_warranty_remittance`. |

- **Channel rule — the weakest link, named rather than papered over.** There is **no editorial vertical** for trade contractors in the registry (the nearest owned surfaces, `home_ops_execution` and `property_loss_insurance_mitigation`, both sell to the **homeowner**, not to the shop). So this candidate has no owned audience: distribution would be search ("warranty claim short paid", "labor allowance schedule", "<OEM> warranty reimbursement"), the trade communities the factory cannot currently post into, and the metered agent endpoint. This is the same structural gap RatchetProof carries, and it is the reason the ask is a decision, not an instruction.

## 6. VERTICAL_A — `media_production_qc`: scanned, no build

- **The pain is real and quantified.** Timed-text delivery to a platform is a spec-conformance job: reading rate (Netflix caps ~17–20 characters per second; ~13 for children's), 42-character lines, 2-line events, 5/6-second minimum and 7-second maximum duration, a two-frame gap between events, and TTML/IMSC structural rules — and **60% of subtitle rejections come from character/line limits**, not translation (Gotham Lab, 2026-08-28). Redeliveries are paid at a published rate card: $60 (30 min) / $120 (60 min) / $180 (feature) per timed-text asset, and "compensation covers all rounds of redeliveries" (Netflix Preferred Fulfillment Partner conditions) — the vendor eats them.
- **Why it still does not get a build slot: the tool surface is owned at both ends.**
  - *Free*: Subtitle Edit (open source, reading-speed colour coding, 300+ formats, saveable broadcast/streaming rule profiles); `captionspec.com` free SRT-vs-Netflix checker; SubtitleWise, GoLocalise, Valmera, VoiceDeck, Induwara — free single-file CPS/CPL checkers, several published in-window.
  - *Paid*: EZTitles, OOONA, CaptionHub (professional rule-based QC); Closed Caption Converter (conforms frame rates, reflows text to target limits, validates output against a configurable style guide, and exposes an API); `ttconv` as an open-source format/conversion CLI.
  - The one layer with no cheap owner — a multi-destination *delivery-set* audit (one master, N platform profiles, signed per-destination conformance report) — is what the paid delivery suites already sell to exactly these buyers, at exactly these buyers' price point.
- **Score: 68 / 100** (repeat 90 / pricing friction 25 / WTP 85 / urgency 65). Passes the ≥60 bar and dies at the **free-incumbent rule** plus a paid layer that already ships conform + validate + API. **Runner-up:** a re-timing engine (frame-rate drift 23.976 ↔ 25 ↔ 29.97 and re-cut conform) — also already inside every subtitle editor.
- **Re-open trigger (dated, not vague):** a platform publishes a new timed-text spec version that the free checkers leave unaddressed for more than 30 days, **or** a buyer requires a signed per-delivery conformance report that the free tools cannot produce. Absent that, this vertical is retired cheaply, which is a result.

## 7. Build Notes (if approved)

- Route `src/app/claimproof/`; registry entry in `src/products/registry.ts` (`usesLlmPrimitive: true`, status `beta` at launch); telemetry `track(..., "claimproof")`.
- Vendored schedules live in `src/lib/calc/claimproof/schedules/<oem>@<version>.ts` with `effectiveFrom` + source URL + the page each rule came from; a test asserts every vendored code resolves and that an unknown code returns `unstated`.
- Gate: `scripts/verify-build.sh` must pass before push (tsc → lint → tokens → vitest → build → Playwright → visual QA).
- Cold start: the first schedule set is commercial refrigeration (True Manufacturing's published form is the fixture — real caps, real multiple-repair rule); residential OEMs that pay parts only are **not** in scope until a labour-paying schedule is vendored for them.
