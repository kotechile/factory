---
name: self-improvement-eval
description: "Use for post-run error reflection and SOP patching."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Self-Improvement Evaluation

## 1. Objective
Persist post-run evaluation and dynamic error reflection so no operational failure repeats.

## 2. Sections

### Failure log
| Date | Product | Phase | Error class | Root cause | Patched SOP |
|---|---|---|---|---|---|
| 2026-08-31 | QuarterLine | Build | build | TS literal type from `as const` data (`bracket.rate` inferred `0.1`, can't assign `0.12`) — annotate the accumulator `: number` | ui_component_standards.md |
| 2026-08-31 | QuarterLine | Build | context | `agy` headless timed out on a full-scaffold/product prompt; work completes but the final verify/stage step doesn't run | ANTIGRAVITY_PROMPTS.md |
| 2026-09-01 | QuarterLine | Verify (visual-qa) | endpoint | Transient network timeout to Gemini API — single `fetch`, 10s timeout, no retry; unreachable round-robin IP `172.217.115.4:443` → `UND_ERR_CONNECT_TIMEOUT`. All deterministic checks passed; re-run passed. | ui_component_standards.md |
| 2026-09-01 | Fleet | Deploy | monetization | Fictitious Stripe apiVersion ("2026-03-25.acacia") rejected by Stripe API — use SDK default | stripe_gating_workflow.md |
| 2026-09-01 | Fleet | Deploy | monetization | Stripe Managed Payments required product tax_code — added txcd_10000000/txcd_10202000 and passed managed_payments: { enabled: false } | stripe_gating_workflow.md |
| 2026-09-01 | Fleet | Deploy | context | Container 0.0.0.0:3000 internal host passed as Stripe return URL — resolve public origin via x-forwarded-host | stripe_gating_workflow.md |
| 2026-09-01 | Fleet | Build | context | Paid report delivered plaintext .txt blob; header lacked hierarchy — standardized on pdf-lib executive workpaper layout | ui_component_standards.md |
| 2026-09-01 | Fleet | Build | build | TypeScript 5.5+ Uint8Array ArrayBufferLike rejected by BlobPart — cast pdfBytes as unknown as BlobPart | stripe_gating_workflow.md |
| 2026-09-02 | QuarterLine | Verify (lint) | build | `let { customerId, sessionId } = body` in portal route — `sessionId` never reassigned → ESLint `prefer-const` (line 72). Split destructure: `let` for reassigned bindings, `const` for read-only | ui_component_standards.md |
| 2026-09-04 | QuarterLine | Verify (visual-qa) | build | Tab bar `overflow-x-auto` in the 5-col results column clipped the last tab ("Scorecard") — Gemini flagged "tab text is cut off" (reported as "23% Trap Checker tab text"). Fix: `flex-wrap` on the tab row so tabs wrap instead of clipping at the edge. | ui_component_standards.md |

### Recon zero-result log
| Date | Query syntax | Vertical | Correction |
|---|---|---|---|

### Growth gate log (audit trail for `scripts/growth-check.mjs`)
| Date | Product | Days since launch | Gate state | Metrics (from growth-check.mjs) | Action taken |
|---|---|---|---|---|---|
| 2026-09-02 | quarterline | 2 | Day 7/14/30 not yet due | page_view=20, checkout_click=3, export_click=2, agent_query=0; charge_count=9, gross_revenue=$161. Correction (2026-09-03): agent_query emission IS wired — `track("agent_query", …)` in `/api/agent/calculate/route.ts`. But the browser WebMCP tools (`calculate_qbi_deduction`, `calculate_quarterly_estimate`) compute client-side and bypass `track()` + Stripe metering; `registry.ts` advertises `calculate_self_employment_2026`, which does not match the registered tool names. Zero agent_query rows = no agent traffic yet, not "no event type". | none — re-evaluate Day 7 gate 2026-09-07 |
| 2026-09-04 | quarterline | 4 (launch 08-31) / 3 (first event) | Day 7/14/30 not yet due — Day 7 due 2026-09-07 | page_view=61 (+41 vs 09-02), checkout_click=3, export_click=2, agent_query=0; charge_count=9, gross_revenue=$161 (unchanged since 09-02 — no new charges in 48h). Note: script reports page_view event count, not unique visitors, so the Day 7 "≥50 unique visitors" criterion can't be strictly verified from this metric alone. | none — re-evaluate Day 7 gate 2026-09-07 |

## 3. Error classes
- `build` — type/lint/compile
- `dependency` — missing/version
- `endpoint` — MCP/WebMCP broken
- `webhook` — unhandled event type
- `context` — missing/gap in an SOP
- `monetization` — stripe/webmcp pricing

## 4. Protocol
1. Toby classifies the failure and isolates root cause.
2. Toby patches the matching `skills/*.md` with a "Resolved edge-case" note.
3. Toby appends a row here referencing the patched SOP.

## 5. Compounding
Every future agent invocation reads updated skills — failures must never repeat across builds.
