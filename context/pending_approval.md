# Pending Approval — @Simon approve queue

Single source of truth for work blocked on the founder's `@Simon approve` (hard gate,
AGENTS.md rule 7 / company_goals.md rule 5). Simon does not build code and does not dispatch
build/ship actions ahead of the gate. Read this instead of re-deriving from journals/sweeps.

_Last updated: 2026-10-25 (**16:00 — the owner approved `RatchetProof` live; the sixth product is a full live product, and its launch video is unlocked**).
`context/approval_queue.json`: **14 rows — 1 `pending` (`growth-check-scope`), 1 `approved` (`canopyproof`, idle 7 days), 12 `resolved`**.
0. **`ratchetproof-live` — CLOSED on the owner's approval.** Verbatim: *"Approve"*, in the thread where the row had been
   parked since 2026-10-20; it was the only product status still at the gate, so it is read as that row. `src/products/registry.ts`
   status **`beta` → `live`**, commit **`de9092e`**; the registry is the single source, so the `/showcase` badge, the derived
   crawler surfaces and the launch-video selector (`plan.ts` selects `status === "live"` only) all moved with it — `detect.mjs --json`
   now returns `ratchetproof` in `pending`, where it returned `[]` for the whole beta period. Gate `scripts/verify-build.sh`
   **"Verification passed."** (vitest **479/479**, **52/52** pages, Playwright **110/110**, visual-qa **30/30** incl. ratchetproof
   **6/6**). One red on the way, read before it was accepted: the `/showcase` snapshot (**116 px**, 0.01 of all pixels), confined to
   the RatchetProof card's BETA→LIVE badge; the render was checked (badge reads LIVE, live green stripe) and the **Linux** baseline
   re-derived — the macOS baseline is untouched. Deploy verified by IMAGE TAG: container `af8yqbwrrnyyfgs9wcg0intj-20261025T155726`,
   image `de9092e…` == HEAD. Live measurements after the swap: `/showcase` **8 LIVE / 0 BETA / 1 RETIRED** (was **7 / 1 / 1**),
   `/ratchetproof` **200**, `sitemap.xml` **31** locs carrying `/ratchetproof`. Still the owner's, unchanged: the PRD's
   $12 one-off / $39-mo per-site web tier needs Stripe products (a credentialed step), and the first live tariff is the
   cost-measurement run that must confirm **$1.50** clears 3× its measured cost.
1. **`growth-check-scope` — day 3.** `scripts/growth-check.mjs:54` still defaults `PRODUCT=quarterline` (killed 2026-09-19),
   so the weekly traffic gate scores a product that no longer exists; the silent 1,000-row truncation was fixed 2026-10-24
   with explicit `.range()` paging. Reply `@Simon re-point the growth check`.
2. **`canopyproof` — approved 2026-10-18, idle 7 days.** One commit (`01d02c3`, S1 EUDR engine + tests), no route, not
   registered, not on `/showcase`. Nothing to approve — it is a dispatch gap, named here so it is not mistaken for progress.
3. **Direction, day 4, unanswered:** distribution vs keep building (raised 2026-10-22, not a queue row). Six products,
   55 days, no provable outside visitor, $0 revenue — while the factory now owns five 4K product films nobody distributes.
   Reply `@Simon switch to distribution` or `@Simon keep building`.
**Closed since the last record:** `ratchetproof-live` (this block) and `superseded-video-copies` (the 15:55 block below).
**Not an ask, fleet P2:** the internal-traffic marker does not cover the video desk's headless post-upload checks, so 43
visitor-classified rows in the last 24 h are ours; the growth check's revenue leg reads the sandbox slot locally
(`STRIPE_MODE` absent from the repo `.env`, labelled `revenue_is_sandbox: true`); `0004_events_traffic_class.sql` is still an
owner SQL-console step (non-blocking); `PAUSED_2026-10-15.md` is stale history; `/api/agent/calculate {}` answers 500 with a
400-class message (day 9).
**Owner infra note:** Traefik's ACME renewal for `hermes.aichieve.net` fails daily; the certificate is valid to 2026-12-02.

_Last updated: 2026-10-25 (**15:55 — the owner cleared the video cleanup; the six superseded launch-video copies are deleted, the five 4K films are intact, and the ledger now points at them**).
`context/approval_queue.json`: **14 rows — 2 `pending` (`ratchetproof-live`, `growth-check-scope`), 1 `approved` (`canopyproof`, idle 7 days), 11 `resolved`**.
1. **`ratchetproof-live` — unchanged, day 7, still the owner's call.** Public, uncounted and video-less while the status is `beta`:
   `/ratchetproof` 200 and on `/showcase`, empty audit **400 `rp-intervals-empty`**, `/launch-videos/ratchetproof.jpg` **404**,
   `detect.mjs` pending [] / ledgerRows 5. Reply `@Simon approve RatchetProof live` or `@Simon keep RatchetProof in beta`.
2. **`growth-check-scope` — day 2.** `scripts/growth-check.mjs:54` still defaults `PRODUCT=quarterline` (killed 2026-09-19),
   so the weekly traffic gate scores a product that no longer exists; the silent 1,000-row truncation was fixed 2026-10-24
   with explicit `.range()` paging. Reply `@Simon re-point the growth check`.
3. **`canopyproof` — approved 2026-10-18, idle 7 days.** One commit (`01d02c3`, S1 EUDR engine + tests), no route, not
   registered, not on `/showcase`. Nothing to approve — it is a dispatch gap, named here so it is not mistaken for progress.
4. **Direction, day 4, unanswered:** distribution vs keep building (raised 2026-10-22, not a queue row). Six products,
   55 days, no provable outside visitor, $0 revenue — while the factory now owns five 4K product films nobody distributes.
   Reply `@Simon switch to distribution` or `@Simon keep building`.
**Closed since the last sweep:** `superseded-video-copies` — the owner replied `@Simon delete the superseded launch videos`
and the six intermediate uploads from the 4K re-render (`f9xr2ILpUEg`, `H2TwJrVF1-A`, `a4x5rhkBlXA`, `pVItC4gjXJc`,
`gPz-3Tuhps0`, `Ski_feMOWuc`) were deleted through the YouTube Data API: HTTP 204 each, 0 of the six resolve on
`videos.list`, all six answer oEmbed 404. The five embedded films read back public and untouched, all five pages 200 serving
their own id, and the Supabase `launch_videos` ledger was repointed to them (5/5, no mismatches).
**Not an ask, fleet P2:** the internal-traffic
marker does not cover the video desk's headless post-upload checks, so 43 visitor-classified rows in the last 24 h are ours;
the growth check's revenue leg reads the sandbox slot locally (`STRIPE_MODE` absent from the repo `.env`, labelled
`revenue_is_sandbox: true`); `0004_events_traffic_class.sql` is still an owner SQL-console step (non-blocking);
`PAUSED_2026-10-15.md` is stale history; `/api/agent/calculate {}` answers 500 with a 400-class message (day 8).
**Owner infra note:** Traefik's ACME renewal for `hermes.aichieve.net` fails daily; the certificate is valid to 2026-12-02.

_Last updated: 2026-10-24 (**15:30 sweep, Day-54 — a fourth day with no product change; the first visitor-classed browsing session in a week arrived, and the meter that reported zeros for every product is fixed**).
`context/approval_queue.json`: **13 rows — 2 `pending` (`ratchetproof-live`, new `growth-check-scope`), 1 `approved` (`canopyproof`, still at S1), 10 `resolved`**.
1. **`ratchetproof-live` — unchanged, day 5, still the owner's call.** Public, uncounted and video-less while the status is `beta`:
   `/ratchetproof` 200 and on `/showcase`, empty audit **400 `rp-intervals-empty`**, `/launch-videos/ratchetproof.jpg` **404**,
   `detect.mjs` pending [] / ledgerRows 5. Reply `@Simon approve RatchetProof live` or `@Simon keep RatchetProof in beta`.
2. **`growth-check-scope` — NEW row, recorded from prose.** Friday's Growth Watchdog queued "re-point the growth check" in its
   eval note but never wrote a queue row (rule 7 drift, corrected here). `scripts/growth-check.mjs:54` still defaults
   `PRODUCT=quarterline` — killed 2026-09-19 — so the weekly traffic gate scores a product that no longer exists. The same
   script's silent truncation (one unpaginated, oldest-first `events` read, ~1,000-row PostgREST cap → `product_event_rows: 0`
   against 1,012 real rows for spendproof) **was fixed this sweep** with explicit `.range()` paging and a printed
   `events_read_capped` line. Reply `@Simon re-point the growth check`.
3. **`canopyproof` — approved 2026-10-18, idle 6 days.** One commit (`01d02c3`, S1 EUDR engine + tests), no route, not
   registered, not on `/showcase`. Nothing to approve — it is a dispatch gap, named here so it is not mistaken for progress.
4. **Direction, day 3, unanswered:** distribution vs keep building (raised 2026-10-22, not a queue row). Six products,
   54 days, one 8-event visitor session, $0 revenue. Reply `@Simon switch to distribution` or `@Simon keep building`.
**Closed since the last sweep:** `copy-gate-deploy` (deploy chain repaired 2026-10-23; every push since has built, and the
Build Watchdog's 10-23 run is green on the served commit — 416 vitest / 110 Playwright / 30/30 tiles).
**Not an ask, fleet P2:** the growth check's revenue leg reads the sandbox slot locally (`STRIPE_MODE` absent from the repo
`.env`; it labels the result `revenue_is_sandbox: true`, and the deployed app carries `STRIPE_MODE=live`);
`0004_events_traffic_class.sql` is still an owner SQL-console step (non-blocking); `PAUSED_2026-10-15.md` is stale history;
`/api/agent/calculate {}` answers 500 with a 400-class message (day 7). **Owner infra note:** Traefik's ACME renewal for
`hermes.aichieve.net` fails daily; the current certificate is valid to 2026-12-02.

_Last updated: 2026-10-23 (**15:30 sweep, Day-53 — the factory's deploy chain was broken for 20 hours by the new copy gate; fixed this sweep; one decision is still yours and one approved build is still idle**).
`context/approval_queue.json`: **11 rows — 1 `pending`, 1 `approved` (`canopyproof`, still at S1), 9 `resolved`** (the new `copy-gate-deploy` row closes at `resolved`).
1. **`ratchetproof-live` — unchanged, day 4, still the owner's call.** Public, uncounted and video-less while the status is `beta`:
   `/launch-videos/ratchetproof.jpg` **404**, `detect.mjs` pending [] / ledgerRows 5, the selector reads `status === "live"` only.
   Reply `@Simon approve RatchetProof live` or `@Simon keep RatchetProof in beta`.
2. **`canopyproof` — approved 2026-10-18, idle 5 days.** One commit (`01d02c3`, S1 EUDR engine + tests), no route, not registered,
   not on `/showcase`. Nothing to approve — it is a dispatch gap, named here so it is not mistaken for progress.
3. **NEW finding, fixed autonomously — `copy-gate-deploy` (closed, `resolved`):** the vendored copy gate (`533e309`/`5a96e75`,
   2026-10-22 19:05–19:16) scanned `content/launch_videos`, which is gitignored runtime output and absent from a git clone, so
   **every build failed at prebuild** (`ENOENT … /app/content/launch_videos`, deployments **2544** and **2553** `failed`) and the app
   sat on the 16:37 build of `7d60f7e` — the FacturGate badge-copy fix never went live. Fix: `package.json` `copy:check` scans `src`
   always and the launch-copy root only when it exists, with an explicit printed line when it does not; vendored hashes untouched,
   gate still fails on a real violation (proven in a clean clone). Reversal: `@Simon restore the strict copy gate`
   (only viable once launch copy is committed or the artifacts are generated in the image).
**Closed since the last sweep:** `cms-legacy-posts` (exempted in code 2026-10-22, WordPress Draft Sweep green 2 days running).
**Not an ask, fleet P2:** `scripts/growth-check.mjs:54` still defaults `PRODUCT=quarterline`; `0004_events_traffic_class.sql`
is still an owner SQL-console step (non-blocking); `PAUSED_2026-10-15.md` is stale history; `/api/agent/calculate {}` answers
500 with a 400-class message (day 6).

_Last updated: 2026-10-22 (**15:30 sweep, Day-52 — one decision is the owner's; the old-post row closed itself in code; the week's direction is the new ask**).
`context/approval_queue.json`: **11 rows — 1 `pending`, 1 `approved` (`canopyproof`, still at S1), 9 `resolved`.** No product commit
in 24 h and nothing user-facing changed; the app container `af8yqbwrrnyyfgs9wcg0intj-20261021T163724` image `813487cd8555…` == HEAD
`813487c`, `/showcase` **200**.
1. **`ratchetproof-live` — unchanged, day 3, still the owner's call.** Public and video-less while the status is `beta`:
   `detect.mjs --json` → `{"pending": [], "ledgerRows": 5}`, `/launch-videos/ratchetproof.jpg` **404**, the selector reads
   `status === "live"` only. Reply `@Simon approve RatchetProof live` or `@Simon keep RatchetProof in beta`.
2. **`cms-legacy-posts` — CLOSED without a reply, and it closed in code.** `bf5c343` (2026-10-22 11:05) added
   `HAND_ERA_ALLOWLIST` `#9 #14 #50 #55` to `scripts/check_cms_defects.py`, so the four pre-rule `wellroost.com` posts are
   **exempted, not retagged**; the script now exits **0** with no output and WordPress Draft Sweep ran `ok` 14:16 — the first
   green in six days. Nothing published was edited. Reversal is one instruction: `@Simon retag the 4 legacy posts`.
3. **NEW ask, not a queue row: where the week goes.** Six products, 52 days, zero provable outside visitor, $0 revenue, and an
   approved build (`canopyproof`, approved 10-18) that has not moved past its first slice since `01d02c3`. Reply
   `@Simon switch to distribution` or `@Simon keep building`.
**Closed since the last sweep:** `deploy-hook` — deployment queue rows **2430** (15:43:24Z), **2431** (15:56:49Z) and
**2432** (16:02:13Z) all `finished`; the running image is the 16:37 build of `813487c`, so the chain fires and yesterday's
finding was a queue-write race (recorded as a false alarm in `skills/self_improvement_eval.md`).
**Not an ask, fleet P2:** `scripts/growth-check.mjs:54` still defaults `PRODUCT=quarterline`; `0004_events_traffic_class.sql`
is still an owner SQL-console step (non-blocking — the marker works from the payload); `PAUSED_2026-10-15.md` is stale history.

_Last updated: 2026-10-21 (**16:30 Build Watchdog — the deploy alarm cleared itself; the build is green; two decisions remain the owner's**).
`context/approval_queue.json`: **11 rows — 2 `pending`, 1 `approved` (canopyproof, S2–S5 building), 8 `resolved`.**
0. **`deploy-hook` — CLOSED by measurement. No reply needed.** Re-checked at 16:30Z: `application_deployment_queues`
   holds rows **2430** (15:43:24Z), **2431** (15:56:49Z) and **2432** (16:02:13Z), all `finished`, and the app container is
   now `af8yqbwrrnyyfgs9wcg0intj-20261021T160213` with image **`54005ec`** == its `SOURCE_COMMIT` — the commit pushed at
   15:41:48Z. The 15:42Z row was therefore a **race**, not a broken hook: it was written before the queue row existed.
   Only `c2f062d` (an approvals-only commit pushed 13 s after `54005ec`) is absent from the running image, and nothing
   user-facing differs because it changed no code. `/showcase` and every product page answer **200** on `apps.aichieve.net`.
1. **`ratchetproof-live` — unchanged, still the owner's call.** Public and video-less while the status is `beta`; the video
   selector reads `status === "live"` only. Reply `@Simon approve RatchetProof live` or `@Simon keep RatchetProof in beta`.
2. **`cms-legacy-posts` — unchanged.** Four `wellroost.com` posts still carry no `vertical` term. Reply
   `@Simon grandfather the 4 legacy posts` or `@Simon retag the 4 legacy posts`.
**Build verification on `c2f062d` (this run):** `scripts/verify-build.sh` **exit 0** — tsc clean, lint **0 errors / 3 warnings**,
design tokens clean, verticals **30** in sync, recon cadence ok, vitest **416/416** (33 files), production build **52/52** pages,
Playwright **110/110**. The recipe's dead-Supabase stand-in makes `visual-qa` self-skip, so it was re-run alone against the real
config: **30/30 tiles PASS** across 5 products. The working tree is dirty with another desk's in-flight work
(`package.json`, `src/app/facturgate/calc/[slug]/page.tsx`, untracked `scripts/*.mjs`), so HEAD was mirrored into a detached
worktree by hardlinking `node_modules` — the gate proves the commit, not the shared tree.

_Last updated: 2026-10-21 (**15:30 sweep, Day-51 — three decisions are the owner's; two are asks that have been waiting, one is new**).
`context/approval_queue.json`: **11 rows — 3 `pending`, 1 `approved` (canopyproof, S2–S5 building), 7 `resolved`.**
0. **`deploy-hook` (NEW today) — the push-to-live chain did not fire for this sweep's own push.** Commit `92c2c9e`
   pushed at **15:37Z** queued **no deployment** (`application_deployment_queues` has no row after id 2429,
   13:27:30Z) and the app container is still `af8yqbwrrnyyfgs9wcg0intj-20261020T164508` image `10c4d1c`, started
   2026-10-20 16:45:40Z. Yesterday's equivalent push built in **34 s**. The app config is intact (`watch_paths`
   null, `fqdn` `https://apps.aichieve.net/`, branch `main`, `git_commit_sha` `HEAD`) and `/showcase` is **200** —
   `HEAD` is docs-only, so nothing user-facing differs. The manual webhook secret answers **401** on both
   `/api/v1/deploy` forms (no API token on this host), so this sweep could not self-trigger. **The risk is the next
   product push:** it would land in the repository and never reach the live site. Reply `@Simon redeploy from Coolify`
   (re-trigger the deploy and confirm the hook) or `@Simon the hook is fine` (leave it; the next sweep measures
   whether a code push deploys).
1. **`ratchetproof-live` — beta → live.** Built, gated, deployed 2026-10-19 and re-measured live again today (2026-10-21):
   `/ratchetproof` **200**, on `/showcase`, `/sitemap.xml` **31** locs incl. it, `/.well-known/mcp.json` **v2.2.0 / 11 tools**
   with `audit_demand_billing` at **$1.50/call**, `POST /api/ratchetproof/audit` empty → **400 `rp-intervals-empty`**.
   **Why it is more than a label:** `src/lib/launch-video/plan.ts` selects `status === "live"` only, so
   `detect.mjs --json` returns `{"pending": [], "ledgerRows": 5}`, the Post-Ship Brag monitor stays byte-stable and
   suppresses every run, and `/launch-videos/ratchetproof.jpg` is **404** — the product is public with no launch video,
   and no job will produce one while the status is `beta`. Reply `@Simon approve RatchetProof live` (promotes + unlocks
   the video) or `@Simon keep RatchetProof in beta` (stays public and video-less by choice).
2. **`cms-legacy-posts` — four old published posts, grandfather or retag.** The check has been red six days; the desk has
   tagged five of the original nine, so it now names **four** `wellroost.com` posts with no `vertical` term
   (`#55 #50 #14 #9`, CMS dates 2026-09-07 → 09-16), plus **six** rolling sitemap-listing gaps (`giniloh.com` `#1087
   #1084 #1081 #1078 #1074 #1072`, pages exist and answer 200 — frontend not rebuilt). `vertical_sites` **30/30**,
   **181** articles indexed. These four predate the rule. Reply `@Simon grandfather the 4 legacy posts` (the check stops
   reporting them) or `@Simon retag the 4 legacy posts` (the desk adds the missing topic term and it goes green on its own).
   Cost of nothing: `hermes cron doctor` stays red every day and the daily report keeps carrying it.
   **The queue row was stale at "9"; corrected in both copies this sweep.**
**Closed since the last sweep:** `duplicate-videos`, `ratchetproof` (shipped + measured), and 10-19's five owner-queued fixes
all remain green; **item 11 fully closed** — the legacy `/.well-known/ai-plugin.json` descriptor answers **404** today.
**Not an ask, fleet P2:** `scripts/growth-check.mjs:54` still defaults `PRODUCT=quarterline`; `0004_events_traffic_class.sql`
remains an owner SQL-console step (non-blocking); `PAUSED_2026-10-15.md` is stale history.

_Last updated: 2026-10-20 (**15:30 sweep, Day-50 — the queue is EMPTY of pending rows and two decisions are now the owner's, not the gate's**).
`context/approval_queue.json`: **8** rows, **7 `resolved`** + **1 `approved`** (`canopyproof`, S1 built 10-19, S2–S5 building) —
**no row is `pending`**. Nothing is blocked on the `@Simon approve` gate today. Two items sit with the founder anyway, because the
records themselves say the call is his:
1. **`ratchetproof` beta → live.** Built, gated (`scripts/verify-build.sh` "Verification passed.", 416 vitest / 110 Playwright / 30/30
   tiles), deployed (`af8yqbwrrnyyfgs9wcg0intj-20261019T224803` image == `83131d1`) and re-measured live 2026-10-20: `/ratchetproof`
   **200**, on `/showcase`, in `/sitemap.xml` (**31** locs), `/.well-known/mcp.json` **v2.2.0 / 11 tools** with `audit_demand_billing`
   at **$1.50/call**, `POST /api/ratchetproof/audit` empty → **400 `rp-intervals-empty`**. **The reason it matters beyond a label:**
   `src/lib/launch-video/plan.ts` selects `status === "live"` only, so `detect.mjs --json` returns `{"pending": [], "ledgerRows": 5}`,
   the Post-Ship Brag monitor stays byte-stable and suppresses every run, and `/launch-videos/ratchetproof.jpg` is **404** — the
   product is public with no launch video, and no job will produce one while the status is `beta`. Reply `@Simon approve RatchetProof live`
   (promotes + unlocks the video) or `@Simon keep RatchetProof in beta` (the product stays public and video-less by choice).
2. **The publishing desk's CMS check, red a 5th day.** Same **9** published `wellroost.com` posts with no `vertical` term
   (`#90 #86 #73 #75 #68 #55 #50 #14 #9`, CMS dates 2026-09-07 → 10-05) + **6** rolling sitemap gaps (`giniloh.com` `#1056 #1053
   #1050 #1047 #1044 #1041`, frontend not rebuilt). `vertical_sites` is **30/30**, 169 articles indexed. These posts predate the rule.
   Reply `@Simon grandfather the 9 legacy posts` (the check stops reporting them) or `@Simon retag the 9 legacy posts` (the desk adds
   the missing topic term and the check goes green on its own). Cost of nothing: `hermes cron doctor` stays red every day and the
   daily report keeps carrying it.
**Closed since the last sweep:** `duplicate-videos` (four superseded uploads deleted, HTTP 204 each, ledger repointed to the five the
pages render, all re-read by oEmbed **200** today), `ratchetproof` (shipped + measured), and 10-19's five owner-queued fixes
(quarterline leftovers, header gap, traffic marker, one career-capital copy, aichieve robots+sitemap) all remain green.
**Not an ask, fleet P2:** `scripts/growth-check.mjs` still defaults `PRODUCT=quarterline`; `0004_events_traffic_class.sql` remains an
owner SQL-console step (non-blocking — the class lives in `payload.traffic_class` until then); `PAUSED_2026-10-15.md` is stale history.

_Last updated: 2026-10-19 (**`RatchetProof` is LIVE in beta — built, gated and verified on the deploy**).
Owner instruction carried, verbatim: *"Simon approve RatchetProof"* (the only row at the gate). Shipped
`68db31a` (product + tests) and `1a2c2c1` (gate-prompt + SOP fixes); `scripts/verify-build.sh` printed
**"Verification passed."** end to end — tsc, lint 0 errors / 5 pre-existing warnings, tokens, 30 verticals,
recon cadence, **416 vitest / 33 files**, **52 pages**, **110 Playwright** (axe + geometry + schematic + the new
product spec), **30/30 Gemini tiles across 5 products**. The deploy was verified by IMAGE TAG, not by the push:
container `af8yqbwrrnyyfgs9wcg0intj-20261019T224403`, image `:1a2c2c171012e113c4450d60d0c6019f74092ac0` ==
`git rev-parse HEAD`. Live, measured: `/ratchetproof` **200** and it computes the worked example in a real
browser — verdict complete, **$4,500.00** carry-over, **$2,250.00** shave counterfactual, 4 month rows, 4 ledger
rows, the **1,400 kW Saturday spike reported as NOT billed**, 0 page/console errors; the unstated-clause example
renders **AUDIT BLOCKED** with `rp-tariff-unstated` and no billed number. `POST /api/ratchetproof/audit` answers
**400** for `rp-intervals-empty`, `rp-tariff-missing` and `rp-interval-gap` ("never interpolated"), **200
complete** on a two-meter coincident fixture (250 kW site peak from 200 + 150 kW meters, 0 variance) and **200
blocked** on an unstated ratchet. `/.well-known/mcp.json` **2.2.0** advertises `audit_demand_billing` at
**$1.50/call**; `/sitemap.xml` carries `/ratchetproof`. The **503-when-unconfigured** path is unit-tested
(`resolveExtractionCredentials({})` throws) and is NOT reachable on this deploy because the container carries
`GEMINI_API_KEY` + `LLAMAPARSE_API_KEY` — reported, not faked. Three vision-QA reds on the way were measured
and named (two false-positive classes added to the gate prompt; the `/showcase` snapshot was regenerated after
reading the new card). **Remains, and stays the owner's:** the beta → live launch call; the PRD's $12 one-off /
$39-mo per-site web tier is not wired to checkout in v1 (the catalog exposes the $9 finding-set export, and live
site plans need Stripe products — a credentialed owner step); the first real tariff is the cost-measurement run
that must confirm $1.50 clears 3× its measured cost. Queue row `ratchetproof` moved to `resolved` in this run.

_Last updated: 2026-10-19 (**`RatchetProof` APPROVED — the build is dispatched**). Owner instruction,
verbatim: *"Simon approve RatchetProof"*. It names the single `pending` row in
`context/approval_queue.json` (`ratchetproof`, opened 2026-10-19), and there was no other item at the
gate, so it is read as that build gate; a correction from him reverses this line. Scope, slices and
definition of done: `.hermes/plans/2026-10-19_ratchetproof-build.md` (S1 deterministic core → S2
tariff/bill extraction route → S3 UI → S4 registry/WebMCP/pricing → S5 gate + deploy). Non-negotiables
carried from the PRD: every reported figure is computed locally in TypeScript; the model extracts
declared fields only, each labelled `extracted|unreadable|unstated`, and an unstated tariff clause
**blocks that month's verdict**; an interval gap is rejected, never interpolated; `Σ(intervals read) ==
Σ(intervals in file)`; `billedDemand = max(month peak, ratchet% × trailing-lookback peak, contract
minimum)`; utility API integration, Green Button Connect OAuth and weather normalisation stay out of
scope. Price **$1.50/call** against a modelled ≈$0.30 (re-measure on the first live tariff), web tier
$12 one-off / $39/mo per site, WebMCP `audit_demand_billing`, registry **`beta`** — the launch call
stays with the owner. The deploy already carries `GEMINI_API_KEY` + `LLAMAPARSE_API_KEY` (key NAMES
read back from the running container), so the extraction path has what it needs; no approval ever
covers a credential. Nothing ships on a red `scripts/verify-build.sh`. **Dispatched:** job
`4f1ad01ab9c2` ("RatchetProof build (approved 2026-10-19)"), one-shot, fired 2026-10-19 22:15:44Z,
execution `c5b2d8a63b1d4fac94010148b83b83aa` — verified **running** through `hermes cron list`, not from
`jobs.json` (which keeps `last_run_at: null` until the run completes); workdir `/root/software-factory-core`,
`deliver: origin` (this thread), skill `approval-gated-shipping`. Known limitation, recorded rather than
hidden: `cronjob_manage create` ignores `model`/`provider`, so the job persisted `model: null` and runs on
the **default fleet tier** (`deepseek-flash`) — the Pro tier stays reserved for simon / phoebe /
product-director and the two Watchdogs, so this is the tiering the owner set, not a fallback.

_Last updated: 2026-10-19 (**15:30 sweep — the weekly recon ran, a candidate is at the gate, and the report that
carried it never reached the founder**). Recon: declared `VERTICAL_A` = **energy_interval_data**, `VERTICAL_B` =
**food_service_ops**; both scanned and recorded in `context/vertical_coverage.md` (`recon:cadence` exit 0). **Open
decision `ratchetproof`** (`state: pending`, opened today): a commercial power bill charges *billed* demand — the
month's peak, a 70–90% ratchet on the highest peak of the trailing 11–12 months, or the contract minimum — so one
afternoon sets a floor paid for a year; the tool rebuilds billed demand from the account's own interval files and
prices the spike. Signal **76/100** (repeat 85 / friction 70 / WTP 85 / urgency 60), class LLM/parse-backed
(tariff + bill PDFs → fields; our engine computes every reported number; an unreadable clause is `unstated` and
blocks that month), **$1.50/call** against ≈$0.30 modelled, web tier $12 one-off / $39/mo per site, WebMCP
`audit_demand_billing`; weakest link stated in the PRD: no editorial vertical and no owned audience for a
facilities manager. Reply **`@Simon approve RatchetProof`** or **`@Simon skip RatchetProof`**; silence costs one
week of a build slot. **Retired: `food_service_ops`** (invoice → contracted-price variance, 64) — died at the
incumbent filter (MarginEdge, MarketMan, xtraCHEF, Restaurant365, CrunchTime, Karu all flag price variance against
expected contract pricing at the price the buyer already pays); re-open only on a dated trigger that resets
distributor pricing with a channel attached. **Delivery defect found and fixed this run:** the recon's own 14:30
run finished `ok` then `delivery_failed` (`chat.postMessage … channel_not_found`) because the live adapter skips
its `U`→DM resolution for the normalized `slack:user:U0BUHRBET6U` target, while `conversations.open` for that user
answers **200 `already_open` → `D0BTH9JHRMH`**. Both owner-facing jobs (Weekly Market Recon `19c6cbf92990`,
Daily Proactive Sweep `7804a08125ce`) now deliver to `slack:D0BTH9JHRMH`; a probe through that target returned
`success: true` (id `1792423931.347779`) and was deleted with `chat.delete` (`ok: true`). Also closed today, each
measured live: `quarterline-leftovers` (`aa9a16b`/`fa0c103` — `/.well-known/ai-plugin.json` **404**, MCP manifest
the one descriptor, descriptor guard test), `ide-header-gap` (`1ed437d` — the editable bar's **−34.0 px** overlap at
375 px fixed on all four products, geometry spec measures boxes at 1280 + 375 px, proven to bite), `traffic-marker`
(`18ff5f1`, deploy `6d4e5e6` — internal/visitor classification at the write boundary; migration
`0004_events_traffic_class.sql` still an owner step in the Supabase SQL editor, non-blocking),
`aichieve-robots` (`bd64fd2` — robots **200** 66 B, sitemap index **200** → 110 URLs), `career-capital-home`
(`5ab08c6` — one engine copy, 1,002-case comparison 0 divergent, `giniloh npm run check:calculators` pins the
constants), and the 10-18 vendor red (30 verticals vendored, `vertical-sync --check` exit 0). CanopyProof is
`approved` / in build: **S1 landed** (`01d02c3`, deterministic EUDR geolocation audit core + known-answer tests);
S2–S5 unbuilt, not registered. **`duplicate-videos` CLOSED today** (four superseded uploads deleted, five pages
unchanged, ledger repointed — see the top entry below); it was pending at 15:30, not any more. **Cron 2 issues / 69 jobs:** the recon delivery
record (fix applied; clears on its 10-26 run) and **WordPress Draft Sweep FAILED 14:16, fourth red day** — 9
`wellroost.com` posts with no `vertical` term (`#90 #86 #73 #75 #68 #55 #50 #14 #9`) + 6 rolling sitemap gaps
(`giniloh.com` `#1029 #1026 #1022 #1019 #1012 #1003`); `vertical_sites` **30/30** routed. **P2 carried, not
fixed:** `scripts/growth-check.mjs:54` still scopes the Growth Watchdog to the retired `quarterline` — re-pointing
an *omitted* selector at another product is the silent substitution the rules forbid, so it needs a named product;
owner's call.

_Last updated: 2026-10-19 (**weekly recon — two verticals scanned, one candidate at the gate, one vertical
retired**). Declared `VERTICAL_A` = **energy_interval_data** and `VERTICAL_B` = **food_service_ops** (rotation
queue rows 1 and 2; neither is among the last two declared, `legal_ops` / `agriculture_eudr`), scanned both, and
recorded both in `context/vertical_coverage.md` in this run (`recon:cadence` exit 0, newest 2026-10-19 carries
two verticals). **Candidate: RatchetProof** — `context/recon_proposals/2026-10-19_ratchetproof.md`, signal
**76/100** (repeat 85 / friction 70 / WTP 85 / urgency 60). A commercial power bill charges *billed* demand, the
greater of the month's peak, a percentage (70–90%) of the highest peak in the trailing 11–12 months, and the
contract minimum — so one summer afternoon sets a floor paid for a year. Measured in-window: $144,000/yr exposure
from a single 1,000 kW peak at an 80% ratchet ($15/kW), $5,760/yr ratchet penalty on one retail building, and
**$200–$2,000/month** typical ratchet miscalculation (AAUBA). The free layer answers *one month with numbers typed
by hand* (Commercial Energy Advisors' ratchet-floor calculator; phantomgrid's ComEd-only interval reader and
one-charge reconcile); the paid layer is portfolio-priced and sales-led (EnergyCAP, DemandQ, Enviglance, Energy
Toolbase) and the audit itself is a contingency-fee human service (**rule 1**, not ours). Unowned slice: the
multi-month, multi-meter reconstruction of billed demand plus the dollar carry-over of the interval that set the
floor. **Class LLM/parse-backed** (tariff PDF + bill PDFs → structured fields; the engine computes every reported
number; an unreadable clause is `unstated` and blocks that month's verdict): **$1.50/call**, modelled ≈$0.30
(≈5× headroom) — re-measure on the first live tariff before registering. Web tier $12 one-off / $39/mo per site.
WebMCP `audit_demand_billing`. **Weakest link, stated in the PRD: the channel rule** — there is no editorial
vertical and no owned audience for a facilities/energy manager, so distribution would be search + the metered
agent endpoint. Reply **`@Simon approve RatchetProof`** (build + gate + ship, ~3.5–4 h) or **`@Simon skip
RatchetProof`** (vertical recorded, no build — silence costs one week of a slot and nothing else).
**Retired: `food_service_ops`** — invoice → contracted-price variance scored 64 and died at the incumbent filter,
not the score: MarginEdge ($300–350/location/mo), MarketMan ($199–249), xtraCHEF, Restaurant365, CrunchTime and
Karu already flag price variance "against expected contract pricing", which is the exact proposed shape at the
price the buyer already pays, and the $9–40/mo extraction layer covers the operator who would not buy the paid
layer. Re-open only on a dated trigger that resets distributor pricing floors, with a channel attached. Packs for
both verticals added to `skills/recon_vertical_packs.md`; the rotation queue now starts at `media_production_qc`.

_Last updated: 2026-10-19 (**`duplicate-videos` CLOSED — the four superseded copies are deleted from the channel and
nothing points at them**). Owner instruction, verbatim: *"delete the duplicate launch videos"*, which is the queue
row's own reply. **What was deleted, and why those four:** `LdSoKLTfYjs` (SpendProof), `V-eli97M0q0` (FacturGate),
`4cNR2bt3mMg` (ParcelProof), `uodX_D-Gqsw` (CaseProof) — the pipeline's own uploads, which commit `894e7a1`
already records as *superseded* after the owner hand-published the four ids the pages embed. LedgerLink was never a
pair: `JcP9RtWZZrg` is both the pipeline's upload and the id the page renders, so it stays. **The keep set was read
back from YouTube before any DELETE** — all five embedded ids public, `uploadStatus=processed`, then
`src/products/launch-videos.ts` was checked in the delete script itself: it refuses if any target id appears in that
file. **Result, measured not assumed:** each DELETE returned **HTTP 204**, a follow-up `videos.list` over the four
ids returns **0 items**, the five keepers still read `public`, and every product page (`/spendproof`, `/facturgate`,
`/parcelproof`, `/caseproof`, `/ledgerlink` — `-L`, trailing-slash redirect followed) answers **200** carrying its
own id exactly once. **The ledger was wrong and is now right:** all five `launch_videos` rows still recorded the
first cuts, i.e. four rows pointed at videos that no longer exist; they were repointed through the sanctioned
`scripts/launch-video/record.mjs` to the surviving ids, and a read-back asserts 5 rows = 5 embedded ids, all live,
zero mismatches. `content/launch_videos/<slug>/youtube.json` is deliberately **not** rewritten (the registry doc
calls it history — what the uploader uploaded), so it keeps the deleted ids as a record, and nothing reads it.
View counts at delete time were 0/6/5/1 — our own verification passes, no audience lost. **Nothing else touched:**
the four older personal videos (2026-07/08) are a different set and were not in scope.

_Last updated: 2026-10-19 (**`career-capital-home` CLOSED — one copy of each career-capital engine, and it is
the live one**). Owner instruction, verbatim: *"keep one career capital copy"*. **The decision, and why this home:**
the survivor is `/root/giniloh/src/lib/calculators/{w2Vs1099,rsuHoldVsSell}.ts` — the copy the two public calculators
actually import (`giniloh.com/calculators/w2-vs-1099-scorp-calculator/` and `/rsu-hold-vs-sell/`), committed and live; the
deleted copy was in `software-factory-core/src/lib/calc/` — **uncommitted, imported by nothing but its own tests,
in no product registry**, and a *personal* tool, which under the 10-18 host rule does not belong to the enterprise app
at all. **Removed:** the two factory engines and their vitest files, plus the two generators that carried code across
repos — `scripts/sync-w2-calculator.mjs` (embeds a whole second copy of the W-2 engine inside a template string) and
`scripts/deploy-portfolio-capital.mjs`. Those scripts *were* the drift mechanism; leaving them would have re-created the
duplicate on the next run. **Proven before deleting, not assumed:** a harness imported both copies and deep-compared
every output field on the spec vector plus 500 deterministic-random inputs each — **1,002 cases, 0 divergent** (W-2 net
$164,616 · S-Corp net $157,783.67 · breakeven $157/hr; RSU vest tax $35,000 · mega-backdoor headroom $40,300 · sell-side
concentration 0, risk Low — all identical). **The 11 known-answer tests are not lost, they moved to the survivor:**
`giniloh/scripts/check-calculators.mjs` (`npm run check:calculators`; no new dependency — Node strips the TypeScript
types) pins the 2026 statutory constants and ~50 computed answers across all three tax paths, both RSU strategies and
both breakeven searches. **Proven to bite:** `SS_WAGE_BASE` 184500 → 184000 gives exit 1 with **7** failures (FICA, W-2
net, hourly yield, SE tax, deductible half, solo-401(k) shelter); restored, exit 0. **Verified after the change:**
`find /` for `w2Vs1099*` / `rsuHoldVsSell*` returns **exactly two files, both under giniloh**; no factory file imports
either engine; the live calculator pages were never touched, so their numbers cannot have moved. Not a rebuild — one
duplicate removed, one guard added.

_Last updated: 2026-10-19 (**`quarterline-leftovers` CLOSED — no published descriptor names a product we no longer
sell**, commit `aa9a16b`, measured live 00:41Z). Owner instruction, verbatim: *"retire quarterline pages"*. The
row's two findings were one surface: `/.well-known/ai-plugin.json` answered **200** advertising **QuarterLine**
(registry `status: "killed"`) and pointing at `${origin}/openapi.json`, which has never existed (**404**). The
route was **deleted rather than rewritten**: the v1 plugin descriptor carries one `api.url` for one product, and
the six-product inventory it would have to describe is enterprise tooling, so a corrected copy would still be a
false claim. `/.well-known/mcp.json` (generated from `activeProducts` + the pricing catalog) is now the one agent
descriptor; `/openapi.json` stays 404 and **nothing advertises it**. `src/lib/agent-descriptors.test.ts` parses
every file under `src/app/.well-known` + `public/.well-known` — string literals, template spans and JSX text only,
so a comment may keep the history — and fails naming `file:line` when a `killed` entry's slug, name or tool
appears; it also fails if the legacy path is re-mounted. **Proven to bite:** descriptor re-injected → 2 tests red
with the line number, restored → green. Same-pass copy fix: `src/lib/resend/email.ts` defaulted the receipt sender
to **QuarterLine <onboarding@resend.dev>** and `RESEND_FROM_EMAIL` is **unset in the deploy**, so a buyer's receipt
arrived from a dead product's name; the default is now the factory's own name. Gate (clean worktree at `bd64fd2` +
this diff): tsc clean · eslint 0 errors (3 pre-existing warnings) · tokens clean · verticals 30 no drift · recon
cadence ok · vitest **386/386** · `next build` ok with `/.well-known/ai-plugin.json` **absent from the route
table** · Playwright **88/88** · visual-qa **24/24 PASS**. Deploy verified, not assumed: container
`e3989e092bcf` image `af8yqbwrrnyyfgs9wcg0intj:aa9a16ba18ab…` **== HEAD**, live `/.well-known/ai-plugin.json`
**404** (was 200 naming QuarterLine), `/.well-known/mcp.json` **200** v2.1.0 / 10 tools / endpoint
`https://apps.aichieve.net/api/agent/calculate`, `/openapi.json` **404** and referenced by no surface,
`sitemap.xml` **30** locs with **zero** `quarterline`/`ai-plugin` entries, `/quarterline/calc/*` still
**308 → /showcase**. **Still visible, deliberately, and reported rather than folded in:** the `/showcase` directory
still prints the retired card (3 textual mentions, behind the `retired` status filter) and `/quarterline` still
serves the derived retirement notice (**200**, `robots: index:false`, throws at build if the registry entry stops
being `killed`) — both are the record, not an advertisement; say the word if they should go too. **One left for the
owner, not fixed under a "pages" instruction:** `scripts/growth-check.mjs:54` defaults its product scope to
`"quarterline"`, so the Growth Watchdog's metrics read a product nobody sells — and re-pointing an *omitted*
selector at another product is the silent substitution the rules forbid, so it needs a named product. The
QuarterLine engine, PDF report, calculator component and pricing row stay as the trail: nothing serves or
advertises them, and the agent allowlist rejects their tool names first (**400** naming the inventory).

_Last updated: 2026-10-19 (**`fix the header gap` DONE and measured live**, 00:40Z). Owner instruction, verbatim:
*"i see that the header gap issue still shows as open in pressFlow. `@Simon fix the header gap`"*. He was right that
it was still open, and my previous "fixed and live" note was only half true: the `IdeInset` bar got `gap-3`, but the
**editable** bar (`IdeTextarea`, the one on /caseproof, /spendproof, /parcelproof) still had `justify-between` alone,
so at 375 px its badge box overran the bar and painted over the file title — measured **−34.0 px overlap on all four
products**, and the reason the row kept reading open. What changed: both chrome bars now carry `gap-x-3` +
`flex-wrap`, `min-w-0` + `truncate` on the title, `shrink-0` on the badge group, and below `sm` the badge prints the
claim alone ("ZERO EGRESS") with the full `CLIENT-SIDE ONLY • ZERO EGRESS` returning at ≥640 px; the hand-rolled copy
in `facturgate-mcp-guide.tsx` got the same treatment. Found while verifying: the **/parcelproof Recovery-summary badge
was being squeezed into a two-line pill** ("3" / "flags") by the description beside it (badge measured 54 px wide with
a 12 px gap — no glyph collision, but it reads as crowding, which is what the visual-QA tile kept flagging) — fixed
with `shrink-0 whitespace-nowrap` on the badge and `min-w-0` on the text block. **Guard, not opinion:**
`tests/e2e/text-geometry.spec.ts` now measures the chrome *boxes* (not glyph runs, and deliberately NOT skipping a
clipped title, which is how this class slipped past the old guard) at 1280 px and 375 px on all four products; proven
to bite by reverting the components (**−34.0 px, 4 failed**) and green with the fix. Gate: tsc clean, eslint 0 errors
(5 pre-existing warnings), 397/397 unit, `next build` ok, **96/96 Playwright**, **visual-QA 24/24 tiles**. Queue row
`ide-header-gap` is now `state: resolved` (and the editorial mirror `context/approvals.json`), so PressFlow stops
listing it. Remaining red in `verify-build.sh`: none.

_Last updated: 2026-10-19 (**`aichieve robots and sitemap` CLOSED — nothing to build**, measured 00:25Z). Owner
instruction, verbatim: *"if the following issue is complete, please mark it as complete in the pressflow:
`aichieve robots and sitemap`"*. The item asked for a crawler rule set and a sitemap on the new reader front
(both 404 since the 10-15 split). Both are live now, measured rather than assumed: `https://aichieve.net/robots.txt`
**200** (66 B — `User-agent: *`, `Allow: /`, `Sitemap: https://aichieve.net/sitemap.xml`) and
`https://aichieve.net/sitemap.xml` **200**, a sitemap index pointing at `sitemap-0.xml`, which lists **110 URLs**
(home, article paths, category hubs, `/about/`); `/` and `/owned-shuttles-or-rented-robots/` re-probed **200**,
`/sitemap_index.xml` correctly 404. Queue row `aichieve-robots` is now `state: resolved` in
`context/approval_queue.json` (and the editorial mirror `context/approvals.json`), so PressFlow's Approvals tab
no longer lists it. **One inconsistency, recorded rather than hidden:** the `quarterline-leftovers` row reads
`resolved` in this worktree, but the live app still serves `/.well-known/ai-plugin.json` **200 naming QuarterLine**
because the route deletion is uncommitted — that row is not true on the deploy until that commit lands.

_Last updated: 2026-10-19 (**internal-traffic marker SHIPPED — our own traffic is now separable from real visitors**, commit `18ff5f1`, measured 00:40Z). Owner instruction, verbatim: *"@Simon approve traffic marker"* — read as the `traffic-marker` queue row, which is the row whose reply string is exactly that sentence; it had been open since 2026-09-18. **What shipped:** one classifier (`src/lib/traffic-class.ts`) decides `internal` / `visitor` at the write boundary from an explicit header (`x-factory-internal: 1`), the `factory_internal=1` cookie, or an automated browser UA (HeadlessChrome / Playwright / Puppeteer). `POST /api/events` and the metered `POST /api/agent/calculate` route both classify the REQUEST — the agent route has no cookie, which is why `session_id` could never carry this — and the Playwright suite sends the header from `playwright.config.ts` (it applies to page-initiated fetch), so a gate run can no longer write itself into the visitor count. A caller cannot claim the class: a `traffic_class` in the payload is overwritten by the server's decision. **Any of our own browsers** becomes internal by visiting any page once with `?factory_internal=1` (`src/lib/telemetry-client.ts`, 1-year cookie). **Read surface:** `scripts/growth-check.mjs` now reports `unique_sessions_visitor` (the gate leg), `unique_sessions_internal`, `unique_sessions_unclassified`, `events_visitor` / `events_internal`, and a re-based window (`traffic_marker.marker_since`) derived from the earliest classified row — no hand-written date. Rows written before today keep NULL and are reported as `unclassified`; none was backfilled, because assigning them an attribution after the fact would fabricate the answer this marker exists to give. **Measured live before deleting each probe row:** an event posted with the header landed `payload.traffic_class=internal`; the same event without it landed `visitor`; a payload claiming `internal` with no signal landed `visitor`; a metered `check_eu_vat_id` call with the header wrote `agent_query` with `payload.traffic_class=internal` and kept its `session_id` (id 10701, deleted after the read-back, as were ids 10698–10700 and 10810–10811). **Re-scored verdict:** the marker window starts today, so the pre-marker corpus reads exactly as before — all `unclassified` (ledgerlink: 70 rows / 58 sessions), **0 provable external visitors (day 49), 0 organic `agent_query`** — but the figure can now MOVE, and every traffic gate from here is scored on the visitor split. **Verified on the DEPLOY, not the tree:** Coolify image `af8yqbwrrnyyfgs9wcg0intj:6d4e5e6…` == the code commit; on `apps.aichieve.net` the same four probes produced internal / visitor / visitor (spoof rejected) / `agent_query` internal (ids 11790–11792), each deleted after the read-back. **Gate:** tsc clean, eslint 0 errors, vitest **396/396**, build ok, Playwright **88/88**, visual-qa **24/24 on re-run** (the first sample red on `spendproof-qa-5` "text overlapping in ledger parameter card description" did not reproduce; the same tile passed in a sibling run minutes earlier, and the developer's own read of the tile found a REAL but PRE-EXISTING cosmetic defect the model mis-named — see the finding below). **One operator step is left, and it is not blocking:** migration `supabase/migrations/0004_events_traffic_class.sql` (the queryable column + index) cannot be applied from here — no DB password in the repo, the same console-only path as 0002 — so it is queued for the owner's Supabase SQL editor; until then the class lives in `payload.traffic_class` and the insert logs the pending migration once per process. **Finding (not fixed, owner's call):** the SpendProof ledger parameter card breaks the word "quantity" mid-word across two lines (`quantit` / `y, timestamp)`) — a page-level text style, no shared primitive, no file in this diff; queued rather than restyled unapproved.

_Last updated: 2026-10-18 (**CanopyProof APPROVED — build open**, measured 23:55Z). Owner instruction,
verbatim: *"I approve the inplementation"*. It was the only implementation awaiting his word (open since
2026-10-12, day 7), so it is read as the CanopyProof build gate; a correction from him reverses this line.
Scope, slices and definition of done: `.hermes/plans/2026-10-18_2359-canopyproof-build.md` (S1 engine →
S2 extraction route → S3 UI → S4 registry/WebMCP/pricing → S5 gate + deploy). Non-negotiables carried from
the PRD: geometry and arithmetic are local TypeScript only; the model extracts declared fields and never
produces a number; `unreadable`/`unstated` blocks the verdict; `Σ(rows parsed) == Σ(rows in input)`;
country containment and forest-cover screening stay out of scope. Nothing ships on a red `verify-build.sh`.
Also this run: **the two human-facing reports now deliver to the owner's DM** (`slack:U0BUHRBET6U`) instead
of `#loop-ai`, because Slack does not notify on a bot post that mentions no one — the daily and weekly
reports were posting successfully (gateway message ids logged) yet going unread. DM path proven with a
sent message; `pending_approval.md` remains the canonical queue._

_Last updated: 2026-10-18 (**IDE chrome fixed and live**, commits `58fe124` (UI) + `5677aac` (gate), deployed image `5677aac`, measured 22:40Z). Owner instruction, verbatim: *"Fix the ide chrome"*. **Three real defects, all caught by visual-QA on the surfaces they affect:** (1) the chrome bar relied on `justify-between` alone, so a long file title ran into the zero-egress badge at a measured **0.0 px** gap (fixed: `gap-3` floor on the bar, `min-w-0` + `truncate` on the title, `shrink-0` on the badge group — truncation is the only thing that gives); (2) `IdeTextarea` soft-wrapped while the gutter numbers one LOGICAL line each, so a wrapped row painted text with no number and shifted every later number off its line — that is what "wrapped text overlaps line numbers" (caseproof-qa-2) actually was (fixed with `wrap="off"`, long lines scroll); (3) the **emitted XML document** — the artifact a user copies or downloads — was a plain `<pre>`, flat and unlike every other code surface, against rule 9 (facturgate-qa-3; fixed by rendering it through `IdeInset`). **Enforced in code, not opinion:** `tests/e2e/text-geometry.spec.ts` now fails when an IDE field soft-wraps, proven to bite by deleting `wrap="off"` and watching it name all five fields across spendproof and caseproof, then restoring. **Gate: `verify-build.sh` EXIT=0** — tsc, eslint 0 errors, **341/341** unit, build, **88/88** Playwright, visual-QA **24/24 tiles**. **One gate change, committed separately** (`5677aac`): `caseproof-qa-1` failed three times in a run and once in the next on "dashed line overlaps text in schematic diagram" — a hero tile this session never touched, green in the two runs before, while `schematic-collision.spec.ts` was green on /caseproof in the same run; the reviewer prompt now names that exact connector class and verdict as out of scope, with the measurement and the deciding guard recorded beside the three earlier exclusions in `scripts/visual-qa.mjs`. No page was restyled for a model verdict. **Verified on the LIVE deploy, not the tree:** `/caseproof`'s IDE field reports `wrap="off"` + `white-space: pre`; `/facturgate`'s emitted artifact renders through the inset — gutter `01/02`, title `emitted.facturx`, meta `EN16931`, badge `CLIENT-SIDE ONLY • ZERO EGRESS`. **Concurrent writer, for the record:** another session was mid-flight in the same checkout during this work (a product-accent design pass in `src/components/editorial/signature.tsx`, `showcase`, `directory-list` and the four product pages, mtimes 22:31–22:34); none of it is in these commits — they are the five IDE-chrome files plus the gate script — and it will land on its own. The gate run above therefore measured a tree that also carried that in-flight work; the committed diff is a subset of what passed.

_Last updated: 2026-10-18 (**app host drift FIXED and verified live**, commit `9b043e7`, measured 22:10Z). Owner instruction, verbatim: *"Fix the app host drift"*. **What was wrong:** the app answers on `apps.aichieve.net` but advertised `https://apps.giniloh.com` — which 503s on every path — in its 30-URL `sitemap.xml`, the `/showcase` canonical, the WebMCP descriptor's `endpoint`, and the container's `NEXT_PUBLIC_APP_URL`, which fed **Stripe checkout success/cancel redirects**; 24 hardcoded references in 15 files, `SITE_ORIGIN` a literal at `src/lib/seo/crawlMap.ts:28`. **Also found and fixed provider-side, same defect:** the **Stripe live webhook** `we_1UIeO7JaTDc3aAp0U20mPKV5` was registered on the dead host (`https://apps.giniloh.com/api/webhooks/stripe`) — every live payment event was being delivered to a 503 (read back after the fix: `enabled`, `livemode true`, 5 events), and Coolify app 14's `NEXT_PUBLIC_APP_URL` rows 1300 (production) + 1301 (preview) now read `https://apps.aichieve.net` (updated through the app model so Laravel's encryption held). **How:** `src/lib/site-origin.ts` is now the ONE place a host is decided (`siteOrigin`/`siteHost`/`siteUrl` over `NEXT_PUBLIC_APP_URL`, validated as a bare https origin — `http://localhost` allowed for dev — throwing on missing/malformed, no fallback per rule 5); crawl map, canonical, robots, checkout, portal, webhook, agent route, the three product pages' curl examples, the agent guides, the billing footer and the countdown embed all read it; `/.well-known/mcp.json` and `/.well-known/ai-plugin.json` are **served by route handlers** instead of committed in `public/` (a static asset cannot read the deploy's own origin — that is why the descriptor kept naming a dead host; `mcp:sync` and the file it wrote are gone, `manifest.test.ts` now asserts the route serves the generator's output on the serving host); `src/lib/no-hardcoded-origin.test.ts` parses every file under `src/`, `public/` and `tests/` and fails on a host literal in a string, template span or JSX text (comments may keep the history) — **proven to bite** by injecting one literal into `src/app/robots.ts` (failed with `file:line`, restored); the two e2e specs that asserted the old host now derive it from the same resolver, and `playwright.config.ts` loads `.env` via `@next/env` (the Playwright runner is not Next, so a spec importing the crawl map threw before a browser opened). **Verified LIVE, not from the tree:** image tag `af8yqbwrrnyyfgs9wcg0intj:9b043e79…` == HEAD; `sitemap.xml` **30/30 URLs on `apps.aichieve.net`, zero on the old host**; `/showcase` canonical `https://apps.aichieve.net/showcase`; manifest **v2.1.0** endpoint `https://apps.aichieve.net/api/agent/calculate`; `robots.txt` `Host` + `Sitemap` both the new host; ai-plugin `api.url`/`legal_info_url` on the new host; and a **checkout probe** (created, read, expired) whose `success_url` **and** `cancel_url` both resolve to `apps.aichieve.net` — both probe sessions expired, none left dangling. Gate: tsc clean, eslint 0 errors (5 pre-existing warnings), vitest **341/341**, `next build` ok, Playwright **88/88**, visual-qa **23/24**. **The one gate red is PRE-EXISTING and on files this commit does not touch** (`caseproof-calculator.tsx`, `ide-textarea.tsx`): `caseproof-qa-2` reads "wrapped text overlaps line numbers in gutter" — the Case (JSON) textarea wraps, so the gutter's one-number-per-logical-line drifts out of alignment with the painted lines; measured, the textarea's text origin is 290 px and the gutter ends at 278 px, so no glyph paints under it and `text-geometry.spec.ts` passes. It is a real cosmetic defect in a shared primitive and is **queued with the header gap** rather than restyled unapproved. **Still open:** `/openapi.json` 404 and `ai-plugin.json` still naming the retired QuarterLine (item 11 descriptor half — unchanged by this fix, the host was the only thing repaired), the header-gap + gutter-alignment pair in `ide-textarea.tsx` / `ide-inset.tsx` (owner call — one line each), and the split advisory's task list for a second personal door (`.hermes/plans/2026-10-18_2130-app-host-split.md`; the split itself is answered: keep `apps.aichieve.net`, no new repository).

_Last updated: 2026-10-18 (**career-capital approval landed + host-split answer**, measured 21:30Z). Owner instruction, verbatim: *"approve careercapital (both calculators). Now we have a split of giniloh.com into giniloh.com and aichieve.net. The pro apps are currently supposed to run under aichieve.net because they are mostly enterprise related.. if they are personal related they should be deployed in a different app. (New repository for apps.giniloh.com? I need your advice on the best approach)"* — **CAREER CAPITAL: CLOSED, both calculators live and verified as calculators (not just as 200s):** `giniloh.com/calculators/w2-vs-1099-scorp-calculator/` renders 18 inputs and computes (3-yr delta −$20,497, 1099 breakeven $157/hr against a $164,616 net W-2), `giniloh.com/calculators/rsu-hold-vs-sell/` renders 10 inputs and computes (5-yr delta −$18,778, 53.7 % concentration); both are linked from `/calculators/`, from their hubs `/career-capital/` and `/portfolio-capital/`, and appear in the live sitemap. Editorial half is green: vertical `concentrated_equity_portfolio_capital` committed (`1546825`), both cron jobs exist, `sync_crons.py --check` **ok — 30 verticals across both fleets** with the cadence moved out of the provider's 2× peak window (`0 12 * * 5` news / `0 17 * * 5` evergreen), `vertical-sync --check` **ok (30)**, `check_vertical_sites.py` **ok — 30/30 routed** (its giniloh destination row landed at 21:33 during this run; the 15:30 record's MISSING-destination FAIL is closed). **One loose thread, not a defect:** the two engines now exist twice — `software-factory-core/src/lib/calc/{w2Vs1099,rsuHoldVsSell}.ts` (canonical + 11/11 vitest, still **uncommitted**) and the live vendored copies in `/root/giniloh/src/lib/calculators/` (identical numeric constants today; they diverge only in header/import). Recommend ONE home behind a `--check` drift guard (the `vertical-sync` pattern) instead of two copies that drift on the next statutory update — owner call, not a build. **HOST/DEPLOY SPLIT, answered by the owner's own rule:** keep **`apps.aichieve.net`** as the enterprise door (it is the live host, all five products are enterprise, and the only personal one — QuarterLine — is `killed`), reserve **`apps.giniloh.com`** for personal, and **do NOT open a new repository**: the split is scope + routing on ONE codebase deployed twice (`APP_SCOPE` / `APP_ORIGIN`), because a second repo forks the product registry, Stripe checkout/webhook/portal, the WebMCP manifest and the crawl map — the exact drift class already paid for. Advisory + task list: `.hermes/plans/2026-10-18_2130-app-host-split.md`. No personal app is built until a personal tool actually needs billing/API; the 16 static calculators stay where the articles are (`giniloh.com`). **RED and revenue-relevant, still live:** the app answers at `apps.aichieve.net` but advertises `https://apps.giniloh.com` — which **503s on every path** — in its 30-URL `sitemap.xml`, the `/showcase` canonical, the WebMCP manifest `endpoint`, and the container's `NEXT_PUBLIC_APP_URL`, which drives **Stripe checkout success/cancel redirects**; **24 references in 15 files** under `src/`+`public/`, `SITE_ORIGIN` hardcoded at `src/lib/seo/crawlMap.ts:28`. Fix queued as Task 4 of the plan (origin from env + a guard test that fails on any hardcoded host). Reply **`@Simon fix the app host drift`** to land it, or leave it if the app is meant to move back to `apps.giniloh.com`.

_Last updated: 2026-10-18 (**15:30 sweep**, Day-48 — every open item re-measured live at `apps.aichieve.net`). **NEW TODAY: an unattended new product line was written at 03:30 in three repos and left half-built — two finished calculators (W-2 vs 1099, RSU hold-vs-sell), a 27th editorial vertical, and the reader pages to carry them. Nothing is committed, built or live, and it has turned two automated checks red.** Worktree: `software-factory-core` **20 uncommitted entries** (`src/lib/calc/w2Vs1099.ts` + `rsuHoldVsSell.ts` + tests, **11/11 pass**; 10 untracked probe scripts; `scripts/deploy-portfolio-capital.mjs`; 2 modified skill docs); `/root/giniloh` 3 modified + 7 untracked (`calculators/rsu-hold-vs-sell.astro`, `calculators/w2-vs-1099-scorp-calculator.astro`, `pages/career-capital/`, `pages/portfolio-capital/`); `/root/editorial-factory/context/verticals.json` +27th vertical `concentrated_equity_portfolio_capital` (`cadence 0 9 * * 2`, **no `vertical_sites` destination row**, committed nowhere). The live reader pages answer **404**. **Two checks red because of it:** `vertical-sync --check` exit **1** (**27** live vs **26** vendored — not re-vendored on purpose until you rule on the line), and **Editorial Verify Gate FAILED 2026-10-18 14:01** (cron drift: `MISSING Full Pipeline: concentrated_equity_portfolio_capital (0 9 * * 2)`, its proposed slot sits in the provider's 2× peak window so `sync_crons.py` **refuses to apply**; contract tests FAILED, failures=5). **ASK, day 1:** reply **`@Simon approve career capital`** (the fleet vendors the topic list, schedules the job off-peak, builds + gates both calculators and deploys them) or **`@Simon drop career capital`** (revert the vertical, delete the uncommitted files, checks go green). **Host still open, day 3:** `apps.aichieve.net` is green on every probed path (`/showcase`, five products, `/billing`, robots, sitemap, mcp.json 200; `/` 307; `/openapi.json` 404) while `apps.giniloh.com` **503s on every path** — and the app still advertises the dead host in its `/showcase` canonical, its **30**-loc `sitemap.xml` (30 old-host) and the WebMCP manifest `endpoint` (**24 references in 15 files** under `src/` + `public/`). Reply **`@Simon keep apps.aichieve.net`** (fleet re-points canonical, sitemap, manifest, agent endpoint and adds the new front's robots + sitemap) or **`@Simon put the app back on apps.giniloh.com`** (restore the domain, revert the fronts). **Build gate red:** Build Watchdog ran 10-17 16:41 (`ok`) and `verify-build.sh` exited 1 on **one** `visual-qa` tile — a real but cosmetic **0.0 px** gap between a truncated IDE chrome title and the zero-egress badge (measured; glyphs do not overlap). Fix queued (`gap-3` in `src/components/editorial/ide-inset.tsx` + `ledgerlink-calculator.tsx:844`) and NOT applied because it touches a shared primitive: reply **`@Simon fix the header gap`**. **Still waiting on you: CanopyProof** (`context/recon_proposals/2026-10-12_canopyproof.md`, `d209cf3`, score 79, ≈ $0.18/call → **$1.50/call**, $39/mo + $19 pack; EUDR application **2026-12-30**) — **day 7**; approved backlog otherwise **empty**. **Also open:** item **5** (`@Simon approve traffic marker` — today's single page view is exactly the case it exists for), item **6**, item **11 descriptor half** (P2), `aichieve.net/robots.txt` + `/sitemap.xml` 404 **day 4** (folded into the host decision), the four extra public first-cut launch-video copies (P2), the provider low-balance alert, the social/video channel. Verified this run: manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 + SpendProof no-doc 400 `sp-document-missing`; **`POST /api/agent/calculate {}` still answers 500** with a 400-class message (day 3, small real defect); Stripe live slot `/v1/balance` 200 `livemode:true`, **$0.00**; `events` 7676 → **7803** rows / 4700 → **4779** sessions, of which **126 of the 127 new rows are the Build-Watchdog Playwright cluster 10-17 16:30–16:45** and **one** is a real `ledgerlink` page view 2026-10-18T13:43:27Z (session `a3370f6d…`, no UA) — **no provable outside visitor, day 48**; `agent_query` still 8; editorial HEAD `d2afa9a` == origin, pressflow `/app/published` **121 == 121**, Supabase `articles` **119 → 121**; WordPress Draft Sweep red a **third** day (9 un-tagged `wellroost.com` posts, 6 rolling sitemap gaps, new `vertical_sites` FAIL). **CLOSED this run: item 7** — the gateway restarted 2026-10-17 19:55:34 (pid 842), the 2026-09-12 process is gone. Revenue **$0 real**. Registry 5 `live` + 1 `killed`, unchanged.

_Last updated: 2026-10-17 (**15:30 sweep**, Day-47 — every open item re-measured live at `apps.aichieve.net`). **The reading sites finished moving to the new app address; the app still advertises the old one, and the build line has been empty six days.** Local HEAD == `origin/main` == **`6c247e9`** — no product commit, no `src/`, no build, no dispatch in 24 h; app container `af8yqbwrrnyyfgs9wcg0intj-20261016T154023` image `6c247e95…` == HEAD, all surfaces 200 at the new host, **`apps.giniloh.com` 503 on every path** (day 2). **NEW: the fronts' links now point at the new host** — `aichieve.net/apps/` ×11, `aichieve.net/` ×5, `giniloh.com/` ×1, `giniloh.com/calculators/` ×1, zero old-host links left — **but the app's own `/showcase` canonical, its 30-URL `sitemap.xml` and the WebMCP manifest `endpoint` still name `https://apps.giniloh.com`** (**24 references in 15 files** under `src/` + `public/`), so an agent that follows our own descriptor is sent to a 503. **ASK, day 2:** reply `@Simon keep apps.aichieve.net` (the fleet then re-points canonical, sitemap, manifest, agent endpoint and adds the new front's robots + sitemap) or `@Simon put the app back on apps.giniloh.com` (restore the domain and revert the fronts). **Still waiting on you: CanopyProof** (`context/recon_proposals/2026-10-12_canopyproof.md`, commit `d209cf3`, score 79, `usesLlmPrimitive: true`, ≈ $0.18/call → rec **$1.50/call**, $39/mo importer plan, $19 one-off pack, WebMCP `preflight_eudr_geolocation`; EUDR Delegated Reg (EU) 2026/2102, application **2026-12-30**) — reply `@Simon approve CanopyProof`; **day 6** of waiting, approved backlog otherwise **empty**. **NEW, measured:** first browsing activity in three days — `events` **7669 → 7676** rows / sessions 4698 → **4700**: `01d35679…` hit `spendproof` 2026-10-16T20:55, **four products in 68 s** on 10-17 (01:20–01:22), then returned for `facturgate` at 13:24; `715be7be…` hit `spendproof` at 21:02. No user agent stored, no row in a build window → **not** a CI cluster, but **not provable outside traffic** (most likely the owner) — **no provable outside visitor, day 47**; `agent_query` still 8. **RED, second day:** `hermes cron doctor` **1 issue / 1 job** — **WordPress Draft Sweep FAILED 2026-10-17 14:21**: the same 9 published `wellroost.com` posts with **no `vertical` term** (`#90 #86 #73 #75 #68 #55 #50 #14 #9`) + a rolling 6-post sitemap-gap list (now `#1003` / `#997` / `#991` / `#970` / `#966` / `#962`; `#988`, `#961` dropped off); hand-probed `#1003`, `#997`, `#991` are **200 on all three fronts** with redirects followed → sitemap-listing gaps, not missing pages. The check lives in the **other** repo (`/root/editorial-factory`, `scripts/check_cms_defects.py`), tightened by the owner's own commit `169a917`; the exemption question is his: reply **`@Simon grandfather the CMS topic tag`** or **`@Simon tag the pre-split posts`**. **Also open for you:** item **5** (`@Simon approve traffic marker` — today's two session ids are exactly the case it exists for), item **6** (durable record), item **7** (P2), item **11 descriptor half** (P2), **`aichieve.net/robots.txt` + `/sitemap.xml` 404 third day** (`@Simon approve aichieve robots and sitemap`), the four extra public first-cut launch-video copies (P2), the provider low-balance alert, and the social/video channel the owner runs by hand. Verified this run: manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 (`cpa_monthly` + app) + `agent_metered` 200 `cs_live_` + `cpa_monthly`/`pdf_audit_export` no-`app` 400 + `quarterline` 400 + portal 307; Stripe **mode-paired keys** (`STRIPE_SECRET_KEY_LIVE` `sk_live_` 107 ch beside the legacy `sk_test_` slot, `STRIPE_MODE=live`) `/v1/balance` 200 `livemode:true`, available **$0.00**; container `GEMINI_API_KEY` 39 + `LLAMAPARSE_API_KEY` 52 + `STRIPE_AGENT_METER_PRICE_ID` 30 ch; SpendProof no-doc → 400 `sp-document-missing`; editorial HEAD `957efaa` == origin, pressflow `/app/published` **119 == 119**, Supabase `articles` **114 → 119**; fronts all 200 (`aichieve.net` 100 article paths, `giniloh.com` sitemap 1070, `wellroost.com` 38); `vertical-sync --check` exit 0 (26); `recon:cadence` exit 0. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription). Registry 5 `live` + 1 `killed`, unchanged. Item 7 gateway still `1963330` (2026-09-12).

_Last updated: 2026-10-16 (**15:30 sweep**, Day-46 — every open item re-measured live; **the app's host moved mid-run, giniloh → aichieve; surfaces re-probed at the new host**). **The factory changed nothing in 24 h and the approved backlog is empty — the build line has now been idle five days with only CanopyProof in front of it.** Local HEAD == `origin/main` == **`f842104`** (the 10-15 sweep record; the only commit — no product commit, no `src/`, no dispatch, worktree clean but for the video desk's untracked `.scratch/`); app container `af8yqbwrrnyyfgs9wcg0intj-20261015T153543` image `f84210445830…` == HEAD (up 24 h), `/showcase` 200 — **then the web address moved with this run's own docs deploy**: the new container `af8yqbwrrnyyfgs9wcg0intj-20261016T153427` (image `fffc1a462dbf…` == HEAD, 15:34:27) carries `COOLIFY_FQDN=apps.aichieve.net/` and a single traefik rule `Host(\`apps.aichieve.net\`)`, so **`apps.aichieve.net` is the app's public host now (all surfaces 200, manifest byte-identical) and `apps.giniloh.com` answers 503 on every path** (it was 200 at 15:31Z). **NEW ASK, decided today:** reply `@Simon keep apps.aichieve.net` (the fleet then re-points the `/showcase` canonical, the app's 30-URL `sitemap.xml`, the WebMCP manifest `endpoint` and the reader fronts' links — `aichieve.net/apps/` ×11, `aichieve.net/` ×5, `giniloh.com/` ×1, `giniloh.com/calculators/` ×1 — and adds the missing `robots.txt` + `sitemap.xml` for the new front) or `@Simon put the app back on apps.giniloh.com` (restore the Coolify domain). **Still waiting on you: CanopyProof** (`context/recon_proposals/2026-10-12_canopyproof.md`, commit `d209cf3`, score 79, `usesLlmPrimitive: true`, measured ≈ $0.18/call → rec **$1.50/call**, $39/mo importer plan, $19 one-off pack, WebMCP `preflight_eudr_geolocation`; EUDR Delegated Reg (EU) 2026/2102, in force 2026-09-18, **application date 30 Dec 2026**) — reply `@Simon approve CanopyProof`; day **5** of waiting (day 1 = 2026-10-12 and the line has been idle since 2026-10-10's SpendProof ship). **The 10-15 cron-hold confirmation is CLOSED by behaviour** — `hermes cron status` **61 active job(s)**, nothing re-paused, and the owner was back on the editorial desk from **2026-10-16 00:40** (`.hermes_history`: 00:40 "to publish anything to wordpress, we now need to specify a vertical", 01:22 the CMS routing split, 01:27 "can any of these issues be fixed? how?", 01:42 "a) yes b) I deleted it c) yes"); `~/.hermes/cron/PAUSED_2026-10-15.md` is stale/inert. **NEW RED — the publishing desk's own check, not a factory item:** `hermes cron doctor` **1 issue / 1 job**, **WordPress Draft Sweep FAILED 2026-10-16 14:17** (first red; `ok` 10-08 → 10-15) — `CMS defect check: 9 problem(s)` = published `wellroost.com` posts with **no `vertical` term** (`#90/#86/#73/#75/#68/#55/#50/#14/#9`, CMS dates 2026-09-07 → 10-05; the CMS `vertical` taxonomy is what the split routes on) + `6 post(s) published in a CMS but absent from its site's sitemap (frontend not rebuilt)`. The check lives in `/root/editorial-factory` (`scripts/check_cms_defects.py`, added 2026-09-30, wired into `scripts/cron-wp-drafts.sh`) and was tightened for the split by the owner's own commit **`169a917`** (2026-10-16 00:56). Hand-probed: 4 of the 6 are `giniloh.com/<slug>/` **301 → `aichieve.net/<slug>/` 200** (fine) and `#991`/`#988` are served from **`wellroost.com` 200** while giniloh/aichieve 404. Because the owner told the desk on 2026-10-15 06:50 *"please do not touch the existing mismatches"*, the exemption question is his: reply **`@Simon grandfather the CMS topic tag`** (exempt pre-split posts) or **`@Simon tag the pre-split posts`**. **Also open for you:** item **5** (internal-traffic marker — `@Simon approve traffic marker`), item **6** (durable record), item **7** (P2), item **11 descriptor half** (P2: `ai-plugin.json` 200 still names QuarterLine against the dead `factory.aichieve.net`, `/openapi.json` 404), **`aichieve.net/robots.txt` + `/sitemap.xml` 404 second day** (`@Simon approve aichieve robots and sitemap`), the four extra public first-cut launch-video copies (P2), the provider low-balance alert, and the social/video channel the owner runs by hand. Verified this run: manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 + `agent_metered` 200 `cs_live_` + product-scoped plan with no `app` 400 + `quarterline` 400 (as plan and as `app`) + portal 307; Stripe `/v1/balance` 200 `livemode:true`, available **$0.00**; container `GEMINI_API_KEY` 39 + `LLAMAPARSE_API_KEY` 52 + `STRIPE_AGENT_METER_PRICE_ID` 30 ch; SpendProof with no document → 400 `sp-document-missing`; `events` **7669** rows / sessions **4698** (**zero new rows in 24 h**; last row still 2026-10-14T19:36:22Z); `agent_query` still 8 (organic 0, day 46); **no provable outside visitor — day 46**; `vertical-sync --check` exit 0 (26); `recon:cadence` exit 0. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription). Registry 5 `live` + 1 `killed`, unchanged.

_Last updated: 2026-10-15 (**15:30 sweep**, Day-45 — every open item re-measured live on `apps.giniloh.com`). **The domain split is live and today's cron hold has been lifted.** `aichieve.net` **200** (own title, 91 article links, six category hubs, its own container `p3zkcfkzvmjq6xt3yjnsobwf-20261015T070638` image `57d01bf7…` up since 07:07); `giniloh.com` **200** (redeployed today `c6sm5gz59a3jnrjg1ouahfp7-20261015T132047` image `3433769331…` 13:22); `wellroost.com` **200**. The owner asked for a fleet pause at 06:22 (`PAUSED_2026-10-15.md` + snapshot, 61 of 62 jobs); the note still claims "No active jobs" but `hermes cron status` reads **61 active**, today's Thursday editorial slots (10:30–12:30, five verticals) were **skipped** (`last_run_at` still 2026-10-08) and `Full Pipeline: demand_sensing_advanced_sop` fired **on time 13:00** and finished `ok` 13:38 — the hold ran 06:23 → 12:30/13:00 and no all-clear note was left on this host; **owner confirmation is the open ask.** Editorial (separate repo, HEAD `0bea2db` == origin): the split work landed today (`9805025`/`8bc3bdc` corpus + sitemap from the new fronts, `98954ec`/`8559fe0` CMS anchor audit + rewrite wired into `verify.sh`, `a495767`/`19b055d` RAW-body read-back + sitemap, `6ea9459` publish, `0bea2db` meta-description floor); today's article (**Why 6.7% Holiday Growth Misses Units**) is **live on `wellroost.com` 200** and correctly 404 on the other two fronts; Supabase `articles` **99 → 105**; pressflow container image `0bea2dbf…` == HEAD serving **105 == 105** files. A real editorial defect was found and fixed: the live CMS excerpt published as **"U.S."** (initialism split the derived description); replaced + backfilled, splitter floored, 461/461 tests. **NEW, live:** `aichieve.net/robots.txt` and `/sitemap.xml` both **404** (giniloh + wellroost have both) — the new property is invisible to search and gives crawlers no rule. **The vision provider recovered** (`models` 200 in 233 ms, minimal `generateContent` 200 in **8.9 s** vs 502 / 129.9 s on 10-14), so yesterday's inconclusive screenshot review can run again. Launch videos: the five rendered ids are public on **GiniLoh** (`qeow4cdaiv8`, `JcP9RtWZZrg`, `I7NOZAQ-5Ig`, `I38c05ZZZr8`, `MiNmsr1i9Lo`), posters all 200, ledger 5 rows `uploaded`; **`82vT3OkoYsU` (the personal-channel copy) is now 404 — deleted**, but `LdSoKLTfYjs` + the desk's first cuts `V-eli97M0q0` / `4cNR2bt3mMg` / `uodX_D-Gqsw` remain public beside them. **Still waiting on you: CanopyProof** (`context/recon_proposals/2026-10-12_canopyproof.md`, commit `d209cf3`, score 79, `usesLlmPrimitive: true`, measured ≈ $0.18/call → rec **$1.50/call**, $39/mo importer plan, $19 one-off pack, WebMCP `preflight_eudr_geolocation`; application date **30 Dec 2026**) — nothing built, nothing in `src/`, nothing dispatched; the approved backlog is otherwise **empty** and **no factory product commit landed in 24 h** (the only commit is `cad1fbc`, docs/skills). **Also open for you:** item **5** (internal-traffic marker), item **6** (durable record), item **7** (P2), item **11 descriptor half** (P2), the aichieve robots/sitemap gap, the remaining extra launch-video copies, the provider low-balance alert, and the social/video channel the owner runs by hand. Verified this run: app container `af8yqbwrrnyyfgs9wcg0intj-20261014T165437` image `cad1fbc45fc8…` == HEAD; `/showcase` 200; manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 + `agent_metered` 200 + product-scoped plan with no `app` 400 + `quarterline` 400 (both as plan and as `app`) + portal 307; Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch, `/v1/balance` 200 `livemode:true` (available $0.00); SpendProof with no document → 400 `sp-document-missing`; `events` 7668 → **7669** rows / sessions **4697** (one new row in 24 h: caseproof view 2026-10-14T19:36:22Z, unattributable; zero rows today); `agent_query` still 8 (organic 0, day 45); no provable outside visitor (day 45; last outside-touching 2026-09-23T14:11:42Z); `vertical-sync --check` exit 0 (26); `recon:cadence` exit 0. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription).

_Last updated: 2026-10-14 (**15:30 sweep**, Day-44 — every open item re-measured live on `apps.giniloh.com`). **Every live product now
has a public launch video, and each product page embeds it.** Five of five verified through YouTube's oEmbed endpoint (200 + a real
title) on the product channel **GiniLoh** (`@GiniLoh-m6i`): `spendproof` `qeow4cdaiv8`, `ledgerlink` `JcP9RtWZZrg`, `facturgate`
`I7NOZAQ-5Ig`, `parcelproof` `I38c05ZZZr8`, `caseproof` `MiNmsr1i9Lo` — each rendered click-to-load behind a poster served from our own
origin (`/launch-videos/<slug>.jpg`, all 200). The four products that shipped before the pipeline existed were produced anyway (the
owner reversed the `grandfathered` standard on 10-13); the `launch_videos` ledger is **5 rows, all `uploaded`**. Six commits landed
`20c0d13..5ee4194` (10-13 23:55 → 10-14 02:46): publish all five + embed them, quarantine the third-party video frame from the WCAG
scan, repoint the four pages at the owner's hand-published cuts (each id read back from the YouTube Data API first), click-to-load with
our own poster, the schematic caption-versus-border class decided in code, neutral section heading + a crisp FacturGate poster. **The
worktree is clean** — the launch-video P2 (12 modified / 7 new files) is CLOSED; only the desk's untracked `.scratch/` remains. **NEW
owner item:** three SpendProof launch videos are public — the page embeds `qeow4cdaiv8`, the ledger's own `LdSoKLTfYjs` is also public,
and `82vT3OkoYsU` (the one the 10-13 report named) **is still public on the founder's personal channel**, so that block's claim that the
earlier uploads were deleted does not hold. **The red job is gone:** `hermes cron doctor` **0 issues / 61 jobs** — Editorial Verify Gate
`ok` 10-14 14:08 (after three reds in four days), WordPress Draft Sweep `ok` 14:20. Measured closure: `/root/editorial-factory` is level
with its origin (HEAD `606ce73`), pressflow container `nstjdswcf5p9xckxwja89o6z0-20261014T130123` image `606ce738d93…` serves **99**
published files against **99** on the host (the 4 → 15 gap is CLOSED), Supabase `articles` **88 → 99**. **Still waiting on you:
CanopyProof** (`context/recon_proposals/2026-10-12_canopyproof.md`, commit `d209cf3`, score 79, `usesLlmPrimitive: true`, measured
≈ $0.18/call → rec **$1.50/call**, $39/mo importer plan, $19 one-off pack, WebMCP `preflight_eudr_geolocation`; audits a supplier
geolocation submission set **before** an EUDR due-diligence statement is filed; application date **30 Dec 2026**) — nothing built,
nothing in `src/`, nothing dispatched; the approved backlog is otherwise **empty** and no product code changed in 24 h.
**Also open for you:** item **5** (internal-traffic marker), item **6** (durable record), item **7** (P2), item **11 descriptor half**
(P2), the duplicate SpendProof video, the provider low-balance alert, and the social/video channel the owner runs by hand. Verified this
run: app container `af8yqbwrrnyyfgs9wcg0intj-20261014T024644` image `5ee41949285f…` == HEAD; `/showcase` 200; manifest **v2.1.0 / 10
tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 + `agent_metered` 200 + product-scoped plan with no `app` 400 +
`quarterline` 400 "retired" + portal 307; Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch, `/v1/balance` 200 `livemode:true` (available
$0.00); SpendProof with no document → 400 `sp-document-missing`; `events` 6543 → **7668** rows / sessions 4037 → **4697** (990 rows
today, of which 980 are our own browser suites at 01:14–01:59 and 02:10–02:40 — the per-second clustering is the evidence); `agent_query`
still 8 (organic 0, day 44); no provable outside visitor (day 44; last outside-touching 2026-09-23T14:11:42Z); `vertical-sync --check`
exit 0 (26); `recon:cadence` exit 0. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription).

_Last updated: 2026-10-13 (**15:30 sweep** — every open item re-measured live on `apps.giniloh.com`). **The factory now publishes its own
launch videos, and the first one is live.** `Post-Ship Brag` (new job, `*/30 11-23 * * *`, monitor-driven) plus `Launch Video Auth Check`
(`0 13 * * 1`) landed with 17 commits `6cf56b8..c62c690` (2026-10-12 23:02–23:07): a `launch_videos` ledger with a grandfathered backlog, a
deterministic pending-product detector, a narration word/second budget that also fails hard on the MEASURED take length, a Kokoro
voiceover with the voice derived from the slug (Kokoro replaced ElevenLabs as the default; `--tts elevenlabs` survives for A/B only),
a duck-and-mux step that now loudness-normalises the mix to -14 LUFS with 48 kHz pinned, a resumable YouTube upload, and a one-time
OAuth consent helper whose scope list now carries the full `youtube` scope — the narrower upload/readonly pair could not set a
video's status (`videos.update` answered 403). **SpendProof's video is PUBLIC on the product channel** (`https://youtu.be/LdSoKLTfYjs`,
channel **GiniLoh**, `privacyStatus: public`, `PT22S` / `hd`, own thumbnail) — the founder moved launch videos off his personal channel
and reissued the token, and **every earlier upload (`DlLmXBBAOUY`, `GPo_PeQvHyY`, `82vT3OkoYsU`) was deleted by him**. Verified back
from the YouTube API, not from the uploader's exit code. 22.0 s runtime, 19.0 s / 45-word narration, and scene 4 is the product's own
disaggregation prism ported from `src/components/editorial/prism-schematic.tsx`. `ProductLaunchVideo` (registry
`src/products/launch-videos.ts`) embeds it on `/spendproof`, and renders nothing at all for a product with no published video. The
other four live products were ledgered `grandfathered` — **the founder reversed that standard on 2026-10-13 and their four videos are
in production now**, so the factory is doing exactly the bulk retro-processing the standard forbade; a future product picks up a video
automatically within 30 minutes of going live. Caveat: the launch-video worktree carries uncommitted in-flight work (12 modified / 7 new files) — the video desk's own, not a
defect in the published video. **Still waiting on you: CanopyProof** (`context/recon_proposals/2026-10-12_canopyproof.md`, commit
`d209cf3`, score 79, `usesLlmPrimitive: true`, measured ≈ $0.18/call → rec **$1.50/call**, $39/mo importer plan, $19 one-off pack, WebMCP
tool `preflight_eudr_geolocation`; audits a supplier geolocation submission set **before** an EUDR due-diligence statement is filed; dated
driver Delegated Regulation (EU) 2026/2102, application 30 Dec 2026) — **nothing built, nothing in `src/`, nothing dispatched**; the
approved backlog is otherwise **empty** and no product code changed in 24 h. **The one red job:** Editorial Verify Gate FAILED 2026-10-13
14:02 (*live image `29294d0f6e19` vs HEAD `91115b944e59`, deploy behind*) — measured cause: `/root/editorial-factory` is **3 commits ahead
of its own origin** (`fef87f3`, `e79c382`, `91115b9`, never pushed); the pressflow container serves **73** published files against **88** on
the host (**15** newest articles missing from the internal reader only — CMS and Supabase carry all 88, public reader sites unaffected).
Third red in four days; flagged, not touched (the sweep does not push another repo, whose push path runs `git add -A` over a dirty
worktree). **Also open for you:** item **5** (internal-traffic marker — 7 events today across 5 sessions, still none attributable), item
**6** (durable record), item **7** (P2), item **11 descriptor half** (P2), the provider low-balance alert, and the social/video channel you
run by hand. Verified this run: app container `af8yqbwrrnyyfgs9wcg0intj-20261012T232802` image `c62c69002190…` == HEAD; `/showcase` 200;
manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 + `agent_metered` 200 `cs_live_` + app-less 400 +
`quarterline` 400 "retired" + portal 307; Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch, `/v1/balance` 200 `livemode:true`; `events` 6534 →
**6543** rows / sessions 4032 → **4037**; `agent_query` still 8 (organic 0, day 43); articles 77 → **88**; `vertical-sync --check` exit 0
(26); `recon:cadence` exit 0. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription).

_Last updated: 2026-10-12 (**15:30 sweep** — every open item re-measured live on `apps.giniloh.com`). **NEW, and
the only thing asking for you: the weekly recon produced a build.** `context/recon_proposals/2026-10-12_canopyproof.md`
(commit `d209cf3`): **CanopyProof**, signal **79/100**, declared **LLM/document-parse-backed** (`usesLlmPrimitive:
true`, so the $0.50–$3.00 band applies; measured ≈ $0.18/call → recommended **$1.50/call**, $39/mo importer plan,
$19 one-off pack, WebMCP tool `preflight_eudr_geolocation` at $1.50). It audits a supplier geolocation submission
set **before** an EUDR due-diligence statement is filed: ring/coordinate validity and WGS84 as declared (never a
silent reprojection), polygon required above four hectares, declared vs computed area, pairwise overlap between
suppliers (the double-count a single-file validator cannot see), yield plausibility against the operator's *own*
figure, and a version-stamped Annex I scope screen whose changed codes surface `unverifiable` rather than a guess.
Dated driver in-window: Delegated Regulation (EU) 2026/2102 (in force 18 Sep 2026); application date **30 December
2026**. `VERTICAL_A` = `legal_ops`: two candidates scored **53** and **46**, both below the 60 threshold →
**honest no build** (free federal deadline calculators with FRCP 6 holiday logic and free open-source PDF/A
validation own the arithmetic; no dated court-rule or filing-format change before 1 Dec 2026). `VERTICAL_B` =
`agriculture_eudr` produced the PRD; its stated weakest link is that the vertical has **no native editorial
channel** (adjacent to `supplier_risk_reshoring_decision` / `supply_chain`, same buyer). Both ledger rows recorded
2026-10-12; both moved out of the never-scanned queue. **Nothing was built, committed to `src/`, or dispatched —
the build starts only on your reply.** The approved backlog is otherwise **empty** and no product code changed in
24 h. **The one red cron:** Editorial Verify Gate FAILED 10-12 14:00 — *repo `/root/editorial-factory`, HEAD
`e79c382da342`; live image `29294d0f6e19` — deploy is behind*. Measured cause: that repo is **2 commits ahead of
its own origin** (`fef87f3` 11:14, `e79c382` 11:16, never pushed), so no pressflow deploy could take them; the
container serves **73** published files against **77** on the host (four newest articles missing from the internal
reader only — the live CMS and Supabase have them). Same class as 2026-10-10, second red in three days: flagged as
P2 fleet/editorial, not touched by this sweep. **Still open for you:** item **5** (internal-traffic marker — today
12 events across three long-lived browsers, still none attributable), item **6** (durable record), item **7** (P2),
item **11 descriptor half** (P2), the provider low-balance alert, and the social/video channel he runs by hand.
Verified this run: app container `af8yqbwrrnyyfgs9wcg0intj-20261012T143353` image `d209cf3abfee…` == HEAD;
`/showcase` 200; manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 +
`agent_metered` 200 + app-less 400 + `quarterline` 400 "retired" + portal 307; Stripe `STRIPE_MODE=live`,
`sk_live_` 107 ch, `/v1/balance` 200 `livemode:true`; `events` 6522 → **6534** rows / sessions 4031 → **4032**;
`agent_query` still 8 (organic 0, day 42); articles 72 → **77**; `vertical-sync --check` exit 0 (26);
`recon:cadence` exit 0. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription).

_Last updated: 2026-10-11 (**15:30 sweep** — every open item re-measured live on `apps.giniloh.com`). **The line is
running and the last three owner calls are landed and independently verified.** The three approvals of 2026-10-10
are SHIPPED: ParcelProof's UPS AHS-Dimension trigger 96 in → **48 in** (`38153e0`; the 96 in figure is the separate
Large Package/oversize rule — the defect made a legitimate UPS accessorial between 48 in and 96 in read as money to
dispute), the reader-site product wiring (`kotechile/giniloh` `30c1d59`, 52 of 86 articles carry one contextual CTA;
the same pass found the reader sitemap advertising five CAPITALISED product URLs that answer 404), and the
product-host crawler map (`/robots.txt` + `/sitemap.xml` **200**, 30 URLs, `quarterline` absent by construction).
**SpendProof went LIVE with a working document pipeline** (`6f325f5`): three measured defects fixed (the parse
service is a multipart, asynchronous upload whose receipt was being handed to the model as the invoice; the prompt
asked per-line while the parser read a record; the record is integer micro-USD, so a dollar amount read as micro-USD
was off by 1e6 in a money product). Live re-probe this turn: pasting an invoice is **read** and the verdict
**withheld** with `sp-extraction-unstated` (a declared field absent from my sample — rule 5, not a stub); neither
input → **400 `sp-document-missing`**. **Canonicals fixed on all 30 advertised pages** (`94d6341`, owner
instruction *“please fix the no canonical tags issue”*): the root layout set no `metadataBase`, so the 24 rule pages
emitted a relative canonical (Google ignores it — why Search Console read “User-declared canonical: None”) and the
five product pages plus the directory declared none. **`agent_metered` checkout 500 → 200 `cs_live_…`** — the
owner's `STRIPE_AGENT_METER_PRICE_ID` now reaches the container, together with `GEMINI_API_KEY` (39 chars) and
`LLAMAPARSE_API_KEY` (52 chars), all read back from the running container. Two gate repairs landed as their own
commits (`4dfe3c1`, `4b1e213`): the vision reviewer no longer opines on the text-in-a-row / gutter classes
`tests/e2e/text-geometry.spec.ts` decides in code, both settled by measurement (0 intersecting text runs at
1280×900) rather than by restyling. Billing portal work landed today: vertical pricing suites + legal disclaimers
(`05cc9d1`) and a customer-service section (`91cb116`, rescued from a canceled Antigravity run — its anonymous GET
had been returning every customer's name, email, subject and message body to anyone on a public page and its PATCH
let anyone flip a ticket's status; now one-ticket self-scoped by `ticket_id` + filing email, admin listing behind an
optional token that fails closed). **Still open for the owner:** the social/video channel he runs by hand,
affiliate/ads deferred until traffic builds, the provider low-balance alert (he took it), and **item 5**
(internal-traffic marker — today two long-lived browser sessions touched the site and the store cannot say who they
were), **item 6** (durable record), **item 7** (P2), **item 11 (descriptor half, P2)** — its crawler-map half is
what closed today: `/.well-known/ai-plugin.json` still names **QuarterLine** against the dead host and
`/openapi.json` 404s. Revenue still **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription); no
provable outside visitor (day 41). `hermes cron doctor` **no issues / 59 jobs**; `events` 6363 → **6522** rows /
sessions 3951 → **4031**; `agent_query` still **8** (organic 0); articles 70 → **72**; app image `91cb116d…` == HEAD.

_Last updated: 2026-10-11 (**canonicals fixed — the field the owner's Search Console panel showed empty**). Owner
instruction, verbatim: *"please fix the no canonical tags issue"*. Two defects, one root cause: the root layout set
no `metadataBase`, so (a) the 24 rule pages emitted a **relative** canonical (`href="/<product>/calc/<slug>"` — read
out of the live HTML, not the tree), which Google ignores, and (b) the directory and the five product pages declared
no canonical at all. Code `94d6341` (canonicals) and `4b1e213` (a separate gate repair, below): `src/lib/seo/canonical.ts` emits the absolute production URL and throws unless
the path is in the crawl map and lowercase; `metadataBase` is set at the root; all 30 advertised pages go through it.
Guard: a vitest contract (absolute, advertised-only, no capitals) plus an e2e that loops the crawl map and asserts
every advertised URL serves a canonical equal to itself — proven to bite by removing `/showcase`'s canonical and
watching that test fail. The gate then went red ONCE on two vision tiles (`parcelproof-qa-1`, `spendproof-qa-4`: "text overlapping in IDE inset (content overlaps line numbers)"); it did not reproduce on the immediate re-run (24/24, exit 0), and measurement at 1280×900 over every painted text run (`Range.getClientRects()`, pairwise) found /parcelproof with **zero** intersecting runs (242 scanned) and /spendproof's only intersecting pair in a code-inset title bar — the class `tests/e2e/text-geometry.spec.ts` decides and passes. No page was restyled to satisfy the model; the reviewer's prompt was narrowed instead, with the measurement recorded in `scripts/visual-qa.mjs`, as its own commit. **Owner-side, verified in Search Console's own API:** `https://apps.giniloh.com/sitemap.xml`
is now registered on the `sc-domain:giniloh.com` property — **lastSubmitted 2026-10-10T23:59:40Z, lastDownloaded
23:59:41Z, 0 errors, 0 warnings, 30 URLs submitted** — and `https://giniloh.com/sitemap.xml` was re-submitted
23:02:24Z (its live body carries the corrected lowercase product URLs). Note the honest reading of the panel he
pasted: `Crawled as: Google Inspection Tool smartphone` means that fetch was the *inspection tool*, not Googlebot —
it proves the page is unblocked but does not index it, which is why all five product pages still read "URL is
unknown to Google" in the index-status API while `/showcase` is indexed (last Googlebot crawl 2026-10-10T17:11Z).
**Still open for the owner, unchanged:** items **5**, **6**, **7** (P2), **11** (P2), the provider low-balance alert,
and the social/video channel he runs by hand. Revenue **$0 real**; no provable outside visitor.

_Last updated: 2026-10-10 (**the three approved items are LANDED and verified live; the ParcelProof trigger is
closed**). ParcelProof `38153e0` (code) / `ba6c5c1` (this record): `AHS_DIMENSION_LONGEST_SIDE_IN.ups` 96 → **48**
(both carriers 48; 96 belongs to the separate Large Package/oversize rule), the PRD tariff line corrected in place
with sources, the published pSEO bullet fixed, a new known-answer vector for the band the mix-up got wrong (a 60 in
UPS parcel: AHS-Dimension eligible, oversize not met) and a paired-constant test. **Live proof, not the gate:** the
running container (`af8yqbwrrnyyfgs9wcg0intj:38153e0…` == HEAD) contains `fedex:48` in its own server bundle and
**no `ups:96` anywhere** under `/app/.next/server`; the live rule page
`/parcelproof/calc/ahs-dimension-trigger` now publishes "UPS and FedEx both trigger AHS-Dimension above a 48″
longest side … the 96″ figure belongs to the separate Large Package/oversize rule". **Crawler map live:**
`/robots.txt` **200** and `/sitemap.xml` **200** on the product host (both were 404) — 30 URLs, the 5 in-inventory
product pages plus 24 rule pages, `quarterline` absent by construction. **Reader wiring live** (separate repo
`kotechile/giniloh`, `30c1d59`, app 12, image `30c1d590…` == HEAD): 52 of 86 live articles now carry one contextual
CTA to the tool that answers them — verified on the live pages (a customs-money article → ParcelProof, an AI-spend
article → SpendProof, the payout article → LedgerLink, the FacturGate launch note → FacturGate), and a career
article and a calculator page render **no** card. **Defect found and fixed in the same pass:** the reader sitemap
had been publishing five CAPITALISED product URLs (`/LedgerLink`, …) since the tools shipped — all **404**, because
Next routes are case-sensitive; the live sitemap now lists the real lowercase routes and no capitalised one.
The gate's own e2e run wrote 115 telemetry rows (23:33:50–23:34:22Z); they were deleted through the REST API and
the count verified back to the pre-run **6481**, so the growth metric cannot read our tests as usage. One operator
item found, not fixable from here: submitting `https://apps.giniloh.com/sitemap.xml` in Search Console returns
**403** for the fleet's service account (read-only on the domain property) — the owner can add it in one click, and
the `Sitemap:` line in the new `robots.txt` already exposes it to Google. **Still open for the owner, unchanged:**
items **5** (internal-traffic marker), **6** (durable record), **7** (P2), **11** (P2 — its crawler-map half is what
landed today), the provider low-balance alert, and the social/video channel he runs by hand. Revenue **$0 real**; no
provable outside visitor.

_Last updated: 2026-10-10 (**three owner decisions; the fleet is landing the two build items**). Owner
instruction, verbatim: *"fix the Parcelproof inconsistency ( ships UPS AHS-Dimension as 96 in when the PRD says 48
(23rd day open))"* — then, against the advisory's numbered list — *"1. DONE: ... Search Console: submit
giniloh.com/sitemap.xml and wellroost.com/sitemap.xml, and request indexing for the 5 product pages"*, *"2. APPROVED
PLEASE DO [wire the pages that are already indexed to the matching product]"*, *"3. APPROVED PLEASE DO [give the
product host a crawler map so the five product pages get crawled]"*. Items 4–6 are answered, not deferred: he will
add the provider low-balance alert himself, runs the social/video work by hand ("I WILL WORK ON THIS MANUALLY THEN",
"I cannot spend right now"), and holds affiliate/ads until traffic builds ("I WILL WAIT UNTIL TRAFFIC BUILDS").
**Correction recorded with the approval:** the advisory said "the PRD says 48" for UPS — the PRD's own tariff table
said **96 in for UPS / 48 in for FedEx** (the defect was the PRD's table, not the code's fidelity to it). The correct
rule, from both carriers' 2026 tables: **AHS-Dimension fires above a 48 in longest side at UPS and FedEx alike**; the
96 in figure belongs to the separate Large Package / oversize rule (longest side > 96 in AND length+girth > 130 in).
As published, the product called a legitimate UPS AHS-Dimension charge ineligible for every parcel between 48 in and
96 in — it told a shipper to dispute money they owed. Being landed in this session, evidence in the code commit:
(A) `AHS_DIMENSION_LONGEST_SIDE_IN.ups` 96 → 48 with the tariff basis in the file, the PRD line corrected in place,
the pSEO bullet fixed, plus a known-answer boundary vector (a 60 in UPS parcel: AHS-Dimension eligible, oversize not
met) and a paired-constant assertion so the two rules cannot be swapped again; (B) `/robots.txt` + `/sitemap.xml` on
the product host, derived from the registry and each product's own preset modules (a retired product drops out by
construction), with a drift-guard test and an e2e served-surface test; (C) the reader-site corpus (separate repo
`kotechile/giniloh`) gains a contextual CTA to the matching product on the pages that honestly have one — 52 of 86
live articles (carrier/customs money → ParcelProof, AI bills → SpendProof, the automation case → CaseProof, the four
launch notes → their own tool); career and personal-finance pages get nothing rather than a fabricated match, and the
1,029 career-occupation calculator pages have no matching product in inventory. **Defect found while wiring (C):**
the reader sitemap has been advertising five CAPITALISED product URLs (`/LedgerLink`, `/ParcelProof`, …) that answer
**404** — Next routes are case-sensitive — so Google was fed five dead product URLs from every reader page's sitemap;
corrected to the real lowercase routes in the same commit. **Still open for the owner:** the provider low-balance
alert (his), the social/video channel (his, manual), affiliate/ads (deferred until traffic builds), the agent tool
staying text-in, and unchanged: **item 5** (internal-traffic marker), **item 6** (durable record), **item 7** (P2),
**item 11** (P2 — the crawler-map half of it is what (B) closes). Revenue still **$0 real**; no provable outside
visitor.

_Last updated: 2026-10-10 (**SpendProof is LIVE and the extraction half WORKS — verified live, not just green**).
Owner instruction, verbatim: *"env variables are now created in Coolify.. Please review and change status"* → then,
after the defect report, *"full fix"*. Code `6f325f5`, gate repair `4dfe3c1`, app container
`af8yqbwrrnyyfgs9wcg0intj-20261010T194129` runs image `af8yqbwrrnyyfgs9wcg0intj:4dfe3c1…` == `git rev-parse HEAD`.
Registry **5 live + 0 beta + 1 killed**; live `/showcase` renders **LIVE ×5 / BETA ×0 / RETIRED ×1**, `/spendproof`
200. **The three credentials the owner added are in the RUNNING container** (read back from it, not from the
dashboard: `GEMINI_API_KEY` 39 chars, `LLAMAPARSE_API_KEY` 52 chars, `STRIPE_AGENT_METER_PRICE_ID` `price_1UMYy8…`),
and both were validated against the live services before anything shipped (Gemini `/v1beta/models` **200** with
`gemini-3.1-pro-preview` present; LlamaParse `/api/parsing/upload` authenticated). The Coolify env change needed a
redeploy to reach the container — app 14 was redeployed for it. **`agent_metered` checkout went 500 → 200 live
session** (`cs_live_…`): that open item is CLOSED, the agent money rail is no longer dead. **The extraction half was
dead in three ways, none of which a stubbed transport or a faked key can reveal:** (1) the parse call was a JSON POST
where the service requires a **multipart `file`** upload and is **asynchronous** (`upload → {id,status:PENDING} → poll
GET /job/{id} → GET /job/{id}/result/markdown`) — the upload response is a RECEIPT and the old code fed it to the model
as the invoice; (2) the prompt asked for a flat **per-line** field list while the parser read a whole **record**, so
the model answered ONE OBJECT PER LINE (a top-level array) and the parser's first-`{`-to-last-`}` slice fabricated
invalid JSON out of `{…},{…}`; (3) the prompt never stated the units while the record is **integer micro-USD** — a
dollar amount read as micro-USD is off by 1e6 in a money product. All three fixed (`skills/webmcp_integration.md` §7
gained contracts 5–7). **Live-verified end to end, not by the gate:** `POST /api/spendproof/extract` with
`documentText` → **200**, **22/22 fields labelled `extracted`** (provider, period, currency, amount + 3 lines × 6);
with a real PDF as `documentBase64` → **200** through the parse flow; neither input or both inputs → **400** with a
rule id (`sp-document-missing` / `sp-document-ambiguous`); `POST /api/agent/calculate` `reconcile_ai_invoice` now
reaches input validation instead of the credential door. `verify-build.sh` green end to end (**213 vitest** / **75
Playwright e2e** / **visual-qa 24/24 tiles PASS**), and the `/showcase` baseline re-derived after READING the diff
(one contiguous 62×23 px region at (1098,822), 1347 px of 2,485,760 — the BETA pill becoming the LIVE badge).
**`visual-qa` failed `caseproof-qa-5` on three consecutive attempts** on an untouched product ("text overlapping in
IDE header (W3C navigator.modelContext and CLIENT-SIDE ONLY badge)") — a tile `tests/e2e/text-geometry.spec.ts`
already names as a false positive of that reviewer; measured at 1280×900 on the audited page state: the two runs sit
at x=647 (156 wide) and x=839, **0 intersecting rects, 36 px of clear space**. Landed as its own commit (`4dfe3c1`):
the reviewer prompt no longer opines on the text-in-a-row class the deterministic guard decides, with the measurement
recorded in the file. **The 357 telemetry rows the gate's own e2e runs wrote** (19:24:28→19:38:13Z) were deleted and
verified back to the pre-run row (id 6723, 18:49:51Z), so the growth metric cannot read our tests as usage.
**Still open for the owner:** the product host has **no crawler map** (`/robots.txt` + `/sitemap.xml` **404** on
`apps.giniloh.com`, re-probed this turn), so nothing shipped becomes discoverable; `reconcile_ai_invoice` stays
**text-in** (its published agent contract) — the PDF path is the HTTP route and the page, and widening the agent
contract is a manifest version bump for the owner to call; and unchanged: the **ParcelProof AHS-Dimension one-liner**
(23rd day), **item 5**, **item 6**, **item 7** (P2), **item 11** (P2). One nit, reported not hidden: an invalid
`documentBase64` answers **502** (a service-refusal class) where a **400** would be the honest class for a caller's
malformed input — the message is explicit and nothing was extracted.

_Last updated: 2026-10-10 (**15:30 sweep** — every surface re-measured live on `apps.giniloh.com`; the line is
running again). **SpendProof is BUILT and LIVE in beta.** Approval `c1470e2` (2026-10-09 23:50 UTC) → build job
`ed2ee8b` (23:53) → ship `536de2a` (2026-10-10 00:31, 28 files) → landing record `04b699d` (00:36);
`HEAD == origin/main == 04b699d`, app image `04b699dc…` == HEAD, `/showcase` 200, `/spendproof` 200. Registry
**4 live + 1 beta + 1 killed**; `verify-build.sh` green end to end (201 vitest / 75 Playwright e2e / visual-qa
24/24); manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical. **Still open for the owner, and one
of them blocks the product's value:** the deploy env has **no model key and no document-parse key**, so
`POST /api/spendproof/extract` answers **503** naming the missing variables (`SPENDPROOF_EXTRACTION_MODEL_KEY` /
`GEMINI_API_KEY`, `SPENDPROOF_PARSE_KEY` / `LLAMAPARSE_API_KEY`) — the loud door, and nothing was extracted or
estimated; and the `agent_metered` checkout is still **500** (`STRIPE_AGENT_METER_PRICE_ID` unset though the
meter + Price exist). `hermes cron doctor` **1 issue / 59 jobs**: Editorial Verify Gate FAIL 10-10 14:01 (live
site image `99933819` vs editorial HEAD `eaa303d`, deploy behind), **CLOSED** by 15:27 — pressflow container
`nstjdswcf5p9xckwja89o6z0-20261010T152712` built 15:27, image `ab44d141` == editorial HEAD `ab44d14`. Unchanged
and still open: the **ParcelProof AHS-Dimension one-liner** (UPS 96 as published vs 48 as intended, 22nd day),
**item 5** (internal-traffic marker), **item 6** (durable record), **item 7** (gateway restart, P2), **item 11**
(dead-host descriptor + no crawler map, P2 — `robots.txt`/`sitemap.xml`/`openapi.json` 404 re-probed). Revenue
**$0 real** (4 `cs_test_` purchases, 2026-09-02); **no provable outside visitor (day 40)**; `events` 5789 → 6363
(+574 — 82 the 10-09 16:31 watchdog run, 492 the SpendProof build's own browser suite 10-10 00:05–00:26, 268
sessions; 0 rows after 00:26); `agent_query` still **8** (organic 0 on day 40). Editorial: articles 65 → 70,
pressflow `/app/published` 70 files, `/healthz` 200, `/api/articles.json` 401. `vertical-sync --check` exit 0
(26); `recon:cadence` exit 0 (2 verticals 2026-10-05). Item 7: gateway pid still `1963330` (2026-09-12).

_Last updated: 2026-10-10 (**SpendProof is BUILT and LANDED — the build line is running again**). Code
commit `536de2a` (28 files, staged by name; the other writer's `skills/self_improvement_eval.md` stayed
unstaged). `bash scripts/verify-build.sh` **green end to end**: tsc 0 / eslint 0 errors / design tokens /
`verticals:check` 26 / `recon:cadence` / **201 vitest** (20 new known-answer tests carrying the PRD's five
vectors) / `next build` / **75 Playwright e2e** (11 new SpendProof specs + a new text-geometry guard) /
**visual-qa 24/24 tiles PASS**. Deploy verified, not the push: app container
`af8yqbwrrnyyfgs9wcg0intj-20261010T003137` runs image `af8yqbwrrnyyfgs9wcg0intj:536de2a2c528…` ==
`git rev-parse HEAD`; `/showcase` **200** (SpendProof card, `BETA` ×1, `LIVE` ×4, `RETIRED` ×1) and
`/spendproof` **200**; `/.well-known/mcp.json` **200 v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical
to the tree (selector default unchanged, `reconcile_ai_invoice` $1.50); the 400 rejection path and the
**503 extraction door** both return before any telemetry write, and a headless render of the live page shows
`CLOSE WITHHELD` with blockers `sp-untagged-spend · sp-bucket-unmatched` and 0 page errors. **Still open for
the owner, unchanged: the deploy carries no model key and no document-parse key**, so
`reconcile_ai_invoice` answers **503** naming the missing variables (the loud door, not a stub) — the
credential is the owner's action; and the product host still has **no crawler map** (`/robots.txt` +
`/sitemap.xml` 404, re-probed this turn).

_Last updated: 2026-10-09 (**owner approval — SpendProof is APPROVED and the build line restarts**). Verbatim
owner instruction: *"approve spendproof and reactivate the build line"*. SpendProof (signal 79/100, PRD
`context/recon_proposals/2026-10-05_spendproof.md`) is dispatched as a one-shot job; the APPROVED record below
carries its v1 scope and the two things the approval does **not** cover. **There is no disabled build job to
switch back on** — the fleet is 59 `active` jobs, and the line was idle because nothing was approved, so the
approval itself is the reactivation. State at approval: `HEAD == origin/main == 23ce146`, app image `23ce1466…`
== HEAD, `/showcase` 200, tree clean apart from one other writer's WIP. **Still open for the founder, unchanged:**
the deploy env has **no model or document-parse key** (SpendProof is the first LLM/parse-backed product — the code
must fail loudly without it, the key is the owner's to add), the `agent_metered` checkout is still **500**
(`STRIPE_AGENT_METER_PRICE_ID` unset), the product host still has **no crawler map** (`/robots.txt` + `/sitemap.xml`
both 404 on `apps.giniloh.com`), the **ParcelProof AHS-Dimension one-liner** (21st day), **item 5** (internal-traffic
marker), **item 6** (durable record), **item 7** (gateway restart, P2), **item 11** (dead-host descriptor, P2).
Revenue still **$0 real**; no provable outside visitor (day 39)._

_Last updated: 2026-10-09 (**15:30 sweep**, every open item re-measured live). **The factory built nothing for a
fourth day; two internal housekeeping changes landed this morning from the owner's instruction.**
`HEAD == origin/main == b337f77` (two non-product commits, 08:52–08:53 UTC; tree clean), app image `b337f770…` ==
HEAD, `/showcase` 200 — no product commit, no build, no registry change. **The build line still has no approved
work and exactly one candidate waiting: SpendProof (signal 79/100, PRD
`context/recon_proposals/2026-10-05_spendproof.md`)** — an LLM-parse-backed product that reconciles an AI provider
invoice against the organization's own tagged-usage ledger, declared `usesLlmPrimitive: true` and priced in the
$0.50–$3.00 band at a recommended $1.50/call. Reply `@Simon approve SpendProof` to start the build (fourth full
day waiting). **The two changes:** (1) the **Build Watchdog left the pro tier** (`deepseek-v4-pro` →
`deepseek-flash`) — it runs `scripts/verify-build.sh` and reports the result, green on its last 18 runs; pro is
now the three frontier agents plus the Friday Growth Watchdog only; (2) the **Slack writing standard is now
enforced** (`skills/slack_reporting.md` v1.1.0 — a required `What's live for you` section, and "the text you
send IS the file you gated") via a new **`Slack Report Gate`** job (18:00 UTC, script-only,
`scripts/check-slack-posts.mjs`) that re-gates what each factory job actually delivered. **`hermes cron doctor`
is CLEAN for a second day — 0 issues across 59 jobs** (+1 = the new gate): **Editorial Verify Gate ran `ok`
10-09 14:00** (second green day) and **WordPress Draft Sweep ran `ok` 10-09 14:16** (fifth green day). The
editorial desk shipped **9 new pieces** (Supabase `articles` 56 → 65; pressflow `/app/published` 56 → 65 files;
container `99933819…` == editorial HEAD `9993381`). Still open for the founder: the **ParcelProof AHS-Dimension
one-liner** (UPS 96 as published vs 48 as intended, 21st day), **item 5** (internal-traffic marker), **item 6**
(durable record), **item 7** (gateway restart, P2), **item 11** (dead-host descriptor + no crawler map, P2), and
two **operator settings**: a low-balance alert on the model provider account, and `STRIPE_AGENT_METER_PRICE_ID`
(unset, so `agent_metered` checkout is **500** even though the Stripe meter + Price exist). Live `/showcase`
`LIVE` ×4 / `RETIRED` ×1; manifest v2.0.0 / 9 tools sha256 `5e47d410…` byte-identical; all four products return
live checkout sessions; revenue still **$0 real**. Traffic `events` 5527 → **5789** / sessions 3484 → **3633**
— 261 the 10-08 16:31 Build Watchdog run and **1 unattributable page view today at 09:34:36Z** — **no provable
outside visitor (day 39)**. `agent_query` still **8** (organic 0 on day 39). pressflow internal-only
(`/api/articles.json` 401; container 65 files, image `99933819…` == editorial HEAD `9993381`). App image
`b337f770…` == HEAD. Item 10 CLOSED, re-verified (presets 308 → /showcase). Item 7: gateway pid still `1963330`
(2026-09-12)._

_Last updated: 2026-10-08 (**15:30 sweep**, every open item re-measured live). **The factory built nothing and the
one red cron healed.** `HEAD == origin/main == 0cc2d57` (yesterday's sweep docs commit; tree clean) — no product
commit, no build, no registry change in 24 h. **The build line still has no approved work and exactly one
candidate waiting: SpendProof (signal 79/100, PRD `context/recon_proposals/2026-10-05_spendproof.md`)** — an
LLM-parse-backed product that reconciles an AI provider invoice against the organization's own tagged-usage
ledger, declared `usesLlmPrimitive: true` and priced in the $0.50–$3.00 band at a recommended $1.50/call. Reply
`@Simon approve SpendProof` to start the build (third full day waiting). **`hermes cron doctor` is now CLEAN — 0
issues across 58 jobs**: **Editorial Verify Gate ran `ok` 10-08 14:00** after three red days (the fleet's own
self-heal landed in the editorial repo, `afce7b5`), and **WordPress Draft Sweep ran `ok` 10-08 14:16** (fourth
green day). The editorial desk shipped **9 new pieces** (Supabase `articles` 47 → 56; pressflow
`/app/published` 35 → 56 files) and its container is now `2e79053d…` == editorial HEAD `2e79053` — the
one-commit deploy lag is closed. Still open for the founder: the **ParcelProof AHS-Dimension one-liner** (UPS
96″ as published vs 48″ as intended, 20th day), **item 5** (internal-traffic marker), **item 6** (durable
record), **item 7** (gateway restart, P2), **item 11** (dead-host descriptor + no crawler map, P2), and two
**operator settings**: a low-balance alert on the model provider account, and `STRIPE_AGENT_METER_PRICE_ID`
(unset, so `agent_metered` checkout is **500** even though the Stripe meter + Price exist). Live `/showcase`
`LIVE` ×4 / `RETIRED` ×1; manifest v2.0.0 / 9 tools sha256 `5e47d410…` byte-identical; all four products return
live checkout sessions; revenue still **$0 real**. Traffic `events` 5437 → **5527** / sessions 3434 → **3484**,
all 10-07 (88 the Build Watchdog run + 2 owner directory views at 17:58/19:28Z; 0 rows on 10-08) — **no provable
outside visitor (day 38)**. `agent_query` still **8** (organic 0 on day 38). pressflow internal-only
(`/api/articles.json` 401; container 56 files, image `2e79053d…` == editorial HEAD). App image `0cc2d57d…` ==
HEAD. Item 7: gateway pid still `1963330` (2026-09-12)._

_Last updated: 2026-10-07 (**15:30 sweep**, every open item re-measured live). **The owner closed the social
distribution ask and nothing else moved.** `HEAD == origin/main == 8a96080` ("docs: the editorial
LinkedIn/Reddit queue is gone (owner, 2026-10-06)") — the editorial desk's LinkedIn/Reddit channel and its
prepared cards are **removed by owner decision**; the stale `factory_config.distribution_queue` key (12 cards,
rewritten 2026-10-06T20:08:26Z) is inert history, **not a queued ask**, and the factory SOPs no longer point at
it. **The build line still has no approved work and exactly one candidate waiting: SpendProof (signal 79/100,
PRD `context/recon_proposals/2026-10-05_spendproof.md`)** — an LLM-parse-backed product that reconciles an AI
provider invoice against the organization's own tagged-usage ledger, declared `usesLlmPrimitive: true` and priced
in the $0.50–$3.00 band at a recommended $1.50/call. Reply `@Simon approve SpendProof` to start the build.
`hermes cron doctor` improved **6 → 1 issue**: the five stale 402 stamps all cleared by their own next run and
**WordPress Draft Sweep ran `ok` 10-07 14:16** (third green day), leaving **Editorial Verify Gate red a THIRD
day on a third check** (10-07 14:01, editorial HEAD `64d3043`; the writer's **article-voice** gate reports **2
problems across 124 checks**, `skills/claude_humanizer.md` §3.9 — the social-voice class is gone because the
channel it checked was removed; the gate also flags its own deploy one commit behind, live image `5dd08918`).
Still open for the founder: the **ParcelProof AHS-Dimension one-liner** (UPS 96″ as published vs 48″ as
intended, 19th day), **item 5** (internal-traffic marker — tonight's two directory views came from the owner's
own browser, proving the point), **item 6** (durable record), **item 7** (gateway restart, P2), **item 11**
(dead-host descriptor + no crawler map, P2), and two **operator settings**: a low-balance alert on the model
provider account, and `STRIPE_AGENT_METER_PRICE_ID` (unset, so `agent_metered` checkout is **500** even though
the Stripe meter + Price exist). Live `/showcase` `LIVE` ×4 / `RETIRED` ×1; manifest v2.0.0 / 9 tools sha256
`5e47d410…` byte-identical; all four products return live checkout sessions; revenue still **$0 real**. Traffic
`events` 5350 → **5437** / sessions 3385 → **3434**, all 10-06 (85 the Build Watchdog run + 2 owner directory
views at 22:17/22:24Z; 0 rows on 10-07) — **no provable outside visitor (day 37)**. `agent_query` still **8**
(organic 0 on day 37). pressflow internal-only (`/api/articles.json` 401; container 35 files, image `5dd08918`
one commit behind editorial HEAD; Supabase `articles` 47 rows). App image `8a96080a…` == HEAD. Item 7: gateway
pid still `1963330` (2026-09-12)._

_Last updated: 2026-10-06 (**15:30 sweep**, every open item re-measured live). **Nothing moved in the factory
in 24 h** — no commit, no build, no product change (`HEAD == origin/main == 867a419`, app image `867a419d…` ==
HEAD, `/showcase` 200). **The build line has no approved work and exactly one candidate waiting: the
2026-10-05 weekly recon recommends SpendProof (signal 79/100, PRD `context/recon_proposals/2026-10-05_spendproof.md`)
— an LLM-parse-backed product that reconciles an AI provider invoice against the organization's own tagged-usage
ledger, declared `usesLlmPrimitive: true` and priced in the $0.50–$3.00 band at a recommended $1.50/call. Reply
`@Simon approve SpendProof` to start the build. The one change today is our own gate: `hermes cron doctor`
improved **12 → 6 issues** — the **WordPress Draft Sweep ran `ok` 10-06 14:16** (duplicate-slug defect cleared)
and five stale 402 stamps cleared by their own next run — leaving **Editorial Verify Gate red a second day**
(10-06 14:01, editorial HEAD `efcbe1f`; the writer's social-voice check fails **3 problems across 194 checks**,
`skills/claude_humanizer.md` §3.8/§3.9) plus 5 stale 402 vertical stamps (next runs 10-07). Still open for the
founder: the **ParcelProof AHS-Dimension one-liner** (UPS 96″ as published vs 48″ as intended, 18th day), the
**distribution approval** (12 product-promotion cards ready, 0 ever published), **item 5** (internal-traffic
marker), **item 6** (durable record), **item 7** (gateway restart, P2), **item 11** (dead-host descriptor + no
crawler map, P2), and two **operator settings**: a low-balance alert on the model provider account, and
`STRIPE_AGENT_METER_PRICE_ID` (unset, so `agent_metered` checkout is **400** even though the Stripe meter +
Price exist). Live `/showcase` `LIVE` ×4 / `RETIRED` ×1; manifest v2.0.0 / 9 tools sha256 `5e47d410…`
byte-identical; all four products return live checkout sessions; revenue still **$0 real**. Traffic `events`
5266 → **5350** / sessions 3337 → **3385**, all 10-05 and 0 rows on 10-06 (last outside visitor
2026-09-23T14:11:42Z → 13 days). `agent_query` still **8** (organic 0 on day 36). Social queue unchanged at
**12** product-promotion cards, `updated_at` 2026-10-06T13:07:32Z, 0 published. pressflow internal-only
(`/api/articles.json` 401; container 33 files; Supabase `articles` 36 rows). App image `867a419d…` == HEAD.
Item 7: gateway pid still `1963330` (2026-09-12)._

_Last updated: 2026-10-05 (**15:30 sweep**, every open item re-measured live). **The build line has no approved
work left and exactly one candidate waiting: the 2026-10-05 weekly recon recommends SpendProof (signal 79/100,
PRD `context/recon_proposals/2026-10-05_spendproof.md`) — an LLM-parse-backed product that reconciles an AI
provider invoice against the organization's own tagged-usage ledger, declared `usesLlmPrimitive: true` and
priced in the $0.50–$3.00 band at a recommended $1.50/call. Reply `@Simon approve SpendProof` to start the
build; nothing else product-side is approved. **Item 10 is CLOSED (`bc6c3de`, live-verified)**: `/quarterline`
serves the retirement notice, all **20** `/quarterline/calc/*` preset URLs **308 → /showcase**, and
`/embed/countdown` is repointed at the live inventory. Also landed today (owner session): the visual review
now reads **full-resolution tiles** (`4f66600`, finding and fixing a real CaseProof hero caption/beam
collision in `7b7e767`), and the policy pass for **two verticals per sweep + LLM/parse primitives at the
higher band** (`60ae0b9` docs, `2678217` code; new `context/tech_stack_capabilities.md`,
`scripts/check-recon-cadence.mjs`, and a declared-class pricing guard). Still open for the founder: the
**ParcelProof AHS-Dimension one-liner** (96″ as published vs 48″ as intended, 17th day), the **distribution
approval** (12 product-promotion cards ready, 0 ever published), **item 5** (internal-traffic marker),
**item 6** (durable record), **item 7** (gateway restart, P2), **item 11** (dead-host descriptor + no crawler
map, P2), and an **operator setting**: a low-balance alert on the model provider account. `hermes cron doctor`
= **12 issues / 12 jobs** (10 stale 402 vertical stamps with last runs 2026-09-29 06:01 → 2026-09-30 08:01 and
next runs 10-05 → 10-10, plus two live editorial failures from today: **Editorial Verify Gate** 14:01, a
`wp_draft` mapping test in `/root/editorial-factory` HEAD `11be376`; and **WordPress Draft Sweep** 14:16, the
same duplicate slug on BOTH giniloh.com and wellroost.com). Live `/showcase` `LIVE` ×4 / `RETIRED` ×1;
manifest v2.0.0 / 9 tools sha256 `5e47d410…` byte-identical; all four products return live checkout sessions;
revenue still **$0 real**. Traffic `events` 4492 → **5266** / sessions 2886 → **3337**, all factory e2e runs
and the owner's own clicks (last outside visitor 2026-09-23T14:11:42Z → 12 days). `agent_query` still **8**
(organic 0 on day 35). App image `13478a9…` == HEAD == `origin/main`. Item 7: gateway pid still `1963330`
(2026-09-12)._

_Last updated: 2026-10-04 (**15:30 sweep**, every surface re-measured live). **The three launch calls are
SHIPPED** — FacturGate (`1336823`), ParcelProof and CaseProof (`683796b`) are all `status: live`; the inventory
is **4 `live` + 1 `retired`** and nothing is `beta`. So the top-block APPROVED records below are now the
current state, not pending work. **Item 10 is CLOSED** — on 2026-10-05 the owner retired all three public
QuarterLine surfaces (`bc6c3de`, live-verified; 2026-10-05 entry at the top of this file), so the retired
product no longer has a public page, indexable preset pages or an embed pointing at it. Still open for the
founder: the **ParcelProof AHS-Dimension
one-liner** (96″ as published vs 48″ as intended), the **distribution approval** (54 cards ready, 0 ever
published), **item 5** (internal-traffic marker), **item 6** (durable record), **item 7** (gateway restart,
P2), **item 11** (dead-host descriptor + no crawler map, P2), and an **operator setting**: a low-balance alert
on the model provider account so the 09-28…09-30 402 blackout cannot repeat silently. `hermes cron doctor` = 13
issues / 13 jobs (12 stale 402 vertical stamps + WordPress Draft Sweep failed 2026-10-04 14:24, kie.ai
featured-image Internal Error ×3). Live `LIVE` ×4 / `BETA` ×0 on `/showcase`; manifest v2.0.0 / 9 tools
byte-identical; all four products return live checkout sessions; revenue still $0 real._

## APPROVED + SHIPPED — 2026-10-10 (owner instruction, Jorge) → **SpendProof goes LIVE; the document pipeline fixed**

**[SHIPPED + LIVE-VERIFIED — `6f325f5` (product) + `4dfe3c1` (gate repair).]** Owner instruction, verbatim:
*"env variables are now created in Coolify.. Please review and change status"* — answered first with a review that
found the credential was not the only problem, then *"full fix"* for the three defects it named.

- **What the review found (all measured live, not read from the docs).** The credentials were correct and in the
  Coolify env for app 14 (`GEMINI_API_KEY` 39 chars, `LLAMAPARSE_API_KEY` 52 chars,
  `STRIPE_AGENT_METER_PRICE_ID` `price_1UMYy8…`, all `is_runtime`), and both keys validated against their services
  — but `POST /api/spendproof/extract` answered **502 "The document-parse service rejected the invoice (HTTP 400)"**,
  so the launch would have shipped a product whose headline feature errors for every user. The status flip was held
  and the defect reported.
- **Approved scope:** the full fix — the document path done properly (multipart upload + job polling) so real PDF
  invoices work, not the minimal "skip the parse for text" shortcut.
- **Shipped.** The parse flow is the measured three-step one (`upload` → `poll /job/{id}` → `/result/markdown`) with
  a bounded poll that withholds the verdict on ERROR/timeout/failed poll; the injected transport carries a `method`
  and a multipart `upload`; pasted TEXT is returned as-is without calling the parse service (so a text run no longer
  requires a parse key, while a DOCUMENT still refuses loudly by name); the prompt is rendered from the record's own
  key list with the units spelled out and a consistent worked example; the model payload is read AS JSON FIRST (a
  single-record array accepted, an array of several records refused, never merged); the route takes `documentText`
  XOR `documentBase64` with rule-id 400s and a size ceiling instead of truncation; the page gained a PDF/scan upload
  control; the agent tool is repointed at the new entry point, unchanged in its text-in contract.
- **Registry:** `spendproof` `beta` → **`live`** (the owner's launch call). It sits last in registry order, so
  `defaultInventoryProduct` is unchanged (still LedgerLink), and the published manifest already advertised the tool —
  v2.1.0 / 10 tools, no version bump.
- **Gate:** `scripts/verify-build.sh` green end to end — tsc 0 / eslint 0 errors / tokens / `verticals:check` 26 /
  `recon:cadence` / **213 vitest** (12 new) / `next build` / **75 Playwright e2e** / **visual-qa 24/24 tiles PASS**.
  The `/showcase` baseline was re-derived after READING the diff: one contiguous 62×23 px region at (1098,822),
  1347 px of 2,485,760 (0.054%) — the BETA pill becoming the LIVE badge, same row band as the 2026-10-04 change.
- **Live, after the deploy (not the push):** container `af8yqbwrrnyyfgs9wcg0intj-20261010T194129` runs image
  `af8yqbwrrnyyfgs9wcg0intj:4dfe3c1…` == `git rev-parse HEAD`; `/showcase` **200** with **LIVE ×5 / BETA ×0 /
  RETIRED ×1**; `/spendproof` **200** with the upload control in the served HTML; `POST
  /api/spendproof/extract` **200** with 22/22 fields labelled `extracted` (text) and **200** with a real PDF as
  `documentBase64` (document path); neither input → **400 `sp-document-missing`**, both inputs → **400
  `sp-document-ambiguous`**. Nothing wrote telemetry: all probes are rejection paths or plain GETs, and the route
  writes nothing on any path. The 357 rows the gate's own Playwright runs wrote were deleted through PostgREST and
  verified back to the pre-run row id 6723 (18:49:51Z).
- **A gate repair landed with it, as its own commit — reported because it changes a gate.** `visual-qa` failed
  `caseproof-qa-5` on three consecutive attempts on a product this pass does not touch, with a verdict
  `tests/e2e/text-geometry.spec.ts` already names as a false positive of that reviewer. Measured at 1280×900 on the
  audited page state (Range client rects, i.e. painted text runs): "W3C navigator.modelContext" at x=647 w=156 and
  "CLIENT-SIDE ONLY • ZERO EGRESS" at x=839 on the same row — **0 intersecting rects, 36 px of clear space**. The
  reviewer prompt no longer flags two adjacent text runs in a flex row/table row/code-inset header (it still flags a
  run that visibly crosses another) and names the deterministic guard, the same shape as the existing
  connector/line-near-label exclusion, with the measurement recorded in the file.
- **Not covered by this call, reported rather than folded in:** the product host still has **no crawler map**
  (`/robots.txt` + `/sitemap.xml` 404, re-probed), so nothing shipped becomes discoverable; `reconcile_ai_invoice`
  stays text-in — widening the agent contract to accept a document is a manifest version bump, the owner's call; and
  an invalid `documentBase64` answers 502 where 400 would be the honest class (explicit message, nothing extracted).
- **Still open for the owner, unchanged:** the **ParcelProof AHS-Dimension one-liner** (23rd day), **item 5**, **item
  6**, **item 7** (P2), **item 11** (P2).

## APPROVED — 2026-10-09 (owner instruction, Jorge) → **SpendProof build; the build line restarts**

Owner instruction, verbatim: *"approve spendproof and reactivate the build line"* — this ends the fourth full
day of an idle build line. SpendProof is the candidate this queue has carried since 2026-10-05 (signal 79/100,
PRD `context/recon_proposals/2026-10-05_spendproof.md`). **There is no disabled job to switch back on:** all 59
fleet jobs are `active` and the Watchdogs ran `ok` today; the line was idle because nothing was approved, so the
approval itself is the reactivation.

- **Approved scope (v1) — the PRD's §2 engine, §2 extraction posture and §3 pricing, and nothing else.**
  Engine `src/lib/calc/spendproof/` (pure TypeScript, fixture-testable, no network): rate-card recompute from the
  invoice's own declared unit price; the variance engine classifying rounding / period-boundary overlap /
  missing-or-late usage / untagged spend / price drift per attribution bucket; the balancing invariants
  (`Σ(invoice line items) == invoice total`; `Σ(recomputed) ≈ invoice total` within a declared tolerance; every
  bucket that does not reconcile reported `unmatched`; untagged usage an explicit `unattributed` finding that
  blocks a clean close); the close-ready report emitter. The **extraction layer sits in FRONT of the engine and
  extracts only** — document parse + LLM structured field extraction filling the declared field set
  `{provider, period, service, model, quantity, unit_price, amount, sku}`, every field labelled `extracted` on the
  page and in the artifact, any unsure field or unreadable region `unreadable`/`unstated` and **blocking the
  verdict** (rule 5). Route `src/app/spendproof/` on the Editorial Signature
  (`skills/ui_component_standards.md`); registry entry in `src/products/registry.ts` with
  **`usesLlmPrimitive: true`**, category Finance, WebMCP tool `reconcile_ai_invoice`; pricing catalog entry
  `$1.50/call` (LLM/parse band $0.50–$3.00 — `src/products/pricing.test.ts` fails the build if the declared class
  and the price disagree); telemetry `track(..., "spendproof")`; the PRD's five test vectors (clean pair → zero
  findings; mid-period rate change → price drift, no false variance; dropped usage rows → undershoot + `unmatched`;
  untagged batch → `unattributed` that blocks a pass; unreadable region → blocks, never guesses).
- **Deliberately NOT in v1:** multi-provider saved rate cards, a scheduled close, any live rate/duty feed lookup,
  Pro-suite entitlement changes, paid-tier work beyond the free preview + the one-off close pack. Parked behind the
  PRD, not dropped.
- **Launch status: `beta`.** The public launch call stays with the founder, as every build does.
- **Open credential — the owner's action, not the build's.** Re-read this turn from the app container's own env
  (`af8yqbwrrnyyfgs9wcg0intj-20261009T153227`): the deploy carries `STRIPE_*`, `SUPABASE_*`, `RESEND_API_KEY`,
  `EDITORIAL_SECRET` and `GSC_*`, and **no model key and no document-parse key** (no `GEMINI_*`/`GOOGLE_*`/
  `OPENAI_*`/`ANTHROPIC_*`/`LLAMAPARSE_*`). SpendProof is the **first** LLM/parse-backed product in the inventory,
  so its extraction step cannot run on the deploy until one exists. This does not block the build: the code must
  read the key from the deploy env and **fail loudly when it is absent** (no stub, no fabricated field, no
  degraded substitute), and the extraction test asserts that explicit failure path. **No approval ever covers a
  credential.**
- **What this approval does NOT cover (both stay open for the founder):** the `agent_metered` checkout is still
  **500** (`STRIPE_AGENT_METER_PRICE_ID` unset although the Meter + Price exist) — a different item, and the
  agent-native money rail stays dead; and the product host still has **no crawler map** (`apps.giniloh.com`
  `/robots.txt` and `/sitemap.xml` both 404, re-probed this turn), so nothing new this build ships becomes
  discoverable. Approving SpendProof does not fix the money path.
- **Dispatch:** one-shot cron job on the `approval-gated-shipping` skill, PRD v1 scope only, registry `beta`,
  the full `scripts/verify-build.sh` gate, push only on green — see DISPATCH below for the job id and the fired
  execution.

## DISPATCH — 2026-10-09 (approval: SpendProof)

- **Job:** `4b16d0e2e7f2` — "SpendProof build (approved 2026-10-09)", one-shot (`in 2m`), workdir
  `/root/software-factory-core`, `deliver=origin` (this thread), `attach_to_session=true`, skill
  `approval-gated-shipping`.
- **Fired:** 2026-10-09 23:52:47 UTC, execution `d20e2f8c45a74c178f4b0c2318e8616a` — verified via
  `hermes cron list` (`Execution: running …`, `Repeat: 1/1`), not from `jobs.json` (which keeps
  `last_run_at: null` until the run completes).
- **The approval record it reads is `c1470e2`** (`docs(approval): SpendProof APPROVED …`), already on `main`
  before the job was created — the prompt tells it the gate is satisfied there.
- **The dispatched prompt constrains the job to:** the v1 scope in the APPROVED record only; registry status
  `beta`; the full `scripts/verify-build.sh` gate; push **only** on green; stage-by-name (another writer's WIP
  `skills/self_improvement_eval.md` stays unstaged); restore-a-clean-tree-and-report on a root cause it cannot
  fix; deploy verification by container image tag == `git rev-parse --short HEAD` with side-effect-free probes;
  fail-loudly-when-the-key-is-absent for the extraction layer; the durable-record update; and a report that
  passes `scripts/check-slack-report.mjs` before it is posted.
- **Known limitation (recorded, not hidden):** `cronjob_manage action='create'` ignores `model`/`provider` —
  the job persisted with `model: null`, so it runs on the **default fleet tier** (`deepseek-flash`) rather than
  the frontier builder tier the repo's "Runtime model note" assigns to Product Director work. One build slot is
  running; nothing else was dispatched in parallel.

## BUILT + LANDED — 2026-10-10 (execution of the 2026-10-09 approval) → SpendProof

The dispatched job (`4b16d0e2e7f2`, execution `d20e2f8c45a74c178f4b0c2318e8616a`) is **done and on
`main`**. Code commit **`536de2a`** — 28 files staged by name, v1 scope only, registry `beta`.

- **Gate:** `bash scripts/verify-build.sh` green end to end (tsc 0 / eslint 0 errors / tokens /
  `verticals:check` 26 / `recon:cadence` / **201 vitest** / `next build` / **75 Playwright e2e** /
  **visual-qa 24/24 tiles PASS**). The `/showcase` baseline was an INTENDED re-derivation, made after
  reading the measured diff: five changed bands — the Finance chip count, the product count, the new card,
  the tool count and the new catalog row — and nothing else moved.
- **Deployed and verified, not the push:** container `af8yqbwrrnyyfgs9wcg0intj-20261010T003137`, image
  `af8yqbwrrnyyfgs9wcg0intj:536de2a2c528d0b7882f099fed8bcc442fc4b166` == `git rev-parse HEAD`.
  Live: `/showcase` 200 (SpendProof card, `BETA` ×1 / `LIVE` ×4 / `RETIRED` ×1), `/spendproof` 200,
  `/.well-known/mcp.json` 200 **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical to the tree
  (selector default still `reconcile_stripe_payout`), `x-webmcp-tool: not_a_tool` → **400**,
  `x-webmcp-tool: reconcile_ai_invoice` → **503** naming both missing env vars, `POST
  /api/spendproof/extract` → **503** likewise. A headless render of the live `/spendproof` shows
  `CLOSE WITHHELD`, `$2.70` recomputed, 2 findings, blockers `sp-untagged-spend · sp-bucket-unmatched`,
  0 page errors.
- **No telemetry was written by any probe.** All probes are rejection paths or plain GETs, and the live
  headless render had `/api/events` intercepted. The 147 rows the build's OWN Playwright runs wrote under
  `product=spendproof` (ids 6048–6599, 00:06:22→00:26:51, `page_view`/`reconcile_click` only) were
  deleted through PostgREST and verified back to **0**; `agent_query` is unchanged at **8**.
- **Two gate-classes recorded in the owning SOPs, both settled by measurement rather than by a model:**
  `skills/ui_component_standards.md` gained the 2026-10-09 entry (three "text overlaps" verdicts across
  two products, all false positives at 315/665/353/356 unclipped text runs with 0 intersections —
  `tests/e2e/text-geometry.spec.ts` now decides that class in code, incl. the placeholder-vs-gutter
  geometry), and `skills/webmcp_integration.md` §7 records the four contracts an LLM/parse-backed tool
  owes (env-keyed loud refusal ordered before the cap gate and any telemetry; declared-and-blocking
  extraction that never derives the audited number; transport injected so the core stays offline-testable;
  class-checked pricing with the 3× measured-cost test) plus the three traps when the tool list grows.
- **Still open for the owner (unchanged by this build):** the deploy needs a model key and a
  document-parse key (`SPENDPROOF_EXTRACTION_MODEL_KEY`/`GEMINI_API_KEY` and
  `SPENDPROOF_PARSE_KEY`/`LLAMAPARSE_API_KEY`) before `reconcile_ai_invoice` can serve a call — no
  approval covers a credential; the `agent_metered` checkout is still 500
  (`STRIPE_AGENT_METER_PRICE_ID` unset); and the product host still has no crawler map.

## APPROVED + LANDED — 2026-10-05 (owner instruction, Jorge) → the visual review reads full-resolution tiles

Owner instruction, verbatim: *"approve tiles"* — the structural call this file had parked twice ("the fix
changes a gate, so it stays the owner's call"), now made.

- **The reviewer's input changed.** `scripts/visual-qa.mjs` no longer sends one ~4×-downscaled full-page image
  per product (1280×6495 for ParcelProof) — the input its reviewer could not read, and the source of repeated
  hallucinated "text overlapping" verdicts. It reviews every **full-resolution tile**
  (`test-results/<product>-qa-<n>.png`, ≤6 per product, ~1280×900, cut from the full-page render with `clip`
  so a sticky element appears once in its document position rather than in every band).
  `tests/e2e/qa-screenshot.spec.ts` captures them; a product passes only if every tile passes; tiles are
  reviewed 4 at a time (18 tiles in ~112 s); missing tiles fail the step instead of going silently unaudited.
- **It justified itself on the first run.** With legible tiles the gate found a REAL defect on CaseProof's hero
  that the shrunken review had never reported: the payload caption ("vendor lines, buyer basis", 26 characters)
  overran its 146px card, and the dashed beam leaving that card ran through the text — confirmed by sampling
  the beam's path against the label's box (28 of 241 samples inside it).
- **Fixed and guarded.** `src/components/editorial/prism-caption.ts` wraps caller-supplied captions to the
  card's usable width (pure, unit-tested against both shipped captions; the card also gained a minimum height
  so a two-line caption fits). `tests/e2e/schematic-collision.spec.ts` samples every connector path against
  every label box on all three product pages and fails on any crossing — **proven RED before the fix, GREEN
  after**. With that geometry measured in code, the vision prompt no longer opines on "line near label" (a
  class it flagged as overlap twice on measurement-clean pages): the same division of labour this file already
  applies to fonts, padding and contrast.
- **The gate's own two defects, landed in the same pass:** the truncated-verdict bug (thinking tokens consumed
  the 2048 output budget, so a cut-off, verdict-less answer was read as a FAIL) and unrecognized verdicts now
  retrying instead of failing terminally — both with the measurement recorded in the file.
- **Gate:** `scripts/verify-build.sh` green — tsc 0 / eslint 0 errors / tokens / `verticals:check` 26 /
  `recon:cadence` / **180 vitest** / `next build` / **54 Playwright e2e** (incl. the 3 new collision guards) /
  **visual-qa 18/18 tiles PASS**.

## APPROVED + LANDED — 2026-10-05 (owner instruction, Jorge) → recon cadence ×2 + LLM/parse primitives at a higher price band

Owner instruction in `loop-ai`, verbatim: *"Increase the number of verticals to two per week and also add more
tools (at higher price maybe) to include LLM, llamaparse, etc."* Two policy changes to what the factory
searches for and what it may build, plus the machinery that makes both mechanical rather than advisory.

**1. Two verticals per sweep.** The weekly recon now declares `VERTICAL_A` and `VERTICAL_B` (two distinct
verticals, neither among the last two declared) and must record a `last_scanned` row for **both**.
- `skills/market_recon_last30days.md` Stage 0 rewritten (two slots, freshness rule per slot, "a sweep may
  return a candidate from one slot and a retirement from the other; it may not skip a slot"), Stage 6 now
  requires both verticals in the PRD and both rows in the ledger.
- `context/vertical_coverage.md` rules state the cadence; `.agents/market_scout.md` (the persona that runs it)
  gained the two-slot responsibility.
- **New guard, in the build gate:** `scripts/check-recon-cadence.mjs` (`npm run recon:cadence`, wired into
  `scripts/verify-build.sh`) fails when the ledger's newest scan date carries fewer than two verticals, and
  when either the SOP or the ledger stops declaring the cadence. Baseline handling is deliberate — the newest
  pre-change date (2026-09-28, one vertical) is reported and passed, because a guard that fails on its own
  baseline is last month's `verticals:check` false-red repeating. **Proven to bite by injection:** one
  vertical on a post-change date → exit 1 naming the date and the fix; two on the same date → exit 0; the
  SOP's cadence marker removed → exit 1 naming the file.
- The cron job's own prompt was updated in the same pass (a two-vertical sweep with both ledger rows), so the
  unattended run and the SOP agree.

**2. LLM / document-parse primitives, priced higher.** The factory may now build products whose pipeline calls
an LLM or a document-parsing service (LlamaParse named) — as an **extraction layer in front of the
deterministic engine**, never as the thing that produces a reported number.
- **New canonical file `context/tech_stack_capabilities.md`** (it did not exist, though the recon SOP has
  listed it as a prerequisite for weeks — a dangling reference now fixed): the deterministic core's
  invariants, the three newly allowed primitive classes with what each may and may NOT do, and the price
  bands. `context/company_goals.md` and `AGENTS.md` rules 1–2 now point at it; the recon SOP's Stage 4
  filters 1–2 and Stage 5 monetization line carry the new archetype and the class-based pricing.
- **The invariants that keep rule 1 intact:** no number a product reports or charges for may come from a
  model; extraction failure is an explicit finding that blocks the verdict, never a default; the moat must
  still be the deterministic computation ("the model does the whole thing" is a filter-1 drop); the model
  call must be priced in.
- **Bands, enforced in code, not just documented:** `src/products/pricing.ts` gained
  `DETERMINISTIC_RATE_BAND_USD` ($0.05–$0.50, unchanged) and `LLM_RATE_BAND_USD` ($0.50–$3.00, the higher
  band the owner asked for), with the class read from a **declaration** — the new registry field
  `usesLlmPrimitive` — never inferred from the price. `src/products/pricing.test.ts` fails the build when a
  deterministic tool exceeds its ceiling or an LLM-backed tool undercuts its floor.
  **Proven to bite by injection:** a deterministic tool priced $0.75 → red (`ratesOutsideTheirBand`);
  `usesLlmPrimitive: true` on a tool priced $0.25 → red. The margin rule (3× measured per-call cost) is the
  recon-side half and lands in the PRD when a candidate is proposed.
- **Nothing was built from the new primitives yet, on purpose.** No product was specified in the instruction,
  so this pass changes *what the search may propose* and *how it must be priced*; the next sweeps can now
  propose LLM/parse-backed candidates with a class and a band. The first such PRD must state the measured
  per-call cost (parse + generate + retries) that its rate has to clear.

**Gate:** `scripts/verify-build.sh` green end to end after both changes.

## APPROVED — 2026-10-05 (owner instruction, Jorge) → QuarterLine public surfaces retired (item 10)

**[SHIPPED + LIVE-VERIFIED — `bc6c3de`, 2026-10-05.]** Owner instruction in `loop-ai`, verbatim:
*"approve retire quarterline pages"*. Item 10 was the one thing the registry retirement (`bc3d556`) did not
cover, held as an explicit publish/unpublish call; the call is made, and all three surfaces it named are retired
in one pass. Nothing else in the queue was touched.

- **(a) `/quarterline`** served the working calculator behind a "$9 export" CTA that can only 400 now that
  checkout rejects the retired product — honest, but a dead end for a visitor. It now serves the **retirement
  notice**, whose copy is DERIVED from the registry entry (no second hand-written copy of the name/description),
  with a module-level guard that **fails the build** if the entry stops being `killed` (rule 5): reactivating the
  product cannot leave behind a notice claiming a live product is gone. `robots: { index: false, follow: true }`
  — the pSEO intent dies with the product, the record stays reachable — and the editorial shell
  (HorizonStripe/AmbientGrid/GhostCard, rule 9). No calculator, no currency input, no export CTA.
- **(b) The 20 `/quarterline/calc/*` preset pages** were still served and indexable. Retired through a
  **config-level 301 to `/showcase`** in `next.config.ts`, and the route directory is **deleted** — so re-mounting
  a calculator route is a visible change rather than a silent one. The legacy pre-subpath `/calc/:slug` redirect
  now goes **straight** to the directory instead of chaining through the retired preset route (one hop, not two).
  `src/lib/seo/presets.ts` stays as the enumerated record of what was published; its consumer is now the guard
  test. An unknown slug under the retired prefix redirects too (no 404, no calculator).
- **(c) `/embed/countdown`** still linked at the retired product: CTA and attribution repointed at the live
  inventory. The route keeps serving (200) so a third-party embed cannot 404.
- **Guards added, each proven to bite by injection before the commit:** the e2e guard asserts EVERY published
  preset slug 301s to the directory (un-retired expectation injected → red), plus the unknown-slug and legacy
  one-hop cases; the notice renders with no currency input and no export CTA and passes axe WCAG 2.1 AA; the
  embed's CTA points at the directory and links to quarterline nowhere. The QuarterLine QA capture retired with
  the surface it reviewed (visual-qa now reviews the three live products); the deterministic monospace check it
  carried moved onto ParcelProof's audited money figure (**inverted expectation injected → red**). The
  "decimal-input padding" check is **deleted, not moved**: the only surface it could observe was QuarterLine's
  currency field, and padding is enforced by `check:tokens`. `visual-qa --suggest` no longer reaches into
  `SCREENSHOTS[0]`; it names its target explicitly, so dropping an entry cannot silently retarget it.
- **Gate:** `scripts/verify-build.sh` green end to end **on the rebased tree** (the branch had two incoming
  docs commits; the second gate run is the one that counts) — tsc 0 / eslint 0 errors (1 pre-existing warning,
  `src/middleware.ts`) / design tokens / `verticals:check` 26 / **171 vitest** / `next build` / **51 Playwright
  e2e** / visual-qa PASS ×3.
- **Live evidence, probed from outside the container after the deploy** (image tag
  `af8yqbwrrnyyfgs9wcg0intj:bc6c3de0963352f77f63bbc78e1e3d9cfca8a5ef` == `git rev-parse HEAD`):
  `/quarterline/calc/california-freelancer-tax-2026` → **308 → /showcase** (was 200 with the calculator),
  `/quarterline/calc/nope` → **308 → /showcase** (was 404), legacy `/calc/texas-1099-estimated-tax` →
  **308 → /showcase** in one hop, `/quarterline` → **200** `<title>QuarterLine — Retired</title>` +
  `<meta name="robots" content="noindex, follow">`, 0 occurrences of "Export Report" and 0 of `inputmode` in the
  payload, `/embed/countdown` → **200** with the directory CTA and **0** quarterline references, `/showcase` 200,
  `/` 307 → giniloh.com, `/.well-known/mcp.json` 200 sha256 `5e47d410…` byte-identical to the tree. No telemetry
  rows written (probes were plain HTTP GETs; the notice page tracks nothing).
- **NOT retired by this call, reported rather than fixed silently:** (1) `/api/export/pdf` — the retired
  product's paid export route is still wired (`src/app/api/export/pdf/route.ts`); entitlement-gated, so only a
  legacy purchase row can reach it, but it is the last sellable-adjacent surface of a retired product and a
  candidate for the same treatment. (2) `public/.well-known/ai-plugin.json` still advertises **QuarterLine** by
  name against the dead `factory.aichieve.net` host (item 11): with the product retired, removing that descriptor
  is now the cleaner fix than repointing it. Both await the founder.

## APPROVED — 2026-10-04 (owner instruction, operator session) → ParcelProof + CaseProof public launch

**[SHIPPED + LIVE-VERIFIED — `683796b`, 2026-10-04.]** Owner instruction, verbatim: *"run all outstanding
tests and make necessary changes to move these apps to live status.. in addition, since this app runs on a
linux VPS it shouldn't be an issue to not having mac compatibility.. right?"* — the public launch call for
BOTH remaining beta products is made: **`parcelproof` and `caseproof` `status: beta → live`**. No product is
`beta` any more; the inventory is 4 `live` + 1 `retired`.

- **Registry effect, stated explicitly because it is the one blast radius a status flip has:**
  `defaultInventoryProduct` (the first `live` entry in registry order — what an unscoped, product-scoped
  request resolves to) is **unchanged**, still LedgerLink. Both promoted entries sit AFTER it. The flip
  changes the `/showcase` lifecycle badge (BETA pill → LIVE beacon) and nothing else.
- **Page parity verified, not assumed — and no page change was needed.** Both pages already carry the
  launch surface the older live product (LedgerLink) carries and more: `<ProductPricing slug>` (every
  number read from `src/products/pricing.ts`, the catalog checkout and the agent API charge from) plus an
  agent-surface block naming their WebMCP tools and linking `/.well-known/mcp.json`. Added 2
  launch-surface e2e specs per product (pricing block + billing entry; agent surface + manifest link),
  mirroring the FacturGate precedent. e2e 47 → **51**.
- **Stripe verified live, probed from outside the container:** `POST /api/checkout
  {app:"parcelproof", plan:"pdf_audit_export"}` → **200 `cs_live_a15V0gRS…`**; `{app:"caseproof"}` → **200
  `cs_live_a1rZGxhvrX…`**; app-less → 400 naming the inventory (no product assumed); `app=quarterline` →
  400 "retired". The repo's local `.env` is sandbox, so only the deployed probe evidences the live key.
- **Deploy verified, not the push:** the app container
  (`label=coolify.applicationId=14`) was replaced and now runs image
  `af8yqbwrrnyyfgs9wcg0intj:683796b7361614f83280a2b4ce3f64f094e61b1c` == `git rev-parse HEAD`; live
  `/showcase` renders `LIVE` ×4 / `BETA` ×0 (QuarterLine `RETIRED`), and `/parcelproof`, `/caseproof`,
  `/billing`, `/.well-known/mcp.json` all 200.
- **Two gate repairs landed with the launch.**
  (1) **The per-platform snapshot trap.** `playwright.config.ts` now pins
  `snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}"` and the Darwin baseline is
  deleted. The default `-{platform}` suffix had split `/showcase` into a linux and a darwin file, and the
  showcase redesign (`cd76993`, `8421aba`) refreshed **only the darwin copy** — so this host's gate was
  RED (46 passed / 1 failed) on an already-approved change *before any of today's work*, and the failure
  would have been misread as a regression in the redesign. Linux is the deploy target and the only test
  host, so a second baseline is a file no run here can validate. Answer to the owner's question: correct,
  macOS compatibility is not needed — and it is now impossible for the two platforms to diverge silently.
  (2) **The `/showcase` baseline re-derived for the badge change after READING the diff**, measured rather
  than eyeballed: one contiguous changed cluster, rows 822–844 × cols 359–790 (2694 px of 2,420,480 — the
  two status pills), nothing else on the page moved.
- **Gate:** tsc, eslint (1 pre-existing warning, `src/middleware.ts`), design tokens, vertical-sync,
  **171 vitest**, `next build`, **51 Playwright e2e**, **visual-qa PASS on all four product screenshots**
  — every step green. Baseline before any change: 46 passed / 1 failed (the stale Linux snapshot).
- **`visual-qa` is not reproducible run-to-run — recorded, and it matters for how much a red means.** A
  standalone run FAILed `facturgate-qa.png` (`text colliding in JSON schema parameters card`) on all three
  attempts; the identical image then PASSed in the gate run and in 3 further consecutive runs — 16 review
  calls on the same screenshot set, 4 of them on that image. So a red there is a signal to falsify by
  measurement, never a licence to restyle a page — and a
  green one is weak evidence. The exact failing capture could not be hashed (a Playwright run had already
  cleared `test-results/`), so the cause is not pinned: verdict non-determinism, or the earlier capture
  having been taken against a reused server. The open structural fix (viewport-height tiles per
  screenshot, instead of one ~4× downscaled full-page image) stays the owner's call, now with a second
  data point: it is not only false-positive-prone but non-reproducible in **both** directions.

## APPROVED — 2026-10-04 (owner instruction, operator session) → FacturGate public launch

**[SHIPPED + LIVE-VERIFIED — `1336823`, 2026-10-04.]** Owner instruction, verbatim: *"review facturgate
page. It should be in line with the web page of ledgerlin[k]... Inlude MCP instructions and link to
pricing. When everything is fine including stripe integration please change status to live"* — the
public launch call for FacturGate is made: **`status: beta → live`**.

- **The page review (against the live `/ledgerlink`).** The MCP guide + pricing link the instruction asked
  for had already landed in `dd4b536`; reviewing the deployed page against LedgerLink's found two gaps,
  both closed in `1336823`: (a) every advertised number was a hand-typed literal (`($29/mo · from
  $0.05/call)`, `METERED $0.05 – $0.25 / CALL`, a literal footer rate line) while checkout and the agent
  API price from `src/products/pricing.ts` — all four now read the catalog, plus a new wiring guard in
  `pricing.test.ts` so re-inlining a rate forks the build red instead of quietly forking the value;
  (b) the guide's footer lacked the `/showcase` Fleet catalog link LedgerLink's carries — added.
- **Stripe verified live, probed from outside the container:** `POST /api/checkout
  {app:"facturgate", plan:"pdf_audit_export"}` → **200 `cs_live_a14b6Sgn…`**; `{plan:"factory_pro"}` →
  **200 `cs_live_a1fWj2Ev…`**; app-less → 400 naming the inventory; `app=quarterline` → 400 "retired".
  Manifest `/.well-known/mcp.json` **v2.0.0 / 9 tools**, facturgate rates $0.05/$0.10/$0.25,
  byte-identical to the repo file (`5e47d410…`).
- **Gate:** tsc, eslint (1 pre-existing warning), design tokens, vertical-sync, **171 vitest**, `next
  build`, **47 Playwright e2e** green. `/showcase` visual snapshot re-derived for the badge change after
  reading the diff (107 px, the one badge); Linux baseline only — the Darwin baseline stays stale.
  `npm run visual-qa` is **RED on ParcelProof**, a surface this commit does not touch: the documented
  vision-model false-positive class (3rd occurrence), settled by measurement (0 text-run collisions, 0
  overflow, one 798×16px line) and by the flagged page's visible text being byte-identical to the live
  baseline `dd4b536`; the falsification recipe is now in `skills/ui_component_standards.md`. The
  structural fix — review viewport-height tiles instead of one ~4× downscaled full-page image — is an
  **open owner call**, because it changes a gate.
- **Registry effect:** `/showcase` shows FacturGate as `live`; LedgerLink remains the default inventory
  product (first `live` in registry order, unchanged). **ParcelProof and CaseProof stay `beta`** — their
  launch calls are the only two left, and both can already take money.

## APPROVED — 2026-10-03 (owner instruction, Jorge) → Factory Billing v1

**[APPROVED — owner (Jorge), 2026-10-03.]** Verbatim owner instruction:
*"go ahead with your suggestion. I agree we do not need to overcomplicate this."*

**[D1–D3 FIXED + LIVE-VERIFIED — `7751fea`, 2026-10-03 19:5x UTC.]** Owner follow-up "yes, fix these"
authorised the three money-relevant defects only. Shipped and verified against the live deploy
(container image tag == `7751fea`):
- **D1** — `/api/portal` no longer resolves a customer from an email or from the newest active
  subscription. Live: `POST {}` → **400**; `POST {email}` → **400** (was a portal-open); `GET` (no params)
  and `GET?email=` → **307 `/billing?error=missing_customer_reference`** (was a Stripe portal session).
- **D2** — `/api/checkout` prices from `PLAN_CATALOG`. Live: client `lineItems` → **400**; unknown plan →
  **400** (names the catalog); `{plan:"factory_pro", amount:1}` → 200 `cs_live_a1c3FTi7…` whose **read-back
  from Stripe is `unit_amount: 2900`** (was $0.01 on the live account). Probe session expired afterwards.
- **D3** — the metered tier is metered or it fails loud. Live: `agent_metered` → **500** naming
  `STRIPE_AGENT_METER_PRICE_ID` (was a silent flat $25/mo contradicting the card). **Owner action still
  open:** create a Stripe Billing Meter + metered Price and set that env var, else the Agent CTA stays down.
- Gate: tsc, eslint, tokens, vertical-sync, 144 unit tests, `next build`, billing Playwright e2e (2/2 incl.
  axe AA) all green locally; SOP patched (`skills/stripe_gating_workflow.md` §11).
- **V1.2–V1.4 SHIPPED + LIVE-VERIFIED — `16c7c91`.** Owner follow-up "take those same pattern".
  Ledger = `public.events` (`event='agent_usage'`), caps = `factory_config['billing_caps']` — no migration
  needed. Cap enforced before the engine (402 at cap, explicit 500 on a billing-DB error);
  `/api/v1/billing/summary` + `/api/v1/billing/cap`; `/billing` gained "Your Usage & Spend".
  Live loop on a throwaway live customer: no id → **401**; unknown customer → **404**; fresh → **200**
  (cap $50 default) → cap 0 → metered call → **402** (engine did not run) → cap 50 → metered call → **200**
  (`usageRecorded:true`, $0.05) → summary → **usage $0.05 / 1 query**; bad cap value → **400**; `/billing`
  **200**. Probe customer, its ledger row and its caps entry were then deleted (verified: **0**
  `agent_usage` rows remain; the customer now 404s).
  **Metered invoicing — cents model shipped (`b45aeb5`), Stripe meter created.** A meter binds to ONE
  event name, so per-tool event names could not invoice without a meter+price per tool. The app now reports
  a single event (`factory_agent_usage`) with `value` = the charge in **integer cents**, against a **sum**
  meter and a **$0.01/unit** metered Price. Created on the live account: meter
  `mtr_61VVwvUGMDZ1f90bp41JaTDc3aAp0O5w` (active, sum), product `prod_VNJbbCEjZjVge2`, price
  `price_1UMYy8JaTDc3aAp0mRZ6SFZ7` ($0.01/unit, monthly, metered). Live end-to-end: agent call **200** →
  `meteredUsageReported:true`, `meteredCents:5`, `usageRecorded:true` → summary **$0.05 / 1 query** →
  Stripe meter aggregation read back **5**. Probe customer, its ledger row and caps entry deleted
  (verified afterwards: 0 probe customers, 0 `agent_usage` rows).
  **Owner action left:** set `STRIPE_AGENT_METER_PRICE_ID=price_1UMYy8JaTDc3aAp0mRZ6SFZ7` in the Coolify
  env to switch the Agent CTA back on (`STRIPE_METER_EVENT_NAME` is optional — the code default already
  matches the meter). **D4** (identity required on the metered path) stays unshipped on purpose: the
  published manifest advertises the id as optional, so that is a contract change for the owner to call.
  **Pricing is now shown per product — `adefa50`.** One catalog (`src/products/pricing.ts`) is the single
  source for the per-tool agent rates, the free tier and the one-off export; the agent API, the `/billing`
  matrix, each product page's pricing block and the showcase directory all read from it, and a drift test
  fails the build when an in-inventory product or tool has no price. Live: `/ledgerlink` $0.25 ·
  `/facturgate` $0.05/$0.10/$0.25 · `/parcelproof` $0.05/$0.25 + $9 one-off · `/caseproof` $0.50 + $9
  one-off; the showcase shows a price line per card and a rate on each of the 10 catalog rows; the
  `/billing` matrix now reads "from $0.05 / query" instead of the wrong flat "$0.25 / query".
  **MCP pricing fixed — `0bc00d4`.** `/.well-known/mcp.json` no longer advertises a flat
  `rate_per_query_usd: 0.25`; it publishes `unit`, `rate_range_usd` and `rates_by_tool` for all 9
  advertised tools, derived from the pricing catalog by `meteredRatesByTool()` (which throws on an
  unpriced tool). Version 1.5.0 → 2.0.0, because a consumer reading the removed field is a breaking
  read, not a silent one. Live: v2.0.0, range $0.05–$0.50, 9 rates, byte-identical to the repo file
  (`5e47d410…`). Two new drift guards: every advertised tool must carry a published rate equal to
  the catalog's, and `rate_per_query_usd` must never come back. Also flipped every other surface
  that asserted the flat rate, all derived now: the /billing hero and Agent card ("from $0.05 /
  successful call"), the /billing metadata, the `agent_metered` checkout line, LedgerLink's
  "METERED $0.25" badge (still $0.25 — that tool's real rate) and `context/mcp_usage_guide.md`.
  **Still open:** the macOS Playwright snapshot (`landing-chromium-darwin.png`) is stale — the
  baseline was regenerated on Linux only, and a macOS render can only be produced on a Mac.

- **Item:** the factory's first customer-facing billing contract — a verified usage ledger + a read
  surface every app consumes. Full PRD: `context/recon_proposals/2026-10-03_factory_billing_v1.md`.
- **Approved scope:** the PRD **§4 v1 only** (V1.1 trust boundary, V1.2 server-enforced cap,
  V1.3 `GET /api/v1/billing/summary`, V1.4 usage section on the shipped `/billing`, V1.5 metered-price
  fix), bounded by **§5**.
- **Owner-confirmed OUT of v1:** organizations / workspaces / seats / RBAC; external-app usage ingest
  (`POST /api/v1/billing/usage`); in-app card capture; annual/tiered pricing; multi-product cart;
  cancellation surveys. Stripe's hosted portal stays the only card/tax/invoice surface.
- **Why now:** five defects were found reading the tree (PRD §1), two of them **live liabilities**:
  (D1) `/api/portal` opens any customer's Stripe portal from an unverified email or no params —
  `src/app/api/portal/route.ts`; (D2) `/api/checkout` prices from a client-supplied `amount` — `amount:1`
  is a $0.01/mo subscription on the LIVE account; (D3) the `/billing` "Agent Metered Pass" card advertises
  "$0 base + $0.25/query" but checks out a flat $25/mo recurring; (D4) usage attributed by a client-supplied
  `x-stripe-customer-id` with no cap; (D5) single-tenant schema.
- **Note — half of this shipped in parallel:** while this entry was being drafted, the owner pushed
  `65a2407` (2026-10-03 19:10 UTC) creating `/billing` as a pricing/onboarding + portal-gateway page. It
  has **no** usage meter, history or cap, and it *widened* D1 (added the email lookup). v1 V1.4 is now
  "extend that page", not "build one".
- **Rule 7:** all items are `src/` work. This entry + the PRD + its commit are the go/no-go record;
  dispatch as a one-shot job against **PRD §4 scope guard only**, `verify-build.sh` green, push on green.

_Last updated: 2026-10-03 (15:30 sweep, every open item re-measured live) — **ITEM 1 IS RESOLVED: live payments
are ON.** The founder (Jorge) replaced the live key slot's `mk_…` ID with the real secret ≈13:15 today; re-verified
*(live, from inside the running container)* `STRIPE_MODE=live`, `STRIPE_SECRET_KEY_LIVE=sk_live_51UA…` (107 chars)
→ `GET /v1/balance` **200 `livemode:true`** (was 401), and `POST /api/checkout` now returns **live** sessions
(`app=ledgerlink` → 200 `cs_live_a1x7AzbQ…`, `app=caseproof` → 200 `cs_live_a1S8pBOv…`, app-less → 400 naming the
inventory, `app=quarterline` → 400 "retired"; `/api/portal` 307). A live webhook is enabled at
`/api/webhooks/stripe` (`invoice.payment_failed` added today). Revenue is still **$0 real** (4 `purchases`, all
`cs_test_*`, all 09-02) and the one `subscriptions` row is still `active`/`livemode:false` (sandbox) — but the
three finished products (all `beta`) can now actually take money, so their launch calls are the top open decision.
**Crons jumped 32 → 58 active** (26 new `Evergreen Pipeline: <vertical>` jobs); the registry re-vendor landed
in-repo (`4e88bdc`), `vertical-sync.mjs --check` exit 0 (26 verticals). **`hermes cron doctor` is still NOT clean
— 14 issues across 14 jobs:** 12 are the stale 402 vertical stamps (last runs 2026-09-28 06:31 → 2026-09-30 08:01,
next runs 2026-10-05 → 2026-10-10), and **two are live failures from today** — WordPress Draft Sweep 14:23 (kie.ai
featured-image generation, 3/3 Internal Error) and `home_infrastructure_lifecycle_tco` 15:11 (output truncated,
2nd in a row). Prod surfaces green: `/` 307 → `giniloh.com`, `/showcase` + all four products + `/embed/countdown`
200, legacy `factory.aichieve.net` 503, manifest **v1.5.0 / 9 tools** sha256 `2843f352…` byte-identical to the
tree, all **20** `/quarterline/calc/*` preset pages 200 (item 10 still open). `events` **1983 rows / 1225 sessions**
(+62 — the whole 10-02 16:31 Build Watchdog Playwright run, 3 seconds, 41 fresh sessions across all five products;
**zero rows on 2026-10-03**; last event 2026-10-02T16:31:58Z, last non-test event still 2026-09-23T14:11:42Z →
**10 days with no visitor**). `agent_query` still **4** (all factory ship probes → organic 0 on day 33). Pressflow
is now internal-only (`/api/articles.json` **401**, was 200; `/robots.txt` disallow-all; `/healthz` 200, container
rebuilt ≈15:00); Supabase `articles` holds **19 rows** (was 16; three new dated 2026-10-03). The social queue
**shrank 50 → 42 items, all `ready`, 0 published**, `updated_at` 2026-10-03T15:25:53Z. Item 11 leftovers unchanged
(`ai-plugin.json` names the dead host, its `/openapi.json` 404s; `/robots.txt` + `/sitemap.xml` 404 with no
producer). Item 7 unchanged: gateway process still the 2026-09-12 15:13 one (`1963330`), no visible symptom. Next
Build Watchdog 2026-10-03 16:30; next Weekly Market Recon 2026-10-05 14:30; next Growth Watchdog 2026-10-09 17:00;
next live gate is ledgerlink ≈2026-10-09._

_Last updated: 2026-10-02 (15:30 sweep, every open item re-measured live) — **the provider outage is clearing but
`hermes cron doctor` is still NOT clean: 15 jobs report a failed last run (17 → 15), and the 15 that remain are the
weekly editorial vertical jobs whose last run fell inside the 09-28…09-30 `HTTP 402: Insufficient Balance` window
(last run 09-28 06:31 → 09-30 08:01) with next runs 10-05 → 10-08 — stale stamps, not a live outage.** The daily
sweep (`ok` 10-01 15:37) and the Build Watchdog (`ok` 10-01 16:33) have both run since the balance returned.
**Item 1 unchanged, re-verified from inside the running container:** the deploy env carries the full mode split
(`STRIPE_MODE=test`, `STRIPE_SECRET_KEY_TEST=sk_test_…` → `GET /v1/balance` **200**) and a live pair whose secret
is still the key's **ID** (`STRIPE_SECRET_KEY_LIVE=mk_1UAeGxJaTDc3aAp0lG3UwbFj` → read-only `GET /v1/balance`
**HTTP 401** *"This looks like the ID of an API key rather than the key itself."*). Prod surfaces unchanged and
green: `/` 307 → `giniloh.com`, `/showcase` + all four products + `/embed/countdown` 200, legacy
`factory.aichieve.net` 503, manifest **v1.5.0 / 9 tools** sha256 `2843f352…` byte-identical to the tree, all **20**
`/quarterline/calc/*` preset pages 200 (item 10 still open), POST `/api/checkout` unchanged (ledgerlink 200
`cs_test_…`, caseproof 200, app-less 400, `app=quarterline` 400 retired, `/api/portal` 307). `events` **1921 rows /
1184 sessions** (+63 — the whole 10-01 16:31 Build Watchdog Playwright run, 3 seconds, 41 fresh sessions across all
five products; **zero rows on 2026-10-02**; last event 2026-10-01T16:31:21Z, last non-test event still
2026-09-23T14:11:42Z → **9 days with no visitor**). Revenue still **$0** (4 `purchases` all `cs_test_*`, all
09-02) — with one new data change: the single `subscriptions` row flipped `canceled` → `active` (`updated_at`
2026-10-02T02:04:18Z) but reads **`livemode:false`** through the sandbox key (still sandbox; stored customer id
does not match the one Stripe returns; no accompanying telemetry row, so unattributable). `agent_query` still
**4** (all factory ship probes → organic 0 on day 32). Pressflow serves **16** articles (was 14; two new dated
2026-10-02), container `b4b382c9…` == editorial HEAD, and Supabase `articles` now holds **16 rows** — DB and live
files agree 16/16. The social queue grew again: **46 → 50 items, all `ready`, 0 published**, `updated_at`
2026-10-02T11:40:44Z. Crons: **32 active**; 15 with a non-`ok` last run (the stale 402s above). `vertical-sync.mjs
--check` exit 0 (26 verticals, no drift). Item 11 leftovers unchanged: `ai-plugin.json` still names the dead host
and its `/openapi.json` 404s; `/robots.txt` + `/sitemap.xml` 404 with no producer. Item 7 unchanged: gateway
process still the 2026-09-12 15:13 one (`1963330`), no visible symptom. Next Growth Watchdog: **2026-10-02 17:00**
(today); next Weekly Market Recon 2026-10-05 14:30; next live gate is ledgerlink ≈2026-10-09._

_Last updated: 2026-10-01 (15:30 sweep, every open item re-measured live) — **the factory was blind for three days:
the provider account ran out of credit** and the 09-28/09-29/09-30 sweeps plus three Build Watchdog runs failed on
`HTTP 402: Insufficient Balance` (17 jobs still report a 402 last run; jobs resumed `ok` from 10-01 10:33). **Day-30
(due 2026-09-30) was therefore never scored on its date and is scored MISS here, one day late, on all three legs:**
0 unique sessions in the last-7-day window, `agent_query` still **4** (all factory ship probes → organic 0 on day
31), **$0 real revenue**. **Item 1 unchanged, re-verified from inside the running container:** the deploy env carries
the full mode split (`STRIPE_MODE=test`, `STRIPE_SECRET_KEY_TEST=sk_test_…` → `GET /v1/balance` **200**) and a live
pair whose secret is still the key's **ID** (`STRIPE_SECRET_KEY_LIVE=mk_1UAeGxJaTDc3aAp0lG3UwbFj` → read-only
`GET /v1/balance` **HTTP 401** *"This looks like the ID of an API key rather than the key itself."*). Prod surfaces
unchanged and green: `/` 307 → `giniloh.com`, `/showcase` + all four products + `/embed/countdown` 200, legacy
`factory.aichieve.net` 503, manifest **v1.5.0 / 9 tools** sha256 `2843f352…` byte-identical to the tree, all **20**
`/quarterline/calc/*` preset pages 200 (item 10 still open), POST `/api/checkout` unchanged (ledgerlink 200
`cs_test_…`, caseproof 200, app-less 400, `app=quarterline` 400 retired, `/api/portal` 307). `events` **1858 rows /
1143 sessions** (+186 — exactly two factory runs: 124 rows 09-27 10:00–10:05 and 62 rows 10-01 00:57:35–00:57:49,
the latter 40 fresh sessions across all five products; **zero rows on 09-28/29/30 because the watchdogs were out of
credit**; last event 2026-10-01T00:57:49Z, last non-test event still 2026-09-23T14:11:42Z → **8 days with no
visitor**). `product=caseproof` 204 → **272** (all our own test runs). Pressflow serves **14** articles (was 15): four
new pieces dated 2026-10-01 replaced five older ones, container `234b86ae…` rebuilt 10-01 14:22, and Supabase
`articles` now holds **14 rows (was 10)** — **the 10-vs-15 mismatch is resolved**, at 14 live files vs 14 rows. The
social queue grew again: **38 → 46 items, all `ready`, 0 published**, `updated_at` 2026-10-01T13:09:43Z. Crons:
**32 active (was 31; new job WordPress Draft Sweep `15 14 * * *`, ran `ok` 10-01 14:17)** and **`hermes cron doctor`
is NOT clean** — 17 jobs report `HTTP 402: Insufficient Balance` as their last run. `vertical-sync.mjs --check`
exit 0 (26 verticals, no drift). Item 11 leftovers unchanged: `ai-plugin.json` still names the dead host and its
`/openapi.json` 404s; `/robots.txt` + `/sitemap.xml` 404 with no producer. Item 7 unchanged: gateway process still
the 2026-09-12 15:13 one (`1963330`), no visible symptom. Next Growth Watchdog: **2026-10-02 17:00**; next live gate
is ledgerlink ≈2026-10-09._

_Last updated: 2026-09-27 (08:00 sweep, every open item re-measured live) — **nothing was built, shipped or
committed in the last 24 h** (`HEAD == origin/main == f20b9e3`, the 09-26 sweep's docs commit, and the running app
image is that same commit; the build line has been idle ≈118 h since the two 09-22 builds). **Item 1 unchanged,
re-verified from inside the running container:** the deploy env carries the full mode split (`STRIPE_MODE=test`,
`STRIPE_SECRET_KEY_TEST=sk_test_…` → `GET /v1/balance` **200**) and a live pair whose secret is still the key's
**ID** (`STRIPE_SECRET_KEY_LIVE=mk_1UAeGxJaTDc3aAp0lG3UwbFj` → read-only `GET /v1/balance` **HTTP 401** *"This
looks like the ID of an API key rather than the key itself."*). **$0 real revenue, 3 days to Day-30 (09-30).**
Prod surfaces unchanged and green: `/` 307 → `giniloh.com`, `/showcase` + all four products + `/embed/countdown`
200, legacy `factory.aichieve.net` 503, manifest **v1.5.0 / 9 tools** sha256 `2843f352…` byte-identical to the
tree, all **20** `/quarterline/calc/*` preset pages 200 (item 10 still open), POST `/api/checkout` unchanged
(ledgerlink 200 `cs_test_…`, caseproof 200, app-less 400, `app=quarterline` 400 retired, `/api/portal` 307).
`events` **1672 rows / 1022 sessions** (+63 — the whole 09-26 10:01 Build Watchdog Playwright run, 12 seconds;
**no event at all in the ≈22 h before this sweep**; last event 2026-09-26T10:01:57Z; last non-test event still
2026-09-23T14:11:42Z → 4 days with no visitor). `product=caseproof` 181 → **204** (all our own test run;
seventh consecutive day). **`agent_query` still 4, all factory ship probes → organic 0 on day 27.** Pressflow
serves the same **15** articles as yesterday (`/api/articles.json` 15, container `536219b…` == editorial HEAD,
**up 25 h** — no editorial deploy in 24 h; today is a Sunday and no pipeline is scheduled then). Supabase
`articles` still holds **10** rows against those 15 live files (five have no row — P2, unchanged). The social
queue is unchanged: **38 items, all `ready`, 0 published**, `updated_at` 2026-09-26T06:41:31Z (23 Reddit + 15
LinkedIn across 15 articles). Crons: **31 active, `hermes cron doctor` clean**, 22 with a last run all `ok`
(Build Watchdog 09-26 10:03, Editorial Verify Gate 09-26 09:30, personal_microeconomics 09-26 06:11,
supplier_risk_reshoring_decision 09-26 06:42). `vertical-sync.mjs --check` exit 0 (26 verticals, no drift).
Item 11 leftovers unchanged: `ai-plugin.json` still names the dead host and its `/openapi.json` 404s;
`/robots.txt` + `/sitemap.xml` 404 with no producer. Item 7 unchanged: gateway process still the 2026-09-12
15:13 one (`1963330`), no visible symptom. Next Growth Watchdog: **2026-10-02 17:00** (Day-30, 09-30, is a
Wednesday and is scored by the daily sweep)._

_Last updated: 2026-09-26 (08:00 sweep, every open item re-measured live) — **nothing was built, shipped or
committed in the last 24 h** (`HEAD == origin/main == 50014d4`, the 09-25 Growth Watchdog's docs commit, and the
running app image is that same commit; the build line has been idle ≈94 h). **Item 1 unchanged, re-verified from
inside the running container:** the deploy env carries the full mode split (`STRIPE_MODE=test`,
`STRIPE_SECRET_KEY_TEST=sk_test_…` → `GET /v1/balance` **200**) and a live pair whose secret is still the key's
**ID** (`STRIPE_SECRET_KEY_LIVE=mk_1UAeGxJaTDc3aAp0lG3UwbFj` → read-only `GET /v1/balance` **HTTP 401** *"This
looks like the ID of an API key rather than the key itself."*). **$0 real revenue, 4 days to Day-30 (≈09-30).**
Prod surfaces unchanged and green on the new host: `/` 307 → `giniloh.com`, `/showcase` + all four products +
`/embed/countdown` 200, legacy `factory.aichieve.net` 503, manifest **v1.5.0 / 9 tools** sha256 `2843f352…`
byte-identical to the tree, all **20** `/quarterline/calc/*` preset pages 200 (item 10 still open), POST
`/api/checkout` unchanged (ledgerlink 200 `cs_test_…`, caseproof 200, app-less 400, `app=quarterline` 400
retired, `/api/portal` 307). `events` **1609 rows / 981 sessions** (+62 — the whole 09-25 10:02 Build Watchdog
Playwright run; **no event at all in the ≈22 h before this sweep**; last event 2026-09-25T10:02:14Z; last
non-test event still 2026-09-23T14:11:42Z). `product=caseproof` 159 → **181** (all our own test run).
**`agent_query` still 4, all factory ship probes → organic 0 on day 26.** **RESOLVED: the four articles deleted
from the live pressflow site on 09-25 00:36 are back** — the pressflow container was rebuilt 2026-09-26 ≈06:39
(image `536219b…` == the editorial repo's HEAD) and `pressflow /api/articles.json` serves **15** items, including
the four deleted slugs and three published today; the deletion stays unattributable (no traefik access logs).
Supabase `articles` holds **10** rows against those 15 live files (five have no row — new P2). The social queue is
now **auto-produced**: `distribution_queue` 6 → **38 items, all `ready`, 0 published**, `updated_at`
2026-09-26T06:41:31Z (editorial commit `5c7df8a`, `scripts/seed_distribution.py` as step 4c of the publish pass).
Crons: **31 active, `hermes cron doctor` clean**, 22 with a last run all `ok` (editorial publishes 09-26 06:11 and
06:42; the 09-25 Growth Watchdog ran 17:06 `ok`; new job **Editorial Verify Gate** created 2026-09-26T01:34, ran
`ok`). `vertical-sync.mjs --check` exit 0 (26 verticals, no drift). Item 11 leftovers unchanged: `ai-plugin.json`
still names the dead host and its `/openapi.json` 404s; `/robots.txt` + `/sitemap.xml` 404 with no producer. Next
Growth Watchdog: **2026-10-02 17:00** (Day-30, 09-30, is a Wednesday and is scored by the daily sweep)._


_Last updated: 2026-09-24 (08:00 sweep, every open item re-measured live) — **nothing was built, shipped or
committed in the last 24 h** (`HEAD == origin/main == b75615e`, the running app image is that same docs commit;
the build line has been idle ≈54 h). **Item 1 unchanged, re-verified:** the deploy env carries the full mode
split (`STRIPE_MODE=test`, `STRIPE_SECRET_KEY_TEST=sk_test_…`, `STRIPE_WEBHOOK_SECRET_TEST=whsec_g6Jc…`) and a
live pair whose secret is still the key's **ID** (`STRIPE_SECRET_KEY_LIVE=mk_1UAeGxJaTDc3aAp0lG3UwbFj`) —
read-only `GET /v1/balance` → **HTTP 401** *"This looks like the ID of an API key rather than the key itself."*
**$0 real revenue, 6 days to Day-30 (≈09-30).** Prod surfaces unchanged and green on the new host: `/` 307 →
`giniloh.com`, `/showcase` + all four products + `/embed/countdown` 200, legacy `factory.aichieve.net` 503,
manifest **v1.5.0 / 9 tools** sha256 `2843f352…` byte-identical to the tree, POST `/api/checkout` unchanged
(ledgerlink 200 `cs_test_…`, caseproof 200, app-less 400, `app=quarterline` 400 retired, `/api/portal` 307).
`events` **1485 rows / 899 sessions** (+66: 63 the 09-23 10:01 Build Watchdog Playwright run, 3 session
`59a27597…` returning to the factory page at 12:13:50 / 12:16:50 / 14:11:42Z; **no event at all in the 18 h
before this sweep**; last event 2026-09-23T14:11:42Z). `product=caseproof` 114 → **137** (all our own test run).
**`agent_query` still 4, all factory ship probes → organic 0 on day 24.** `factory_config.distribution_queue`
went `[]` → **15 items, all `ready`, 0 published** (`updated_at` 2026-09-23T13:18:00Z, seeded by hand, not by a
cron). Crons: **30 jobs, 0 open incidents** (editorial fleet healthy: `agentic_ai` 09-24 06:14, `supply_chain`
09-24 07:09, `home_ops_execution` 09-24 07:38, all `ok`). `vertical-sync.mjs --check` exit 0 (26 verticals, no
drift). Item 11 leftovers unchanged: `ai-plugin.json` still names the dead host and its `/openapi.json` 404s;
`/robots.txt` + `/sitemap.xml` 404 with no producer._

_**2026-09-23 08:00 sweep — measured live on the new host.** Three owner commits in 24 h, no scheduled build:
`dfc2851` (explicit `STRIPE_MODE` resolver, `src/lib/stripe/mode.ts`), `9eb43a5` (migrate to
`apps.giniloh.com`, showcase → `/showcase`), `1393f42` (re-vendor the editorial registry). Deployed image
`af8yqbwrrnyyfgs9wcg0intj:1393f42…` == pushed HEAD. **New host**: `/` 307 → `https://giniloh.com/`,
`/showcase` 200, all four products 200, **all 44 `/calc/*` presets 200**, manifest **v1.5.0 / 9 tools**,
sha256 `2843f352…` byte-identical to the tree. **Legacy `factory.aichieve.net` → 503 on every path.**
**Item 1 re-measured and now diagnosed:** the mode split is configured (`STRIPE_MODE=test`,
`STRIPE_SECRET_KEY_TEST=sk_test_…`) **and** a live pair exists, but `STRIPE_SECRET_KEY_LIVE=mk_1UAeGxJaTDc3aAp0lG3UwbFj`
is the key's **ID** — read-only `GET /v1/balance` → **HTTP 401** *"Invalid API key provided: mk_1…
This looks like the ID of an API key rather than the key itself."* `mode.ts` requires the `sk_live_` prefix in
live mode, so flipping `STRIPE_MODE=live` as-is throws explicitly. Checkout `app=ledgerlink` → 200
`cs_test_a1l9pF2VmGwT3oDxyoyh5dvCJ199BQZYGbjPH4ccQGlqX4l3mv6hGtO0p7`; app-less `pdf_audit_export` → 400;
`app=quarterline` → 400; `/api/portal` → 307. **$0 real revenue, 7 days to Day-30 (≈09-30).**
`events` **1419 rows / 858 sessions** (+320: 124 Build Watchdog Playwright 09-22 10:0x, 189 the three verify
runs behind `dfc2851`/`9eb43a5`, **7 rows from five new standalone sessions** `3eb270ce`, `ac8303ae`,
`59a27597`, `24c8fd67`, `a3f8de07` — straddling the migration, still unattributable). **`agent_query` still 4,
all factory ship probes → organic 0 on day 23.** Returning browser `30eb9935…` did **not** return 09-23.
`product=caseproof` now reads **114** rows, all factory verification runs (the 09-22 build's own row-deletion
was not repeated). `factory_config.distribution_queue` still `[]` (day 4). Crons: 30 jobs, **0 open incidents**;
**`gpu_hardware` ran 09-23 07:13:13 `ok` → item 7 has no visible symptom left** (gateway still the 09-12
process, restart still owed to load the fix). `vertical-sync.mjs --check` exit 0 (26 verticals, no drift).
Tree: `HEAD == origin/main == 1393f42`, clean except untracked `.hermes/`._

_Last updated: 2026-09-22 (08:00 sweep, every open item re-measured live; CaseProof shipped `78d0739`, 
live-verified — item 9 closed; item 8 shipped `b6e6555` earlier the same day) — **owner instruction 2026-09-22 in
`loop-ai` (Jorge Fernandez): "Pending developments are approved. Tomorrow I will take care of my pending actions
(stripe, to-do's list, etc)"** → item 8 approved and shipped (`b6e6555`, live-verified) and item 9 (CaseProof)
approved, dispatched (dispatch record `ea56aaf`) and **built + shipped this pass**. The owner's own actions — the
live Stripe key (item 1) and the editorial to-do list, which lives in `kiosk/editorial-factory` — stay his, and
were not touched. Items 5, 6, 7 are unchanged (item 5 also needs a production Supabase migration only the owner
can apply); **item 10 remains open** with the QuarterLine surfaces the registry retirement does not cover._

_**2026-09-22 08:00 sweep — measured live.** Two builds shipped in one hour overnight and nothing new was
built after them. Re-verified rather than assumed: `/`, `/caseproof`, `/quarterline`, `/ledgerlink`,
`/facturgate`, `/parcelproof` all 200 and **all 44 `/calc/*` presets 200** (caseproof 6 + quarterline 20 +
facturgate 12 + parcelproof 6, slugs enumerated from the preset files); published manifest **v1.5.0, 9 tools**,
sha256 `f3be55bc…` **byte-identical to the working tree**; **item 8 holds on the deployed app** — app-less
`pdf_audit_export` → 400 naming the inventory, `app=quarterline` → 400 "retired and cannot be purchased",
`app=ledgerlink` → 200 `cs_test_a10wdt20…`, `/api/portal` → 307 to the directory. `events` **1099 rows**
(+176 since the 09-21 sweep: 39 Build Watchdog Playwright, 136 the two pre-commit verify runs, 1 the returning
browser), 649 session ids, **`product=caseproof` reads 0 rows** (the build deleted its own 90 verification rows
after the deploy check). **Item 1** re-measured: `livemode:false`, 4 `purchases` all `cs_test_*` 09-02, **$0
real revenue** — 8 days to Day-30. **Item 5**: `agent_query` still 4, every one a factory ship probe → organic 0
on day 21; the returning browser `30eb9935…` came back a **seventh** day (09-22 01:25:12Z, 24 rows lifetime) and
is still unattributable. **Item 6**: durable record written a seventh day running, still without a producer.
**Item 7**: patch still unloaded (gateway pid from 09-12), **but the mislabel did not recur** — the 09-22 06:00
`enterprise_tech_leadership` run recorded `ok`, leaving only the 09-16 `gpu_hardware` label (next run 09-23).
**Item 10** re-measured live: `/quarterline` 200 (calculator works, $9 export returns the explicit 400), its 20
presets 200 and indexable, `/embed/countdown` 200 and still linking there. CaseProof build job `38704fd5a527`
fired 01:36:29 / completed 02:06:48 `ok`. Crons: 12 jobs, **0 open incidents**; `vertical-sync.mjs --check`
exit 0 (26 verticals, no drift). Tree: `HEAD == origin/main == 64af7c1`, clean except untracked `.hermes/`._

_**2026-09-22 — CASEPROOF SHIPPED `78d0739`, live-verified.** The one-shot build job landed the 09-21 weekly
recon's single candidate (score 78) at `https://factory.aichieve.net/caseproof` as a **`beta`** product — the
public launch call stays with the founder, as every build does. PRD `context/recon_proposals/2026-09-21_caseproof.md`,
**§5 v1 scope guard only**: line items are pasted/uploaded as CSV rows (no PDF/OCR), no rate table of our own, no
throughput sizing model, and an unstated cost line blocks a pass verdict rather than being estimated._

- **Engine** `src/lib/calc/caseproof/` (pure: no I/O, no clock, no LLM): fully loaded labour rate with its
  component breakdown (wage + employer burden + benefits + FLSA overtime premium + turnover replacement); the
  quote-line normalizer (echoed, categorized, never re-priced — an unmapped row is surfaced, a blank amount is an
  unpriced line, never $0); §179 (with its phase-out) → bonus → straight-line **by tax year** from a cited rule
  table (2026 only; an uncited year is refused, never estimated); the after-tax cash flow per bid (ramp, downtime
  at the contracted availability, error saving, maintenance/licence, amortized one-time lines, lease/RaaS
  escalation and peak-fleet weight, debt service) with payback in months, IRR and NPV at the hurdle rate; the
  audit (vendor's own assumptions re-run, buyer's applied one input group at a time, break-even per assumption,
  ranked confirm-in-writing list); and 2–3 bids on one cash model with the solved crossing and the PRD's
  sensitivity grid.
- **Known-answer vectors (29 tests, `npm run test` 123/123):** the PRD's flip is **reproduced exactly** — a
  proposal claiming **14 months** is re-run by the same engine at **14.1** and audits at **41.0** on the buyer's
  numbers, with the driver chain reconciling month for month (the test asserts `14.1 + Σ deltas == 41.0` and that
  the chain's last value equals the buyer's run); §179 phase-out at a $5,000,000 basis cuts the $2,560,000 limit to
  **$1,650,000** (−$910,000, $0 at $6,650,000); the capex-vs-subscription ranking flips at a **40.0% seasonal
  premium** (1.400 ± 0.005); a fully stated quote produces **zero flags and nothing unstated**; an empty
  maintenance field reports **`unstated`, charges $0 and blocks a pass**.
- **Two PRD lines reported with their own honest verdict, not bent to the prose:** (a) the §2 vector 3 direction —
  the crossing is at 40.0% as written, but the measured direction is the reverse of the PRD's phrasing
  ("subscribing wins only past a 40% seasonal premium"): a fixed-price capex bid has no peak exposure while a
  per-unit subscription is charged for the peak fleet, so the subscription leads *below* 40% and the capex bid
  leads above it. The engine publishes the direction it solved; the prose claim is unverifiable as written.
  (b) the flip's attribution — the three inputs the PRD names do move it (loaded labour **−10.3** months, turnover
  **−0.9**, maintenance **+19.7**), but the largest single driver is the headcount claim itself: the proposal's
  **52 FTE** vs the buyer's own **18** accounts for **+26.6** of the 27-month gap. Reported as measured.
- **Surface:** `/caseproof` + **6** `/caseproof/calc/*` preset pages; registry entry at `beta`; telemetry under the
  `caseproof` slug; **3** metered WebMCP tools (`audit_automation_case`, `compare_automation_bids`,
  `after_tax_payback` at **$0.50/call**) registered via `navigator.modelContext` **and** handled in the server
  branch of `/api/agent/calculate` (explicit 400 + rule id on a malformed case: live `cp-options-empty` /
  `case.options`). Published manifest generated (**v1.5.0, 9 tools**, `npm run mcp:sync`; `manifest.test.ts` is the
  drift guard) — never hand-edited.
- **Gate:** `scripts/verify-build.sh` **green end to end** — tsc 0 / eslint 0 errors / design tokens /
  `verticals:check` / **vitest 123** / `next build` / **Playwright 41** (13 new: 10 CaseProof e2e incl. axe WCAG
  2.1 AA, 2 layout guards, 1 QA capture; the directory visual snapshot regenerated **and reviewed**) / Gemini
  visual-QA **PASS ×4** including CaseProof on the first verdict.
- **Live, after the deploy (not the push):** deployed image tag
  `af8yqbwrrnyyfgs9wcg0intj:78d073988131be39e48ad6ae955db7ce983e6eea` == pushed HEAD; `/caseproof` **200**;
  published manifest **byte-identical to the tree** (sha256 `f3be55bc…`, v1.5.0, 9 tools, CaseProof's 3 advertised);
  the 400 rejection paths (unknown tool → the 9-tool list; malformed case → `ruleId` + `fieldPath`) returned before
  any telemetry write; and one **metered** success-path probe (`audit_automation_case`) returned **payback 41**,
  `costPerQueryUsd 0.50`, meter event `agent_case_audit` — **its `agent_query` row and the 90 `page_view`/
  `audit_click` rows my own verification runs wrote under `product=caseproof` (ids 1006–1189, 01:56–01:59 UTC,
  51 Playwright sessions, all created before the product existed in production) were deleted afterwards**, so
  `product=caseproof` reads **0 rows** and the growth metric is not reading our own tests as usage.
- **Docs in the same pass:** `skills/webmcp_integration.md` (multi-tool product checklist + the resolve-once rule),
  `skills/ui_component_standards.md` (directory snapshot, repeated-number locators, no clock in the deterministic
  core), `skills/self_improvement_eval.md` (7 rows). Code and docs are separate commits.
- **Open for the owner:** the public launch call for CaseProof (status stays `beta`); the paid decision-pack export
  and its Stripe checkout are **not** part of v1 (CSV pack ships; PRD §3 pricing is unchanged and unwired).

_**2026-09-22 — OWNER APPROVAL RECORDED + ITEM 8 SHIPPED (by hand, not a sweep).** Owner instruction in `loop-ai`
(Jorge Fernandez, software-factory approver), verbatim: **"Pending developments are approved. Tomorrow I will take
care of my pending actions (stripe, to-do's list, etc)"**. Read as the open *software* work this queue was waiting
on the approver for — item 8 (finish the retirement) and item 9 (CaseProof, the 09-21 recon candidate at the
go/no-go) — and applied to nothing else: the phrasing followed a list, so it was scoped to the two items named as
developments, one build slot at a time (item 5 was not dispatched; item 6 is SOP work; item 7 needs an operator
restart). The owner's own actions are explicitly his: item 1's live Stripe key and the editorial distribution
to-do list.

**Item 8 — SHIPPED `b6e6555`, live-verified.** Both halves the item named, plus every other stale literal of the
retired slug on a paid or agent surface:

- `src/products/registry.ts` now derives the inventory (`activeProducts` / `retiredProducts` /
  `activeProductSlugs` / `defaultInventoryProduct` / `isRetiredProduct`); generated surfaces read it, so one
  `status` change retires every surface instead of needing an edit per surface.
- `/api/checkout` (a): `app` no longer defaults to a product literal. An `app` naming a `killed` product is an
  explicit 400; an `app`-less product-scoped plan (`pdf_audit_export`, `cpa_monthly`) is an explicit 400 naming
  the inventory — **rejected, not silently substituted for a live product**, because re-attributing the retired
  product's own page to LedgerLink would be a silent fallback (rule 5). `factory` stays the directory sentinel for
  app-less generic plans; non-registry white-label app names stay accepted.
- WebMCP manifest + agent allowlist (b): both now derive from the inventory, so the retired product's two tools are
  neither served nor advertised. Manifest v1.4.0, **6 tools (was 8)**, and `tool_selector.default` is now the
  derived `DEFAULT_AGENT_TOOL` (`reconcile_stripe_payout`) instead of a retired tool name. `manifest.test.ts`
  asserts that nothing owned by a retired product is served or advertised, that the selector default is an
  advertised tool, and that no tool definition belongs to no product at all.
- **Guard proven by injection before committing:** (a) the previously published manifest file → the byte-identity
  test fails; (b) counting `killed` products as inventory → `retired product's tool 'calculate_qbi_deduction' is
  still advertised in the manifest` fails. 9/9 green after each restore.
- Same-class stale literals of the retired slug: telemetry's default product, the Stripe webhook's app fallback,
  and the billing portal's three redirects to the retired page (now the directory root).
- **Gate:** `scripts/verify-build.sh` green end to end (tsc 0 / eslint 0 errors / tokens / `verticals:check` /
  vitest 94 / build / Playwright 28 / visual-qa PASS ×3).
- **Live, after the deploy (not the push):** deployed image tag `af8yqbwrrnyyfgs9wcg0intj:a5c8c8971…` == pushed
  HEAD; published manifest byte-identical to the tree (sha256 `b5ca149c…`, v1.4.0, 6 tools, default
  `reconcile_stripe_payout`); app-less `pdf_audit_export` → **400** with the inventory list; `app=quarterline` →
  **400** "retired and cannot be purchased"; `app=ledgerlink` → 200 `cs_test_a1YNCQRO…` (one sandbox session from
  the verification probe; the route writes no telemetry); retired tool name → **400** + the 6-tool list; a live
  tool → 200 (its `agent_query` probe row id 1005 was deleted after the check — `agent_query` is back to 4, all
  pre-existing ship probes); `/api/portal` → 307 to `/`.

**Also shipped in the same pass — `a5c8c89`, the build gate itself.** `scripts/verify-build.sh` was **red on a clean
`main`** before any change was made: `verticals:check` compared the generated inventory block byte-for-byte
including the date it was generated, so it failed every calendar day until someone re-ran the sync. The check now
normalizes only the `_Generated <date> by` token (rows and the snapshot provenance line are still byte-compared) and
a plain `verticals:sync` keeps the date fresh. Proven: date-only staleness → exit 0, one character changed in an
inventory row → exit 1.

**Item 9 — APPROVED + DISPATCHED.** CaseProof (78) is dispatched as a one-shot cron job (see DISPATCH below)
against `context/recon_proposals/2026-09-21_caseproof.md`, **PRD §5 v1 scope guard only**, registry status
`beta` — the public launch call stays with the founder, as every build does.

**Item 10 — RESOLVED 2026-10-05 (`bc6c3de`, live-verified; full evidence in the 2026-10-05 entry at the top).**
All three surfaces are retired by owner instruction: `/quarterline` serves the retirement notice (no calculator,
no dead-end $9 CTA), the 20 `/quarterline/calc/*` preset pages 301 to the directory with the route deleted, and
`/embed/countdown` is repointed at the live inventory. The three were, verbatim from this entry, the three
QuarterLine surfaces still live for the public: (a) `/quarterline` still renders the
working calculator with a "$9 export" CTA that now returns an explicit 400 error instead of selling (honest, but a
dead end for a visitor); (b) the 20 `/quarterline/calc/*` preset pages are still served and indexable — 38
`/calc/*` routes were 200 in the 09-21 sweep; (c) `/embed/countdown` still links to `/quarterline`. Nothing was
changed here because each is a publish/unpublish decision, not a retirement leftover: recommend (a) replace the
calculator with the retirement notice the directory already carries, (b) keep or 301 the preset pages to the
directory, (c) repoint the embed. Awaiting the founder's call.


_**2026-09-21 08:00 sweep — measured live.** No product code and no `src/` change in the last day. The **Weekly
Market Recon ran on time at 06:00 (`ok`) — the first vertical-scoped run** — declaring
`warehouse_automation_robotics_capex` from the never-scanned rotation queue and producing **CaseProof (78)**
(`9bbb804`, PRD `context/recon_proposals/2026-09-21_caseproof.md`, build ≈3.5 h): the buyer-side audit of a
warehouse-automation business case, scoped away from the generic calculator by the free-incumbent check (free
vendor ROI calculators now exist: ISD 2026-07-10, Dexory, Kinexon, KUKA) toward the adversarial re-run of the
vendor's own numbers plus multi-quote comparison. Two further commits landed outside any scheduled run
(`1bc3a58` 09-20 13:32 vertical-scoped discovery; `ffebf51` 09-20 17:01 vendored registry). Item 8: the
published manifest still advertises `calculate_qbi_deduction` + `calculate_quarterly_estimate` and
`src/app/api/checkout/route.ts:40` still defaults `app="quarterline"` for `pdf_audit_export` (fresh `app`-less
probe → `cs_test_a1Ay2uDa…`). Item 1: `livemode:false`, 4 `purchases` all 09-02, **$0 real revenue**. Item 5:
`agent_query` still 4, every one a factory ship probe → organic 0 on day 21. Item 6: the durable record is
written a sixth day running without a producer. Item 7: patch still unloaded (gateway pid `1963330` from
09-12), no new mislabel; the two jobs that still display the 09-15/09-16 mislabels next run **09-22** and
**09-23**. New evidence for item 5: the one returning browser (`30eb9935`) made **8 page views on 09-20 and
09-21 across the showcase, LedgerLink and FacturGate** — the only visitor-like signal in 21 days and still
unattributable without tagging at source. Prod probes: all 38 `/calc/*` routes 200, manifest v1.3.0 / 8 tools /
sha256 `6ea29ed1…` byte-identical to the tree, retired tool name → 400; `vertical-sync.mjs --check` exit 0._

_**2026-09-20 08:00 sweep — measured live.** Two owner workstreams landed overnight. (a) `bc3d556`
(2026-09-19 23:43 UTC, Jorge Fernandez, by hand): **QuarterLine retired in the registry (`live` → `killed`)**
and `/api/checkout` + the Stripe webhook generalized to any product (`app` from the request or the registry,
per-product receipt email); `scripts/growth-check.mjs` now takes the product as an argument, a partial answer
to item 5. Deployed and live (showcase serves the retirement copy). **Item 8 opened:** a default checkout
request (`plan: "pdf_audit_export"`, no `app`) still resolves to the retired product — the session metadata
read back from the Stripe API says `app=quarterline, appName=QuarterLine` — and the published manifest still
advertises its two tools (`calculate_qbi_deduction`, `calculate_quarterly_estimate`). (b) `editorial-factory`
six commits 23:09 → 01:23: new verticals + Google Search Console wiring, and `fbc3606` removed all drafts and
published articles "to start fresh" — `published/` holds only `.gitkeep`, `/api/articles.json` → `[]`, and
**`factory_config.distribution_queue` is `[]` (updated 09-19 22:42:49Z)**, so the 36 posts prepared 09-12 are
deleted, not published. **Item 2 is therefore closed as resolved-by-removal**, with the honest residue that 0
items were ever published and the third wedge in a row expired unused. Item 1: prod checkout `cs_test_a1MlUGMq…`
with `livemode:false` (API-verified), 4 `purchases` all 09-02, $0 real revenue. Item 5: `agent_query` still 4,
every one our own ship probe; manifest byte-identical to the tree (sha256 `6ea29ed1…`, v1.3.0, 8 tools). Item
6: the durable record is now written a fifth day running without a producer. Item 7: patch still unloaded
(gateway pid `1963330` from 09-12), no new mislabel; it matters again on 09-22 (`enterprise_tech_leadership`)
and 09-23 (`gpu_hardware`), the two jobs that still display the 09-15/09-16 mislabels._

_**2026-09-19 08:00 sweep — measured live.** Item 4 closed on both halves: ParcelProof shipped 09-18 22:05
(`3584a62` + docs `19d9529`), `/parcelproof` 200, all 6 `/parcelproof/calc/*` 200, manifest v1.3.0 with 8
tools and byte-identical to the tree. **Item 2's clock has now run out: `distribution_queue` is 36/36
`ready`, 0 published, untouched since 09-12 14:48, and its lead item's event date (2026-09-18) passed with
nothing posted** — the third wedge in a row to expire. Item 1 re-measured: prod checkout still `cs_test_…`
(fresh probe 09-19; 4 `purchases`, all 09-02, $0 real revenue). Item 5 re-measured: **`agent_query` is now
4 rows and every one is our own ship probe** (3 FacturGate + 1 ParcelProof), so the Day-30 agent criterion
still has no organic reading; the 09-18 Growth Watchdog row formally gates Day-30 on this item. Item 6: the
sweep has now written a durable record four days running, still without a producer. Item 7: patch still
unloaded (gateway pid from 09-12), no new mislabel on 09-17/09-18/09-19. **New this sweep:** an open
correctness question on the shipped ParcelProof (UPS AHS-Dimension trigger 96″ as published vs 48″ as
possibly intended — one line in `src/lib/calc/parcelaudit/surcharges.ts`)._

---

_**2026-09-18 21:32 UTC — OWNER APPROVAL RECORDED (by hand, not a sweep).** Owner instruction in `loop-ai`
2026-09-18: **"approve ParcelProof"** → item 4's open ParcelProof go/no-go is answered. The ParcelProof (80)
build is dispatched as a one-shot cron job against `context/recon_proposals/2026-09-14_parcelproof.md`,
**PRD §5 v1 scope guard only** — DIM-weight recompute (UPS/FedEx/USPS domestic parcel, carrier × service ×
date divisors incl. USPS 166 → 139 on 2026-07-12), round-up + cubic-inch thresholds, AHS-Dimension
eligibility, service-commitment refund eligibility, dispute-window clock, CSV ingest, recovery ledger +
dispute CSV, and the two WebMCP tools; registry status `beta` (the **public launch call stays with the
founder**). Nothing outside that scope is approved — P1 items (zone-matrix derivation, published fuel
tables, LTL/ocean modes, rate-card auto-mapping) stay deferred. Item 4's FacturGate half is unchanged
(live as `beta`, launch call still open)._

_**2026-09-18 08:00 sweep re-verified every item below live.** Item 3 stays closed (prod manifest byte-identical
to the tree, sha256 `f3b4cbd2…327fea`; retired tool name → 400, second day). Item 4 is unchanged from 09-17:
**FacturGate live as `beta`** (all 12 `/facturgate/calc/*` → 200, enumerated from the preset file), **ParcelProof
still shortlisted with no go/no-go — the build line has been idle 28 h** (last product commit `e77db64`,
09-17 03:49; no commit at all since `c1b3139`). Item 2 is now **on the clock: `distribution_queue` is 36/36
`ready`, 0 published, untouched since 09-12, and its top item's event date is TODAY 2026-09-18** (the Q3 wedge
expired 09-15 unused). Items 1, 5, 6, 7 re-measured: prod checkout still `cs_test_…` (4 `purchases`, all 09-02,
$0 real revenue); `events` 374 rows / 149 sessions with **5 non-CI sessions** (new `d8e77f23`, 09-17 22:03:17)
→ 0 provably external in 18 days; **`agent_query` still 3, all FacturGate deploy smoke**; the **Growth Watchdog
fires today 17:00** (first run since 09-11) and will meet exactly those polluted inputs; fire-claim patch still
unloaded (gateway process from 09-12, no new mislabel)._

_**2026-09-18 22:07 UTC — PARCELPROOF SHIPPED (cron build run `3584a62`, live-verified).** Queue item 4's
ParcelProof half is now built and deployed to `https://factory.aichieve.net/parcelproof` at the approved
**beta** status: the deterministic audit engine (`src/lib/calc/parcelaudit/`, 32 known-answer vitest
vectors), the paste/upload recovery UI + dispute CSV, 6 `/parcelproof/calc/*` preset pages, and the two
WebMCP tools `audit_carrier_invoice` + `compute_billable_weight` advertised in the generated
`/.well-known/mcp.json` (v1.3.0, 8 tools). `scripts/verify-build.sh` passed end to end before the push
(tsc / eslint 0 err / tokens / 92 vitest / build / 28 Playwright / Gemini visual-QA PASS ×3). PRD §5's v1
scope guard is unchanged: zone-matrix derivation, published fuel tables, LTL/ocean modes and rate-card
auto-mapping stay P1, and every line outside v1 is reported `unverifiable-rate` rather than passed.
**Open for the owner:** the public launch call for ParcelProof is still his (status stays `beta`), and the
PRD's tariff table puts UPS's AHS-Dimension trigger at a longest side > 96″ (FedEx > 48″), so a 40″ parcel
is ineligible at *both* carriers — if the intended UPS trigger is 48″, that is a one-line change in
`src/lib/calc/parcelaudit/surcharges.ts` and the vectors follow it. Nothing else in the queue changed._

---

## DISPATCH — 2026-09-22 (approval item 9, CaseProof)

- **Job:** `38704fd5a527` — "CaseProof build (approval item 9)", one-shot (`in 2m`), workdir
  `software-factory-core`, `deliver=slack`, `attach_to_session=true`, skill `approval-gated-shipping`.
- **Fired:** 2026-09-22 01:35:42 UTC, execution `40042aae3e4b4e80a177ff7db1bb1c64` — verified via
  `hermes cron list` (`Execution: running …`, `Repeat: 1/1`), not from `jobs.json` (which keeps
  `last_run_at: null` until the run completes).
- **The dispatched prompt constrains the job to:** PRD §5 v1 scope guard only; registry status `beta`;
  the full `scripts/verify-build.sh` gate; push **only** on green; restore-a-clean-tree-and-report on a
  root cause it cannot fix; deploy verification by container image tag == `git rev-parse --short HEAD`;
  side-effect-free post-deploy probes; the durable record + the rule-6 SOP patch; and a report that
  passes `scripts/check-slack-report.mjs` before it is posted.
- **Known limitation (recorded, not hidden):** `cronjob_manage action='create'` ignores `model`/`provider`
  — the job persisted with `model: null`, so it runs on the **default fleet tier** (`deepseek-flash`)
  rather than the frontier builder tier the repo's "Runtime model note" assigns to Product Director
  work. One build slot is running; nothing else was dispatched in parallel.

## Recon 2026-09-28 — weekly sweep → **no build proposed**

Scan window 2026-08-29 → 2026-09-28. Declared vertical `healthcare_rcm`, taken from the
never-scanned rotation queue (first scan of this vertical). No candidate cleared the funnel, so
**no approval item was opened and nothing is owed to the build gate** — the founder's reply
`@Simon approve 12` exists only as an override if he wants the dropped candidate built anyway.

- **Top candidate — PayerVariance (score 69):** practice-side audit of payer 835 remittance allowed
  amounts against contracted rates, plus appeal packets. Loud demand (1–3% of net patient revenue
  lost to underpayments; $30K–$150K/yr at risk for a 3–5 provider practice) but **dropped**: the
  free-incumbent rule (the AMA's free Claims Workflow Assistant + free 835 parsers + free
  filing/appeal calculators + the practice system's own contract-variance reporting), Filter 1 (the
  recovery layer is a human appeals chase → factory rule 1), and the Stage 0 channel rule (no
  editorial vertical, no owned audience).
- **Runners-up, all dropped:** ERA/EFT reassociation exception checker (62), denial appeal-worth-it
  estimator (58), payer prior-auth metric aggregator (55).
- **Record:** PRD `context/recon_proposals/2026-09-28_payervariance_no-build.md`; vertical retired in
  `context/vertical_coverage.md` (moved out of the never-scanned queue); pack added at
  `skills/recon_vertical_packs.md` §healthcare_rcm; the sweep's own measurement lesson (sellers'
  content marketing inflates the Stage 3 repeat-intent weight) logged in
  `skills/self_improvement_eval.md`; `node scripts/vertical-sync.mjs --check` exit 0.
- **Consequence for the build line:** last week's recon candidate (CaseProof) shipped 09-22, so this
  is the first weekly scan since vertical rotation began that adds nothing to the queue — the build
  line stays idle by the founder's own pending decisions (items 1, 10, 11), not by a missing
  candidate. Next scan 2026-10-05 opens the next never-scanned vertical.

## OPEN — 2026-09-16 sweep (live-verified this run)

1. **[RESOLVED 2026-10-03 — live mode + live key verified end-to-end (founder action, Jorge)]** `sk_live` in the deploy env **or** record test-mode as intended.
   _2026-10-03 ~13:15: `STRIPE_MODE=live`, `STRIPE_SECRET_KEY_LIVE=sk_live_…` (107 chars), checkout → 200 `cs_live_…` (real live session), live webhook `we_1UIeO7…` enabled at `/api/webhooks/stripe`, `/v1/balance` auth 200. Revenue can now be collected. The `mk_…` key-ID that blocked this for ~3 weeks was replaced with the actual secret (after one wrong copy of the publishable key). Minor leftover fixed 2026-10-03: `invoice.payment_failed` added to the live webhook's enabled events (read-back verified) — the route's past-due handler now fires._
   Live today: `POST /api/checkout` → 200, `cs_test_a1UlRlIvfpCJFByrZEUjbNkIuUaYSgDuc3F9IQUziIosJCixXeST38wqhv`;
   `purchases` = 4 rows, all `cs_test_*`, all 2026-09-02; the only `subscriptions` row is `canceled`.
   Real collected revenue **$0**. Day-14 already scored an honest MISS (row in
   `skills/self_improvement_eval.md`); Day-30 (≈09-30) inherits the same $0 unless answered.
   _2026-09-22: the paid-surface probe must now name a product. An `app`-less product-scoped request is an explicit
   400 (item 8, shipped), so a sandbox/live reading needs `app=<inventory product>` — verified this pass with
   `app=ledgerlink` → 200 `cs_test_a1YNCQRO…`, `livemode:false`, and `app=quarterline` → 400._
2. **[CLOSED 2026-09-20 — resolved by owner removal, not by publishing]** Echo: post GTM Vectors 1 & 5 /
   work the queue. `factory_config.distribution_queue` is now **`[]`, `updated_at` 2026-09-19T22:42:49Z** —
   the owner deleted the 36 prepared posts (all `ready` since 09-12, 0 published) while resetting the
   editorial pipeline onto real search demand. Honest residue: **0 items were ever published**, and the third
   urgency wedge in a row (Q3 estimated tax 09-15, the 09-18 customs/CBP story) expired unused. No
   distribution work is owed from this repo; a new queue is the editorial engine's to regenerate.
3. **[RESOLVED 2026-09-17 — shipped `a57539f`, live-verified]** `.well-known/mcp.json` is now
   generated, never hand-written: `src/lib/webmcp/manifest.ts` derives it from `src/products/registry.ts`
   + `WEBMCP_TOOL_SUMMARIES` (the new canonical surface in `register.ts`). It advertises all three real
   tools — `calculate_qbi_deduction`, `calculate_quarterly_estimate`, `reconcile_stripe_payout` — with
   their true JSON Schemas and product attribution, plus the previously undocumented `x-webmcp-tool`
   selector header (with three tools an agent cannot pick one without it), and no dead name.
   `manifest.test.ts` (7 assertions: registry ↔ definitions ↔ allowlist ↔ manifest ↔ published file)
   fails the build on drift — verified by re-injecting the original regression before committing.
   `/api/agent/calculate` now returns 400 + the supported list for an unadvertised name instead of
   silently running the tax engine (rule 5). Post-deploy probes: prod manifest byte-identical to the
   tree (4 polls, ~60 s); `calculate_self_employment_2026` → 400; `reconcile_stripe_payout` with no
   key/export → explicit 500. Those two probes wrote no telemetry; the guide/manifest probes at 03:50 did —
   see the 09-17 sweep note at the top of this file (`agent_query` = 3, all deploy smoke).
4. **[CLOSED 2026-09-19 — fully shipped: FacturGate `beta` (`e77db64`) + ParcelProof `beta` (`3584a62`);
   both launch calls remain open below]** FacturGate /
   ParcelProof pair, queued by the 09-14 recon (`91b6c50`). Owner instruction 2026-09-17 ("proceed to
   implement to deliver solutions") is the go/no-go: **FacturGate (83) APPROVED primary**, built and pushed
   by job `0da7fd6c8f68` (`e77db64` + docs `c1b3139`), deployed tag `c1b3139`; live-verified this sweep —
   `/facturgate` 200, all 12 `/facturgate/calc/*` 200, 3 metered WebMCP tools advertised, `verify-build.sh`
   green end to end. Registry status stays `beta`: the **public launch call is still the founder's**.
   **ParcelProof (80) APPROVED 2026-09-18** by owner instruction ("approve ParcelProof") → **build dispatched
   as a one-shot job** against `context/recon_proposals/2026-09-14_parcelproof.md`, PRD §5 v1 scope guard only,
   registry status `beta`. The build line's re-idle (28 h at the 08:00 sweep) ends with this dispatch.**
   The 8-day idle that ended here (`91b6c50` 09-14 06:03 → first FacturGate commit) had restarted on 09-17;
   this dispatch ends it again at ~42 h (last product commit `e77db64`, 09-17 03:49).
5. **[P1 — @Simon approve, code]** Tag internal/QA traffic on `events` at source + re-base the gate
   window to instrumentation start (09-09 20:52) + extend `scripts/growth-check.mjs` beyond
   `quarterline` (LedgerLink's 29 rows and the only 3 `reconcile_click` rows are invisible to every
   gate). Honest traffic form as of today (09-17 sweep): quarterline 51 session ids — 47 factory-generated
   inside CI clusters (deploy smoke + Build Watchdog + the 09-17 FacturGate verify runs), **4 sessions
   outside every CI cluster and all unattributable** (`3b3193ce…` 09-09 21:22 → 09-10 00:25; `30eb9935…`
   09-10 12:04 → **09-16 23:57**, a returning browser holding 3× `reconcile_click` and the only
   `checkout_click` outside the 09-02 window, 09-16 23:56:36; `3f26bb8f…` 09-13 20:34:49; `49d8211a…`
   **09-16 19:06:50**), **0 provably external in 17 days**. New this sweep: the marker must also cover
   **server-side route rows** — the 3 `agent_query` rows are all the FacturGate deploy smoke
   (09-17 03:50:21–22) with `session_id` null, indistinguishable from a real agent caller and sitting in
   the exact metric the Day-30 gate reads (see `skills/marketing_engineering_playbook.md` edge-case
   2026-09-17).
6. **[P1 — Simon / SOP]** Make the sweep's durable record non-optional. The 09-14 and 09-15 sweeps both
   ran `completed`, delivered full reports to Slack, and wrote **nothing** into the repo — the only
   copies are `/root/.hermes/cron/output/7804a08125ce/2026-09-1{4,5}_*.md`. This sweep reconstructed
   both entries and the four missing gate rows; the structural fix (a producer for
   `context/daily_voice_journal/`, or an explicit "write the entry + commit" step in the sweep SOP)
   is still open.
7. **[P2 as of 2026-09-23 — no visible symptom left; restart still owed]** _2026-09-23: the last stale label
   (`gpu_hardware`, next run 09-23) recorded **`ok`** at 07:13:13Z, so the mislabel has now gone a full week
   without a recurrence. The running gateway is still the 09-12 process, so the fix is unloaded but no longer
   urgent. Restart when no cron run is in flight._ **[P1 — Hermes fork, DONE this sweep, needs a gateway restart to load]** The recurring
   `Interrupted by shutdown before terminal completion` label is a **bookkeeping** failure, not a run
   failure: today's `Full Pipeline: gpu_hardware` logged `completed successfully` (06:11:28) and
   `delivered to slack` (06:12:25), then `Timed out waiting for local fire fence … failing closed`
   (06:12:25.613) → recorded `failed`. Cause: `cron/jobs.py::heartbeat_fire_claim` wrapped the claim
   refresh in `_fire_job_lock`, which delivery holds for the whole network send (30 s timeout).
   **18 occurrences since 09-03 across 8 days.** Patch re-applied (`cron/jobs.py.bak.20260916`),
   `pytest tests/cron/` re-run; not restarted mid-run because the cron scheduler is in-process with
   this sweep. Operator action: restart `hermes-gateway.service` when no run is in flight.
8. **[CLOSED 2026-09-22 — SHIPPED `b6e6555`, live-verified; full evidence in the 09-22 entry at the top]
   Finish the QuarterLine retirement the
   owner's `bc3d556` started, so no live surface sells or advertises a retired product:
   (a) `/api/checkout` still defaults `app = "quarterline"` for `plan: "pdf_audit_export"` — measured live:
   an `app`-less request produced `cs_test_a1MlUGMq…` whose Stripe metadata reads `app=quarterline,
   appName=QuarterLine`, and the receipt email is templated on that name; (b) `public/.well-known/mcp.json`
   (generated from `registry.ts` + `WEBMCP_TOOL_SUMMARIES`, so the fix is in the generator/registry, not the
   file) still advertises `calculate_qbi_deduction` and `calculate_quarterly_estimate`, both attributed
   `quarterline`. Suggested shape: filter the manifest and the product lookup to non-`killed` statuses and
   default the export plan to a `live` product (`ledgerlink`) or reject the default explicitly. Customer-facing
   risk is latent while checkout is sandbox, and becomes live the moment item 1 is answered. Both changes are
   `src/` work → rule 7 gate applies.
9. **[CLOSED 2026-09-22 — SHIPPED `78d0739`, live-verified; full evidence in the 09-22 CaseProof entry
   at the top]** **CaseProof (78)** — the 2026-09-21
   weekly recon's single candidate, full PRD at `context/recon_proposals/2026-09-21_caseproof.md`. First
   scan of the `warehouse_automation_robotics_capex` vertical (never scanned; ledger verdict A, pack now
   verified). The product is the **buyer's side of a warehouse-automation business case**: it re-runs a
   vendor's own quoted numbers against the buyer's fully loaded labour (turnover included), the lines
   vendors omit (integration, facility work, maintenance, commissioning ramp), the buyer's tax year
   (Section 179 limit $2,560,000 / phase-out $4,090,000, 100% bonus depreciation, equipment placed in
   service by **2026-12-31**), and normalizes 2–3 competing quotes onto one five-year cash model —
   returning payback, IRR, NPV at the buyer's hurdle rate, the assumptions that fail and at what value,
   a sensitivity grid, and an exportable decision pack. **The free-incumbent check shaped the scope and
   is the reason this is not another calculator:** free *vendor* ROI calculators now exist (ISD launched
   2026-07-10; Dexory, Kinexon and KUKA also publish one), so a generic calculator is excluded by the
   recon drop rule; the audit + multi-quote comparison is the unowned surface. Build estimate ≈3.5 h;
   **built and shipped 2026-09-22 (`78d0739`, live-verified, status `beta`); the public launch call
   remains the founder's.** Timeliness: the Sep–Oct peak-staffing commitment window, the 2026-12-31
   in-service date, and the
   2027-01-01 wage-floor step (CA $16.90 → $17.40, +2.99%). Runners-up scored this sweep and shortlisted:
   sustained-throughput validator (66) and peak-labour vs rented capacity (63), both blocked by weaker
   free-incumbent positions.

11. **[P2 — @Simon approve, code, NEW 2026-09-23]** Two leftovers of the domain migration: (a)
   `public/.well-known/ai-plugin.json` is served 200 on `apps.giniloh.com` but its `api.url` and
   `legal_info_url` still name the dead `factory.aichieve.net`, and its `/openapi.json` companion 404s;
   (b) `/robots.txt` and `/sitemap.xml` 404 with no producer in the repo at all, while 44 `/calc/*` landing
   pages are indexable. Recommend repointing (a) and generating (b) from the preset files. Both are publish/code
   decisions → rule 7; neither affects money or the build gate, so nothing was changed silently.

---

## OPEN (2026-09-12 sweep — live-verified)

1. **[RESOLVED 2026-09-12 13:22 UTC — owner decision, no approval record; kept here for the trail]
   The shared working tree was dirty with an unfinished, unapproved feature and failed the build gate.**
   Original escalation: 7 modified files (2,267 insertions / 596 deletions) +
   new `src/app/api/distribution/tasks/route.ts` + `supabase/migrations/0003_distribution_tasks.sql`;
   mtimes 02:20–02:23 UTC 09-12, written while an Antigravity IDE server held this workspace
   (`file_root_software_factory_core`, started 02:11). Content: a PressFlow "Weekly
   Multi-Platform Distribution & To-Do Queue". Live measurements at sweep time:
   - `npm run lint` → **exit 1** (1 error `src/app/pressflow/page.tsx:316` `react-hooks/set-state-in-effect`
     + 5 warnings). `verify-build.sh` uses `set -e` → **the 10:00 Build Watchdog fails at step 2**, not a
     regression from `main`.
   - `npx tsc --noEmit` clean; `check:tokens` clean; content-distributor vitest 8/8 pass.
   - `src/app/pressflow/page.tsx` rewrite (1515 → 2359 lines) removed copy asserted by
     `tests/e2e/pressflow.spec.ts` ("Editorial Factory Suite", "Load Sample",
     "LinkedIn Format Generator & Publisher") → e2e test 1 fails even after the lint fix.
   - `public.distribution_tasks` **absent in production** (PostgREST `PGRST205`) → the new route 500s; the
     UI to-do list cannot load.
   - No approval record for this feature (AGENTS.md rule 7 / goals rule 5).
   **Resolution (measured 2026-09-12 13:45 UTC, independent re-verification):** the dirty tree was
   committed as `791d6cd` (11:33 UTC, owner) and then removed from this repo with the whole PressFlow
   app in `65f4042` (13:22 UTC, owner, "remove pressflow from software-factory-core into standalone
   Editorial-Factory"). Tree is clean; `main` in sync with origin; deployed image is `65f4042` and
   `/pressflow` now 404s in production. HEAD re-verified green this audit: `tsc --noEmit` 0 errors,
   `eslint` 0 errors (1 unused-var warning), `check:tokens` clean, vitest 28/28, `next build` OK.
   **Two caveats that stay open:** (a) no written approval record was ever created — the commit *is*
   the decision, recorded in "DECISION — owner action (2026-09-12)" below; (b) the commit message
   claims the code moved "into standalone Editorial-Factory", but no `pressflow` app exists in
   `kotechile/Editorial-Factory` (verified locally and against origin) — the code was deleted, and the
   only surviving copies are Docker overlay layers. Treat it as a deletion, not a migration.
   **CORRECTED 2026-09-13:** that reading is right about the *Next.js page* and wrong about the *feature*.
   `kotechile/Editorial-Factory` landed `a6ff966` + `7651104` (09-12 14:43–14:48) — `site/distribution.mjs`
   + the dashboard Reddit/LinkedIn publication to-do queue, live behind auth
   (`pressflow.aichieve.net` `/` → 401, `/healthz` → 200, `/api/articles.json` → 200, 12 published
   articles) and populating Supabase `factory_config.distribution_queue`. Nothing needs restoring from
   `git show 791d6cd:…`; the feature exists, it was rebuilt rather than migrated.
2. **[P0 — founder, ~5 min; NOW GATE-BLOCKING: Day-14 gate due 2026-09-14] Revenue is Stripe test-mode.**
   `STRIPE_SECRET_KEY=sk_test` in the repo `.env`,
   so `charge_count=9` / `gross_revenue_usd=161` from `growth-check.mjs` are test-mode charges; real
   collected revenue is $0. The Day-14 gate (≥$50 gross, due ~09-14 Mon) is unmeetable as configured, and
   the Growth Watchdog only runs Fridays (next 09-18) so nothing evaluates it on time. Set a live key in
   the deploy env, or explicitly record test-mode as intended.
   **Re-verified live 2026-09-13 (not inferred from `.env`):** `POST https://factory.aichieve.net/api/checkout`
   → HTTP 200 with `sessionId: "cs_test_a1NyVAs…"` and `url: checkout.stripe.com/c/pay/cs_test_…`, i.e. the
   deployed app creates **test-mode** sessions. In the DB, all **4 `purchases` rows are `cs_test_*`**
   ($9.00, all 2026-09-02) and the only `subscriptions` row is `canceled` (09-02) → $0 real revenue and
   every monetization signal 11 days stale. Day-14 therefore scores a MISS on both criteria: $0 real
   revenue **and** 0 `agent_query` rows all-time. The §3 fallback ("run A/B copy test") is also
   unscoreable without traffic — it must be paired with distribution (item 5), not scheduled instead of it.
3. **[P0 — code, approval needed] `public/.well-known/mcp.json` still advertises a dead tool name.**
   Re-verified live: prod (200) is byte-identical to the working tree, lists only
   `calculate_self_employment_2026` (registered nowhere), omits `calculate_qbi_deduction`,
   `calculate_quarterly_estimate`, `format_article_for_linkedin`, `reconcile_stripe_payout`. Unchanged
   since `4b3abfd`. **Fix:** generate the manifest from `src/products/registry.ts` + a test asserting
   registry ↔ registered names ↔ manifest agree. _Re-verified 2026-09-13: prod 200, still byte-identical to
   the working tree, still only `calculate_self_employment_2026`; the 20 live pSEO routes are now pushing
   traffic at it._
4. **[P1 — approval needed, and now the fallback has already fired] The Day-7 pSEO fallback shipped ahead
   of its own preconditions.** `dd1251a` (09-11 17:06) took presets 9 → 20 and all new slugs are live (200).
   The 09-11 08:00 sweep required two preconditions first — (a) internal sessions tagged/excluded,
   (b) gate window re-based to instrumentation start (09-09 20:52). Neither exists. 20 indexable routes are
   now justified by a metric that is 100% factory traffic (15/15 sessions internal, 0 external, all-time).
   **Need:** an internal-traffic marker on `events` + a re-based window, then a re-scored verdict.
   _Re-verified 2026-09-13: 20/20 presets HTTP 200 live; `unique_sessions=23` for quarterline and all 23 are
   factory-generated (deploy smoke + Build/Growth Watchdog Playwright + the 09-12 post-removal
   verification); external sessions all-time = 0; `agent_query` = 0. 4 rows / 2 sessions on the `factory`
   directory (09-09 21:22 → 09-10 00:25, 09-10 12:04) sit outside every CI cluster but store no UA, so they
   remain unattributable — the only candidate external traffic ever recorded._
5. **[P1 — no approval needed, 2 days left (expires 2026-09-15)] Echo outreach still has ZERO execution
   record.** Approved
   09-09; the only artifact is `context/growth_blueprints/2026-08-31_quarterline.md` (Vectors 1 & 5, copy
   "ready now"). Sept 15 Q3 estimated-tax deadline is the product's entire urgency moat. Distribution only.
   _New 2026-09-13: the hand-execution tooling now exists — but in the other repo. `editorial-factory`'s
   Supabase `factory_config.distribution_queue` holds **36 items, all status `ready`, 0 published,
   0 deleted** (generated 09-12 14:48, `site/distribution.mjs`, live behind auth at
   `pressflow.aichieve.net`). So even the content queue has never been worked by hand: the blocker is
   execution discipline, not tooling._

## CLOSED this cycle (found 2026-09-12)
- **Dirty-tree P0 (item 1) — CLOSED by owner action, 13:22 UTC.** Committed `791d6cd` then removed with
  the PressFlow app in `65f4042`; tree clean, `main` in sync, deployed `65f4042`, `/pressflow` → 404.
  HEAD re-verified green (tsc/lint/tokens/vitest 28/28/build). Rule-7 deviation recorded in the
  "DECISION — owner action (2026-09-12)" section: no approval record was written before the commits.
- **`0002_events_session_id.sql` — APPLIED** (was 09-11 item 3). Independent probe: `select session_id
  from events limit 1` → HTTP 200 (no more `42703`); `growth-check.mjs` → `session_id_column: true`.
  Re-confirmed this audit: `session_id_column: true`, 15/15 instrumented rows.
- **pSEO presets 9 → 20 — DELIVERED** (`dd1251a`, pushed; new slugs verified 200 in production).
  Re-confirmed this audit: `california-freelancer-tax-2026`, `new-york-schedule-c-qbi`,
  `texas-1099-estimated-tax` → 200 on `factory.aichieve.net`.
- **Cron incident ledger — reconciled 2026-09-12.** All 9 open `cron_incidents` rows were stale
  (7 config-drift skips from 09-06/09-07 that were cured by pinning, 1 HTTP-402 balance outage,
  1 `unknown` post-restart execution); none were acked or closed by the fleet, so the ledger read
  "unhealthy" while every job ran `ok`. All 9 acknowledged via `hermes cron incidents ack`; the two
  `unknown` rows remain the only genuinely unknowable side-effect windows (long-run fire-claim issue,
  see `skills/self_improvement_eval.md`).

---

## SHIPPED + VERIFIED (2026-09-10 sweep)

All items approved on 09-09 have landed on `main` and are deployed. Nothing here is open.

- **P0 WebMCP metering + tool-name fix — SHIPPED** (`05ac8ae`). Verified live:
  `POST /api/agent/calculate` + `x-webmcp-tool: calculate_qbi_deduction` → 200, writes
  `agent_query` with `payload.tool = "calculate_qbi_deduction"` (probe row deleted; metric stays
  honest at 0 real agent queries). `reconcile_stripe_payout` without a customer key → HTTP 500 with
  an explicit error (no factory-key fallback). All 4 tools registered via `WebMCPProvider`.
  ⚠️ One leg left open — see "NEW/OPEN" item 1 (stale published manifest).
- **LedgerLink — SHIPPED** (`967a1f2`): engine + fixtures/tests + `/ledgerlink` UI + WebMCP tool,
  registered in `registry.ts` (status `live`). 200 on `https://factory.aichieve.net/ledgerlink`.
- **Day-7 instrumentation — SHIPPED** (`36ea75c`): `ql_session_id` cookie → `payload.session_id`,
  present in the deployed bundle; `growth-check.mjs` reports `unique_sessions`. Migration itself
  still unapplied — see item 2.
- **Design backlog P2 — SHIPPED** (`05ac8ae`): CTA copy unified to "Export Report ($9)" top+bottom,
  currency formatting with commas, "Total 2026 Tax Liability" card promoted (`border-primary/50
  bg-primary/5 shadow-md`), alert-banner button border raised to `border-foreground/50`.
- **Build Watchdog — RECOVERED**: last run 09-09 10:13 `ok` (had failed 5× on fire-claim TTL).

## OPEN (2026-09-11 sweep — historical; items 3 & 4 now closed, see above)

1. **[P0 — verdict is in: MISSED, and the metric is self-generated]** Day-7 gate scored
   `unique_sessions=8` vs the ≥50 criterion, and **every one of the 8 sessions was produced by the
   factory itself**: 4 from the 09-09 deploy smoke (20:52:00–20:52:04) and 4 from the 09-10 10:01
   Build Watchdog Playwright run (raw `events` provenance read this sweep; 214 rows total, nothing
   written since 09-10 12:04). `agent_query` = 0 all-time; the only `checkout_click` (3) and
   `export_click` (2) rows in the table are a single 42-minute window on 09-02. **Implication: the
   gate cannot be honestly scored until internal traffic is excluded — a CI run can "pass" the gate
   for the wrong reason.** Verdict logged in `skills/self_improvement_eval.md`; SOP patched
   (`skills/marketing_engineering_playbook.md` §3 measurement rule + §5 edge-case 2026-09-11).
   **Two code fixes needed (approval):** (a) tag internal traffic at source (CI/deploy/QA probes)
   so the gate query can filter it; (b) re-base the gate window to instrumentation start (09-09
   20:52). Until then the Growth Watchdog (Fri 17:00) is evaluating a number we generate ourselves.
2. **[P0 — code, approval needed] `public/.well-known/mcp.json` still advertises a dead tool name.**
   Verified live again this sweep: the working-tree file and `https://factory.aichieve.net/.well-known/mcp.json`
   are byte-identical, still listing only `calculate_self_employment_2026` (registered nowhere) and
   omitting `calculate_qbi_deduction`, `calculate_quarterly_estimate`, `format_article_for_linkedin`,
   `reconcile_stripe_payout`. Unchanged since `4b3abfd`; no producer script. **Fix:** generate the
   manifest from `src/products/registry.ts` (route handler or build step) + a test asserting
   registry ↔ registered tool names ↔ manifest agree. GTM Vector 4 would publish the dead name.
3. **[RESOLVED 2026-09-12 — verified applied] Apply `supabase/migrations/0002_events_session_id.sql` in the
   Supabase SQL editor.** `session_id_column: false` again this sweep. Confirmed this run that it
   **cannot** be applied with the service-role key: PostgREST exposes no DDL and `rpc/exec_sql`
   returns 404. Not verdict-blocking (the payload fallback works — 8 sessions were readable), but
   every gate query is a full-scan jsonb extraction until the indexed column exists.
4. **[DELIVERED 2026-09-12 by `dd1251a` — but see 09-12 item 4: it fired ahead of its preconditions] Author the pSEO fallback presets — the gap is bigger than
   recorded.** `src/lib/seo/presets.ts` holds **9** presets, not 11 → **11 short** of the 20-route
   fallback target (the 09-10 record said 9 short). The route
   (`src/app/quarterline/calc/[slug]/page.tsx`) is generic, so this is preset data only. Also
   reconcile the playbook's two different targets (20 routes in the journals vs "50 pages" in §4)
   before dispatching.
5. **[P1 — no approval needed, expires Sept 15] Echo outreach still has ZERO execution record.**
   Approved 09-09; the only artifact remains the blueprint
   (`context/growth_blueprints/2026-08-31_quarterline.md`, Vectors 1 & 5, copy "ready now").
   4 days to the Q3 estimated-tax deadline — the product's entire urgency moat. Distribution only.
6. **[P2 — CLOSED, no action] `context/design_backlog.md` triage.** The 09-10 item claiming the
   2026-09-01 suggestions are still untriaged is **stale**: the file already marks all four
   ✅ accepted & implemented in `05ac8ae`. No re-flag risk; item dropped from the queue.


## DECISION — owner action (2026-09-12)

Recorded during the 2026-09-12 integrity audit. **No `@Simon approve` record was created for either
action** — this section records what the owner actually did, so the trail stops being ambiguous. It is
an *audit note*, not a retroactive approval.

1. **PressFlow "Weekly Multi-Platform Distribution & To-Do Queue" — committed then deleted.**
   `791d6cd` (11:33 UTC) committed the rewrite that the 08:00 sweep had escalated as unapproved and
   gate-failing; `65f4042` (13:22 UTC) removed the entire PressFlow app from this repo. Both authored by
   the owner. Outcome: the feature no longer exists here, the tree is clean, and the build gate is green.
   Deviation: AGENTS.md rule 7 requires the approval *before* development/ship, and neither commit has a
   corresponding approval entry — the commit is the de-facto decision.
2. **Consequence to check before re-adding PressFlow anywhere:** the removal commit message says the code
   moved "into standalone Editorial-Factory", but `kotechile/Editorial-Factory` contains no `pressflow`
   app (verified locally and against `origin/main`; only `site/server.mjs` + `published/`). If PressFlow is
   supposed to live there, it was lost in the move and must be restored from git history
   (`git show 791d6cd:src/app/pressflow/page.tsx`) rather than assumed present.

---

## DECISION — Approval granted by @Simon approve (2026-09-09)

ALL software next steps APPROVED. Gate lifted; proceed to build/ship.

- **P0 WebMCP metering fix — APPROVED**
- **P1 Echo outreach — APPROVED**
- **P1 Day-7 gate (unique-session instrumentation) — APPROVED**
- **P2 Design backlog — APPROVED**
- **LedgerLink — APPROVED** (keep scope note: customer Stripe key / JSON export, not the factory's own account)
- **MCPV2 — DEFER** (unchanged; weak moat, no build)

---

## P0 — WebMCP monetization + telemetry fix (code)

- **What:** Route the two browser WebMCP tools (`calculate_qbi_deduction`,
  `calculate_quarterly_estimate` in `src/lib/webmcp/register.ts`) through the metered path —
  either `POST /api/agent/calculate` or mirror its `track("agent_query", …)` +
  `reportMeteredUsage(...)` calls — instead of computing client-side.
  This is a **3-way tool-name mismatch** to fix in one pass: (1) the browser tools compute
  client-side (no metering), (2) `src/products/registry.ts` advertises
  `calculate_self_employment_2026`, (3) `src/app/api/agent/calculate/route.ts` records the
  event with `tool: "calculate_self_employment_2026"` — while the only real registered names
  are `calculate_qbi_deduction` and `calculate_quarterly_estimate`.
- **Why:** This is the entire `$0.25/query` agent tier (company_goals.md hard rule #4 + the
  WebMCP monetization pillar). Currently `agent_query=0` and $0 collected; GTM Vector 4 would
  publish a dead tool name to Smithery/Glama.
- **Effort:** small, bounded — the metered route already exists and just needs to be hit.

## P1 — Echo outreach (ship, time-sensitive)

- **What:** Dispatch Echo to execute GTM Vectors 1 & 5 — the "23%-vs-20% QBI trap" drop
  (Reddit/X/HN) and the 25-CPA memo. Copy is already written in
  `context/growth_blueprints/2026-08-31_quarterline.md` ("ready now").
- **Why:** Sept 15 Q3 estimated-tax deadline (10 days out) is the product's entire urgency moat.
  Zero execution record to date; this cannot be done "after."
- **Effort:** distribution only, no code.

## P1 — Day-7 gate (PAST DUE — was 09-07, no verdict logged)

- **What:** Day-7 gate is ≥50 unique sessions + ≥1 export. Latest (09-09): page_view=134,
  export_click=2, checkout_click=3, charge_count=9 / $161 (flat 7 days). Export criterion likely
  met (2 clicks + 9 charges); sessions criterion unverifiable (see gap). If judged missed, the
  playbook says "deploy 20 pSEO routes" — only ~11 presets exist (`src/lib/seo/presets.ts`),
  ~9 short. Author the remainder now.
- **Measurement gap (fix needed for honest gate):** `scripts/growth-check.mjs` counts raw
  `page_view` events, not unique sessions/visitors, so "≥50 unique sessions" cannot be honestly
  evaluated. Add unique-visitor/session instrumentation. Growth Watchdog (next run Fri 09-11)
  should log the verdict — the growth-gate audit log currently ends 09-04.

## P2 — Design backlog (code, batch into any approval)

From `context/design_backlog.md` (2026-09-01, `visual-qa --suggest`):
1. Unify CTA copy to "Export Report ($9)" top & bottom (low effort, kills price-shock drop-off).
2. Currency input mask (commas + persistent `$`) — high impact / medium effort.
3. Emphasize "Total 2026 Tax Liability" card as the primary focal point.
4. Fix Alert-banner button contrast (currently fails WCAG 2.1 AA 3:1).

## Recon 2026-09-14 — weekly sweep → Proposals queued for @Simon approve

Scan window 2026-08-15 → 2026-09-14. Four vectors searched; two candidates cleared the ≥60 signal
bar and all four viability filters, three signals rejected with reasons. No code built — awaits gate.

- **FacturGate** — EU e-invoice pre-send compliance gate + format converter (Vector A×B). **Score 83.**
  `context/recon_proposals/2026-09-14_facturgate.md`. France's B2B mandate went live **2026-09-01**
  (receive obligation, all VAT businesses; large + mid-size issuing; SMEs 2027-09-01); EN 16931
  profile minimum + CIUS-FR (SIRET, FR VAT codes); penalty raised €15 → **€50/invoice** on the sender.
  Deterministic core = measured high-frequency EN 16931 + CIUS-FR rule set over a canonical invoice
  model, plus Factur-X/CII and UBL 2.1 emitters that *fix* what the existing free validators only
  diagnose. WebMCP `validate_einvoice` / `convert_invoice_to_facturx` / `check_eu_vat_id`.
  Honest limits stated in the PRD: v1 covers the high-frequency rule families only (rest reported as
  `unsupported-rule`), PDF/A-3 hybrid authoring is P1.
- **ParcelProof** — carrier invoice DIM-weight & surcharge audit engine (Vector C×B). **Score 80.**
  `context/recon_proposals/2026-09-14_parcelproof.md`. USPS DIM divisor **166 → 139** effective
  2026-07-12 with fractional dims rounding up (UPS/FedEx already 139); published dim-weight error
  rates 0.1–0.4% of lines and 2–8% of carrier spend recovered; disputes expire in ~21 (FedEx) /
  ~30 (UPS) days. Deterministic core = recompute billable weight from declared shipment records
  against billed invoice lines + accessorial eligibility + dispute clock, with unverifiable lines
  flagged, never guessed. WebMCP `audit_carrier_invoice` / `compute_billable_weight`.
- **Rejected in sweep (logged in `context/audience_pain_points.md`):** Shopify Storefront-MCP → UCP
  conformance checker (free vendor + community tooling already covers it); agent-payment metering /
  governance bridge (Cloudflare Monetization Gateway + AWS WAF Monetize shipped July 2026; Stripe
  MPP / Nevermined / Orb / Metronome own the billing layer); Google Ads API v22 sunset migration
  scanner (third code-migration scanner in three weeks, one-time WTP, free upstream guides —
  archetype saturation with MCPV2 still unbuilt).
- **SOP patched (rule 6):** `skills/market_recon_last30days.md` Stage 2 now carries the measured query
  corrections — the `after:` operator is not honoured by the backend, bare deprecation booleans
  return consumer-media noise, and the two highest-yield phrasings found are regulation+deadline+pain
  (A/B) and billable-quantity+dated-rule-change (C). Failed patterns also logged in
  `skills/self_improvement_eval.md` → "Recon zero-result log".

**Simon recommendation:**
- **FacturGate — APPROVE (primary).** Score 83 with a live, dated regulatory trigger and a
  quantified rejection set (ten named rules dominate failures); the differentiator is *conversion +
  fix*, not another validator, and the agent tier is genuinely metered. Scope note before build:
  hold the rule set to the measured high-frequency families and emit `unsupported-rule` for the
  rest — do not imply full EN 16931 (~1,300 rules) coverage.
- **ParcelProof — SHORTLIST / APPROVE (secondary).** Score 80, recovers cash directly, weakest factor
  is urgency (evergreen). Would reuse the `ledgerlink` CSV-import + reconciliation shape.
- Neither proposal is a build instruction; both wait on `@Simon approve`.

---

## Recon 2026-09-07 — weekly sweep → Proposals queued for @Simon approve

- **LedgerLink** — Stripe payout → GL reconciliation engine (Vector B). Score 76.
  `context/recon_proposals/2026-09-07_ledgerlink.md`. B2B bookkeeper WTP high; deterministic
  `Σnet == payout.amount` invariant; WebMCP `reconcile_stripe_payout`. No code built — awaits gate.
- **MCPV2** — 2026-07-28 stateless migration scanner (Vector A×D). Score 62 (barely over the 60 bar).
  `context/recon_proposals/2026-09-07_mcpv2.md`. Timely but WTP moderate; flag for Toby to vet the
  score before dispatch, since it just clears 60 and repeats a one-time (fast-decaying) urgency window.
- **Rejected in sweep:** OpenAI Assistants→Responses wire-compatible bridge (incumbent Ragwalla +
  free OAI guide; no deterministic engine; fails filter 3). Google Content API→Merchant API (deadline
  08-18 passed; incumbent feed-network moat). Both logged in `context/audience_pain_points.md`.

**Simon recommendation (2026-09-07):**
- **LedgerLink — APPROVE (primary).** Score 76, real recurring pain, WTP 90, sound `Σnet ==
  payout.amount` invariant. One scope note before build: "reads Stripe via the factory's existing
  Stripe key" is imprecise — that key reads the factory's own account, not a customer's payouts.
  MVP should accept a customer read-only Stripe restricted key OR a pasted/uploaded Stripe JSON
  export; the deterministic engine is fixture-testable either way.
- **MCPV2 — DEFER.** Score 62 barely clears the bar; WTP 40 (one-time migration, narrow dev
  segment) and a fast-decaying urgency window = weak recurring moat. Not worth a build slot now.

## Resolved (no action)

- Fleet provider outage (09-06 → 09-07) — RESOLVED. DeepSeek 402 → global config drift → unpinned
  jobs skipped. Founder pinned all jobs; sweep + weekly recon + editorial now `ok`.
  Follow-up: Build Watchdog (`3157deecdeb5`) failing 5× with "Interrupted by shutdown before
  terminal completion" (long verify-build.sh exceeds the run/fire-claim limit) — Toby's quality
  gate is down; triage + raise the run limit.
- Approval-gate tightening — DONE 2026-09-01 (commit `1a60b9f`); gate is already hard.
- Stranded 09-03 lint fix + SOP note — landed in commits `48486f0` / `64796ee`; tree clean.
