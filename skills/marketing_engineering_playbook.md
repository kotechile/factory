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
*   **Action authorization:** Non-destructive gate actions (pSEO expansion, A/B copy tests) run fully
    autonomously. Destructive actions (product hibernation/archive) require Slack human confirmation —
    the watchdog proposes to #loop-ai and waits for `@Simon` sign-off before stopping the Coolify app.
*   **Quantitative Gates:**
    *   **Day 7 Gate:** $\ge 50$ unique visitors, $\ge 1$ paid or agent event. If unmet $\rightarrow$ trigger pSEO expansion.
    *   **Day 14 Gate:** $\ge \$50$ gross revenue or $\ge 100$ agent queries. If unmet $\rightarrow$ run A/B copy test.
    *   **Day 30 Gate:** Break-even vs server cost. If failed $\rightarrow$ hibernate product and log learnings to `skills/self_improvement_eval.md`.

---

## 4. The Human-in-the-Loop Choice Menu

For every product shipped by the factory, the human founder is presented with a 1-page selection menu:

| Option Category | Low Effort (100% Autonomous) | High Impact (Human Assisted - 5 min) |
|---|---|---|
| **Immediate Infiltration** | Automated WebMCP & AI Directory submission. | Approve & post Echo’s pre-drafted reply to the source Reddit/X thread. |
| **SEO & Discoverability** | Deploy 50 programmatic SEO landing pages via Next.js dynamic routes. | Submit custom URL to Google Search Console / Bing Webmaster. |
| **Direct Outreach** | Expose embeddable iframe widget and `.well-known/ai-plugin.json`. | Send Echo's 3-sentence email draft to 10 targeted newsletter authors or CPAs. |
| **Conversion Optimization** | Enable dynamic countdown timer & statutory citation badges. | Pin personal endorsement or thread on personal X/LinkedIn profile. |
