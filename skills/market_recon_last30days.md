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

## 2. Ingestion Triggers & Prerequisites
- **Execution Mode:** Scheduled cron (weekly Mon 06:00 EST) or on-demand via Simon.
- **Prerequisites:** `context/company_goals.md`, `context/tech_stack_capabilities.md`.
- **Tools:** `web_search` (constrained to 30 days), filesystem (proposal persistence).

**Source note:** direct Reddit scraping is frequently blocked by network security. Rely on
search-engine snippets (`site:reddit.com`) where available, and treat Hacker News, GitHub issues,
Stack Overflow, Product Hunt, and Shopify App Store reviews as primary, more-reliable sources.
Never block the sweep on a single source outage.

## 3. Six-Stage Execution Protocol

### Stage 1: Dynamic Date Anchor & Discovery Vectors
Set `CURRENT_DATE = today`, `SCAN_WINDOW_START = today - 30 days`.

- **Vector A: Platform & Ecosystem Shifts** — API deprecations, v1→v2 breaking migrations, SDK
  retirements (Stripe, Shopify, AWS, OpenAI, Meta); SaaS pricing/tier changes forcing migration.
- **Vector B: Operational & Data Transformation Pain** — "convert X to Y", "parse PDF to JSON",
  "EDI mapping tool", "reconcile X with Y", "zapier/make workaround for", "airtable script for".
- **Vector C: High-Intent Calculator & Benchmarking Workflows** — industry unit economics, carbon
  audits, serverless cost estimators, logistics dimensional-weight audits.
- **Vector D: Agentic & MCP Integration Voids** — missing/unofficial MCP servers for high-utility
  APIs; workflows where LLM agents need deterministic tool execution (parsers, rate limiters,
  token counters, validators).

### Stage 2: Fan-Out Multi-Threaded Search Queries
Run parallel queries constrained to `after:[SCAN_WINDOW_START]`:

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

### Stage 3: Signal Intensity Score
Quantify demand **before** writing a PRD — prevent chasing one-off complaints. Score each
candidate 0–100 and log the score in the PRD:

| Factor | Weight | Scoring |
|---|---|---|
| Repeat search intent | 30% | 1 isolated mention = 20; 3+ independent sources = 100 |
| Incumbent pricing friction | 25% | free incumbent = 0; $50+/mo incumbent with migration pain = 100 |
| Willingness-to-pay | 25% | consumer/hobbyist = 0; B2B ops / finance / agency / dev-team = 100 |
| Urgency window | 20% | evergreen = 30; imminent deadline or deprecation = 100 |

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
schema below. Include the Signal Intensity Score.

## 4. Standard PRD Candidate Output Schema

```markdown
# Proposal: [Product Name / One-Line Descriptor]
**Date Discovered:** YYYY-MM-DD
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
- **Zero viable candidates** → log failed query patterns to `skills/self_improvement_eval.md`,
  cycle secondary vectors (AWS billing shifts, Figma token pipelines, webhook translation), and
  widen the window to 45 days.
- **Build rejection** (fails the 4-hour window) → append the root cause (e.g., undocumented
  upstream rate limits, missing TypeScript SDK) to the Stage 4 exclusion filters.
- **Source outage** (e.g., Reddit blocked) → record the fallback sources that worked; never block
  the sweep on a single platform.
