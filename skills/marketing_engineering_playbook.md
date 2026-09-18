# Marketing Engineering Playbook — Autonomous Growth & Distribution SOP

**Owner:** `echo` (Chief Growth Engineer)  
**Collaborators:** `scout` (Signal Discovery), `phoebe` (10x Asymmetric Hooks), `simon` (GTM Orchestration)  
**Target:** Near-zero marginal distribution cost for deterministic micro-SaaS and WebMCP endpoints.

---

## 1. Philosophy: Engineering vs. Traditional Marketing

Most SaaS marketing fails because it relies on high-friction manual labor (daily social media posting, expensive paid ad testing, agency retainers). 

For an autonomous factory producing $\le 4$-hour deterministic utilities, **marketing must be engineered into the product**:
1. **Zero-Marginal Cost:** Every channel must compound automatically or execute programmatically.
2. **Signal-Anchored:** Every product was discovered from a real 30-day pain signal; marketing starts at that exact ground-zero URL.
3. **Dual-Funnel:** Human tier (instant value $\rightarrow$ gated export) + Agent tier (WebMCP tool registry $\rightarrow$ metered billing).
4. **Kill-Switch Disciplined:** Products that fail quantifiable adoption milestones within 30 days are automatically hibernated.

---

## 2. The Comprehensive Growth Tactics Catalog (The "Tricks" Arsenal)

Every product built by the factory selects a tailored combination of the following tactics:

### Category A: Ground-Zero Infiltration & Reverse Demand (Day 0)

*   **Tactic A1: Source-Signal Thread Hijacking (The "I Got Tired of Broken Spreadsheets" Drop)**
    *   *Mechanism:* Scout identifies the exact Reddit/X/Forum URL where the bottleneck was discovered. Echo drafts an authoritative, neutral reply:
        > *"There is massive confusion on this thread regarding [Topic/Regulation]. Published guides are citing X, but the enacted law (Pub. L. Y) kept it at Z. I got tired of recalculating this in messy spreadsheets, so I compiled the exact statutory formulas into an open, ad-free calculator here: [Link]. Hope it helps someone avoid underpayment penalties."*
    *   *Why it works:* High credibility, zero advertising feel, captures high-intent users immediately at the moment of peak pain.

*   **Tactic A2: "Your Math Is Probably Wrong" Provocation Hook**
    *   *Mechanism:* Create a public diagnostic or comparison checker highlighting a widespread, costly misconception (e.g. the 23%-vs-20% QBI trap, miscalculated safe-harbor thresholds, or outdated deduction limits).
    *   *Why it works:* Fear of audit or financial loss is 10x more motivating than generic "productivity" gains. Drives heated debates and viral shares on LinkedIn, Twitter/X, and practitioner subreddits.

*   **Tactic A3: "Show HN" & Niche Forum Value Launch**
    *   *Mechanism:* Submit a technical breakdown on Hacker News and niche boards detailing the pure-TypeScript deterministic calculation engine, open test vectors, and regulatory citations.
    *   *Why it works:* Developers and technical founders respect transparent math, open APIs, and zero dark patterns.

---

### Category B: Programmatic SEO (pSEO) & Dynamic Surface Area

*   **Tactic B1: N-Dimensional Dynamic URL Matrix**
    *   *Mechanism:* Since the core calculation engine is pure TypeScript with no external database dependencies, generate 50–500 static or SSR programmatic pages from key parameter combinations:
        *   Jurisdiction: `/calc/california-freelancer-tax-2026`, `/calc/new-york-llc-estimated-tax`
        *   Profession / SSTB: `/calc/therapist-qbi-deduction`, `/calc/software-engineer-1099-writeoffs`
        *   Income Tier: `/calc/150k-schedule-c-taxes`, `/calc/250k-qbi-phaseout-calculator`
    *   *Why it works:* Dominates hyper-specific long-tail Google searches where user purchase intent is near 100% and competition is near zero.

*   **Tactic B2: Dynamic OpenGraph (OG) Preview Cards**
    *   *Mechanism:* Use `@vercel/og` or dynamic SVG generation to render live calculations or compliance scorecards directly into the link preview image when shared on social media.
    *   *Why it works:* Links with custom dynamic stats achieve 3x–5x higher click-through rates on Twitter/X, LinkedIn, and Slack than generic logo previews.

*   **Tactic B3: Public Sitemap & Instant IndexNow Ping**
    *   *Mechanism:* Automatically submit newly generated pSEO routes to Google Search Console and Bing via the IndexNow API within minutes of deployment.

---

### Category C: Asymmetric Viral Loops & Interactive Embeds (Phoebe 10x Layer)

*   **Tactic C1: Embeddable Widget Snippet (The Backlink Vampire)**
    *   *Mechanism:* Provide a 1-line `<iframe src=".../embed">` or Web Component that financial bloggers, trade publications, and accounting firms can embed on their own sites (e.g. "Embed this 2026 Estimated Tax Countdown on your site").
    *   *Why it works:* Every embed includes a branded attribution badge ("Powered by QuarterLine — OBBBA Certified") that drives organic referral traffic and massive domain authority backlinks.

*   **Tactic C2: The "Readiness / Audit Scorecard" (0–100 Viral Benchmark)**
    *   *Mechanism:* After inputting basic parameters, the user receives an interactive "Compliance & Penalty Risk Score" (e.g. "Safe-Harbor Status: At Risk | Penalty Exposure: $1,420").
    *   *Why it works:* Gamifies an anxiety-inducing problem. Provides a 1-click share button ("I scored 92% on the 2026 Tax Readiness Test").

*   **Tactic C3: The "Tear-Sheet" PDF Watermark Decoy**
    *   *Mechanism:* The free preview allows downloading a watermarked 1-page executive summary with exact top-line numbers. The full multi-page breakdown, CPA citation appendix, and audit trail are unlocked for $9.
    *   *Why it works:* Users share the summary sheet with their spouse, business partner, or CPA, turning the free user into an active sales agent.

---

### Category D: Agent-to-Agent (A2A) Distribution & WebMCP Registries

*   **Tactic D1: Global AI Tool Directory Submissions**
    *   *Mechanism:* Automatically submit the tool’s WebMCP endpoint and JSON-Schema definition to public AI agent registries:
        *   Smithery.ai
        *   Glama.ai
        *   OpenMCP Registry
        *   LlamaIndex & LangChain Tool Hubs
    *   *Why it works:* AI coding assistants and autonomous financial agents query these registries when searching for deterministic calculation tools.

*   **Tactic D2: Open-Source Framework PR Drops**
    *   *Mechanism:* Open PRs to prominent open-source agent libraries (CrewAI, LangGraph, AutoGen) adding the factory's tool as a standard, cited community utility.
    *   *Why it works:* Permanently embeds the tool into developer pipelines; developers route automated agent queries through the tool at $0.25/call.

*   **Tactic D3: Semantic `.well-known/ai-plugin.json` Discovery**
    *   *Mechanism:* Expose machine-readable metadata and OpenAPI schemas at `/.well-known/mcp.json` and `/.well-known/ai-plugin.json` for spontaneous crawler discovery by AI search engines (Perplexity, ChatGPT, Claude).

---

### Category E: Direct Niche Guerrilla & Practitioner Outreach

*   **Tactic E1: The "Save Your Clients from the Audit Trap" Practitioner Alert**
    *   *Mechanism:* Compile public directories of CPAs, enrolled agents, and fractional CFOs. Send a concise, 3-sentence technical memo:
        > *"Subject: OBBBA Section 199A QBI Rate Confirmation (20% vs 23%)*  
        > *Quick heads-up: several top-ranking accounting blogs are advising clients to apply a 23% QBI rate for 2026. The enacted law (Pub. L. 119-21) kept it at 20%. We built a free, cited verification engine you can run client numbers through before the Sept 15 deadline: [Link]."*
    *   *Why it works:* Positioned as a peer technical service alert rather than a sales pitch. Converts CPAs to the $29/mo multi-client tier.

*   **Tactic E2: Substack / Newsletter Barter**
    *   *Mechanism:* Identify the top 5 niche newsletters read by the target persona (e.g. freelance finance, indie maker taxes). Offer the author an exclusive co-branded calculator link or free lifetime pro access for their community.

---

### Category F: Psychological Pricing & Urgency Multipliers

*   **Tactic F1: Dynamic Regulatory Deadline Countdown**
    *   *Mechanism:* Display a live ticking banner at the top of the interface:
        > *"⚠️ 13 Days, 4 Hours until the IRS Q3 Estimated Payment Deadline (Sept 15, 2026)."*
    *   *Why it works:* Immediate urgency prompts instant calculation and lowers hesitation for the $9 report.

*   **Tactic F2: Transparent Decoy Pricing Matrix**
    *   *Tier 1 (Free):* Instant live preview, interactive sliders, on-screen results.
    *   *Tier 2 ($9 one-off):* Official PDF Audit Report with statutory citations (saves 2 hours of CPA prep).
    *   *Tier 3 ($29/mo):* CPA & Bookkeeper Roster (unlimited client profiles + batch exports).
    *   *Tier 4 ($0.25/query):* WebMCP headless agent access via Stripe Billing Meters.

---

## 3. Autonomous Hermes Marketing Loops (The Operating System)

To execute this playbook without manual founder overhead, the factory deploys three coordinated Hermes agent loops:

```
                  ┌──────────────────────────────┐
                  │ Scout: Discovers 30d Signal  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Simon: Approves Product PRD  │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────┴───────────────┐
                  ▼                              ▼
     ┌────────────────────────┐    ┌────────────────────────┐
     │ Product Director Build │    │ Echo: GTM Blueprint    │
     │ (Antigravity Line)     │    │ (Selects 3-5 Tactics)  │
     └────────────┬───────────┘    └─────────────┬──────────┘
                  │                              │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Launch Strike & Seeding      │
                  │ (Echo + Seeder Subagent)     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ Weekly Growth Pulse Watchdog │
                  │ (Toby: Evaluate vs. Gates)   │
                  └──────────────────────────────┘
```

### 1. `echo` — Chief Growth Officer
*   **Trigger:** Dispatched immediately upon PRD approval.
*   **Deliverable:** Writes `context/growth_blueprints/YYYY-MM-DD_<product>.md`.
*   **Role:** Selects the top 3–5 high-leverage tactics from the catalog above tailored specifically to that product's audience.

### 2. `seeder` — Ground-Zero Execution Task
*   **Role:** Generates ready-to-post, platform-specific markdown payloads for:
    *   The exact source signal thread (Reddit/X/Forum).
    *   Hacker News Show HN description.
    *   Top 3 practitioner outreach drafts.
*   **Delivery:** Posts to Slack `#loop-ai` with 1-click review buttons for the human founder.

### 3. `growth-watchdog` — Weekly Performance Cron
*   **Schedule:** Every Friday at 17:00 local time.
*   **Mission:** Inspects Stripe revenue, Supabase purchase records, and WebMCP meter events.
*   **Action authorization:*** Non-destructive gate actions (pSEO expansion, A/B copy tests) run fully
    autonomously. Destructive actions (product hibernation/archive) require Slack human confirmation —
    the watchdog proposes to #loop-ai and waits for `@Simon` sign-off before stopping the Coolify app.
*   **Reporting:** the weekly post to `#loop-ai` follows `skills/slack_reporting.md` — headline, bottom
    line, what changed, what it did on its own, what it needs from the founder, then the raw numbers.
    `node scripts/check-slack-report.mjs <file>` must exit 0 first; a message the founder has to decode
    is a failed delivery (see edge-case 2026-09-18).
*   **Quantitative Gates:**
    *   **Day 7 Gate:** $\ge 50$ unique visitors, $\ge 1$ paid or agent event. If unmet $\rightarrow$ trigger pSEO expansion
        (author to the 20-route target recorded in the journal — reconcile with the 50-page figure in §4
        before dispatching, and only count sessions that are **not** factory-generated; see edge-case 2026-09-11).
    *   **Day 14 Gate:** $\ge \$50$ gross revenue or $\ge 100$ agent queries. If unmet $\rightarrow$ run A/B copy test.
        Count only **organic** agent queries: the metered route writes no internal marker, so the factory's
        own deploy smoke lands in the same metric (3 such rows on 2026-09-17 — see edge-case 2026-09-17).
        Attribute any nonzero `agent_query` reading against the ship/build log before scoring.
    *   **Day 30 Gate:** Break-even vs server cost. If failed $\rightarrow$ hibernate product and log learnings to `skills/self_improvement_eval.md`.
    *   **Measurement rule (all gates):** a gate may only be evaluated over a window that starts when the
        measuring instrumentation went live, and never over sessions produced by the factory's own CI,
        deploy smoke, or QA runs. Verify provenance from raw rows before scoring a gate.
    *   **Gate-due rule:** a gate is scored on its **due date**, by whoever runs that day. If the due date
        falls before the next `growth-watchdog` run (it only runs Fridays), the daily 08:00 sweep scores it
        and logs the verdict — never silently defer it to the next Friday. A verdict that arrives four days
        late is not a verdict (see edge-case 2026-09-13).

---

## 4. The Human-in-the-Loop Choice Menu

For every product shipped by the factory, the human founder is presented with a 1-page selection menu:

| Option Category | Low Effort (100% Autonomous) | High Impact (Human Assisted - 5 min) |
|---|---|---|
| **Immediate Infiltration** | Automated WebMCP & AI Directory submission. | Approve & post Echo’s pre-drafted reply to the source Reddit/X thread. |
| **SEO & Discoverability** | Deploy 50 programmatic SEO landing pages via Next.js dynamic routes. | Submit custom URL to Google Search Console / Bing Webmaster. |
| **Direct Outreach** | Expose embeddable iframe widget and `.well-known/ai-plugin.json`. | Send Echo's 3-sentence email draft to 10 targeted newsletter authors or CPAs. |
| **Conversion Optimization** | Enable dynamic countdown timer & statutory citation badges. | Pin personal endorsement or thread on personal X/LinkedIn profile. |

---

## 5. Resolved edge-cases

### Resolved edge-case (2026-09-11) — self-generated gate metrics
The Day-7 gate scored `unique_sessions=8` from `scripts/growth-check.mjs`, and every one of those
sessions was created by the factory itself: 4 from the 09-09 deploy smoke (20:52:00–20:52:04) and 4
from the 09-10 10:01 Build Watchdog Playwright run. No external visitor has ever been instrumented
(`agent_query` is 0 all-time; the only `checkout_click`/`export_click` rows in the table are a
single 42-minute window on 09-02). A gate fed by our own test runs is unfalsifiable and can be
"passed" by CI, which would fire or suppress the pSEO fallback for the wrong reason.

Rules:
1. Before scoring any gate, read the raw rows and attribute each session (`created_at` clustering at
   a deploy/verify timestamp + a repeating session id = internal). Exclude internal sessions.
2. Tag internal traffic at source (build/QA/health probes should carry an explicit internal marker)
   so the gate query can filter it without human judgement.
3. Re-base each gate window to the moment its instrumentation went live; pre-instrumentation rows
   can never answer a per-session criterion.
4. Verdicts are only valid if the metric they rest on is produced by the system under test, not by
   the factory operating it.

### Resolved edge-case (2026-09-12) — fallback authorized while its preconditions were still unmet
The 09-11 08:00 sweep logged the Day-7 verdict (MISSED) together with two explicit preconditions for
firing the fallback: (a) internal/QA sessions must be tagged or excluded, and (b) the gate window must
be re-based to instrumentation start (09-09 20:52). Nine hours later the Growth Watchdog executed the
fallback anyway — `dd1251a` took `src/lib/seo/presets.ts` from 9 → 20 presets and pushed, so 20
indexable routes are now live and were justified by `unique_sessions` that are 100 % factory-generated
(15/15 internal, 0 external all-time). A fallback that fires on a pre-condition-violating metric is
unfalsifiable in both directions: it cannot be proven right, and the next gate inherits the debt.

Rules:
1. Preconditions are part of the authorization, not advice. If a verdict records "do not fire until X",
   the fallback action must fail closed until X is implemented — record the precondition as an explicit
   blocking item, not a sentence in a journal.
2. When a fallback fires, log the metric it rested on **and** the current exclusion state (how many
   sessions were internal vs external) in the same audit row. A delivered action without its
   exclusion state cannot be audited later.
3. Non-destructive ≠ pre-authorized. "pSEO expansion runs autonomously" means no human confirmation is
   needed *once the gate is honestly scored*; it does not license firing on a metric the same run
   declared unmeasurable.
4. Once a fallback has shipped, re-scoring the original gate does not un-ship it. Treat the affected
   routes as pending-review artifacts and re-score on the corrected window before the next gate.

### Resolved edge-case (2026-09-13) — a gate nobody is scheduled to score, and a flaky column probe

The Day-14 gate (≥$50 gross revenue **or** ≥100 agent queries) fell due 2026-09-14, a Monday, while the
only evaluator (`growth-watchdog`) runs Fridays — next run 09-18. Nothing in the fleet was scheduled to
score it, and both criteria were already impossible by construction: production Stripe is in **test mode**
(`POST /api/checkout` on prod returns `cs_test_…`; every `purchases` row is `cs_test_*`), so real revenue
was $0, and `agent_query` was 0 all-time. A gate with no evaluator on its due date decays into an
unscored verdict, which is indistinguishable from a passed one.

Rules:
1. Score every gate on its due date. If the weekly watchdog cannot reach it, the daily sweep scores it and
   records the raw numbers, the window, and the internal/external session split in the same entry.
2. Before scoring, verify the scoring surface itself. A "failed" measurement can be an infrastructure
   artifact: on 09-13 `scripts/growth-check.mjs` reported `session_id_column: false` on its first run and
   `true` on five consecutive re-runs, with a raw REST read confirming the column exists and is populated.
   Re-run a single inconsistent probe before recording a regression or an outage.
3. A gate whose fallback action also needs traffic (e.g. "run an A/B copy test") cannot be satisfied by
   scheduling the fallback — pair it with a distribution action or record it as blocked-on-traffic, not as
   pending work.

### Resolved edge-case (2026-09-17) — the factory's own deploy smoke lands in the agent-query metric

`agent_query` had been 0 all-time, so "≥100 agent queries" looked like a clean demand signal. On
2026-09-17 the FacturGate ship (`0da7fd6c8f68`) exercised the metered `/api/agent/calculate` route against
production as part of its post-deploy check and wrote **3 `agent_query` rows** (`validate_einvoice` ×2,
`check_eu_vat_id` ×1, 03:50:21–03:50:22). The route stores no `session_id` and no internal marker, so
those rows are byte-for-byte identical in shape to what a real agent caller would produce; only the ship
log distinguishes them. The metric a gate reads was therefore written by the factory itself, and the
defect is silent — a future ship that probes harder inflates the leg it is measured by.

Rules:
1. The internal-traffic marker must cover **server-side route rows**, not just browser sessions
   (`session_id` cannot carry it — the metered route has no cookie).
2. Until that marker exists, score `agent_query` only after attributing every nonzero row against the
   build/ship log by timestamp and tool name, and record the attribution in the gate row.
3. A product that ships with metered tools is a candidate to write its own gate traffic; prefer a
   read-only probe tool or a dry-run flag over calling the metered path for verification.

### Resolved edge-case (2026-09-18) — unattributable sessions accumulate while the marker stays unbuilt

Every daily sweep now reports a small, slowly growing set of sessions that sit outside every CI cluster and
carry no UA, referrer or path. The count went **2 (09-14) → 4 (09-17) → 5 (09-18)**; the newest
(`d8e77f23`, 1 `factory:page_view`, 2026-09-17 22:03:17) is 22 h after `30eb9935`'s last row (09-16 23:57),
on the same page. These are the only external-traffic candidates the factory has ever recorded, and the
per-row data model cannot separate a real visitor from any other client, so each sweep can only restate
"0 provably external" — a metric that never moves is not evidence of no demand, and reporting it as a bare
zero invites the wrong conclusion (that distribution isn't working) as readily as the wrong action
(hibernating a product with no measurable exposure).

Rules:
1. Report the non-CI session **count and its delta** each sweep, not just "0 provably external" — the trend
   is the only signal available until the marker ships (approval item 5).
2. Classify each new non-CI session by **shape and time-of-day** (page mix, evening vs CI-window) and state
   the classification as a hypothesis, never as attribution. A returning pattern across days is stronger
   than a single row but still not proof.
3. Treat the marker as a **hard prerequisite for the Day-30 verdict**, not a nice-to-have: an unattributable
   session pile cannot score a session-based gate, and the pile is what the gate will be reading.

### Resolved edge-case (2026-09-18) — the weekly report was unreadable to its own reader

The 09-18 17:03 Growth Watchdog post was delivered in full and read by nobody: the founder's reply the next
morning was "I do not understand". Every fact in it was correct — 18 days live, 58 sessions all
factory-generated, 0 real revenue, three items needing a decision — and the message was 359 words of
`page_view 161 · checkout_click 4` opened by a metric dump, with the escalations phrased as
"approval item 1/2/5" and the stakes left implicit. It scores **30 errors** on
`scripts/check-slack-report.mjs` (built from this incident): no plain-language headline, internal jargon
and raw ids in the body, no explicit ask, over budget. The failure is not cosmetic: an escalation the
founder cannot parse is an escalation that did not happen, and three of them sat unanswered across a run
that had already been four days late.

Rules:
1. Every factory post to `#loop-ai` follows `skills/slack_reporting.md` and passes
   `node scripts/check-slack-report.mjs <file>` at exit 0 before it goes out. This is a hard gate of the
   same class as `scripts/verify-build.sh`, and it is never weakened to let a message pass.
2. Metrics are not the report. State the meaning, the delta and the consequence in plain words; raw event
   names, column names, session ids and commits are allowed only in the "Numbers, for the record" section.
3. An escalation names the decision, the deadline, the cost of doing nothing and the exact reply to send.
   Never reference queued work by internal index ("approval item 5") — name it by what it does and when it
   was queued.
4. A message that is technically correct but not understandable is a delivery failure, and it is logged as
   one here rather than re-sent unchanged.
