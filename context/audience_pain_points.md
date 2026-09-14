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
| 2026-09-14 | EU/FR finance ops, ERP integrators, accounting firms | France B2B e-invoicing live 2026-09-01: EN 16931 profile minimum + CIUS-FR (SIRET, FR VAT codes) required; ERPs emit illegal MINIMUM/BASIC profiles, "Euro" currency, locale dates, stale CustomizationID; only per-invoice validators exist (find, don't fix; no agent endpoint). €50/invoice penalty on sender | invoicenavigator.eu (factur-x technical reference, france ERP guide, 10 most common errors), avalara.com, quaderno.io, rtcsuite.com, dynatechconsultancy.com, symtrax.com, esker.com, lasernetgroup.com, clearvo.io, dddinvoices.com, aclegal.website, invoicexml.com, peppolvalidator.com | `prd` → `2026-09-14_facturgate.md` |
| 2026-09-14 | Ecommerce shipping ops, 3PL finance, logistics consultants | Carrier invoices bill max(actual, dimensional) weight with a contract divisor; USPS divisor 166→139 on 2026-07-12 + fractional dims round up, UPS/FedEx at 139; DIM errors run 0.1–0.4% of lines, total recovery 2–8% of carrier spend; nothing reconciles declared shipment data against billed lines, and disputes expire in ~21 (FedEx) / ~30 (UPS) days | dclcorp.com (USPS DIM 2026), packizon.com (UPS vs FedEx DIM rules 2026), elleraudit.com, varsitylogistics.com, darrigoconsulting.com, shipware.com, threecolts.com, cxtms.com, profulfill.com, racklify.com | `prd` → `2026-09-14_parcelproof.md` |
| 2026-09-14 | Shopify app devs / agentic-commerce builders | Storefront MCP catalog + cart tools deprecated in favour of UCP (`/api/ucp/mcp`); legacy cart tools retired 2026-08-31 | shopify.dev/changelog (UCP Cart MCP), naughtonandbird.com, weaverse.io, ecomheroes.dev, kaspianfuad.com | `rejected` — fails Filter 1/3: vendor + community tooling already covers conformance (free ucpchecker.com, ucptools.dev, Shopify's own UCP CLI + UCP Skill, open-source `ucp-proxy`); no defensible deterministic core left to own |
| 2026-09-14 | MCP server operators / agent-platform teams | Agent payment + metering governance: per-tool rates, idempotent dedup, per-agent caps, sub-cent settlement; "cost governance within organizations remains unsolved" | workos.com (MCP in 2026), usagebox.com, systemprompt.io, eco.com (x402/purl), nevermined.ai (Stripe vs Orb vs Metronome) | `rejected` — fails Filter 2/3: Cloudflare Monetization Gateway and AWS WAF Monetize shipped edge metering in July 2026 and Stripe MPP / Nevermined / Orb / Metronome own billing; the gap is funded-incumbent territory, and the value is stateful infra, not a deterministic micro-engine |
| 2026-09-14 | PPC agencies / Google Ads API integrators | Google Ads API v22 sunsets 2026-10-07 (v21 already sunset Aug 2026); Content API for Shopping sunset 2026-08-18; every tool/script on a dead version must be found and ported | ppcnewsfeed.com (2026-09), developers.google.com/google-ads/api/docs/sunset-dates, elevarus.com, skuanalyzer.com, digitalapplied.com | `rejected` — archetype saturation: a third code-migration scanner in three weeks (cf. MCPV2, still unbuilt at 62) and the work is largely a version bump with free upstream migration guides; WTP is one-time, not recurring |

## Status values
- `candidate` — discovered, not yet funneled
- `shortlist` — passed 4-filter funnel, awaiting Simon
- `prd` — promoted to `context/recon_proposals/`
- `rejected` — failed a gate (record which)
