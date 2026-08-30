---
name: market-recon-last30days
description: "Use when running the 30-day market discovery sweep."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Autonomous Market Reconnaissance (Last 30 Days)

## 1. Objective & Behavioral Intent
Execute an autonomous, signal-driven intelligence sweep across market data published within the
**last 30 calendar days**. Identify acute B2B/B2C bottlenecks, unaddressed regulatory/platform
changes, and high-margin calculation workflows, filtering them through strict factory feasibility
rules to output actionable Micro-Product PRD candidates.

## 2. Ingestion Triggers & Prerequisites
- **Execution Mode:** Scheduled cron (weekly Mon 06:00 EST) or on-demand via Simon.
- **Prerequisite context:** `context/company_goals.md`, `context/audience_pain_points.md`.
- **Tools:** web_search (constrained to the 30-day window), filesystem (write proposals).

## 3. Five-Stage Execution Protocol

### Stage 1: Dynamic Date Anchor & Parameter Setup
- `CURRENT_DATE` = today; `SCAN_WINDOW_START` = today minus 30 days.
- Three search vectors:
  - **Vector A (Regulatory & Platform Shifts):** compliance mandates, API deprecations, tariff/tax law updates.
  - **Vector B (High-Value Operational Bottlenecks):** "how to calculate X", "spreadsheet template for X", "[industry] ROI calculator".
  - **Vector C (Rising Agentic / WebMCP Demand):** tools requested by AI dev communities, YC RFS themes, automation forum inquiries.

### Stage 2: Fan-Out Multi-Threaded Search Queries
Run parallel queries with boolean constraints, all `after:` the 30-day window start:

```text
"[industry] new regulations" OR "compliance checklist"
"[industry] tax deduction formula" OR "rebate calculator"
"is there a tool to calculate" OR "my excel sheet broke" site:reddit.com
"looking for a simple calculator for" site:reddit.com
"WebMCP" OR "Model Context Protocol server for"
"YC RFS" OR "request for startups" "AI agent"
```

### Stage 3: The 4-Filter Viability Funnel
Every raw idea must pass all four gates:

| Filter Gate | Criteria | Failure action |
|---|---|---|
| 1. Math/Logic Core | Solved by a deterministic algorithm, dynamic multi-variable model, or structured document transform | Drop if it requires non-deterministic long-term human service |
| 2. Scaffolding Fit | Buildable from Next.js + Tailwind + Supabase Auth/DB + Stripe + Resend | Drop if custom native hardware/mobile sensors are mandatory |
| 3. Build Time Budget | MVP + test suite ≤ 4 hours via Antigravity | Drop if multi-month enterprise integration is required |
| 4. WebMCP Monetization | Exposes a paid `navigator.modelContext.registerTool` endpoint for agents | Drop if no programmatic API/agent hook is viable |

### Stage 4: 10x Enhancement Layer (Phoebe Intercept)
For each idea passing Stage 3, formulate ≥2 upside amplifiers:
- **Asymmetric Growth Hook:** downloadable branded PDF audit, embeddable iframe widget, programmatic benchmark score.
- **Agentic API Arbitrage:** how an agent pays $0.10–$1.00/query to run the calc headless.

### Stage 5: Output Generation & File Persistence
Write the highest-scoring candidate to `context/recon_proposals/YYYY-MM-DD_[product_name].md`
using the Standard PRD Candidate Schema below.

## 4. Standard PRD Candidate Output Schema

```markdown
# Proposal: [Product Name / One-Line Descriptor]
**Date Discovered:** YYYY-MM-DD
**Source Signal:** [link/description of the 30-day signal]
**Target Audience:** [specific persona]

### 1. The Core Bottleneck
[2-3 sentences; why spreadsheets/manual methods fail]

### 2. The Deterministic Solution
- **Inputs:** [user/agent parameters]
- **Calculation / Logic Core:** [formulas, logic checks, transforms]
- **Outputs:** [UI dashboard, PDF, or structured JSON]

### 3. Monetization & Paywall Boundaries
- **Free Tier:** instant interactive preview.
- **Paid Tier (Stripe):** $29/mo or $9 one-off export.
- **Agent API Tier (WebMCP):** $0.25/call via Stripe meter.

### 4. Technical Blueprint & Dependencies
- Frontend: Next.js App Router + Tailwind + Lucide Icons.
- Engine: pure TS in `src/lib/calc/[engine].ts`.
- Validation: Jest test vectors vs known industry cases.
- WebMCP schema (see webmcp-integration skill).
```

## 5. Self-Improvement & Failure Handling
- Zero viable candidates → log the query syntax to `skills/self_improvement_eval.md` and expand
the search radius to adjacent B2B verticals.
- Post-launch build failure → update this skill's Stage 3 filters with the specific failure reason.
