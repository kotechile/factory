# Audience Pain Points — Validated Bottleneck Log

Log of validated B2B/B2C bottlenecks discovered during recon. Each entry must carry a source
signal (thread/regulation/deadline) and a date.

## Format
| Date | Persona | Pain point | Source signal | Status |

## Log

| Date | Persona | Pain point | Source signal | Status |
|---|---|---|---|---|
| 2026-09-07 | Ecommerce bookkeeper / finance ops | A single Stripe payout is a netted bundle of charges, refunds, disputes, fees & FX; Xero/QB has no native decomposition → manual journals | 5+ bookkeeping sources (smallaccountants.co.uk, reconkept, thebookkeeper.ai, growthy, invimarko) | `prd` → `2026-09-07_ledgerlink.md` |
| 2026-09-07 | MCP server maintainers / agent-infra teams | 2026-07-28 spec made MCP stateless; initialize handshake + Mcp-Session-Id gone, Mcp-Method/Mcp-Name mandatory, per-request _meta, server/discover — audit+rewrite is manual, no tooling | 9+ sources (MCP blog, MSFT, r/mcp, developersdigest, inovaflow, mcpjam, wavect) | `prd` → `2026-09-07_mcpv2.md` |
| 2026-09-07 | AI app developers | OpenAI Assistants API sunset 2026-08-26; wire-compatible bridges (Ragwalla) exist to avoid rewrite | developers.openai.com/api/docs/assistants/migration, ragwalla.com | `rejected` — no deterministic engine; incumbent bridge (Ragwalla) + free OAI guide; fails Filter 3 (≤4h) / competes with funded incumbent |

## Status values
- `candidate` — discovered, not yet funneled
- `shortlist` — passed 4-filter funnel, awaiting Simon
- `prd` — promoted to `context/recon_proposals/`
- `rejected` — failed a gate (record which)
