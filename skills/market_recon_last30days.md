---
name: market-recon-last30days
description: "Use when running the weekly 30-day autonomous discovery sweep across platform churn, data-transform pain, API bridges, and MCP gaps."
version: 2.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Autonomous Market Reconnaissance Engine

## 1. Objective & Behavioral Intent
Execute an autonomous, signal-driven intelligence sweep across developer communities, SaaS
ecosystems, operational forums, and platform change logs published within the **last 30 calendar
days**. Identify high-friction B2B/prosumer bottlenecks, tool deprecations, integration
dead-zones, and deterministic transformation workflows solvable via modular micro-software or
WebMCP/API endpoints.

The sweep is **not** limited to tax/compliance calculators. It hunts four opportunity classes:

1. **Deterministic engines / calculators** — unit economics, benchmarks, audits, estimators.
2. **Format transpilers / parsers** — EDI→JSON, PDF→JSON, Figma tokens→Tailwind, CSV/JSON/XML mismatches.
3. **Stateful micro-bridges** — two APIs that refuse to talk; brittle Zapier/Make workarounds.
4. **Headless asset generators** — dynamic OG images, branded invoices, barcode/QR payloads.

**Vertical scope rule (added 2026-09-20).** The four classes above are *shapes*; they are
domain-agnostic and portable across every vertical that moves a document, a number or a record
between two systems. Tax/self-employment, e-invoicing, Stripe→GL and parcel audit are **four
instances of one vertical cluster (money- and document-reconciliation)**, not the factory's scope.
A sweep must declare its vertical before it searches, and must not default to that cluster — see
Stage 0. Measured baseline this rule corrects (2026-09-20): 4 shipped products and 4 of 5 PRDs sit in
the money/document cluster (QuarterLine, LedgerLink, FacturGate, ParcelProof); the single exception,
MCPV2 (dev-infra), scored 62 and was deferred.

## 2. Ingestion Triggers & Prerequisites
- **Execution Mode:** Scheduled cron (weekly Mon 06:00 EST) or on-demand via Simon.
- **Prerequisites:** `context/company_goals.md`, `context/tech_stack_capabilities.md`,
  `context/vertical_coverage.md` (rotation queue + verdicts) and `skills/recon_vertical_packs.md`.
- **Tools:** `web_search` (constrained to 30 days), filesystem (proposal persistence).

**Source note:** direct Reddit scraping is frequently blocked by network security. Rely on
search-engine snippets (`site:reddit.com`) where available, and treat Hacker News, GitHub issues,
Stack Overflow, Product Hunt, and Shopify App Store reviews as primary, more-reliable sources.
Never block the sweep on a single source outage.

## 3. Execution Protocol (Stage 0 → Stage 6)

### Stage 0: Declare the vertical (before any search)
Set `VERTICAL = <id>` at the top of the sweep and record it in the run report and in the PRD schema.

- **Rotation rule:** the declared vertical must not be one of the last **two** declared verticals.
  Pick from the rotation queue in `context/vertical_coverage.md` (least-recently-scanned first,
  `never` before everything else). The queue's inventory of the factory's 26 audience verticals is
  generated from a **vendored snapshot** of the editorial registry
  (`context/editorial_verticals.json`, provenance included) — re-vendor after an editorial vertical
  change with `node scripts/vertical-sync.mjs --vendor`, and let `--check` fail the run if the snapshot
  is stale, the inventory block is out of date, or a verdict row is missing. Every vertical in
  `skills/recon_vertical_packs.md` has a pack; add one when you open a new vertical.
- **Freshness rule:** at least one of the top three scored candidates must come from the declared
  vertical. If it produces nothing ≥60, say so explicitly with the queries that failed and the
  in-window sources they returned — that is a valid, useful result (it retires a vertical cheaply).
  Do not silently fall back to the money/document cluster to fill the quota.
- **Channel rule:** a new vertical earns a build slot only if a distribution channel for its buyer
  already exists (an owned audience, an existing editorial vertical, a community the factory can
  post into). Idea supply is not the factory's binding constraint — distribution is. Record the
  intended channel in the PRD before recommending a build.

### Stage 1: Dynamic Date Anchor & Discovery Vectors
Set `CURRENT_DATE = today`, `SCAN_WINDOW_START = today - 30 days`.

- **Vector A: Platform & Ecosystem Shifts** — API deprecations, v1→v2 breaking migrations, SDK
  retirements (Stripe, Shopify, AWS, OpenAI, Meta); SaaS pricing/tier changes forcing migration.
- **Vector B: Operational & Data Transformation Pain** — "convert X to Y", "parse PDF to JSON",
  "EDI mapping tool", "reconcile X with Y", "zapier/make workaround for", "airtable script for".
- **Vector C: High-Intent Calculator & Benchmarking Workflows** — industry unit economics, carbon
  audits, serverless cost estimators, logistics dimensional-weight audits. **Seed this vector from the
  declared vertical's decision-shaped angles in the editorial registry** (`context/vertical_coverage.md`
  §verdicts; e.g. "amr fleet payback period calculator", "expedited freight vs safety stock
  calculator"). Those angles are unit-economics decisions with a named buyer already attached — they
  convert into a C-vector query in one step, and the editorial vertical is the distribution channel.
- **Vector D: Agentic & MCP Integration Voids** — missing/unofficial MCP servers for high-utility
  APIs; workflows where LLM agents need deterministic tool execution (parsers, rate limiters,
  token counters, validators).

### Stage 2: Fan-Out Multi-Threaded Search Queries

Query phrasings come from the **declared vertical's pack** in `skills/recon_vertical_packs.md`
(standards bodies, dated triggers, incumbent/validator names, the buyer, the free-incumbent check).
The vector queries below are shape templates to instantiate per vertical — never run them bare.
Run parallel queries constrained to `[SCAN_WINDOW_START]`:

```text
# Platform churn & migration
"deprecated" OR "breaking change" ("API" OR "migration guide")
"pricing changes" OR "discontinuing" ("tier" OR "plan")

# Workflow & integration friction (HN / GitHub / Stack Overflow first — Reddit often blocked)
"looking for a tool that" OR "is there an API for"
"how do you guys handle" ("exporting" OR "syncing" OR "reconciling")
"why is there no simple way to" site:news.ycombinator.com
github ("rate limit" OR "webhook" OR "deprecated") ("workaround" OR "blocked")

# Data transforms & calculators
"convert" AND ("to JSON" OR "to CSV" OR "to schema") ("broken" OR "alternative" OR "CLI")
"calculator" OR "estimator" ("formula" OR "benchmark") ("B2B" OR "operations" OR "SaaS")

# Agentic & developer tooling gaps
"MCP server for" OR "Model Context Protocol" ("wish list" OR "needed" OR "missing")
"tool calling" AND ("deterministic" OR "unreliable" OR "wrapper")

# Platform-specific review signal (acute operational pain before it becomes a thread)
site:apps.shopify.com ("doesn't" OR "missing" OR "broken") ("export" OR "sync" OR "batch")
site:stackoverflow.com ("parsing" OR "mapping" OR "transform") ("error" OR "workaround")
```

**Query syntax that actually works (measured 2026-09-14):**
- **`after:` is not honoured** by the backend — it narrows results to nothing useful while looking
  correct. Do not use it; the 30-day window is enforced by *reading dates in the results*, not by a
  query operator. Record the publication date of each source you cite.
- **Never run a bare deprecation boolean.** `"deprecated" OR "breaking change" API …` returns
  consumer-media noise (event transcripts, social posts). Anchor on a **named vendor + version**
  (`"Google Ads API v22 sunset"`) or a **named regulation** (`"CBAM definitive regime"`), then read
  the vendor changelog/sunset table it surfaces.
- **Regulation + deadline + persona pain is the highest-yield A/B phrasing**
  (e.g. `e-invoicing mandate 2026 B2B company ERP compliance struggle` → 6/6 on-topic).
- **Concrete billable quantity + dated rule change is the highest-yield C phrasing**
  (e.g. `parcel audit dimensional weight divisor 2026` → 6/6 shipper/audit sources); abstract
  `calculator OR estimator` queries return tech-stack videos and are not usable.
- `site:news.ycombinator.com` only surfaces pre-2020 threads — use it for pain *shape*, never as
  in-window evidence. Reddit is **not** reliably blocked: plain and `site:` Reddit queries returned
  in-window threads in this sweep, so try it before invoking the fallback.
- Before shortlisting, check for **free incumbent tooling** by searching the exact deliverable
  (`"<protocol> conformance checker validate"`). Two of this sweep's candidates died there —
  a validator that already exists free is not a product.

### Stage 3: Signal Intensity Score
Quantify demand **before** writing a PRD — prevent chasing one-off complaints. Score each
candidate 0–100 and log the score in the PRD:

| Factor | Weight | Scoring |
|---|---|---|
| Repeat search intent | 30% | 1 isolated mention = 20; 3+ independent sources = 100 |
| Incumbent pricing friction | 25% | free incumbent = 0; $50+/mo incumbent with migration pain = 100 |
| Willingness-to-pay | 25% | consumer/hobbyist = 0; B2B ops / finance / agency / dev-team = 100 |
| Urgency window | 20% | evergreen = 30; imminent deadline or deprecation = 100 |

**Urgency is not only regulation.** A dated trigger can be a migration cutoff, a contract or
renewal cycle, a fiscal-year or enrollment window, a season, a staffing/turnover event, an audit
or inspection window, a vendor price/plan change, or a dispute/claims clock. Search for the vertical's
dated triggers (renewal calendars, cutoff dates, submission windows) before concluding a vertical
has no urgency — regulation-only searching is what narrowed the factory onto compliance topics.

Only candidates scoring **≥ 60** proceed to Stage 4.

### Stage 4: The 4-Filter Viability Funnel
Every candidate must pass all four gates:

| Filter Gate | Criteria | Drop trigger |
|---|---|---|
| 1. Solution Archetype | Fits one: (a) Deterministic engine/calculator, (b) Transform/parser, (c) API-to-API bridge, (d) Headless asset generator | Requires continuous human-in-the-loop service or non-deterministic creative generation |
| 2. Stack Feasibility | 100% buildable from Next.js App Router + Tailwind + Supabase + Stripe + Resend + pure TypeScript | Requires native binaries, custom hardware, or heavy GPU |
| 3. Rapid Build Horizon | MVP + test suite ≤ 4 hours via `agy` | Needs multi-tenant enterprise RBAC or long vendor approvals |
| 4. Dual-Interface Utility | Solves a visual UI need AND exposes a REST/WebMCP programmatic hook | Pure UI eye-candy with no agentic monetizable endpoint |

### Stage 5: 10x Enhancement Layer
For top candidates, formulate:
- **Growth vector:** embeddable responsive widget (`<iframe>`/web component), shareable URL state
  with base64-encoded params, or branded vector/PDF reports.
- **Agentic monetization:** dedicated headless API or WebMCP endpoint, metered $0.05–$0.50/call.

### Stage 6: Output Generation & Persistence
Write the top candidate(s) to `context/recon_proposals/YYYY-MM-DD_[product_name].md` using the
schema below. Include the Signal Intensity Score and the declared **Vertical**.

Then update `context/vertical_coverage.md` **in the same run** (record hygiene rule 1): set
`last_scanned` for the declared vertical, append the pack entries you added or corrected, and
record any vertical retired for zero signal. A coverage ledger that lags the sweep is worse than
none — the next sweep picks its vertical from it.

## 4. Standard PRD Candidate Output Schema

```markdown
# Proposal: [Product Name / One-Line Descriptor]
**Date Discovered:** YYYY-MM-DD
**Vertical:** [pack id from `skills/recon_vertical_packs.md`]
**Signal Vector:** [A | B | C | D]
**Primary Source:** [URL or exact forum thread / announcement]
**Signal Intensity Score:** [0–100] (repeat-intent / pricing-friction / WTP / urgency)
**Target Persona:** [e.g., Shopify Store Ops, Cloud Financial Analysts, B2B Growth Leads]

### 1. The Bottleneck & Market Context
- **Current State:** [why existing workflows fail, break, or cost too much]
- **Validation Intensity:** [evidence of repeat search intent or multiple user complaints]

### 2. Architecture & Technical Blueprint
- **Engine Type:** [Calculator | Schema Transpiler | Micro-Bridge | Asset Generator]
- **Deterministic Core (`src/lib/calc/<slug>/`):** [pure TS interfaces, formulas, transforms, edge cases]
- **Inputs / Outputs:** [JSON schema of inputs → structured JSON, dashboard metrics, or file export]

### 3. Dual-Pronged Monetization
- **Web Tier (Stripe):** free interactive preview; $19–$49/mo or $9 pay-per-export.
- **Agentic Tier (WebMCP):** $0.10–$0.50/invocation, Stripe-metered.

### 4. Zero-Friction Viral Hook
[e.g., embeddable widget, instant pre-filled query-param sharing, public benchmark score]

### 5. Build Notes
- Route `src/app/<slug>/`; registry entry in `src/products/registry.ts`; telemetry `track(..., "<slug>")`.
- Gate: `scripts/verify-build.sh` must pass before push.
```

## 5. Self-Improvement & Failure Handling

### Vertical bias — resolved edge-case (measured 2026-09-20)
The SOP's compounding loop had narrowed its own search space: every sweep since 08-31 fed winning
query phrasings back, and the two phrasings that survived the zero-result log (2026-09-14) were both
compliance/finance-shaped — *regulation + deadline + persona pain* and *billable quantity + dated
rule change*. Result: 4 shipped products (QuarterLine, LedgerLink, FacturGate, ParcelProof) and 5
PRDs (incl. the deferred MCPV2) all sit in the money/document-reconciliation cluster, and three
dev-infra candidates were rejected for *archetype saturation* — the funnel kept re-encountering the
same product shape because it kept searching the same vertical. Root cause is input scope, not
scoring: the archetypes were always domain-agnostic (`HL7v2→FHIR`, `OneRoster` roster drift, `RETS→RESO`
cutoffs, ACORD/COI extraction and RUBS utility-bill re-allocation are the same four archetypes in
different verticals). Fix: Stage 0 vertical declaration + rotation, per-vertical packs in
`skills/recon_vertical_packs.md`, and the coverage ledger in `context/vertical_coverage.md`.
Subsequent sweeps: log **vertical coverage** here alongside query syntax — a query-pattern log
without a vertical dimension cannot detect domain drift.

- **Zero viable candidates** → log failed query patterns to `skills/self_improvement_eval.md`,
  cycle secondary vectors (AWS billing shifts, Figma token pipelines, webhook translation), and
  widen the window to 45 days.
- **Build rejection** (fails the 4-hour window) → append the root cause (e.g., undocumented
  upstream rate limits, missing TypeScript SDK) to the Stage 4 exclusion filters.
- **Source outage** (e.g., Reddit blocked) → record the fallback sources that worked; never block
  the sweep on a single platform.
