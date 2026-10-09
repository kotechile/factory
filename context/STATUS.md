# Factory Status Map

_Last updated: 2026-10-09 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`. **The factory
built nothing for a fourth day; two internal housekeeping changes landed this morning from the owner's
instruction.** `HEAD == origin/main == b337f77` (two non-product commits, 08:52–08:53 UTC), app image `b337f770…`
== HEAD, `/showcase` 200; no product commit, no build, no registry change, and the build line has **nothing
approved** with only SpendProof (79/100, `context/recon_proposals/2026-10-05_spendproof.md`) ahead of it,
awaiting `@Simon approve` for a fourth full day. **The two changes:** (1) the **Build Watchdog left the pro
tier** (`deepseek-v4-pro` → `deepseek-flash`) — it runs `scripts/verify-build.sh` and reports the result; pro is
now the three frontier agents plus the Friday Growth Watchdog only; (2) the **Slack writing standard is now
enforced** (`skills/slack_reporting.md` v1.1.0 — a required `What's live for you` section, and "the text you
send IS the file you gated") via a new **`Slack Report Gate`** job (18:00 UTC, script-only,
`scripts/check-slack-posts.mjs`) that re-gates what each factory job actually delivered. `hermes cron doctor` is
**CLEAN for a second day — 0 issues across 59 jobs** (+1 = the new gate): Editorial Verify Gate `ok` 10-09 14:00
(second green day) and WordPress Draft Sweep `ok` 10-09 14:16 (fifth green day). The editorial desk shipped **9
new pieces** (Supabase `articles` 56 → 65; pressflow `/app/published` 56 → 65 files; container `99933819…` ==
editorial HEAD `9993381`). Still open for the founder: the **ParcelProof AHS-Dimension one-liner** (UPS 96 as
published vs 48 as intended, 21st day), **item 5** (internal-traffic marker), **item 6** (durable record),
**item 7** (gateway restart, P2), **item 11** (dead-host descriptor + no crawler map, P2), and two **operator
settings**: a low-balance alert on the model provider account, and `STRIPE_AGENT_METER_PRICE_ID` (unset, so
`agent_metered` checkout is **500** though the meter + Price exist). Live `/showcase` `LIVE` ×4 / `RETIRED` ×1;
manifest v2.0.0 / 9 tools sha256 `5e47d410…` byte-identical; all four products return live checkout sessions;
revenue still **$0 real**. Traffic `events` 5527 → **5789** / sessions 3484 → **3633** — 261 the 10-08 16:31
Build Watchdog run and **1 unattributable page view today at 09:34:36Z** — **no provable outside visitor (day
39)**. `agent_query` still **8** (organic 0 on day 39). pressflow internal-only (`/api/articles.json` 401; 65
files). Item 10 CLOSED, re-verified (presets 308 → /showcase). Item 7: gateway pid still `1963330` (2026-09-12)._

_Last updated: 2026-10-09 (**fleet change + Slack writing standard** — agent-run on owner instruction).
**The Build Watchdog left the frontier tier** (`deepseek-v4-pro` → `deepseek-flash`): it runs
`scripts/verify-build.sh` and reports the result, it was green on every one of its last 18 runs, and
`.agents/meta_auditor.md` already named the Flash tier as its target. The pro tier is now the three
frontier agents plus the **Friday Growth Watchdog** only. **The #loop-ai writing standard gained two
rules** (`skills/slack_reporting.md` → v1.1.0): a required **`What's live for you`** section that names
what the founder can use right now and flags anything new, and "the text you send IS the file you
gated" — on 10-08 the Daily Proactive Sweep reported a clean gate (exit 0, 250 body words) and still
delivered a 261-character preamble carrying a commit id and a script name, because the gate ran on a
scratch draft the founder never saw. Two of the last two factory reports failed the gate on the text
that actually landed. A new **`Slack Report Gate`** job (daily 18:00 UTC, `--no-agent --script`, no
model call) re-gates the message each factory job actually sent and stays silent unless one breaks the
standard. Gateway carries **59 jobs**. `AGENTS.md`'s model note is unchanged — that file is
write-protected and the edit was blocked (same as 10-05); it does not contradict the new tiering, it
simply never mentioned the watchdogs' tier._

_Last updated: 2026-10-08 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`. **The factory
built nothing and nothing moved; the one red cron healed.** `HEAD == origin/main == 0cc2d57` (yesterday's sweep
docs commit; tree clean), app image `0cc2d57d…` == HEAD, `/showcase` 200; no product commit and no build in 24 h,
and the build line has **nothing approved** with only SpendProof (79/100,
`context/recon_proposals/2026-10-05_spendproof.md`) ahead of it, awaiting `@Simon approve` for a third full day.
**`hermes cron doctor` is now CLEAN — 0 issues across 58 jobs**: **Editorial Verify Gate ran `ok` 10-08 14:00**
after three red days (the fleet's own self-heal landed in the editorial repo), and **WordPress Draft Sweep ran
`ok` 10-08 14:16** (fourth green day). The editorial desk shipped **9 new pieces** (Supabase `articles` 47 → 56;
pressflow `/app/published` 35 → 56 files) and its container is now `2e79053d…` == editorial HEAD `2e79053` —
**the one-commit deploy lag is closed.** Still open for the founder: the **ParcelProof AHS-Dimension one-liner**
(UPS 96″ as published vs 48″ as intended, 20th day), **item 5** (internal-traffic marker — last night's two
directory views came from the owner's own browser, proving the point), **item 6** (durable record), **item 7**
(gateway restart, P2), **item 11** (dead-host descriptor + no crawler map, P2), and two **operator settings**: a
low-balance alert on the model provider account, and `STRIPE_AGENT_METER_PRICE_ID` (unset, so `agent_metered`
checkout is **500** even though the Stripe meter + Price exist). Live `/showcase` `LIVE` ×4 / `RETIRED` ×1;
manifest v2.0.0 / 9 tools sha256 `5e47d410…` byte-identical; all four products return live checkout sessions;
revenue still **$0 real**. Traffic `events` 5437 → **5527** / sessions 3434 → **3484**, all 10-07 (88 the Build
Watchdog run + 2 owner directory views at 17:58/19:28Z; 0 rows on 10-08) — **no provable outside visitor (day
38)**. `agent_query` still **8** (organic 0 on day 38). pressflow internal-only (`/api/articles.json` 401;
container 56 files, image `2e79053d…` == editorial HEAD). Item 7: gateway pid still `1963330` (2026-09-12)._

_Last updated: 2026-10-07 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`. **The owner
removed the social-distribution workstream and nothing else moved.** `HEAD == origin/main == 8a96080` ("docs:
the editorial LinkedIn/Reddit queue is gone (owner, 2026-10-06)", tree clean), app image `8a96080a…` == HEAD,
`/showcase` 200; no product commit and no build in 24 h, and the build line has **nothing approved** with only
SpendProof (79/100, `context/recon_proposals/2026-10-05_spendproof.md`) ahead of it, awaiting `@Simon approve`.
The editorial desk's LinkedIn/Reddit queue and its prepared cards are **owner-removed** — the stale
`factory_config.distribution_queue` key (12 cards, rewritten 2026-10-06T20:08:26Z) is inert history, **not a
queued ask**. `hermes cron doctor` improved **6 → 1 issue**: all five stale 402 vertical stamps cleared by their
own next run and **WordPress Draft Sweep ran `ok` 10-07 14:16** (third green day), leaving **Editorial Verify
Gate red a THIRD day on a third check** (10-07 14:01, editorial HEAD `64d3043`, article voice **2 problems /
124 checks** §3.9 — the social-voice class is gone with the channel; the gate also flags its own deploy one
commit behind). Surfaces green (`/` 307 → giniloh.com, `/showcase` + 4 products + `/quarterline` + `/billing` +
`/embed/countdown` 200, legacy 503); manifest **v2.0.0 / 9 tools** sha256 `5e47d410…` byte-identical; item 8
holds (4 live checkout sessions, app-less 400, `quarterline` 400, portal 307); `STRIPE_MODE=live`, `sk_live_…` →
`/v1/balance` 200 — but `agent_metered` checkout is **500** (`STRIPE_AGENT_METER_PRICE_ID` unset; the meter +
Price exist). Traffic **5350 → 5437 events / 3385 → 3434 sessions**, all 10-06: 85 the 16:31 Build Watchdog run
+ **2 directory page views at 22:17/22:24Z from the owner's own browser session** (first seen 09-22, six minutes
before his 22:30 commit) → **still no provable outside visitor (day 37)**; `agent_query` still 8 (organic 0,
day 37). Revenue **$0 real** (4 `cs_test_` purchases 09-02, 1 sandbox subscription). pressflow internal-only
(`/api/articles.json` 401; container 35 files, image `5dd08918` one commit behind editorial HEAD; Supabase
`articles` 47 rows — the editorial engine shipped 11 new pieces). `vertical-sync --check` exit 0 (26);
`recon:cadence` exit 0 (2 verticals on 2026-10-05). Item 10 CLOSED, re-verified (presets 308 → /showcase).
Item 7 gateway pid `1963330` (09-12). _canonical source of truth for the fleet's current state_

_Last updated: 2026-10-06 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`. **Nothing
moved in the factory in 24 h**: `HEAD == origin/main == 867a419` (tree clean), app image `867a419d…` == HEAD,
`/showcase` 200, no build, no product change; the build line has **nothing approved** and only SpendProof
(79/100, `context/recon_proposals/2026-10-05_spendproof.md`) ahead of it, awaiting `@Simon approve`. **The one
live change is our own editorial gate**: `hermes cron doctor` improved **12 → 6 issues** — **WordPress Draft
Sweep ran `ok` 10-06 14:16** (the duplicate-slug defect is cleared) and five stale 402 stamps cleared by
their own next run — leaving **Editorial Verify Gate red a second day** (10-06 14:01, editorial HEAD
`efcbe1f`, the writer's social-voice check: 3 problems / 194 checks, `skills/claude_humanizer.md` §3.8) plus
5 stale 402 vertical stamps (next runs 10-07). Surfaces green (`/` 307 → giniloh.com, `/showcase` + 4 products
+ `/quarterline` + `/billing` + `/embed/countdown` 200, legacy 503); manifest **v2.0.0 / 9 tools** sha256
`5e47d410…` byte-identical; item 8 holds (4 live checkout sessions, app-less 400, `quarterline` 400, portal
307); `STRIPE_MODE=live`, `sk_live_…` → `/v1/balance` 200 — but `agent_metered` checkout is **400**
(`STRIPE_AGENT_METER_PRICE_ID` unset; the meter + Price exist). Traffic **5266 → 5350 events / 3337 → 3385
sessions**, all 10-05 (0 rows on 10-06) — **no outside visitor (last 2026-09-23T14:11:42Z → 13 days)**;
`agent_query` still 8 (organic 0, day 36). Revenue **$0 real** (4 `cs_test_` purchases 09-02, 1 sandbox
subscription). Social queue unchanged at **12 product-promotion cards**, 0 ever published, re-seeded
10-06T13:07:32Z. pressflow internal-only (`/api/articles.json` 401; container 33 files, Supabase `articles`
36 rows — the editorial engine shipped 10 new pieces). `vertical-sync --check` exit 0 (26); `recon:cadence`
exit 0 (2 verticals on 2026-10-05). Item 10 CLOSED, re-verified (presets 308 → /showcase). Item 7 gateway pid
`1963330` (09-12). _canonical source of truth for the fleet's current state_

_Last updated: 2026-10-05 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`. **The
approved backlog is empty and the weekly recon has put one build candidate in front of the founder**:
SpendProof (79/100, `context/recon_proposals/2026-10-05_spendproof.md`) — an AI-invoice↔tagged-usage-ledger
reconciliation with an LLM extraction layer declared `usesLlmPrimitive: true` and priced in the $0.50–$3.00
band; awaiting `@Simon approve`. **Item 10 CLOSED** (`bc6c3de`): `/quarterline` is a retirement notice, all
**20** preset URLs **308 → /showcase**, `/embed/countdown` repointed. Owner session also landed the
full-resolution-tile visual gate (`4f66600`, which found and fixed a real CaseProof hero collision, `7b7e767`)
and the two-verticals/LLM-primitive policy pass (`60ae0b9`, `2678217`). Surfaces green (`/` 307 → giniloh.com,
`/showcase` + 4 products + `/quarterline` + `/billing` + `/embed/countdown` 200, legacy 503); manifest
**v2.0.0 / 9 tools** sha256 `5e47d410…` byte-identical; item 8 holds (4 live checkout sessions, app-less 400,
`quarterline` 400, portal 307); `STRIPE_MODE=live`, `sk_live_…` → `/v1/balance` 200. Traffic **4492 → 5266
events / 2886 → 3337 sessions** — all factory e2e runs and the owner's clicks, **no outside visitor (last
2026-09-23T14:11:42Z → 12 days)**; `agent_query` still 8. Revenue **$0 real**. Social queue rewritten 54 → **12
product-promotion cards**, 0 ever published. pressflow internal-only (`/api/articles.json` 401; container 23
files, Supabase `articles` 26 rows). Crons **58 active**; doctor **12 issues / 12 jobs** = 10 stale 402 stamps
+ Editorial Verify Gate (10-05 14:01) + WordPress Draft Sweep (10-05 14:16, duplicate slug on two sites).
`vertical-sync --check` exit 0 (26); `recon:cadence` exit 0 (2 verticals on 2026-10-05). App image
`13478a9…` == HEAD. Item 7 gateway pid `1963330` (09-12). _canonical source of truth for the fleet's current
state_

_Last updated: 2026-10-04 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`. **The build
line restarted after ~11 idle days and every product is now live**: FacturGate (`1336823`), ParcelProof and
CaseProof (`683796b`) all went `status: beta → live` in the owner's operator session, alongside the Factory
Billing portal (`/billing`, v1→v1.4), the one pricing catalog, the `/showcase` redesign with lifecycle badging,
and the Editorial Signature as shared primitives on every product page (`53e7f12`). **No product is `beta` any
more — 4 `live` + 1 `retired`**; live `/showcase` renders `LIVE` ×4 / `BETA` ×0. **Money path re-verified live:**
in-container `STRIPE_MODE=live`, `sk_live_…` (107 chars) → `/v1/balance` 200 `livemode:true`; `POST /api/checkout`
returns live sessions for all four products (`cs_live_…`), app-less → 400, `quarterline` → 400 retired,
`/api/portal` → 307. Manifest **v2.0.0 / 9 tools** sha256 `5e47d410…` byte-identical to the tree; all 20
`/quarterline/calc/*` presets 200 (item 10 — **closed 2026-10-05, `bc6c3de`**: `/quarterline` serves the retirement notice and every preset URL 301s to `/showcase`). **Traffic 1983 → 4492 events / 2886 sessions** — all of it
the launch-day test runs and the owner's own clicks, still **no outside visitor (last unattributable non-test
event 2026-09-23T14:11:42Z)**; `agent_query` 4 → 8 (all factory/billing probes). **Revenue still $0 real** (4
sandbox `purchases`, all `cs_test_*` 09-02). Social queue 42 → 54 cards, 0 ever published. pressflow internal-only
holds (`/api/articles.json` 401; container 23 files, Supabase `articles` 23 rows). Crons **58 active**; doctor
**13 issues / 13 jobs** — 12 stale 402 vertical stamps + WordPress Draft Sweep failed 2026-10-04 14:24 (kie.ai
featured-image Internal Error ×3) with a duplicate-slug CMS defect on two sites. `vertical-sync --check` exit 0
(26). Item 7 gateway pid `1963330` (09-12) unchanged. _canonical source of truth for the fleet's current state_

_Last updated: 2026-10-04 (ParcelProof + CaseProof launch — owner instruction, `683796b`) — **no product is
`beta` any more: every shipped product is `live` (4) or `retired` (1).** The owner's launch call in the
operator session promoted both remaining `beta` products in one commit: `parcelproof` and `caseproof`
`status: beta → live`. Verified, not assumed: both sit AFTER LedgerLink in registry order, so
`defaultInventoryProduct` — the one product an unscoped, product-scoped request resolves to — is unchanged;
both pages already carried the launch surface the older live product (LedgerLink) has (a `<ProductPricing>`
block whose every number reads `src/products/pricing.ts`, plus an agent-surface block naming the product's
WebMCP tools and linking the manifest), so no page change was needed. **Stripe verified live, probed from
outside the container:** `{app:"parcelproof"}` → 200 `cs_live_a15V0gRS…`, `{app:"caseproof"}` → 200
`cs_live_a1rZGxhvrX…`; app-less → 400 naming the inventory; `app=quarterline` → 400 "retired". Four new
launch-surface e2e specs (2 per product). **Live `/showcase` now renders `LIVE` ×4 / `BETA` ×0.** **Two gate
repairs landed with it:** (1) `playwright.config.ts` pins `snapshotPathTemplate` to ONE baseline — the
default `-{platform}` suffix had split `/showcase` into a linux and a darwin file and the 09-04 showcase
redesign refreshed only the darwin copy, so this host's gate was RED (46 passed / 1 failed) on an
already-approved change before any of today's work; the darwin baseline is deleted (Linux is the deploy
target and the only test host). (2) The `/showcase` baseline was re-derived for the badge change after
READING the diff: one contiguous cluster, rows 822–844 × cols 359–790 (2694 px of 2,420,480 — the two status
pills), nothing else moved. **Gate:** tsc / eslint (1 pre-existing warning) / tokens / vertical-sync /
**171 vitest** / `next build` / **51 e2e** (47 + 4 new) / **visual-qa PASS on all four screenshots** — all
green, whole suite now green. Note `visual-qa` failed `facturgate-qa.png` in a standalone run and passed on
the identical image in the gate run plus 3 further runs (16 review calls, 4 of them on that image): the
vision verdict is not reproducible run-to-run (recorded in
`self_improvement_eval.md`), so a red there is a signal to falsify by measurement, never to restyle.
**Revenue still $0 real** (nothing charged yet). _canonical source of truth for the fleet's current state_

_Last updated: 2026-10-04 (FacturGate launch — owner instruction, `1336823`) — **the build line moved for the
first time since 09-22, and the registry gained a `live` product:** FacturGate `status: beta → live` (the
owner's launch call, in the operator session; it was the last thing pending on that product since 09-17).
Shipped with it: every price the page and its WebMCP guide advertise now reads the pricing catalog instead of
a hand-typed copy (with a new wiring guard in `pricing.test.ts`), the agent-surface footer gained the
`/showcase` link, and two e2e specs cover the launch surface. **Stripe verified live:** `{app:"facturgate"}`
checkout → `cs_live_a14b6Sgn…` (one-off) and `cs_live_a1fWj2Ev…` (factory_pro); app-less → 400 naming the
inventory; `app=quarterline` → 400 "retired"; manifest **v2.0.0 / 9 tools** byte-identical to the tree.
**Gate:** tsc / eslint / tokens / vertical-sync / **171 vitest** / `next build` / **47 e2e** green;
`visual-qa` RED on ParcelProof — an untouched surface, 3rd occurrence of the wrap-as-overlap false-positive
class (measured against the DOM and the live baseline; recipe in `ui_component_standards.md`), whose
structural fix is an open owner call. **ParcelProof and CaseProof stay `beta`** — the only two launch calls
left, both able to take money since 10-03. **Revenue still $0 real** (nothing charged yet). _canonical source
of truth for the fleet's current state_

_Last updated: 2026-10-03 (15:30 sweep, every surface re-measured live on `apps.giniloh.com` · **LIVE PAYMENTS
ARE ON — item 1 is RESOLVED**: the founder put the real `sk_live_…` in the deploy env and set `STRIPE_MODE=live`
(≈13:15); re-verified from inside the running container — `GET /v1/balance` **200 `livemode:true`** (was 401 for
~3 weeks) and `POST /api/checkout` now returns live sessions (`app=ledgerlink` → 200 `cs_live_a1x7AzbQ…`,
`app=caseproof` → 200 `cs_live_a1S8pBOv…`); the last structural blocker between the factory and its first real
dollar is gone, though nothing has been charged yet (**revenue still $0 real**: 4 sandbox `purchases` all
`cs_test_*` 09-02) · **the editorial fleet landed: crons 32 → 58 active** (26 new `Evergreen Pipeline: <vertical>`
jobs), registry re-vendored in-repo (`4e88bdc`), `vertical-sync --check` exit 0 · **pressflow is now
internal-only** (`/healthz` 200, `/robots.txt` disallow-all, `/api/articles.json` now **401**, container rebuilt
≈15:00) while article production continues — Supabase `articles` **19 rows** (was 16; three dated 10-03) · **10
days with no visitor of any kind** (last non-test event still 2026-09-23T14:11:42Z; the whole +62 rows since 10-02
are the 10-02 16:31 Build Watchdog Playwright run, and 2026-10-03 has zero rows) · `hermes cron doctor` reports
**14 issues / 14 jobs**: 12 stale 402 stamps (last runs 09-28→09-30, next runs 10-05→10-10) plus **two live
failures today** — WordPress Draft Sweep 14:23 (kie.ai featured-image Internal Error ×3) and
`home_infrastructure_lifecycle_tco` 15:11 (output truncated, 2 in a row) · the social queue **50 → 42 cards, 0
ever published** · nothing built or shipped in this repo, **build line idle ≈11 days** since the 09-22 builds) ·
canonical source of truth for the fleet's current state_

_Last updated: 2026-10-02 (15:30 sweep, every surface re-measured live on `apps.giniloh.com` · **the provider
outage is clearing, not cleared**: `hermes cron doctor` is still NOT clean — a failed last run is reported by 15
jobs (down from 17), but the 15 are the weekly editorial vertical jobs whose last run fell inside the 09-28…09-30
`HTTP 402: Insufficient Balance` window and whose next runs are 10-05 → 10-08, so the labels are stale stamps,
not a live outage; the daily sweep and the Build Watchdog have both run `ok` since 10-01 10:33 · **the live
payment key slot still holds a key ID Stripe rejects (401, re-verified from inside the running container; the
sandbox key in the same env returns 200)** · **9 days with no visitor of any kind** (last non-test event
2026-09-23T14:11:42Z; the whole +63 rows since 09-27 are the 10-01 16:31 Build Watchdog Playwright run, and
2026-10-02 has zero rows) · $0 real revenue (4 sandbox purchases; the one subscription row flipped canceled →
active at 10-02 02:04 but reads `livemode:false` — still sandbox) · the social queue grew 46 → 50 cards, 0 ever
published · pressflow serves 16 articles (was 14) and Supabase `articles` agrees at 16/16 · nothing was built or
shipped in this repo, build line idle ≈10 days since the 09-22 builds) · canonical
source of truth for the fleet's current state_

_Last updated: 2026-10-01 (15:30 sweep, every surface re-measured live on `apps.giniloh.com` · **the factory was
blind for three days**: the provider account ran out of credit, so the 08:00 sweeps of 09-28/09-29/09-30 and three
Build Watchdog runs all died on `HTTP 402: Insufficient Balance` (17 jobs still report a 402 last run) — jobs
resumed `ok` from 10-01 10:33 · **Day-30 (due 09-30) was never scored on its date and is now scored MISS on all
three legs: 0 in-window unique sessions, 4 agent queries (all factory probes), $0 real revenue** · the live
payment key slot still holds a key ID Stripe rejects (401, re-verified from inside the running container; the
sandbox key in the same env returns 200) · **8 days with no visitor of any kind** (last non-test event
2026-09-23T14:11:42Z; all +186 rows since 09-27 are two factory test runs) · the social queue grew 38 → 46 cards,
0 ever published · pressflow published 4 new articles today and the live/supabase article gap closed at 14/14 ·
nothing was built or shipped in this repo, build line idle ≈9 days since the 09-22 builds) · canonical
source of truth for the fleet's current state_

_Last updated: 2026-09-27 (08:00 sweep, every surface re-measured live on `apps.giniloh.com` · nothing was built or
shipped in this repo and the build line has been idle ≈118 h (5 days) · the live payment key slot still holds a key
ID Stripe rejects (401, re-verified from inside the running container; the sandbox key in the same env returns
200) · the seventh consecutive day of factory-only traffic: all 63 new rows are the 09-26 10:01 Build Watchdog
Playwright run and the last non-test event is still 09-23T14:11:42Z (4 days with no visitor) · the social queue is
unchanged at 38 cards, 0 published · pressflow serves the same 15 articles (no editorial deploy in 24 h) ·
**3 days to the Day-30 gate (09-30)**) · canonical
source of truth for the fleet's current state_

## Fleet — 6 bots + 8 contracts

| Bot | Contract | Role | Model |
|---|---|---|---|
| `simon` | `chief_of_staff.md` | Orchestrator, go/no-go, PRD merge | deepseek-v4-pro (→ Claude 3.7 target) |
| `scout` | `market_scout.md` | 30-day signal discovery | deepseek-flash (V4.1 Flash) |
| `phoebe` | `challenger_10x.md` | 10x viral-loop injection | deepseek-v4-pro |
| `product-director` | `director_product.md` | Builds via `agy` (Gemini-only) | deepseek-v4-pro |
| `toby` | `meta_auditor.md` + `growth_watchdog.md` | Quality gate + self-healing + growth gates | deepseek-flash (V4.1 Flash) |
| `echo` | `growth_engine.md` | GTM blueprints + distribution | deepseek-flash (V4.1 Flash) |
| _(transient)_ | `seeder.md` | Ground-zero payload drafts | `delegate_task` subagent |

Supporting profiles on the non-frontier tier (same `deepseek-flash`): `judge`, `publisher`, `radar`,
`drafter`, `editor`, `verifier` and the default profile. DeepSeek serves exactly two ids —
`deepseek-flash` and `deepseek-v4-pro`; older `deepseek-v4-flash*` ids are server-side aliases of
`deepseek-flash`. **Fleet tier (owner, 2026-10-05: only key agents and processes use the pro tier;
extended 2026-10-09).** Pro is limited to the three frontier agents (`simon`, `phoebe`,
`product-director`) and **one** factory watchdog — the Friday **Growth Watchdog**, whose run makes the
Day 7/14/30 judgement calls. The **Build Watchdog was demoted to `deepseek-flash` on 2026-10-09**: it
runs `scripts/verify-build.sh` and reports the result, it was green on every one of its last 18 runs,
and its own contract (`meta_auditor.md`) targets the Flash tier. The 52 editorial pipeline jobs
(26 `Full Pipeline:` + 26 `Evergreen Pipeline:`) and the `drafter` / `editor` / `verifier` profiles
were moved to `deepseek-flash` on 2026-10-05; the pin default in
`editorial-factory/scripts/sync_crons.py` follows so a new vertical does not re-mint a pro job.
(Pro was ~73% of the 30 days' estimated spend before the 2026-10-05 cut; after the 2026-10-09 demotion
the pro tier is one weekly run — the Build Watchdog's daily run was ~$0.04/run, so the saving is small
and the point is tier honesty, not cost.)

## Knowledge — 9 SOPs

`market_recon_last30days` · `recon_vertical_packs` · `marketing_engineering_playbook` ·
`voice_content_engine` · `ui_component_standards` · `design_review` · `stripe_gating_workflow` ·
`webmcp_integration` · `self_improvement_eval`

## Heartbeat — cron fleet (59 jobs on the gateway: 4 factory agent jobs, 52 editorial, 3 script-only)

The factory's own jobs deliver to `slack:C0BTPDKQXU2:1788974638.867929`. The gateway carries **59 jobs**
at 2026-10-09 — 4 factory agent jobs (Weekly Market Recon, Daily Proactive Sweep, Build Watchdog, Growth
Watchdog), 52 editorial pipeline jobs (26 news + 26 evergreen, reconciled from
`editorial-factory/context/verticals.json` by `sync_crons.py`), and 3 script-only jobs (Editorial Verify
Gate, WordPress Draft Sweep, Slack Report Gate — `no_agent`, no model call). **Only the Friday Growth
Watchdog is pinned to `deepseek-v4-pro`**; every other model-backed job runs `deepseek-flash` (see the
model note above). The Editorial Verify Gate is a daily `verify.sh` + pressflow-image-vs-HEAD check,
silent when green; the Slack Report Gate re-gates the message each factory job actually delivered
(`scripts/check-slack-posts.mjs`) and is silent unless a report broke the writing standard.

⚠️ **Gateway restart still owed (operator action, no visible symptom left).** The `cron/jobs.py` fire-claim fix is
applied in the tree (`heartbeat_fire_claim` no longer takes the delivery-held `_fire_job_lock`) but the running
gateway process is still the one started **2026-09-12 15:13**. The last stale `Interrupted by shutdown` label
(`gpu_hardware`) **recorded `ok` on 2026-09-23 07:13:13Z**, so the mislabel has now gone a full week without a
recurrence and nothing on the board is mislabelled. Restart `hermes_cli.main gateway run` while no cron run is in
flight when convenient; see `hermes-cron-debugging/references/fire-claim-misreport.md`.

| Job | Schedule (UTC) | Model | Workdir |
|---|---|---|---|
| Weekly Market Recon | Mon 14:30 | deepseek-flash | `software-factory-core` |
| Daily Proactive Sweep | daily 15:30 | deepseek-flash | `software-factory-core` |
| Build Watchdog (Toby) | daily 16:30 | deepseek-flash | `software-factory-core` |
| Growth Watchdog | Fri 17:00 | **deepseek-v4-pro** | `software-factory-core` |
| Editorial Verify Gate | daily 14:00 | (script, no model) | `editorial-factory` |
| WordPress Draft Sweep | daily 14:15 | (script, no model) | `editorial-factory` |
| Slack Report Gate | daily 18:00 | (script, no model) | `software-factory-core` |
| Full Pipeline: <26 verticals> | per registry, 10:30–13:00 | deepseek-flash | `editorial-factory` |
| Evergreen Pipeline: <26 verticals> | per registry, 17:30–20:00 | deepseek-flash | `editorial-factory` |

## Closed loop

```
Scout (Mon) → Simon PRD → [@Simon approve] ─┬─ Product Director (agy, Gemini)
                                             └─ Echo (GTM blueprint)          ← parallel
   Seeder (drafts) → Growth Watchdog (Fri) → Day 7/14/30 gates
   Telemetry (Supabase events) ───────────────▲
   pSEO / embed / .well-known → traffic ──────┘
```

## Recon vertical scoping (landed 2026-09-20)

Discovery is now vertical-scoped: a sweep declares one vertical before searching (`Stage 0`), draws its
query phrasings from `skills/recon_vertical_packs.md`, and updates the rotation queue in
`context/vertical_coverage.md`. The factory's 26 audience verticals come from a vendored snapshot of the
editorial registry (`context/editorial_verticals.json`, provenance included — source repo, file commit,
sha256, fetch time), so the guard runs without a sibling checkout; `scripts/vertical-sync.mjs`
regenerates the inventory and `--check` (wired into `scripts/verify-build.sh` as `npm run verticals:check`)
fails on a stale inventory block, a missing/unknown verdict row, or a snapshot behind the live registry.
Reason: 4 of 5 PRDs sat in one vertical cluster (money/document reconciliation) while the archetypes were
domain-agnostic — the prior query book had been pruned by its own improvement loop onto two
compliance-shaped phrasings. Only verticals with an existing distribution channel advance to a build
recommendation.

**First vertical-scoped run (2026-09-21 06:00, on time, `ok`):** declared `warehouse_automation_robotics_capex`
(out of the never-scanned queue), produced one candidate — **CaseProof (78)**, the buyer-side audit of a
warehouse-automation business case (`context/recon_proposals/2026-09-21_caseproof.md`, build ≈3.5 h) — now
open as approval item 9. The free-incumbent check excluded the naive calculator (free vendor ROI
calculators exist) and left the adversarial re-run + multi-quote comparison in scope. Runners-up: 66
(sustained-throughput validator, shortlist) and 63 (peak-labour vs rented capacity, defer).
`scripts/vertical-sync.mjs --check` → exit 0 (26 verticals, no drift).

## Architecture — subpaths under one deploy (moved 2026-09-23)

**Host: `https://apps.giniloh.com`.** `9eb43a5` (2026-09-23 01:57 UTC, owner) migrated the deploy off
`factory.aichieve.net`, which now returns **503 on every path**; `/` 307s to `https://giniloh.com`.

- `/` — 307 → `https://giniloh.com` (the primary brand site).
- `/showcase` — Factory Showcase / directory (search, status badges, WebMCP agent catalog).
- `/<slug>/` — each product's UI; `/ledgerlink/`, `/facturgate/`, `/parcelproof/` and `/caseproof/` are all
  `live` (the last two promoted 2026-10-04, `683796b`), `/quarterline/` is retired (registry status `killed`
  since 2026-09-19, `bc3d556`) but still served.
- `/<slug>/calc/*` — per-product pSEO; `/api/*`, `/embed/*`, `/.well-known/*` are shared.
- Payments are product-generic since `bc3d556`: `/api/checkout` and the Stripe webhook resolve the product
  from the request (`app`) or the registry, with the receipt email templated per product. **One residual
  default**: an `app`-less request still resolves to `quarterline`, i.e. the retired product.

## Retired product — QuarterLine (retired 2026-09-19, `bc3d556`)

`https://apps.giniloh.com/quarterline` — 2026 self-employment tax + QBI + estimated-payment
calculator. The owner retired it from active inventory after the Q3 2026 tax deadline window
(registry status `live` → `killed`, retirement copy live on the showcase). The route, the calculator and
the 20 `/quarterline/calc/*` presets are untouched and still 200; `/.well-known/mcp.json` is generated
from `registry.ts` since 2026-09-17 (`a57539f`) — do not hand-edit. **Two surfaces were not retired with
it** (measured 2026-09-20): the manifest still advertises its two tools (`calculate_qbi_deduction`,
`calculate_quarterly_estimate`), and the default `pdf_audit_export` checkout still carries
`app=quarterline` in the Stripe session metadata.

## Live product — FacturGate (built 2026-09-17, launched 2026-10-04)

`https://apps.giniloh.com/facturgate` — EN 16931 / CIUS-FR e-invoice pre-send gate and
Factur-X (CII) / UBL 2.1 converter, built from queue item 4 (`e77db64`, owner-approved 2026-09-17).
Registry status is **live** (owner launch call, `1336823`, 2026-10-04); the owner's review that
released it, and the pricing wiring it required, are in `pending_approval.md`.

- Engine `src/lib/calc/einvoice/` — 65 implemented rule checks (55 EN 16931 core ids + the 10
  `BR-FR-*` CIUS-FR overlay ids), totals recomputed from the lines in integer cents with an explicit
  `delta` and the destination country's VAT rounding policy (PL at the total, EN 16931 core per
  line). 25 known-answer vitest vectors pin the exact finding list per rule family; an absent or
  unmappable field throws `EinvoiceFieldError` naming its rule id — no invented defaults.
- Surfaces: `/facturgate`, 12 `/facturgate/calc/*` presets, and `validate_einvoice`,
  `convert_invoice_to_facturx`, `check_eu_vat_id` registered via `navigator.modelContext.registerTool`
  and advertised in the generated `/.well-known/mcp.json` (v1.2.0).
- Stated v1 limits (published in the product's own coverage panel, not hidden): EN 16931's ~1,300
  rules are covered by the measured high-frequency families only; PDF/A-3 hybrid authoring,
  EXTENDED-CTC-FR lifecycle fields, e-reporting/CDAR and national serializations (PL KSeF FA(3) XML)
  are P1; `check_eu_vat_id` is offline format + checksum — VIES status is not queried.

## Live product — CaseProof (built 2026-09-22, launched 2026-10-04)

`https://apps.giniloh.com/caseproof` — the buyer's side of a warehouse-automation business case,
built from approval item 9 (`78d0739`, owner-approved 2026-09-22, PRD `context/recon_proposals/2026-09-21_caseproof.md`,
§5 v1 scope guard only). Registry status is **live** (owner launch call, `683796b`, 2026-10-04) — it
was arguably the strongest candidate on the price ladder ($0.50/call, the only product where the
agent rate exceeds the page rate) and now carries a launch-surface e2e spec pair.

- Engine `src/lib/calc/caseproof/` — pure, no I/O, no clock, no LLM: the **fully loaded** labour rate with its
  component breakdown (wage + employer payroll burden + benefits + FLSA overtime premium + turnover
  replacement); the vendor's quote line items as CSV rows, echoed and categorized, never re-priced (an
  unmapped row is surfaced, a blank amount is an unpriced line — never $0); §179 (with its phase-out) then
  100% bonus then straight-line **by tax year**, from a cited rule table (2026 only; an uncited year is
  refused, never estimated); the after-tax cash flow per bid (ramp, downtime at the contracted availability,
  error saving, maintenance/licence, amortized one-time lines, lease/RaaS escalation and the peak-fleet
  weight, debt service) with payback in months, IRR and NPV at the hurdle rate; the audit (the vendor's own
  assumptions re-run through the same engine, then the buyer's applied one input group at a time, break-even
  per assumption, ranked confirm-in-writing list); and 2–3 bids on one cash model with the solved crossing
  point and the volume −10/−20/−30%, capex +15%, maintenance +25% sensitivity grid.
- **29 known-answer vectors** pin the PRD's arithmetic: a proposal claiming **14 months** reproduced at
  **14.1** and audited at **41.0**, with the driver chain reconciling month for month; the §179 phase-out
  ($5,000,000 basis → $1,650,000 allowed, −$910,000, $0 at $6,650,000); the capex-vs-subscription crossing at
  a **40.0% seasonal premium**; a fully stated quote producing **zero flags**; an empty maintenance field
  reported **`unstated`** and blocking a pass.
- Surfaces: `/caseproof`, **6** `/caseproof/calc/*` presets, and `audit_automation_case` +
  `compare_automation_bids` + `after_tax_payback` ($0.50/call) registered via
  `navigator.modelContext.registerTool` and advertised in the generated `/.well-known/mcp.json`
  (**v1.5.0, 9 tools**).
- Stated v1 limits (PRD §5 scope guard, published in the product's own coverage panel): no PDF/OCR
  extraction of a proposal, no rate tables or benchmarks of our own, no throughput *sizing* model, the §179
  taxable-business-income limitation and MACRS conventions are not modelled, and a paid decision-pack export
  / Stripe checkout is not wired (the CSV pack ships free).

## Live product — ParcelProof (built 2026-09-18, launched 2026-10-04)

`https://apps.giniloh.com/parcelproof` — carrier invoice DIM-weight / surcharge audit, built from
queue item 4's ParcelProof half (`3584a62`, owner-approved 2026-09-18, docs `73cad11` + `19d9529`).
Registry status is **live** (owner launch call, `683796b`, 2026-10-04).

- Engine `src/lib/calc/parcelaudit/` — billable weight recomputed as `max(actual, ceil(L)*ceil(W)*ceil(H)/divisor)`
  with the divisor resolved by carrier × service × ship date (UPS/FedEx 139; USPS 166 before 2026-07-12,
  then 139), the round-up rule applied to every dimension, and the cubic-inch threshold enforced. An
  unmapped service or out-of-range date throws with its rule id — no divisor is ever defaulted. Accessorial
  eligibility, service-commitment refunds and the per-carrier dispute clock (UPS ~30 / FedEx ~21 days) are
  recomputed from the record; unpriceable lines report `unverifiable-rate`, never $0. 32 known-answer
  vitest vectors pin the arithmetic.
- Surfaces: `/parcelproof`, **6** `/parcelproof/calc/*` presets (all probed 200 on 2026-09-19), and
  `audit_carrier_invoice` + `compute_billable_weight` registered via `navigator.modelContext.registerTool`
  and advertised in the generated `/.well-known/mcp.json` (**v1.3.0, 8 tools**).
- Stated v1 limits (PRD §5 scope guard): zone-matrix derivation, published fuel tables, LTL/ocean modes and
  rate-card auto-mapping stay P1; every line outside v1 is reported `unverifiable-rate` rather than passed.
- **Open question for the owner:** the tariff table makes UPS's AHS-Dimension trigger a longest side > 96″
  while FedEx triggers at > 48″, so a 40″ parcel is ineligible at *both* carriers. If the intended UPS
  trigger is 48″, that is a one-line change in `src/lib/calc/parcelaudit/surcharges.ts` and the vectors follow.

## Infrastructure

- **Quality gate** — `scripts/verify-build.sh`: tsc → eslint → token-lint → vitest →
  build → Playwright (visual + axe a11y) → Gemini vision-QA (`visual-qa`).
- **Design flywheel** — `visual-qa --suggest` → `context/design_backlog.md` → Toby triage.
- **Telemetry** — `src/lib/telemetry.ts` → Supabase `events` (page_view, export_click,
  checkout_click, agent_query, reconcile_click). `scripts/growth-check.mjs` now takes the product as an
  argument (`process.argv[2] || GROWTH_PRODUCT || "quarterline"`, `bc3d556`) instead of being hard-scoped,
  but `reconcile_click`/`agent_query` still are not counted by it, and the internal-traffic marker (queue
  item 5) remains unbuilt.
- **Growth surfaces** — pSEO routes, embed widget, `.well-known` A2A manifests.
- **Config-as-data** — Gemini key/model/prompt live in Supabase `factory_config`
  (modifiable without redeploy).

## Database — Supabase (all applied, no pending migration)

| Table | Purpose | Status |
|---|---|---|
| `factory_config` | runtime secrets/config (Gemini key, QA model) | ✅ live |
| `events` | growth telemetry | ✅ live (read 2026-09-26, full paged read) — **1609 rows** (parcelproof 497 / facturgate 333 / factory 231 / quarterline 228 / caseproof 181 / ledgerlink 139), last write **2026-09-25T10:02:14Z** (≈22 h silent at the sweep); **981 session ids**, 198 null-session rows; every 09-24 and 09-25 row falls inside the 10:00–10:05 Build Watchdog Playwright window (62 rows on each day), and the session ids before it are the unattributable ones recorded in the 09-23/09-24 entries (returning browser `30eb9935` last seen 09-22T01:25:12Z; `59a27597` last seen 09-23T14:11:42Z, three factory-page `page_view`s, nothing since — **the last non-test event**) — **0 provably external in 26 days**. **4 `agent_query` rows, all factory ship probes** (facturgate ×3, 2026-09-17 03:50; parcelproof ×1, 2026-09-18 22:07) — organic agent queries 0; `product=caseproof` reads **181** rows, all factory verification runs |
| `subscriptions` | Stripe subscription records (webhook) | ✅ live |
| `purchases` | one-off PDF-export purchases (webhook) | ✅ live |

`supabase/schema.sql` is the complete, re-runnable source of truth for all four tables.

## Environment

Coolify env vars **added** (Supabase URL/service-role/anon, Stripe, Resend). Local `.env`
mirrors them.

## Remaining / dormant

1. Distribution is the binding constraint — **0 provably-external sessions / 0 organic `agent_query` / $0 real
   revenue in 23 days live**; production Stripe is still practice mode (`cs_test_` checkout sessions, `livemode:false`
   read back from the Stripe API — fresh probe 2026-09-23, `cs_test_a1l9pF2VmGwT3oDxyoyh5dvCJ199BQZYGbjPH4ccQGlqX4l3mv6hGtO0p7`
   via `app=ledgerlink`; 4 `cs_test_*` purchases all 09-02). **The mode split now exists** (`dfc2851`): deploy env has
   `STRIPE_MODE=test`, `STRIPE_SECRET_KEY_TEST=sk_test_…` and a **live pair whose secret `mk_1UAeGxJaTDc3aAp0lG3UwbFj`
   is the key's ID, not the key** — read-only `GET /v1/balance` → HTTP 401 *"This looks like the ID of an API key rather
   than the key itself"*; `src/lib/stripe/mode.ts` needs the `sk_live_` prefix, so `STRIPE_MODE=live` with that value is
   an explicit throw. The remaining step to real revenue is one paste.
   Eleven standalone session ids sit outside every CI cluster but carry no UA/referrer, so they are unattributable,
   not provably external (`30eb9935` is a returning browser, 09-10 → 09-22, **24 rows across four products on
   seven separate days** — it did **not** return on 09-23; `3b3193ce` returned 09-19; `e41dfb4c` 09-19 21:50;
   **five new single-visit sessions in the 26 h to 08:00 09-23**, two of them showing the directory-then-product
   click pattern no factory test run produces); 198 null-session rows carry every `agent_query`,
   `checkout_click` and `export_click` row. The agent tier's only rows are the 4 factory ship-probe `agent_query`
   rows (3 FacturGate + 1 ParcelProof), so it is factory-exercised, not demanded. The pSEO footprint is 44
   indexable routes (20 quarterline + 12 facturgate + 6 parcelproof + 6 caseproof, all 200 on 2026-09-23 on the new
   host) justified by traffic that is still 100 % factory-generated, and **nothing maps them for crawlers**
   (`/robots.txt` and `/sitemap.xml` 404, no producer in the repo — item 11); the Day-7 fallback shipped before its
   preconditions and remains unreviewed; the Day-14 gate scored an honest MISS on 09-14 and Day-30 (≈09-30, 3 days out)
   inherits the same $0 and is formally gated on the still-unbuilt internal-traffic marker. **The `distribution_queue`
   now holds 38 ready items, 0 published** (`updated_at` 2026-09-26T06:41:31Z): the editorial repo's own change
   (`5c7df8a`, `scripts/seed_distribution.py` as step 4c of the publish pass) made the to-do cards automatic, so a
   cron does produce this queue now — the 09-25 00:36 queue rewrite (15 → 6) is superseded. **The four articles
   deleted from the live pressflow site at 00:36 UTC on 09-25 are back**: the pressflow container was rebuilt
   2026-09-26 ≈06:39 (image `536219b…` == the editorial repo's HEAD) and `/api/articles.json` serves **15** items
   (`published/` 15 files, dir mtime 06:39), including the four deleted slugs and three published today. The
   deletion itself stays unattributable (no traefik access logs; pressflow logs only its startup banner). Supabase
   `articles` holds 10 rows against those 15 live files — five live articles have no row (new observation, P2).
   **The three products recorded as `beta` in this snapshot have since launched** (FacturGate 2026-10-04,
   `1336823`; ParcelProof + CaseProof the same day, `683796b`) — no product is `beta` any more, so every
   "public launch call is the founder's" note below is settled. The build line ran twice on 2026-09-22 (item 8
   `b6e6555`, item 9 `78d0739`) and nothing since; the open queue holds item 1 (the live payment key — one paste),
   item 5 (internal-traffic marker + migration), item 6 (durable record), item 7 (gateway restart, no visible symptom
   left; cron doctor clean), **item 10** (the three public QuarterLine surfaces — **closed 2026-10-05,
   `bc6c3de`:** notice page + every preset URL 301s to the directory + embed repointed) and **item 11** (the
   migration leftovers: a descriptor file naming the dead host + no crawler map).
2. Dynamic OG images — deferred (metadata OG ships; `@vercel/og` route is a later nicety).
3. DeepSeek reliability — daily-sweep cron failed once ("can't reach model provider");
   monitor fleet-wide.
4. Front-end login UI — not built (optional per PRD); subscription/export gating is
   service-role only until it ships.
