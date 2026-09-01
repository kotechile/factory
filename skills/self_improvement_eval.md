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

### Recon zero-result log
| Date | Query syntax | Vertical | Correction |
|---|---|---|---|

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
