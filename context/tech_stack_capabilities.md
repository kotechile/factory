# Tech Stack Capabilities — what the factory may build from

Referenced by `skills/market_recon_last30days.md` (Stage 0 prerequisites) and `context/company_goals.md`.
This file is the **canonical list of primitives a product may use**. When the two disagree, this file wins
and the other is corrected — the point of one list is that a build candidate can be checked against it.

## 1. The deterministic core (unchanged, non-negotiable)

Every product's **value** is still a deterministic algorithm, a multi-variable model, or a structured
document transform (AGENTS.md rule 1). The reason is not purity for its own sake: a number a buyer acts on
must be reproducible, testable against known-answer vectors, and auditable after the fact.

- Every **number** a product prints or charges for comes from the deterministic engine, never from a model.
- A model may not invent a rate, a threshold, a date or a line item. If an input is unreadable or missing,
  the product reports it `unstated` and blocks the verdict — it never estimates (rule 5).
- The deterministic core stays fixture-testable without network access. If a test needs a model, the model
  is on the wrong side of the boundary.

## 2. Extended primitives — allowed as EXTRACTION, never as arithmetic (owner, 2026-10-05)

Owner instruction, verbatim: *"add more tools (at higher price maybe) to include LLM, llamaparse, etc."*
So the following are now in-scope as **front-of-pipeline extraction** layers, i.e. they turn an
unstructured document into the structured record the deterministic engine then computes on:

| Primitive | What it may do | What it may NOT do |
|---|---|---|
| LLM APIs (any provider, e.g. Gemini/Claude/DeepSeek) | Read a document/invoice/quote/email and emit a **structured field set** against a declared schema; classify a document type; normalize a label to a known enum | Produce any figure the product reports as its own output; decide a verdict; fill a missing field with a plausible value |
| Document-parsing services (e.g. LlamaParse, PDF text/table extraction, OCR) | Extract text, tables, page geometry from a PDF/scan into a canonical structure | Be the only check: extraction must be reported with its confidence/provenance, and an unreadable region is an explicit `unreadable`/`unstated` finding |
| Embedding/retrieval services | Retrieve the clause/rule row that applies, from a rule table **shipped in the repo** | Retrieve a rule that is not in the repo's cited table (a retrieved rule must be cited to a source that exists) |

Rules that make this safe, and that a candidate must satisfy:

1. **Extraction is declared.** The product must say, on the page and in the artifact, which fields came from
   the parser and which from the engine — a reader must never have to guess.
2. **Extraction failure is loud.** A parse that returns nothing, or a field the parser is unsure about, is an
   explicit error/finding that blocks the verdict — never a default (rule 5 applies unchanged).
3. **The engine is still the product.** The moat must remain the deterministic computation. "An LLM reads it"
   alone fails Filter 1: if the whole value is model output, it is not a factory product.
4. **Cost is priced in.** An LLM-backed tool's metered rate must clear its own parse cost with margin
   (§3). A model call the factory pays for and does not charge for is a loss-making product.
5. **No new secret surface.** Model keys live in the deploy env like every other secret. No product may ship
   a key to the browser.

## 3. Price bands (owner, 2026-10-05 — "at higher price maybe")

The metered agent tier is priced by **tool class**, from the single catalog (`src/products/pricing.ts`):

- **Deterministic tools — $0.05–$0.50 per call.** Unchanged. These compute with no marginal cost, so the
  price is set by the buyer's value, not the factory's cost.
- **LLM/parse-backed tools — $0.50–$3.00 per call.** The floor covers a worst-case parse + generate, and the
  band stays under the "$5 looks like a typo" plausibility ceiling in the catalog's drift guard.
- **Web tier** — free instant preview; **$29/mo** suite Pro, **$9** one-off export (unchanged).
- **Margin rule** (extends `context/company_goals.md`): a candidate whose metered price cannot clear
  **3× its measured per-call cost** (parse + generate + retries) is dropped, not built — the same shape as
  the existing "$0.25/query margin" rule, applied to the new class.
- A tool's class is declared in `src/products/registry.ts` (`usesLlmPrimitive`) and enforced by
  `src/products/pricing.test.ts`: a declared LLM-backed tool priced under the LLM floor fails the build, and
  a deterministic tool priced over its ceiling does too. Guessing a class is not an option — the guard reads
  the same declaration the recon writes into the PRD.

## 4. Everything else (unchanged)

- Frontend: Next.js (App Router, TypeScript). Styling: Tailwind + Lucide + React Flow (see
  `skills/ui_component_standards.md` for the mandatory Editorial Signature).
- Data: Supabase (PostgreSQL + RLS). Payments: Stripe (Checkout, metered billing, webhooks). Email: Resend.
- Agents: MCP (server) + WebMCP (`navigator.modelContext.registerTool`). Hosting: Coolify on the VPS,
  git-push deploy. Build via the Antigravity `agy` CLI.
- Build budget and the four viability filters are unchanged: MVP + tests in ≤ 4 hours, and the product must
  be dual-interface (a visual UI *and* an agent-callable endpoint).
