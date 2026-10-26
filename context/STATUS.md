# Factory Status Map

_Last updated: 2026-10-26 (**15:30 sweep**, Day-56 — every surface re-measured live at `apps.aichieve.net`). **RatchetProof is live, it has a launch film, and ParcelProof now reads the carrier's own export — the sixth product closed the beta gap by status flip, not by a pipeline change.** Registry: six `live` (`ledgerlink`, `facturgate`, `parcelproof`, `caseproof`, `spendproof`, `ratchetproof`) + `quarterline` killed. `de9092e` (10-25 15:57Z, owner approval) flipped `ratchetproof` beta → live and closed queue row `ratchetproof-live`; `8173a6f` + `88c7292` embedded `ncxRfAAiQ3A` and made the page render the section (SOP `1bfbb47`). **Measured:** `/ratchetproof` **200**, **oEmbed 200** on `ncxRfAAiQ3A`, `/launch-videos/ratchetproof.jpg` **200** (404 for 7 days), page carries `youtu.be/ncxRfAAiQ3A`; all six films oEmbed **200** (`ncxRfAAiQ3A`, `fYCWUMVtb_M`, `euQuJJbNOs0`, `jAiN_tmlj7Y`, `UTmaWW8U4RA`, `Zh13_ukGDiM`), posters **6/6 200**, each page exactly its own id. **Six superseded uploads DELETED** (`1b9d1ff`, owner 10-25): `f9xr2ILpUEg`, `H2TwJrVF1-A`, `a4x5rhkBlXA`, `pVItC4gjXJc`, `gPz-3Tuhps0`, `Ski_feMOWuc`; ledger repointed to the five 4K survivors (5/5, 0 mismatches); queue row `superseded-video-copies` `resolved`. **NEW PRODUCT CAPABILITY:** `95c1e61` (10-25 22:46Z, +866 lines / 13 files) makes ParcelProof read the carrier's own export (normalised header synonyms — `Tracking Number`, `Billed Weight (lb)`, `Net Amount`; two columns claiming one field is refused, an unresolvable field fails `pp-field-missing` naming the columns the file has) and price a corrected line with **no contract rate card** (`observed-bracket`: the carrier's own charge for that whole-pound weight in the same carrier/service/zone lane on the same invoice). **Verified live:** the label `carrier's own charge (observed)` is in the served chunk `/_next/static/chunks/3tyxdisjr8vzo.js`; the static page copy does not advertise it (renders only inside a report). `f462e6f` scopes the weekly growth check to the live inventory (row closed `a499447`). Editor primitive fixed three ways: `b3a3c0d` cap to rows, `01b5802` visible line-number window, `f684b93` number window follows the field's scroll (rule in `0e8d8b5`). **RE-CON 14:33Z (`8cec53e`): ClaimProof proposed** — `trades_service_ops`, **79/100**, warranty-claim short-payment audit for HVAC/refrigeration, LLM/parse class **$1.50/call** vs modelled **≈$0.22** (6.8× headroom), scope excludes the human chase; `media_production_qc` scanned and **retired cheaply** (best 68/100, dead at the free-incumbent rule; Subtitle Edit + six free checkers, EZTitles/OOONA/CaptionHub own the paid layer). Queue **16 rows — 1 `pending` (`claimproof`), 1 `approved` (`canopyproof`, idle **8 days**, still only `01d02c3` engine+tests, no route, not registered), 14 `resolved`**. **Deploy:** pre-sweep HEAD == `origin/main` == `8cec53e`; container `af8yqbwrrnyyfgs9wcg0intj-20261026T143333` image `8cec53e9be0f…` == HEAD (up 55 min), `COOLIFY_FQDN=apps.aichieve.net/`, `STRIPE_MODE=live`. **Surfaces:** `/` **307** → giniloh.com 200, `/showcase` + six products + `/quarterline` (retirement notice) + `/billing` + `/embed/countdown` + robots + sitemap (**31** locs) + mcp.json **200**; `ai-plugin.json` **404**; `/openapi.json` **404**; `apps.giniloh.com` **503** (day 9, by design); `factory.aichieve.net` **503**; three reader fronts **200**. Manifest **v2.2.0 / 11 tools** sha256 **`ae5ac25e…`** (was `4b3d53ec…`; derived data moved with the RatchetProof status flip, no hand edit), endpoint live host. **Paid:** checkout **200 `cs_live_a18SHQOJzh6t…`**, no-`app` **400**, `quarterline` **400**, portal **307**, SpendProof no-doc **400** (explicit supply-the-invoice message), RatchetProof empty **400** (explicit supply-the-interval-data message), **`POST /api/agent/calculate {}` 500 — day 9**. **Build gate:** last recorded green `a499447` (479 vitest / 110 Playwright / 30/30 tiles, `be4440e`); `95c1e61` (ParcelProof engine + 215 test lines) landed after it and has **no recorded gate** — Build Watchdog 16:30Z today. **Traffic `events` 13,274 → 15,073** (+1,799) / **7,976 → 9,038** sessions (+1,062); **zero rows today**, last `factory page_view` **2026-10-25T23:05:57Z**, all new rows on 10-25 after the sweep = video-desk upload checks + the ParcelProof work, not instrumented as internal. Visitor-classed **67 → 79 events / 23 → 26 sessions**; **18 rows on 10-25** (three ratchetproof views in 12 s on three fresh sessions at 17:49 = headless checks; owner session `01d35679…` 19:51–19:54 across five products; `9dc7f007…` 22:17–22:18; owner 23:05); **0 today**; **no provable outside visitor — day 56**; `agent_query` **8** (last 10-03). Per product caseproof 3,609 / parcelproof 3,466 / facturgate 2,510 / factory 2,008 / spendproof 1,570 / ledgerlink 756 / ratchetproof 572 / billing 354 / quarterline 228. **Publishing:** articles **190 → 196** (+6 / 24 h); editorial HEAD **`47ccaaf`** == origin, pressflow `nstjdswcf5p9xckwja89o6z0-20261026T132046` image `47ccaafd…` serving **196 == 196**, Verify Gate + WordPress Draft Sweep `ok`, three fronts 200. **Jobs:** `hermes cron doctor` **0 issues / 78 jobs** — the stale recon delivery record cleared with the 14:35 run (delivered `slack:D0BTH9JHRMH`); Build Watchdog 16:30, Slack Report Gate 18:00, Growth Watchdog 10-30, Post-Ship Brag every 30 min. `vertical-sync --check` **0** (33); `recon:cadence` **0** (2026-10-26, two verticals). **Revenue $0 real** (4 `cs_test_` purchases 09-02; 1 sandbox subscription). **The real number: six live products, six launch films, 56 days, $0 revenue, no provable outside visitor — every asset distribution needs exists and nothing distributes it.**_

_Last updated: 2026-10-25 (**15:30 sweep**, Day-55 — every surface re-measured live). **All five launch videos were re-made at 4K overnight and re-published, the old five were deleted, and every product page now plays the new film.** Uploads 01:46–02:02Z: spendproof `fYCWUMVtb_M`, caseproof `Zh13_ukGDiM`, facturgate `jAiN_tmlj7Y`, parcelproof `UTmaWW8U4RA`, ledgerlink `euQuJJbNOs0` — oEmbed **200** with real descriptive titles on channel **GiniLoh**, each id carried exactly once by its own page (`/spendproof` … `/ledgerlink` 200). Masters measured with `ffprobe`: **3840×2160 @30 fps + aac**, 18.6–37.0 MB, 22–23 s (was 1920×1080); `dc84025` is the 4K delivery, the SpendProof poster reads crisp (headline "Five ways a line drifts.", all rule labels, $3.00 invoice line). Posters 200 (36.7–80.8 KB); `ratchetproof.jpg` **404**. **The five ids rendered yesterday are DELETED** (`qeow4cdaiv8`, `JcP9RtWZZrg`, `I7NOZAQ-5Ig`, `I38c05ZZZr8`, `MiNmsr1i9Lo` → oEmbed 404), superseded by the desk in the same window, so no page broke. **NEW P2, six superseded uploads still public** — the re-render ran in rounds: `f9xr2ILpUEg`, `H2TwJrVF1-A`, `a4x5rhkBlXA`, `pVItC4gjXJc`, `gPz-3Tuhps0`, `Ski_feMOWuc` (all oEmbed 200) = 11 public films for 5 products; queued as `superseded-video-copies`, same class the owner cleared 10-19. **The Supabase `launch_videos` ledger is stale and points at the five deleted ids** (5 rows `uploaded`, `updated_at` 10-13/10-19) — not what the pages render (`src/products/launch-videos.ts` is), no re-upload risk because every slug has a row, but the published record is wrong; reported, not repaired (video desk's table). **Deploy chain:** pre-sweep HEAD == `origin/main` == **`fbcee18`**; container `af8yqbwrrnyyfgs9wcg0intj-20261025T020544` `SOURCE_COMMIT=fbcee18…` == HEAD (up 13 h), `COOLIFY_FQDN=apps.aichieve.net/`; queue rows 2764/2765/2768/2769 `finished`; one build **2763 failed** 2026-10-24 23:44:46Z (`DeploymentException`, exit 1) and the next at 23:53 succeeded — previous image kept serving, no user impact. **Traffic `events` 11,795 → 13,274** rows (+1,479) / **7,099 → 7,976** sessions; today's **436** rows all inside **00:00–02:59** (141/151/144 per hour) = the video desk's own browser + Playwright runs around the uploads and four deploys, **nothing after 02:04**. Visitor-classed count rose 24 → **67 events / 7 → 23 sessions**, but **43 of those rows are the desk's post-upload checks** (three views one second apart, fresh session each, minutes after each embed commit: 23:06 spendproof, 23:35 caseproof, 23:46 parcelproof, 23:49 ledgerlink) — the internal-traffic marker does not cover them, so they read as people (new small measurement gap, inflates the growth check's visitor leg). The one real browser is the owner's session `9dc7f007…` (23:39–23:57 five products, returned 01:41–01:42 for three). **No provable outside visitor — day 55**; `agent_query` **8** (last 10-03). Per product caseproof 3,238 / parcelproof 3,136 / facturgate 2,267 / factory 1,793 / spendproof 1,269 / ledgerlink 707 / billing 320 / ratchetproof 316 / quarterline 228. **No product change for the fifth day** (no `src/` commit since 2026-10-20); registry 5 `live` + `ratchetproof` `beta` (day 7) + `quarterline` killed. **Publishing:** articles **182 → 190** (+8 / 24 h, **3 today** — `snow-robot-stops-at-6000-ft2-it-docks`, `your-50-meter-reads-78-its-metal`, `your-550-battery-spare-is-wrong`, each 200 on wellroost.com); editorial HEAD `a6c97e3` == origin, pressflow `…20261025T152130` image `a6c97e3b…`, `/app/published` **190 == 190**, **Verify Gate ok 14:00**, **WordPress Draft Sweep ok 14:15** (4th green day), three fronts 200. **Surfaces:** `/` 307, `/showcase` + six products + `/quarterline` + `/billing` + `/embed/countdown` + robots + sitemap (**31**) + mcp.json 200; `ai-plugin.json` 404; `/openapi.json` 404; `apps.giniloh.com` **503** (day 8, by design). Manifest **v2.2.0 / 11 tools** sha256 `4b3d53ec…`, endpoint live host. **Paid:** checkout **200 `cs_live_a1fCAfr1…`**, portal 307, SpendProof no-doc **400 `sp-document-missing`**, RatchetProof empty **400 `rp-intervals-empty`**, quarterline **400 Unknown plan**, **`/api/agent/calculate {}` 500** (day 8). Revenue **$0 real** (4 `cs_test_` 09-02; 1 never-live subscription). **Doctor 1 issue / 78 jobs** (fleet grew 69 → 78 with the 33-vertical registry; the issue is the stale recon delivery record, clears 10-26). `vertical-sync --check` **0** (33). **Queue 14 rows — 3 `pending`** (`ratchetproof-live`, `growth-check-scope`, new `superseded-video-copies`), **1 `approved`** (`canopyproof`, idle day 7), 10 `resolved`. Build Watchdog next today 16:30; Growth Watchdog next 10-30; `PAUSED_2026-10-15.md` stale. **The real number: six products, 55 days, zero provable outside visitor, $0 revenue — the best marketing asset the factory owns now exists in 4K and nothing distributes it.**_

_Last updated: 2026-10-24 (**15:30 sweep**, Day-54 — every surface re-measured live). **First counted visitor session in a week — one browser walked five products in five minutes — and the growth meter that reported zeros for every product is fixed.** Traffic `events` **11,787 → 11,795** rows / **7,098 → 7,099** sessions: session `9dc7f007…` (`payload.traffic_class: visitor`) hit `spendproof` 18:15:18, `billing` 18:19:38, `spendproof` 18:19:41, `billing` 18:19:42, `factory` (showcase) 18:20:19, `ledgerlink` 18:20:28, `factory` 18:20:30 and returned for `facturgate` **22:15:17** — 7 page views in five minutes, the widest and largest visitor-classed session on record (previous best `a3370f6d…`, 5 rows). **Not provable outside traffic:** no user agent is stored and Traefik access logging is off, so it may be the owner; it is classed `visitor`, not one of our suites. Since the marker (2026-10-19): **24 visitor-classed events / 7 sessions**. **The growth check was silently blind:** one unpaginated PostgREST read (oldest-first, ~1,000-row cap) meant it saw only the pre-instrumentation head of the store and printed `product_event_rows: 0` / `unique_sessions_visitor: 0` for a product with **1,012** real rows — the reason Friday's Growth Watchdog could not score the visitor leg. **Fixed this sweep** (`scripts/growth-check.mjs`: explicit `.range()` paging + a printed `events_read_capped` at the 200k cap, never a silent partial read); proven `node scripts/growth-check.mjs spendproof` → **1,012** rows / **640** sessions / **2 visitor sessions** in 1.7 s. Per product visitor sessions: facturgate 3, ledgerlink 2, spendproof 2, parcelproof 1, caseproof 1, ratchetproof 1 (the same 7 sessions across products). **No product commit in 24 h and no `src/` change since 2026-10-20 — fourth day**; the only commits since yesterday are `f7e18a2` (Build Watchdog eval note) and this sweep. **Build line green:** `verify-build.sh` on `696c8cb` = **416 vitest / 110 Playwright / 30/30 visual tiles**, app serving the same commit, so the 10-23 `copy:check` repair holds in a clean checkout; Build Watchdog ok 10-23 16:38, next today 16:30. **RatchetProof `beta` day 5:** `/ratchetproof` 200, sitemap 31 locs, empty audit **400 `rp-intervals-empty`**, `/launch-videos/ratchetproof.jpg` **404**, ledger 5 rows. **CanopyProof idle day 6** past approval (`01d02c3` only; no route, not registered). **Publishing:** articles **175 → 182** (+7 / 24 h, 2 today — `2026-10-24_7-days-notice-rewrites-your-duty` and `2026-10-24_your-home-servers-45-day-patch-gap`, each 200 on its owning front); editorial HEAD `975603d` == origin, pressflow `nstjdswcf5p9xckwja89o6z0-20261024T150129` image `975603d7…`, `/app/published` **182 == 182**, **Verify Gate ok 14:02**, **WordPress Draft Sweep ok 14:16** (3rd green day), three fronts 200, aichieve robots+sitemap 200. **Surfaces:** `/` 307, `/showcase` + six products + `/quarterline` (200 notice) + `/billing` + `/embed/countdown` + robots + sitemap (**31**) + `/.well-known/mcp.json` 200; `ai-plugin.json` 404; `/openapi.json` 404; `apps.giniloh.com` **503** (day 7, by design). Manifest **v2.2.0 / 11 tools** sha256 `4b3d53ec…` unchanged. **Paid:** checkout **200 `cs_live_a1eajxsJ…`**, portal 307, SpendProof no-doc **400 `sp-document-missing`**, RatchetProof empty 400, **`POST /api/agent/calculate {}` 500** (day 7); Stripe live slot `livemode:true`, **$0.00**; container `GEMINI`/`LLAMAPARSE`/`STRIPE_AGENT_METER_PRICE_ID` present; **revenue $0 real**. **Videos:** five oEmbed 200 + posters 200; ratchetproof poster 404. **Doctor 1 issue / 69 jobs** (stale recon delivery record, clears 10-26); Growth Watchdog ok Fri 10-23 17:08. `vertical-sync --check` **0** (30). **Queue: 13 rows — 2 `pending`** (`ratchetproof-live`, new `growth-check-scope`), **1 `approved`** (`canopyproof`, idle), 10 `resolved`. **Infra note (owner):** Traefik ACME renewal for `hermes.aichieve.net` fails daily (10-23/10-24 12:09, "cannot retrieve the ACME challenge"); the current certificate is valid to **2026-12-02**. **The real number: six products, 54 days, one 8-event visitor session, $0 revenue — the block is distribution, not code.**_

_Last updated: 2026-10-23 (**15:30 sweep**, Day-53 — every surface re-measured live). **The factory could not deploy for 20 hours, and the cause was last night's own copy gate — fixed and re-shipped this sweep.** Two Coolify deployments **failed**, 11 minutes apart: row **2544** `failed` 2026-10-22 19:06:57Z on `533e309` (vendor the vibe copy gate) and row **2553** `failed` 19:16:56Z on `5a96e75` (lexicon 1.1.0). Last good build is **2523** `finished` 16:37:01Z on `7d60f7e`; the live container `af8yqbwrrnyyfgs9wcg0intj-20261022T163701` carries `SOURCE_COMMIT=7d60f7e…` and has been up 23 h, so **the FacturGate badge-copy fix in `533e309` never went live**. Cause (deployment log + reproduced locally): `prebuild` → `copy:check` → `vibe-lint.mjs` scans `content/launch_videos`, which is **gitignored runtime output** and therefore absent from a git clone → `ENOENT … scandir '/app/content/launch_videos'` → `exit code: 1` → build fails. `git clone . /tmp/cleanclone` + `npm run copy:check` reproduces it, so it was not a platform flake and would have blocked **every** future product push. **Fix (autonomous, minimal):** `package.json` `copy:check` scans `src` first, then `content/launch_videos` **only if present**, printing an explicit "not present (gitignored runtime output)" line when it is not; the vendored `scripts/vibe/*` hashes are untouched (`verify-vendor` ok) and the gate still bites — a banned-word sentence injected into `src/products/registry.ts` in the clean clone returns `verdict: FAIL`, exit 1. Local both-root run: `verdict: PASS`, exit 0. **Traffic `events` 11,787 rows / 7,098 sessions — ZERO new rows in 24 h, zero today**; last row still `facturgate page_view` 2026-10-21T16:58:53Z session `01d35679…` (owner's browser); `agent_query` **8**; **no provable outside visitor — day 53**. **No product commit in 24 h**; registry **six products** (5 `live` + `ratchetproof` `beta` + `quarterline` `killed`). **RatchetProof day 4 in `beta`:** `/ratchetproof` 200, sitemap 31 locs, manifest $1.50/call, `/launch-videos/ratchetproof.jpg` **404**, `detect.mjs` pending [] / ledgerRows 5. **CanopyProof idle day 5** past approval (`01d02c3` only; no route, not registered). **Publishing carried another day:** articles **164 → 175** (+11 in 24 h, **5 today**) — editorial HEAD `6326f9b` == origin, pressflow `…20261023T125608` image `6326f9b9f4d1…`, `/app/published` **175 == 175**, **Verify Gate ok 14:02**, WordPress Draft Sweep ok 14:15 (2nd green day after the `HAND_ERA_ALLOWLIST` exemption), three fronts 200, aichieve robots+sitemap 200. **Surfaces:** `/` 307, `/showcase` + six products + `/quarterline` (200 notice) + `/billing` + `/embed/countdown` + robots + sitemap (31) + `/.well-known/mcp.json` 200; `ai-plugin.json` 404; `/openapi.json` 404; `apps.giniloh.com` **503** (day 6, by design). Manifest **v2.2.0 / 11 tools** sha256 `4b3d53ec…` unchanged. **Paid:** checkout **200 `cs_live_a1VmZ5g2…`**, portal 307, SpendProof no-doc **400 `sp-document-missing`**, RatchetProof empty **400 `rp-intervals-empty`**, **`POST /api/agent/calculate {}` 500** (day 6, small real defect). **Revenue $0 real** (4 `cs_test_` 09-02; 1 never-live subscription). **Videos:** five oEmbed 200 + posters 200; ratchetproof poster 404. **Doctor 1 issue / 69 jobs** (recon stale delivery record, clears 10-26). Build Watchdog ok 10-22 16:37 (next today 16:30), Growth Watchdog next today 17:00 (quarterline scope, P2). `vertical-sync --check` **0** (30). **Queue: 1 pending** (`ratchetproof-live`), 1 `approved` (`canopyproof`, idle), 10 `resolved` (new `copy-gate-deploy`). P2 open: growth-check default `quarterline`; migration `0004`; stale `PAUSED_2026-10-15.md`. **The real number: six products, 53 days, zero outside visitor, $0 revenue — the block is distribution, not code.**_

_Last updated: 2026-10-22 (**15:30 sweep**, Day-52 — every surface re-measured live). **A second empty day for the products, while the publishing desk had its heaviest 48 hours.** No factory commit since `813487c` (10-21 16:37, Build Watchdog eval note): no `src/` change, no build, no dispatch. Local HEAD == `origin/main` == **`813487c`**; app container `af8yqbwrrnyyfgs9wcg0intj-20261021T163724` image `813487cd8555…` == HEAD (up 23 h), `/showcase` **200**. **Yesterday's build alarm is closed by measurement:** `application_deployment_queues` rows **2430** (15:43:24Z), **2431** (15:56:49Z), **2432** (16:02:13Z) all `finished` and the running image is the 16:37 build of `813487c` — the chain fires; the finding was a queue-write race, recorded as a false alarm in `skills/self_improvement_eval.md`, and the `deploy-hook` row stays closed. **Traffic `events` 11786 → 11787 rows / 7099 sessions, ZERO rows today**; the one new row = `facturgate page_view` 2026-10-21T16:58:53Z session `01d35679…` `traffic_class: visitor` = the owner's recurring browser (10-16/17/19); `agent_query` **8** (last 10-03); **no provable outside visitor — day 52**. **Publishing carried the week:** articles **151 → 164** (+13 in 24 h, **7 today**: `your-61-point-growth-was-a-refill`, `your-350000-passport-isnt-europe`, `your-remodel-loses-to-149-growth`, `suez-returns-91-surcharge-doesnt`, `one-request-five-actions`, `your-agent-team-loses-28-points`, `duet-bills-your-five-hour-window`, 12 yesterday); editorial HEAD `75ed34c` == origin, pressflow `nstjdswcf5p9xckwja89o6z0-20261022T132112` image `75ed34c9b955…`, `/app/published` **164 == 164** host, **Verify Gate ok 14:01**, three fronts 200, aichieve robots+sitemap 200; spot-checked today's articles on their owning fronts (**200**) with cross-site paths **301**, no 404. **The six-day red CMS check is green — because the desk exempted the posts, not because they were tagged:** `bf5c343` (10-22 11:05) added `HAND_ERA_ALLOWLIST` `#9 #14 #50 #55` to `scripts/check_cms_defects.py`; the script exits **0** with no output, WordPress Draft Sweep ran **ok** 14:16 (first green in six days), and the `cms-legacy-posts` row is closed in both copies with the reversal spelled out (`@Simon retag the 4 legacy posts`). **Doctor 1 issue / 69 jobs** = the stale `channel_not_found` delivery record on Weekly Market Recon (target now `slack:D0BTH9JHRMH`; clears 2026-10-26 14:30). **Surfaces:** `/` 307, `/showcase` + six products + `/quarterline` (200 retirement notice) + `/billing` + robots + sitemap (**31** locs) + `/.well-known/mcp.json` 200; `/.well-known/ai-plugin.json` 404; `/openapi.json` 404; `apps.giniloh.com` **503** every path (day 5, by design); three reader fronts 200. Manifest **v2.2.0 / 11 tools**, sha256 `4b3d53ec…`, endpoint live host — unchanged. **Paid:** checkout **200 `cs_live_a16DKCw1…`** (cpa_monthly+caseproof); SpendProof no-doc **400 `sp-document-missing`**; **`POST /api/agent/calculate {}` still 500** (400-class message on a 500 status, day 5, no product commit has carried a fix). **Revenue $0 real** (4 `cs_test_` 09-02; 1 `livemode:false` subscription). **Approved work is not moving:** CanopyProof has one commit (`01d02c3`, 2026-10-18, S1 engine + tests), no route, not registered — 4 days after approval. **RatchetProof still `beta`** (day 3): `detect.mjs --json` → `{"pending": [], "ledgerRows": 5}`, `/launch-videos/ratchetproof.jpg` **404** — the selector reads `status === "live"`. **Queue: 1 pending row** (`ratchetproof-live`); `cms-legacy-posts` closed today; `canopyproof` approved. Build Watchdog ok 10-21 16:38 (next 10-22 16:30); Growth Watchdog next 10-23 17:00 (still scoped to retired `quarterline`, P2). `vertical-sync --check` **0** (30). Worktree dirty = another desk's in-flight (`package.json`, a FacturGate calc copy tweak, untracked `scripts/vibe/` + 11 probes), not swept. P2 open: growth-check default `PRODUCT=quarterline`; migration `0004`; stale `PAUSED_2026-10-15.md`. **The real number: six products, 52 days, zero outside visitor, $0 revenue — the block is distribution, not code.**_

_Last updated: 2026-10-21 (**15:30 sweep**, Day-51 — every surface re-measured live). **An entirely empty day for the factory: no product commit and, for the first time, no traffic at all.** Local HEAD == `origin/main` == **`10c4d1c`** (the Build Watchdog's own eval note; yesterday's sweep commit is the only other change in 24 h); app container `af8yqbwrrnyyfgs9wcg0intj-20261020T164508` image `10c4d1c548f8…` == HEAD (up 23 h), `/showcase` **200**. **Traffic `events` 11786 / sessions 7099 — ZERO new rows in 24 h** (`created_at >= 2026-10-21` → 0; last 24 h → 0); last row still `ratchetproof audit_run` 2026-10-20T02:47:42Z session `a3370f6d…` classed `visitor` (owner's browser); `agent_query` **8** (last 10-03, organic 0); **no provable outside visitor — day 51**. **RatchetProof unchanged and still video-less:** `/ratchetproof` 200, on `/showcase`, `/sitemap.xml` **31** locs incl. it, manifest **v2.2.0 / 11 tools** (`audit_demand_billing` $1.50, endpoint live host, sha256 `4b3d53ec…` byte-identical to source), `detect.mjs --json` → `{"pending": [], "ledgerRows": 5}`, `/launch-videos/ratchetproof.jpg` **404** — the selector still reads `status === "live"` and the registry still says `beta`; the beta→live call is the owner's. **Surfaces green, and item 11 CLOSED:** `/` 307, `/showcase` + six products + `/quarterline` (200 = "QuarterLine — Retired" notice) + `/billing` + `/embed/countdown` + robots + sitemap + mcp.json **200**; `/.well-known/ai-plugin.json` **404** and `/openapi.json` **404** (the legacy descriptor route is deleted; MCP manifest is the single descriptor); `apps.giniloh.com` **503** every path (day 4, by design), `factory.aichieve.net` 503, three reader fronts 200. **Paid:** checkout **200 `cs_live_a109yw4B…`** (cpa_monthly+caseproof), no-`app` **400** naming the six-product inventory, `quarterline` **400 "Unknown plan"**, portal **307**, SpendProof no-doc **400 `sp-document-missing`**, RatchetProof empty **400 `rp-intervals-empty`**; **`POST /api/agent/calculate {}` still 500** (400-class message on a 500 status, day 4). **Revenue $0 real** (4 `cs_test_` 09-02; 1 `livemode:false` subscription). **Editorial had its heaviest day of the week: articles 139 → 151** (+12; 6 today, 6 yesterday; today `agent-fleet-two-meters`, `isolation-isnt-detection`, `your-49-discount-isnt-all-roof`, `your-68k-tokens-cost-every-step`, `your-platform-23-features-no-stop-rule`, `your-seller-wont-stay`); HEAD `6c7e340` == origin, pressflow `…20261021T132653` image `6c7e34082b4d…` `/app/published` **151 == 151**, **Verify Gate ok 14:02**, aichieve robots+sitemap 200. **Doctor 2 issues / 69 jobs** (was 3): stale `channel_not_found` record on Weekly Market Recon (Deliver now `slack:D0BTH9JHRMH`; clears 10-26 14:30) + **WordPress Draft Sweep red 6th day but the defect count fell 9 → 4** (`wellroost.com #55 #50 #14 #9` still no `vertical` term — five were tagged; 6 rolling sitemap gaps `giniloh.com #1087 #1084 #1081 #1078 #1074 #1072`; `vertical_sites` 30/30, **181** articles indexed). **Queue: 2 pending rows** — `ratchetproof-live` and `cms-legacy-posts` (the row was stale at "9"; corrected to **4** in both copies this sweep). Build Watchdog last ok 10-20 16:46 (next 16:30 today); Growth Watchdog last ok 10-16 17:06 (next 10-23); `vertical-sync --check` **0** (30). Worktree dirty = another desk's in-flight work (`package.json` +`copy:check`/`prebuild`, a FacturGate calc copy tweak, untracked `scripts/vibe/` + 11 probes), not swept. P2 open: growth-check default `PRODUCT=quarterline`; migration `0004`; stale `PAUSED_2026-10-15.md`. **The real number: six products, 51 days, zero outside visitor, $0 revenue — distribution is the block, not code.**_

_Last updated: 2026-10-20 (**15:30 sweep**, Day-50 — every surface re-measured live). **The sixth product shipped overnight: RatchetProof is live in beta — and it is the first product the launch-video pipeline cannot see.** Local HEAD == `origin/main` == **`83131d1`**; app container `af8yqbwrrnyyfgs9wcg0intj-20261019T224803` image `83131d19…` == HEAD (up 17 h), `/showcase` **200**, `/ratchetproof` **200**, `apps.giniloh.com` **503** (unchanged), legacy `factory.aichieve.net` 503. Ship commits `7156742` (approval recorded) → `0311b92` (dispatch) → `68db31a` (product + tests) → `1a2c2c1` (gate prompt/SOP) → `83131d1` (queue closed); `scripts/verify-build.sh` printed "Verification passed." (416 vitest, 52 pages, 110 Playwright, 30/30 tiles). Re-measured today, not restated: `/sitemap.xml` **31** locs incl. `/ratchetproof`; `/.well-known/mcp.json` **v2.2.0 / 11 tools**, sha256 `4b3d53ec…`, `audit_demand_billing` $1.50, endpoint on the live host; `POST /api/ratchetproof/audit` empty → **400 `rp-intervals-empty`**; registry **6** products (5 `live` + ratchetproof **`beta`**, launched 2026-10-19 + quarterline `killed`). **NEW GAP:** `src/lib/launch-video/plan.ts` selects `status === "live"` only, so `detect.mjs --json` → `{"pending": [], "ledgerRows": 5}`, the Post-Ship Brag monitor stays byte-stable and suppresses every run, `/launch-videos/ratchetproof.jpg` **404** — a public product with no launch video until the beta→live call or the selector changes. **Videos:** `23538e6` deleted the four superseded uploads (204 each, ledger repointed); the five rendered ids re-read today by oEmbed, all **200** with real titles (qeow4cdaiv8 / JcP9RtWZZrg / I7NOZAQ-5Ig / I38c05ZZZr8 / MiNmsr1i9Lo), posters 200. **Queue:** `context/approval_queue.json` has **no pending row** (8 rows: 7 resolved, canopyproof approved/in progress). **Doctor 3 issues / 69 jobs:** the two stale `channel_not_found` delivery records (both jobs now Deliver `slack:D0BTH9JHRMH`; recon clears 10-26) + **WordPress Draft Sweep red a 5th day** (same 9 wellroost posts no vertical term `#90 #86 #73 #75 #68 #55 #50 #14 #9`; sitemap gaps now `#1056 #1053 #1050 #1047 #1044 #1041`; `vertical_sites` 30/30, 169 articles indexed). **Traffic `events` 10832 → 11786 / sessions 6552 → 7099** (+954/+547; 2,336 on 10-19, 5 today); today's 5 rows = one returning session `a3370f6d…` 02:43–02:47 (ledgerlink ×2, ratchetproof ×2, factory ×1, classed visitor = owner's browser); ratchetproof's own 125 rows are 123 internal + 2 owner; `agent_query` **8**; **no provable outside visitor, day 50**. **Articles 127 → 139**, editorial HEAD `5389200` == origin, pressflow `…20261020T131841` 139 == 139, Verify Gate **ok** 14:02, three fronts 200, aichieve robots+sitemap 200. **Revenue $0 real** (4 `cs_test_` 09-02, 1 `livemode:false` cpa_monthly); checkout `cs_live_a16kiVFf…`, quarterline 400 unknown plan, portal GET 307 (POST empty → 500), spendproof no-doc 400. Build Watchdog last ok 10-19 16:40, next 16:30 today. Worktree dirty = in-flight desk work (`package.json` +copy:check/prebuild, a FacturGate copy tweak, untracked `scripts/vibe/` + 11 probe scripts), not swept. P2 open: growth-check default `PRODUCT=quarterline`; migration `0004`; stale `PAUSED_2026-10-15.md`._
_Last updated: 2026-10-19 (**15:30 sweep**, Day-49 — every surface re-measured live at `apps.aichieve.net`). **The busiest working day in a week: five owner-queued fixes shipped and each was measured live** — QuarterLine leftovers retired (`aa9a16b`/`fa0c103`; `/.well-known/ai-plugin.json` deleted → **404**, MCP manifest the one descriptor, `agent-descriptors.test.ts` guard), the header gap actually fixed (`1ed437d`; the editable bar overran the title by **−34.0 px at 375 px**; both bars now `gap-x-3`/`flex-wrap`, geometry spec measures boxes at 1280 + 375 px on four products, proven to bite), the internal-traffic marker shipped (`18ff5f1`, deploy `6d4e5e6`; `src/lib/traffic-class.ts`, `x-factory-internal` header + cookie + automated UA, server overwrites any payload claim, `growth-check.mjs` reports visitor/internal/unclassified and gates on visitors), one career-capital copy (`5ab08c6`; factory duplicate + both cross-repo generators deleted after a **1,002-case, 0-divergent** comparison, `giniloh npm run check:calculators` pins the constants), aichieve robots+sitemap (`bd64fd2`; both **200**, sitemap index → 110 URLs, re-probed today), app host drift closed (`9b043e7`/`d844787`; canonical `apps.aichieve.net/showcase`, sitemap **30/30** live host, manifest endpoint live host, only 2 files keep the dead host as redirect guards), machine-readable `context/approval_queue.json` (`0525852`), and **CanopyProof S1** (`01d02c3`, EUDR geolocation audit core + known-answer tests; S2–S5 unbuilt, not registered). **NEW finding — the owner stopped receiving reports this afternoon:** Weekly Market Recon ran `ok` 14:30 and then `delivery_failed` (`chat.postMessage … channel_not_found` on `slack:user:U0BUHRBET6U`); cause = the live adapter's `U`/`W` DM resolution is skipped for the normalized `user:` target, while `conversations.open` for that user answers **200 `already_open` → `D0BTH9JHRMH`**. Fixed: both owner-facing jobs (`19c6cbf92990`, `7804a08125ce`) now deliver to `slack:D0BTH9JHRMH`; a probe through that target returned `success: true` (id `1792423931.347779`) and was deleted. **Recon ran today:** verticals `energy_interval_data` + `food_service_ops`; **candidate RatchetProof** (power-bill demand-ratchet audit, score **76/100**, LLM/parse-backed **$1.50/call** vs ≈$0.30 modelled, reply `@Simon approve RatchetProof` / `@Simon skip RatchetProof`); **`food_service_ops` retired** at the incumbent filter; `recon:cadence` **0**. **Still red, 4th day:** WordPress Draft Sweep FAILED 2026-10-19 14:16 — 9 `wellroost.com` posts with no `vertical` term (`#90 #86 #73 #75 #68 #55 #50 #14 #9`) + 6 rolling sitemap gaps (`giniloh.com` `#1029 #1026 #1022 #1019 #1012 #1003`); `vertical_sites` **30/30** routed. **Editorial Verify Gate green** (ok 14:02; HEAD `5a9e520` == origin; pressflow `nstjdswcf5p9xckwja89o6z0-20261019T131951` image `5a9e5203…`, up 2 h). **Traffic:** `events` 7803 → **10832** rows / sessions 4779 → **6552** (+3029: 3030 on 10-18, 1387 today) — today's rows are **all 00:xx** (391 `internal` from the marker's own verification, 8 `visitor` from a suite burst before its header shipped, **986 unclassified** pre-deploy, not backfilled) **plus 2 rows at 12:19** (`facturgate`, `factory`, session `01d35679…` — the same browser that visited 10-16/10-17, most likely the owner). **No provable outside visitor — day 49**; `agent_query` **8** (last 10-03). Per product `caseproof` 2726 / `parcelproof` 2687 / `facturgate` 1936 / `factory` 1493 / `spendproof` 857 / `ledgerlink` 633 / `billing` 272 / `quarterline` 228. **Articles 121 → 127**; fronts all **200**; `aichieve.net/robots.txt` + `/sitemap.xml` **200** (closed). Videos: duplicates removed after this sweep *(re-read live)*: pages render `qeow4cdaiv8` / `JcP9RtWZZrg` / `I7NOZAQ-5Ig` / `I38c05ZZZr8` / `MiNmsr1i9Lo`, all public and each page 200 with its own id; the four superseded first cuts (`LdSoKLTfYjs` / `V-eli97M0q0` / `4cNR2bt3mMg` / `uodX_D-Gqsw`) **deleted** (HTTP 204 each, 0 resolve on re-read), and the ledger repointed to the surviving ids (5/5 live, 0 mismatches). Paid surface: checkout **200 `cs_live_`** ×5, no-`app` **400**, `quarterline` **400** retired, portal **307**, SpendProof no-doc **400** `sp-document-missing`; Stripe `STRIPE_SECRET_KEY_LIVE` `/v1/balance` **200 `livemode:true` $0.00**. Revenue **$0 real** (4 `cs_test_` 09-02). Registry 5 `live` + 1 `killed`. `vertical-sync --check` **0** (30 verticals, vendored). Cron **2 issues / 69 jobs** (recon delivery — fixed, record clears 10-26; WordPress sweep). **P2 open, not fixed:** `scripts/growth-check.mjs:54` still scopes the Growth Watchdog to the retired `quarterline`. Deploy verified: container `af8yqbwrrnyyfgs9wcg0intj-20261019T143357` image `3766b1154bc1…` == HEAD (`3766b11`). **Asks: `@Simon approve RatchetProof` / `@Simon skip RatchetProof`; the `0004_events_traffic_class.sql` migration in Supabase (non-blocking). (The duplicate launch videos were deleted at 22:0x UTC — queue row `duplicate-videos` closed.)**
_Last updated: 2026-10-19 (**The career-capital calculators have ONE copy each — the live one on giniloh.com**, measured 01:05Z). Owner instruction, verbatim: *"keep one career capital copy"* — the queue row `career-capital-home`, open since 10-18. **Which copy survived, and why:** `/root/giniloh/src/lib/calculators/{w2Vs1099,rsuHoldVsSell}.ts` — the engines the two public calculators import and the only copy that is committed, deployed and reachable; the duplicate was `src/lib/calc/` here, which was uncommitted, imported by nothing but its own vitest, in no product registry, and a *personal* tool that the 10-18 host rule keeps off the enterprise app. **Deleted:** both engine files, both test files, and `scripts/sync-w2-calculator.mjs` + `scripts/deploy-portfolio-capital.mjs` — the two generators that copied code into `/root/giniloh`, i.e. the drift mechanism itself; leaving them would have rebuilt the duplicate next run. **Safety before deletion:** a harness deep-compared both implementations on the spec vector plus 500 deterministic-random inputs apiece — **1,002 cases, 0 divergent** — so the deletion removed code, not behaviour. **The known-answer coverage moved with the survivor:** `giniloh npm run check:calculators` (`scripts/check-calculators.mjs`, no new dependency) pins 2026 statutory constants and ~50 computed answers across the three tax paths, both RSU strategies and both breakevens; mutating `SS_WAGE_BASE` makes it fail with 7 named mismatches (exit 1), restored it passes. **Verified:** a filesystem-wide search for either filename returns exactly the two giniloh files; no factory source imports them; the live pages were not touched. Queue row set `resolved` in both `context/approval_queue.json` and the PressFlow fallback `editorial-factory/context/approvals.json`.

_Last updated: 2026-10-19 (**QuarterLine leftovers RETIRED and verified live**, commits `aa9a16b` (code) + `fa0c103` (record), measured 00:52Z). Owner instruction, verbatim: *"@Simon retire quarterline pages"* — the queue row `quarterline-leftovers`, the only open item whose reply sentence is that one. **What was wrong:** the product has been `killed` since September and its pages, presets, checkout and agent tools were all withdrawn, but the legacy plugin descriptor `/.well-known/ai-plugin.json` still answered **200 advertising QuarterLine** to agents and crawlers, and its declared `api.url` (`/openapi.json`) has never existed — so anything that followed our own descriptor was sent to a product we do not sell and a spec that answers 404. **Fixed:** the descriptor route is **deleted**, not rewritten — the v1 plugin format carries ONE `api.url` for ONE product, so a "corrected" copy for a six-product inventory would still be a false claim; `/.well-known/mcp.json` (v2.1.0, 10 tools, generated from `activeProducts` + the pricing catalog) is now the single agent descriptor. `/openapi.json` stays 404 and nothing advertises it any more (the `/showcase` HTML has zero `openapi` references). **Guarded:** `src/lib/agent-descriptors.test.ts` parses every file under `src/app/.well-known` + `public/.well-known`, visits string literals / template spans / JSX text only (a comment may keep the history), and fails naming `file:line` when a `killed` entry's slug, name or tool appears, or when the legacy path is re-mounted; needles come from `retiredProducts`, so the next retirement is covered by the status flip. **Proven to bite** on the committed file: re-injecting the descriptor turns 2 tests red with `src/app/.well-known/ai-plugin.json/route.ts:2 advertises retired 'quarterline'`, restored green. **Verified live, not from the tree:** `/.well-known/ai-plugin.json` **404** (was 200 naming QuarterLine), `/.well-known/mcp.json` **200** with `quarterline`/`openapi` absent from the payload, `/openapi.json` 404, `/quarterline` 200 (the derived retirement notice, deliberately kept), app image `af8yqbwrrnyyfgs9wcg0intj:fa0c103ad6f4…` == HEAD. **Gate** (run in an isolated worktree, because a second session was mid-edit in the shared one): tsc clean · eslint 0 errors (3 warnings, pre-existing) · tokens ok · `verticals:check` ok (30) · `recon:cadence` ok · vitest **386/386** · `next build` ok · Playwright **88/88** · visual-qa **24/24**. **One gate note, not a page defect:** `caseproof-qa-5` returned "connector lines overlap text in schematic diagram nodes" once on a change that touches no UI; the immediate re-run was 24/24 and `schematic-collision.spec.ts` was green on `/caseproof` in the same run, so the reviewer prompt now quotes that exact phrase too (a class excluded only by its earlier wording re-enters under a new one). **Still open, named not hidden:** `scripts/growth-check.mjs` still defaults its product scope to the literal `"quarterline"`, so the weekly Growth Watchdog (runbook runs it with no argument) measures a retired product's funnel and is blind to the five live ones — one-line fix (derive the scope from the inventory, or report every product), owner's call. Everything else QuarterLine-shaped in the tree is trail, not surface: the unsold engine, PDF report, calculator component, pricing row and an unreachable legacy branch in `/api/agent/calculate` (the agent allowlist rejects the retired tool names first), plus the `/showcase` RETIRED card, which is the record of the retirement._

_Last updated: 2026-10-18 (**15:30 sweep**, Day-48 — every surface re-measured live at `apps.aichieve.net`). **An unattended new product line was written at 03:30 today in three repos at once and left half-built: two finished calculators, no commit, no build, nothing live — and it turned two automated checks red.** Local HEAD == `origin/main` == **`65f3e25`** (yesterday's sweep record; no new commits since) — but the worktree now carries **20 uncommitted entries**: `src/lib/calc/w2Vs1099.ts` + `rsuHoldVsSell.ts` (two deterministic engines, 2026 statutory constants) with their tests (**11/11 pass** under `npx vitest run`), 10 untracked `scripts/inspect-*`/`analyze-*` probes, `scripts/deploy-portfolio-capital.mjs` (writes the engine + a React component into `/root/giniloh`), and modified `skills/ui_component_standards.md` + `skills/self_improvement_eval.md`. `/root/giniloh` carries 3 modified + 7 untracked (2 calculator components, 2 engines, `calculators/rsu-hold-vs-sell.astro`, `calculators/w2-vs-1099-scorp-calculator.astro`, `pages/career-capital/`, `pages/portfolio-capital/`); `/root/editorial-factory/context/verticals.json` gains an uncommitted **27th vertical** `concentrated_equity_portfolio_capital` (`cadence 0 9 * * 2`, no `vertical_sites` destination row). The new reader pages answer **404** (nothing deployed). **Guard red:** `node scripts/vertical-sync.mjs --check` exit **1** — "vendored snapshot is behind the live editorial registry (**27** live vs **26** vendored)" — left un-vendored until the owner rules on the line. **Cron doctor 2 issues / 61 jobs**: **Editorial Verify Gate FAILED 2026-10-18 14:01** (`scripts/verify.sh` exit 1; **cron drift** — registry 27 verticals / 52 jobs, `MISSING Full Pipeline: concentrated_equity_portfolio_capital (0 9 * * 2)`, `PEAK … 0 9 * * 2` in the DeepSeek 2× window so `sync_crons.py` **refuses to apply**; contract tests FAILED, failures=5) and **WordPress Draft Sweep FAILED 2026-10-18 14:17** (third red day: same 9 un-tagged `wellroost.com` posts `#90 #86 #73 #75 #68 #55 #50 #14 #9`, 6 rolling sitemap gaps now `#1012 #1003 #997 #991 #970 #966`, plus `FAIL: vertical 'concentrated_equity_portfolio_capital' has no destination row in vertical_sites`). **Build gate red too:** Build Watchdog ran 10-17 16:41 (`ok`) and `scripts/verify-build.sh` exited 1 on the **`visual-qa`** tile `spendproof-qa-1` only — a real but cosmetic **0.0 px** gap between a truncated IDE chrome title and the zero-egress badge (measured `scrollWidth` 140/112 vs `clientWidth` 95 at 1280×900; glyphs do not overlap); fix queued (`gap-3` in `src/components/editorial/ide-inset.tsx` + `ledgerlink-calculator.tsx:844`), not applied — shared primitive, owner go/no-go. **Host unchanged, day 3:** `apps.aichieve.net` green on every probed path (`/showcase`, `/ledgerlink`, `/spendproof`, `/billing`, robots, sitemap, mcp.json 200; `/` 307; `/openapi.json` 404), `apps.giniloh.com` **503** everywhere, `factory.aichieve.net` 503; the app still names the dead host in its `/showcase` canonical, its **30**-loc `sitemap.xml` (30 old-host) and the manifest `endpoint` `https://apps.giniloh.com/api/agent/calculate` — **24 references in 15 files**. **Traffic:** `events` 7676 → **7803** rows / sessions 4700 → **4779**; **126 of the 127 new rows are one Build-Watchdog Playwright cluster at 10-17 16:30–16:45 (79 session ids)** (the documented real-telemetry class), so yesterday's "two browsers" is explained; **one row outside every test window** — `ledgerlink` `page_view` 2026-10-18T13:43:27Z, session `a3370f6d…`, no user agent — most likely the owner; **no provable outside visitor, day 48**; `agent_query` still 8 (last 10-03). **Editorial:** HEAD `d2afa9a` == origin, pressflow `nstjdswcf5p9xckwja89o6z0-20261017T181546` `/app/published` **121 == 121**, Supabase `articles` **119 → 121**, fronts all 200 (`aichieve.net` 101 article paths), `aichieve.net/robots.txt` + `/sitemap.xml` **404 day 4**. **Videos** unchanged: 5 rendered ids oEmbed 200 + 4 first-cut copies still public. Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical; checkout `cs_live_` ×5 + SpendProof no-doc 400 `sp-document-missing`; `POST /api/agent/calculate {}` still answers **500** with a 400-class message (day 3); Stripe `STRIPE_SECRET_KEY_LIVE` `/v1/balance` **200 `livemode:true` $0.00**. **Item 7 CLOSED**: gateway now pid **842**, started **2026-10-17 19:55:34** (the 2026-09-12 process is gone). Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02). Registry 5 `live` + 1 `killed`, unchanged._

_Last updated: 2026-10-17 (**15:30 sweep**, Day-47 — every surface re-measured live at `apps.aichieve.net`). **The reading sites finished moving to the new app address; the app itself still advertises the old one, and the build line has been empty six days.** Local HEAD == `origin/main` == **`6c247e9`** (yesterday's sweep correction) — **no product commit, no `src/` change, no build, no dispatch in 24 h**; worktree carries one modified skill doc (`skills/self_improvement_eval.md`) and the video desk's untracked `.scratch/`. App container `af8yqbwrrnyyfgs9wcg0intj-20261016T154023` image `6c247e95…` == HEAD (up 24 h), `COOLIFY_FQDN` len 18, traefik rules `Host(\`apps.aichieve.net\`)` only. **NEW, measured:** every link from `aichieve.net/apps/` ×11, `aichieve.net/` ×5, `giniloh.com/` ×1 and `giniloh.com/calculators/` ×1 now points at **`apps.aichieve.net`** (yesterday all 18 named the dead host) — but inside the app `/showcase`'s canonical is still `https://apps.giniloh.com/showcase`, its `sitemap.xml` lists **30** URLs all on the old host, and the WebMCP manifest `endpoint` is still `https://apps.giniloh.com/api/agent/calculate`; **24 references to the dead host remain across 15 files in `src/` + `public/`**, so an agent following our own descriptor is sent to a **503**. All surfaces **200** at the new host (`/` 307 → giniloh.com 200; `/showcase` + 5 products + `/quarterline` + `/billing` + `/embed/countdown` + robots + sitemap + mcp.json + ai-plugin.json; `/openapi.json` 404; legacy `factory.aichieve.net` 503; **`apps.giniloh.com` 503 on every path**). **NEW, traffic:** `events` 7669 → **7676** rows / sessions 4698 → **4700** — seven `page_view` rows from **two** sessions, the first activity in three days: `01d35679…` hit `spendproof` 10-16 20:55, then four products in 68 s on 10-17 (01:20–01:22), then returned for `facturgate` at 13:24; `715be7be…` hit `spendproof` 10-16 21:02. No user agent is stored and no row falls in a build window, so this is **not** a CI cluster, but it is **not provable outside traffic** either (most likely the owner). **No provable outside visitor — day 47**; `agent_query` still **8** (last 2026-10-03). Per product `parcelproof` 2032 / `caseproof` 1988 / `facturgate` 1445 / `factory` 982 / `ledgerlink` 537 / `spendproof` 265 / `quarterline` 228 / `billing` 199. **RED, second day:** `hermes cron doctor` **1 issue / 1 job** — **WordPress Draft Sweep FAILED 2026-10-17 14:21** (`Script exited with code 1`; first red 10-16): `CMS defect check: 9 problem(s)` = the same 9 published `wellroost.com` posts with **NO `vertical` term** (`#90 #86 #73 #75 #68 #55 #50 #14 #9`, CMS dates 2026-09-07 → 10-05) + `6 post(s) published in a CMS but absent from its site's sitemap` — a **rolling window**: now `#1003` / `#997` / `#991` / `#970` / `#966` / `#962` (`#988`, `#961` dropped off). Hand-probed: `#1003`, `#997`, `#991` are **200 on all three fronts** with redirects followed, so these are sitemap-listing gaps, not missing pages; the check lives in the **other** repo (`/root/editorial-factory`, `scripts/check_cms_defects.py`) — desk's call, nothing pushed from here. Editorial (separate repo): HEAD **`957efaa` == origin**, worktree dirty only in illustration briefs; pressflow container `nstjdswcf5p9xckwja89o6z0-20261017T065814` image `957efaa4…` == HEAD, `/app/published` **119 == 119**, Supabase `articles` **114 → 119** (+5; **2** published today, **6** yesterday). Fronts all **200**: `aichieve.net` (**100** article paths, was 96), `giniloh.com` (sitemap 1070 locs), `wellroost.com` (sitemap 38). **`aichieve.net/robots.txt` + `/sitemap.xml` still 404 — third day.** Launch videos unchanged: the five ids the pages render are public on **GiniLoh** (`qeow4cdaiv8` / `JcP9RtWZZrg` / `I7NOZAQ-5Ig` / `I38c05ZZZr8` / `MiNmsr1i9Lo`), posters all 200, ledger 5 rows `uploaded` but holding the desk's first cuts (four extra copies still public); `82vT3OkoYsU` stays 404. Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` **byte-identical**. Paid surface at the new host: checkout **200 `cs_live_`** ×5 (`cpa_monthly` + app), `agent_metered` 200 `cs_live_`, `cpa_monthly` / `pdf_audit_export` no-`app` **400**, `quarterline` **400**, portal **307**, SpendProof no-doc **400 `sp-document-missing`**. Stripe: the deploy now carries a **mode-paired key set** — `STRIPE_SECRET_KEY_LIVE` (`sk_live_`, 107 ch) beside the legacy slot (`sk_test_`, 107 ch), `STRIPE_MODE=live`; the resolver uses the live slot, `/v1/balance` **200 `livemode:true`**, available **$0.00** (probing the legacy slot alone reads `livemode:false` — a probe artefact, not a lost key). Container `GEMINI_API_KEY` 39 + `LLAMAPARSE_API_KEY` 52 + `STRIPE_AGENT_METER_PRICE_ID` 30 ch, `SPENDPROOF_*` unset. Cron **61 active**, all other last runs `ok` (Editorial Verify Gate 10-17 14:06, Post-Ship Brag 10-17 15:30, Build Watchdog 10-16 16:37 next today 16:30, Growth Watchdog 10-16 17:06 next 10-23, Slack Report Gate 10-16 18:00 next today 18:00, Weekly Recon 10-12 14:35 next 10-19, Launch Video Auth Check first 10-19). `vertical-sync --check` exit 0 (26); `recon:cadence` exit 0 (newest 2026-10-12). Registry 5 `live` + 1 `killed`, unchanged. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription). **Awaiting `@Simon approve CanopyProof` — day 6** (approved backlog otherwise empty). Item 7: gateway still the 2026-09-12 process (`1963330`). Item 11 descriptor half open.

_Last updated: 2026-10-16 (**15:30 sweep**, Day-46 — every surface re-measured live). **The factory changed nothing in 24 h; the build line has been empty five days. The one new red is the publishing desk's own CMS check.** Local HEAD == `origin/main` == **`f842104`** (the 10-15 sweep record — the only commit); no product commit, no `src/` change, no build, no dispatch; app container `af8yqbwrrnyyfgs9wcg0intj-20261015T153543` image `f84210445830…` == HEAD (up 24 h), `/showcase` **200** — **then the address moved with this run's own docs deploy**: the new container `af8yqbwrrnyyfgs9wcg0intj-20261016T153427` (image `fffc1a462dbf…` == HEAD, 15:34:27) carries `COOLIFY_FQDN=apps.aichieve.net/` and a single traefik rule `Host(\`apps.aichieve.net\`)`, so **`apps.aichieve.net` is now the app's public host (all surfaces 200, manifest byte-identical) and `apps.giniloh.com` returns 503 on every path** (it was 200 at 15:31Z). **Four pointers still name the dead host**: the `/showcase` canonical (`https://apps.giniloh.com/showcase`), the app's 30-URL `sitemap.xml`, the WebMCP manifest `endpoint` (`https://apps.giniloh.com/api/agent/calculate`), and the reader fronts' links (`aichieve.net/apps/` ×11, `aichieve.net/` ×5, `giniloh.com/` ×1, `giniloh.com/calculators/` ×1; `wellroost.com` none). Paid surface re-probed at the **new** host: checkout 200 `cs_live_a1y6UuO4…`, `quarterline` 400 retired, portal 307, agent endpoint 400 on a missing field (it works), SpendProof no-doc 400 `sp-document-missing`. Nothing in `src/` changed — infra config; **the keep-or-revert decision is the owner's.** **NEW RED:** `hermes cron doctor` **1 issue / 1 job** — **WordPress Draft Sweep FAILED 2026-10-16 14:17** (`Script exited with code 1`; first red, `ok` 10-08 → 10-15): `CMS defect check: 9 problem(s)` = published posts with **NO `vertical` term** on `wellroost.com` (`#90/#86/#73/#75/#68/#55/#50/#14/#9`, CMS dates 2026-09-07 → 10-05) + `6 post(s) published in a CMS but absent from its site's sitemap (frontend not rebuilt)`. The check lives in the **other** repo (`/root/editorial-factory`, `scripts/check_cms_defects.py`, added 2026-09-30, wired into `scripts/cron-wp-drafts.sh`) and was tightened for the split by the owner's own commit **`169a917`** at 00:56 today. Hand-probed: **4 of the 6** are `giniloh.com/<slug>/` **301 → `aichieve.net/<slug>/` 200** (fine, the split re-routes them) and **2** (`#991 nyc-buys-night-deliveries-8-diesel-bills-you`, `#988 your-ipo-payday-tax-bill`) are served from **`wellroost.com` 200** while giniloh/aichieve 404 — desk's call, nothing pushed from here. **The 10-15 cron hold is settled by behaviour:** `hermes cron status` **61 active job(s)**, nothing re-paused, the owner back on the editorial desk from **2026-10-16 00:40** (`.hermes_history`); `~/.hermes/cron/PAUSED_2026-10-15.md` is stale and inert. Editorial (separate repo): HEAD **`54fd753` == `origin/main`** (one routine dirty `context/assets/illustrations/.../featured.json`), pressflow container `nstjdswcf5p9xckwja89o6z0-20261016T115021` image `54fd75336c36…` == HEAD, `/app/published` **114 == 114** on host (no reader lag); Supabase `articles` **105 → 114**. Fronts all **200** and each with its own title: `aichieve.net` (`AIChieve — model the spend before you approve it`; **96** article paths on `/articles/`, was 91; container `p3zkcfkzvmjq6xt3yjnsobwf-20261016T021243` image `21f0a866…`, 02:12), `giniloh.com` (`Gini Loh | Run the numbers before you commit`; container `c6sm5gz59a3jnrjg1ouahfp7-20261016T021225` image `e080b95f…`, 02:12), `wellroost.com` (`WellRoost | The Decision Engine for Your Home`; **rebuilt today 10:41**, container `mln99jwbwspi62huuifloxla-20261016T104113` image `fb0b7616…`). **`aichieve.net/robots.txt` + `/sitemap.xml` still 404** (second day; giniloh + wellroost have both). Launch videos unchanged: the five ids the pages render are public on **GiniLoh** (`qeow4cdaiv8` / `JcP9RtWZZrg` / `I7NOZAQ-5Ig` / `I38c05ZZZr8` / `MiNmsr1i9Lo`), posters all 200, ledger 5 rows `uploaded` but recording the desk's first cuts; `82vT3OkoYsU` stays **404** (deleted); four extra public copies remain (P2, owner). Surfaces all 200 **at the new host `apps.aichieve.net`** (`/` 307 → giniloh.com 200; `/showcase` + 5 products + `/quarterline` + `/billing` + `/embed/countdown` + robots + sitemap + mcp.json + ai-plugin.json; `/openapi.json` 404; legacy 503; **`apps.giniloh.com` 503 on every path**); 20/20 quarterline presets **308** → `/showcase`, legacy `/calc/*` 308. Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` **byte-identical**. Checkout `cs_live_` ×5 + `agent_metered` 200 `cs_live_` + no-`app` 400 + `quarterline` 400 "retired" + portal 307; Stripe `/v1/balance` 200 `livemode:true`, available **$0.00**; container `GEMINI_API_KEY` 39 + `LLAMAPARSE_API_KEY` 52 + `STRIPE_AGENT_METER_PRICE_ID` 30 ch, `SPENDPROOF_*` unset; SpendProof no-doc → 400 `sp-document-missing`. `events` **7669** rows / sessions **4698** — **zero new rows in 24 h** (nothing on 10-15 or 10-16; last row still the `caseproof` view 2026-10-14T19:36:22Z); per product `parcelproof` 2031 / `caseproof` 1987 / `facturgate` 1444 / `factory` 982 / `ledgerlink` 536 / `spendproof` 262 / `quarterline` 228 / `billing` 199; `agent_query` still 8 (organic 0, day 46); **no provable outside visitor — day 46**. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription). `vertical-sync --check` exit 0 (26); `recon:cadence` exit 0. Registry 5 `live` + 1 `killed`, unchanged. **Awaiting `@Simon approve CanopyProof` — day 5** (nothing built, nothing dispatched; approved backlog otherwise empty). Item 7: gateway still the 2026-09-12 process (`1963330`). Item 11 descriptor half open.

_Last updated: 2026-10-15 (**15:30 sweep**, Day-45 — every surface re-measured live). **The domain split is live and today's cron hold has been lifted.** `aichieve.net` **200** (own title, 91 article links, six category hubs, own container `p3zkcfkzvmjq6xt3yjnsobwf-20261015T070638` image `57d01bf7…` up since 07:07); `giniloh.com` **200** (redeployed today, container `c6sm5gz59a3jnrjg1ouahfp7-20261015T132047` image `3433769331…` at 13:22); `wellroost.com` **200**; factory app container `af8yqbwrrnyyfgs9wcg0intj-20261014T165437` image `cad1fbc45fc8…` == `git rev-parse HEAD` (deployed 10-14 16:54, up 23 h). The owner asked for a fleet-wide cron pause at 06:22 (`PAUSED_2026-10-15.md` + `pause_snapshot_2026-10-15.json`, 61 of 62 jobs); the note still claims "No active jobs" while `hermes cron status` reads **61 active** — today's Thursday editorial slots (10:30, 11:00, 11:30, 12:00, 12:30) were **skipped** (`last_run_at` still 2026-10-08) and `Full Pipeline: demand_sensing_advanced_sop` (`0 13 * * 4`) fired **on time 13:00**, finished `ok` 13:38, so the hold ran 06:23 → ~12:30/13:00 and left no all-clear note on this host. **Owner confirmation is the open ask.** Editorial (separate repo) HEAD **`0bea2db` == origin/main**; pressflow container `nstjdswcf5p9xckwja89o6z0-20261015T132146` image `0bea2dbf…` serves **105 == 105** published files; Supabase `articles` **99 → 105**. The split work landed there today (`9805025`/`8bc3bdc` corpus + sitemap from the new fronts, `98954ec`/`8559fe0` CMS cross-site anchor audit + rewrite wired into `verify.sh`, `a495767`/`19b055d` RAW-body read-back + sitemap, `6ea9459` publish of today's article, `0bea2db` meta-description floor + SOP). Today's article (**Why 6.7% Holiday Growth Misses Units**) is **live on `wellroost.com` 200** and correctly 404 on `aichieve.net` / `giniloh.com`. A real editorial defect was found and fixed today: the live CMS excerpt published as **"U.S."** (4 chars) because the derived description split the lead on an initialism; the artifact was re-pushed (165 chars) and the splitter floored, 461/461 tests. **NEW, live, real gap:** `aichieve.net/robots.txt` and `aichieve.net/sitemap.xml` both **404** while `giniloh.com` and `wellroost.com` have both. **Launch videos:** the five ids the pages render are public on **GiniLoh** (`qeow4cdaiv8`, `JcP9RtWZZrg`, `I7NOZAQ-5Ig`, `I38c05ZZZr8`, `MiNmsr1i9Lo`), posters all 200, ledger 5 rows `uploaded`; **`82vT3OkoYsU` — the personal-channel SpendProof copy — is now 404 (deleted)**, but `LdSoKLTfYjs` plus the desk's first cuts `V-eli97M0q0` / `4cNR2bt3mMg` / `uodX_D-Gqsw` are still public beside them. **The vision provider recovered** (`models` 200 in 233 ms; minimal `generateContent` 200 in **8.9 s**, against 502 / 129.9 s on 10-14) — the screenshot-review step that could not produce a verdict yesterday runs again. `hermes cron doctor` **0 issues / 61 jobs** (today: Editorial Verify Gate ok 14:02, WordPress Draft Sweep ok 14:15, Post-Ship Brag ok 15:30:58, Full Pipeline demand_sensing ok 13:38); next Build Watchdog today 16:30, Growth Watchdog 2026-10-16 17:00, Slack Report Gate today 18:00, Weekly Market Recon 2026-10-19 14:30, Launch Video Auth Check first run 2026-10-19 (registered `0 13 * * 1`, expected). **Awaiting `@Simon approve CanopyProof`** — nothing built, nothing in `src/`, nothing dispatched; **no factory product commit in 24 h** (the only commit is `cad1fbc`, docs/skills) and the approved backlog is otherwise empty. Surfaces all 200 (`/` 307 → giniloh.com 200; `/showcase` + 5 products + `/quarterline` + `/billing` + `/embed/countdown` + robots (30 URLs) + sitemap (30 loc) + mcp.json + ai-plugin.json; `/openapi.json` 404; legacy 503); `/ledgerlink/`, `/quarterline/`, `/quarterline/calc/` 308. Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical. Checkout `cs_live_` ×5 (`ledgerlink`, `facturgate`, `parcelproof`, `caseproof`, `spendproof`); product-scoped plan without `app` → 400 naming the inventory; `quarterline` → 400 both as a plan ("Unknown plan") and as an `app` ("retired"); `agent_metered` 200 `cs_live_…`; `/api/portal` 307. Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch, `/v1/balance` 200 `livemode:true` (available $0.00); `GEMINI_API_KEY` (39) + `LLAMAPARSE_API_KEY` (52) + `STRIPE_AGENT_METER_PRICE_ID` (30) in the container; SpendProof with no document → 400 `sp-document-missing`. `events` 7668 → **7669** rows / sessions **4697** (one new row in 24 h: a `caseproof` view at 2026-10-14T19:36:22Z, session `06c490c0…`, unattributable — no user agent is stored; **zero rows today**); per product `parcelproof` 2031 / `caseproof` 1987 / `facturgate` 1444 / `factory` 982 / `ledgerlink` 536 / `spendproof` 262 / `quarterline` 228 / `billing` 199; `agent_query` still 8 (organic 0, day 45); **no provable outside visitor — day 45**, last outside-touching 2026-09-23T14:11:42Z. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription `cpa_monthly` `livemode:false`). `vertical-sync --check` exit 0 (26); `recon:cadence` exit 0 (newest 2026-10-12, `legal_ops` + `agriculture_eudr`). Item 7: gateway still the 2026-09-12 process (`1963330`). Item 11 descriptor half still open (`ai-plugin.json` 200 names QuarterLine against the dead host; `/openapi.json` 404).

_Last updated: 2026-10-14 (**15:30 sweep**, Day-44 — every surface re-measured live). **Every live product now has a launch video, and every product page embeds it.** Five of five are public on the product channel **GiniLoh** and each was verified through YouTube's
oEmbed endpoint (200 + a real title): `qeow4cdaiv8` (spendproof), `JcP9RtWZZrg` (ledgerlink), `I7NOZAQ-5Ig` (facturgate),
`I38c05ZZZr8` (parcelproof), `MiNmsr1i9Lo` (caseproof). Each page renders a **click-to-load** embed — nothing reaches YouTube until the
viewer presses play — behind a poster served from our own origin (`/launch-videos/<slug>.jpg`, all five 200). The four products that
shipped before the pipeline existed were produced too (the owner reversed the grandfathered standard on 10-13), so the `launch_videos`
ledger reads **5 rows, all `uploaded`**. Six commits `20c0d13..5ee4194` (10-13 23:55 → 10-14 02:46) landed the publish + embed, the
third-party video frame quarantined out of the WCAG scan, the four pages repointed at the owner's hand-published cuts (each new id read
back from the YouTube Data API first), the click-to-load poster, the caption-versus-border class decided in code, and a neutral section
heading. **The worktree is now clean** — yesterday's dirty launch-video P2 is closed. **New, for the owner:** three SpendProof launch
videos are public (`qeow4cdaiv8` on the pages, `LdSoKLTfYjs` in the ledger, and `82vT3OkoYsU` still up on the
founder's personal channel) — the 10-13 claim that the earlier uploads were deleted does not hold. **The red job is gone:** `hermes cron
doctor` **0 issues / 61 jobs**; Editorial Verify Gate `ok` 2026-10-14 14:08 after three failures in four days, WordPress Draft Sweep
`ok` 14:20, Post-Ship Brag `ok` 15:30:36, Build Watchdog `ok` 10-13 16:38 (next today 16:30), Growth Watchdog `ok` 10-09 17:05 (next
10-16 17:00), Slack Report Gate `ok` 10-13 18:00 (next today 18:00), Weekly Market Recon `ok` 10-12 14:35 (next 10-19 14:30), Launch
Video Auth Check registered `0 13 * * 1` and not yet run (first 10-19 — expected). Measured closure of the reader lag:
`/root/editorial-factory` is level with its origin (HEAD `606ce73`), the pressflow container
(`nstjdswcf5p9xckwja89o6z0-20261014T130123`, image `606ce738d93…`) serves **99** published files against **99** on the host, and
Supabase `articles` is **88 → 99**. **Awaiting `@Simon approve CanopyProof`** — nothing built, nothing in `src/`, nothing dispatched;
the only build candidate (score 79, `context/recon_proposals/2026-10-12_canopyproof.md`, commit `d209cf3`, LLM/parse-backed, rec
$1.50/call, EUDR application 30 Dec 2026). Deploy verified: app container `af8yqbwrrnyyfgs9wcg0intj-20261014T024644`, image
`5ee41949285f…` == HEAD, `/showcase` 200. Surfaces all 200 (`/` 307 → giniloh.com 200; `/showcase` + 5 products + `/quarterline` +
`/billing` + `/embed/countdown` + robots (30 URLs) + sitemap (30 loc) + mcp.json + ai-plugin.json; `/openapi.json` 404; legacy 503);
`/quarterline/` + `/quarterline/calc/` 308. Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical. Checkout `cs_live_` ×5
(`ledgerlink`, `facturgate`, `parcelproof`, `caseproof`, `spendproof`); product-scoped plan without `app` → 400 naming the inventory;
`quarterline` 400 "retired"; `agent_metered` 200 `cs_live_…`; `/api/portal` 307. Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch,
`/v1/balance` 200 `livemode:true` (available $0.00); `GEMINI_API_KEY` (39) + `LLAMAPARSE_API_KEY` (52) + `STRIPE_AGENT_METER_PRICE_ID`
(30) in the container; SpendProof with no document → 400 `sp-document-missing`. `events` 6543 → **7668** rows / sessions 4037 → **4697**
— **990 rows today**, of which the two big clusters (01:14–01:59, 02:10–02:40; dozens of sessions inside the same second with click
bursts) are our own browser suites run while the launch-video work was checked, so today's count must not be read as audience → **still
no provable outside visitor, day 44**; last outside-touching event 2026-09-23T14:11:42Z. Revenue **$0 real** (4 `cs_test_` purchases
2026-09-02; 1 sandbox subscription). `agent_query` still 8 (organic 0, day 44). Articles **88 → 99**; the internal reader is level with
the host at 99/99; pressflow internal-only holds (`/healthz` 200, `/api/articles.json` 401). `vertical-sync --check` exit 0 (26);
`recon:cadence` exit 0 (newest 2026-10-12). Item 11's descriptor half open (ai-plugin.json still names QuarterLine against the dead
host; `/openapi.json` 404). Item 7: gateway pid `1963330` (2026-09-12). **Open: 5, 6, 7 (P2), 11 (descriptor half, P2)** + the duplicate
SpendProof video (P2, owner) — plus the owner-held items he took himself (provider low-balance alert, social/video, affiliate/ads).
**CLOSED since 10-13:** the editorial deploy-behind reader lag and the dirty launch-video worktree.

_Last updated: 2026-10-13 (**15:30 sweep** — every surface re-measured live). **New capability, live: the factory publishes its own launch
videos.** The `Post-Ship Brag` and `Launch Video Auth Check` jobs landed last night with 17 commits (`6cf56b8..c62c690`, 2026-10-12
23:02–23:07) — a `launch_videos` ledger with a grandfathered backlog, a pending-product detector, a hard narration budget, an ElevenLabs
voiceover step, a duck-and-mux step and a resumable YouTube upload. **SpendProof's launch video is PUBLIC on YouTube**
(`https://youtu.be/82vT3OkoYsU`, `privacyStatus: public`, uploaded 2026-10-13 12:37:58Z after 2 attempts, 22.0 s / 19.0 s narration; the
thumbnail is the real SpendProof close-verdict card) — verified through YouTube's oEmbed endpoint and by eye. The other four live products
are ledgered `grandfathered`. The launch-video worktree is still dirty with the desk's own in-flight work (12 modified / 7 new files) —
not committed by this sweep. **Awaiting `@Simon approve CanopyProof`** — nothing built, nothing in `src/`, nothing dispatched; the only
build candidate (score 79, `context/recon_proposals/2026-10-12_canopyproof.md`, commit `d209cf3`, LLM/parse-backed, rec $1.50/call, EUDR
application 30 Dec 2026). **The one red job:** `hermes cron doctor` **1 issue / 61 jobs** (was 59) — Editorial Verify Gate FAILED
2026-10-13 14:02 (*live image `29294d0f6e19` vs HEAD `91115b944e59`, deploy behind*); measured cause: `/root/editorial-factory` is **3
commits ahead of its own origin** (`fef87f3`, `e79c382`, `91115b9` — never pushed), so the pressflow container serves **73** published files
against **88** on the host (**15** newest articles missing from the internal reader; CMS + Supabase carry all 88, public reader sites
unaffected). Third red in four days — flagged, not touched. Deploy verified: app container `af8yqbwrrnyyfgs9wcg0intj-20261012T232802`,
image `c62c69002190…` == HEAD, `/showcase` 200. Surfaces all 200 (`/` 307 → giniloh.com 200; `/showcase` + 5 products + `/quarterline` +
`/billing` + `/embed/countdown` + robots (30 URLs) + sitemap (30 loc) + mcp.json + ai-plugin.json; `/openapi.json` 404; legacy 503);
`/quarterline/` + `/quarterline/calc/` 308. Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical. Checkout `cs_live_` ×5
(`ledgerlink`, `facturgate`, `parcelproof`, `caseproof`, `spendproof`); product-scoped plan without `app` → 400 naming the inventory;
`quarterline` 400 "retired"; `agent_metered` 200 `cs_live_…`; `/api/portal` 307. Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch, `/v1/balance`
200 `livemode:true` (available $0.00); `GEMINI_API_KEY` (39) + `LLAMAPARSE_API_KEY` (52) + `STRIPE_AGENT_METER_PRICE_ID` (30) in the
container; SpendProof with no document → 400 `sp-document-missing`. `events` 6534 → **6543** rows / sessions 4032 → **4037** — only **7
rows today** (3 `spendproof` views at 02:34 from the video desk, 2 `spendproof` + 2 `factory`/`ledgerlink` at 12:26 from `885deba9…` and
the long-lived `59a27597…`) → **still no provable outside visitor, day 43**; last outside-touching event 2026-09-23T14:11:42Z. Revenue
**$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription). `agent_query` still 8 (organic 0, day 43). Articles 77 → **88**.
`vertical-sync --check` exit 0 (26); `recon:cadence` exit 0 (newest 2026-10-12). Item 11's descriptor half open (ai-plugin.json still names
QuarterLine against the dead host; `/openapi.json` 404). Item 7: gateway pid `1963330` (2026-09-12). **Open: 5, 6, 7 (P2), 11 (descriptor
half, P2)** + the editorial deploy-behind finding (P2, fleet) + the dirty launch-video worktree (P2, fleet) — plus the owner-held items he
took himself (provider low-balance alert, social/video, affiliate/ads).

_Last updated: 2026-10-12 (**15:30 sweep** — every surface re-measured live). **The weekly recon returned a build
and the line is idle waiting on the founder.** `context/recon_proposals/2026-10-12_canopyproof.md` (commit
`d209cf3`, the day's only factory commit): **CanopyProof**, score **79/100**, declared **LLM/document-parse-backed**
(`usesLlmPrimitive: true`) — it audits a supplier geolocation submission set for EUDR *before* the due-diligence
statement is filed (plot geometry validity, computed area vs the four-hectare rule, declared-vs-computed area,
pairwise overlap between suppliers — the double-count a single-file validator cannot see — yield plausibility
against the operator's own figure, version-stamped Annex I scope screen). Measured ≈ $0.18/call → recommended
**$1.50/call** (≈ 8.3×), $39/mo importer plan, $19 one-off pack, agent tool `preflight_eudr_geolocation` at $1.50.
Dated driver: Delegated Regulation (EU) 2026/2102 in force 18 Sep 2026, application date **30 Dec 2026**.
`VERTICAL_A` = `legal_ops` scanned, **nothing ≥ 60** (53 / 46 — free federal deadline calculators and the free
PDF/A validator own the arithmetic; no dated court-rule or filing-format change in the window). `VERTICAL_B` =
`agriculture_eudr` produced the PRD; stated weakness: no **native** editorial vertical (adjacent to
`supplier_risk_reshoring_decision` / `supply_chain`, same buyer). **Awaiting `@Simon approve CanopyProof`** —
nothing built, nothing in `src/`, nothing dispatched; no product code changed in 24 h. **The one red cron:**
`hermes cron doctor` **1 issue / 59 jobs** — Editorial Verify Gate FAILED 10-12 14:00 (*live image `29294d0f6e19`
vs HEAD `e79c382da342`, deploy behind*); measured cause: the editorial repo is **2 commits ahead of its own
origin** (`fef87f3` 11:14, `e79c382` 11:16 — never pushed), so the pressflow container serves **73** published
files against **77** on the host (the four newest articles are missing from the internal reader; the live CMS and
Supabase have them). Same class as 10-10, second red in three days, and the first with an unpushed-commit cause —
flagged, not touched (the sweep does not push another repo, and that repo's push path runs `git add -A` over a
worktree with in-flight WIP). Deploy verified: app container `af8yqbwrrnyyfgs9wcg0intj-20261012T143353`, image
`d209cf3abfee…` == HEAD, `/showcase` 200. Surfaces all 200 (`/` 307 → giniloh.com 200; `/showcase` + 5 products +
`/quarterline` + `/billing` + `/embed/countdown` + robots (30 URLs) + sitemap + mcp.json + ai-plugin.json;
`/openapi.json` 404; legacy 503); `/quarterline/` + `/quarterline/calc/` 308. Manifest **v2.1.0 / 10 tools**
sha256 `698801c5…` byte-identical. Checkout `cs_live_` ×5 (`ledgerlink`, `facturgate`, `parcelproof`, `caseproof`,
`spendproof`); product-scoped plan without `app` → 400 naming the inventory; `quarterline` 400 "retired";
`agent_metered` 200 `cs_live_…`; `/api/portal` 307. Stripe `STRIPE_MODE=live`, `sk_live_` 107 ch, `/v1/balance`
200 `livemode:true`; `GEMINI_API_KEY` (39) + `LLAMAPARSE_API_KEY` (52) + `STRIPE_AGENT_METER_PRICE_ID` (30) all in
the container; SpendProof with no document → 400 `sp-document-missing`. `events` 6522 → **6534** rows / sessions
4031 → **4032** — only **12 rows today** from three of our own long-lived browsers (`a3f8de07…` from
2026-09-23T02:41:57Z, `59a27597…` from 09-23, and `12e5148c…`, one `/billing` view at 12:08:02Z, a new id but no
user agent or referrer) → **still no provable outside visitor, day 42**; last outside-touching event
2026-09-23T14:11:42Z. Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription).
`agent_query` still 8 (organic 0, day 42). Articles 72 → **77**. `vertical-sync --check` exit 0 (26);
`recon:cadence` exit 0 (newest 2026-10-12, two verticals). Item 11's descriptor half open (ai-plugin.json still
names QuarterLine against the dead host; `/openapi.json` 404). Item 7: gateway pid `1963330` (2026-09-12).
**Open: 5, 6, 7 (P2), 11 (descriptor half, P2)** + the new editorial deploy-behind finding (P2, fleet) — plus the
owner-held items he took himself (provider low-balance alert, social/video, affiliate/ads).

_Last updated: 2026-10-11 (**15:30 sweep** — every surface re-measured live). **The line is running: a money bug is
fixed, five products are live, and the pages are finally discoverable.** ParcelProof's UPS AHS-Dimension trigger
was 96 in where both carriers use **48 in** (`38153e0`, owner-approved 2026-10-10) — a one-way money bug on a live
product; 23-day item **CLOSED**. SpendProof went `beta → live` (`6f325f5`) and its document pipeline works
(LlamaParse is a multipart, asynchronous upload whose receipt was being fed to the model as the invoice; the prompt
asked per-line while the parser read a record; the record is integer micro-USD) — live: pasting an invoice is read
and the verdict **withheld** with `sp-extraction-unstated` because a declared field is absent from my sample
(rule 5), neither input → **400 `sp-document-missing`**; `/showcase` renders **LIVE ×5 / BETA ×0 / RETIRED ×1**.
**Independently verified today:** `/robots.txt` + `/sitemap.xml` **200** on the product host (30 URLs, `quarterline`
absent by construction); absolute canonicals on all 30 advertised pages (`94d6341`, root had no `metadataBase`, so
the 24 rule pages emitted a relative canonical and the five product pages plus the directory declared none);
`agent_metered` checkout **500 → 200 `cs_live_…`** (`STRIPE_AGENT_METER_PRICE_ID` now in the deploy env); the
container also carries `GEMINI_API_KEY` (39) and `LLAMAPARSE_API_KEY` (52); two gate repairs (`4dfe3c1`, `4b1e213`)
narrow the vision reviewer off the text-in-a-row and gutter classes `tests/e2e/text-geometry.spec.ts` decides, both
settled by measurement (0 intersecting text runs at 1280×900); billing portal gained vertical pricing suites +
disclaimers (`05cc9d1`) and a customer-service section (`91cb116`, recovered from a canceled Antigravity run whose
anonymous GET returned every customer's name/email/subject/body and whose PATCH let anyone flip a ticket's status —
now self-scoped and admin-gated, seen live on `/billing`). App container
`af8yqbwrrnyyfgs9wcg0intj-20261011T135632` image tag `91cb116d…` == HEAD. Surfaces all 200 (`/` 307 → giniloh.com
200; `/showcase` + 5 products + `/quarterline` + `/billing` + `/embed/countdown` + robots + sitemap + mcp.json +
ai-plugin.json; `/openapi.json` 404; legacy 503). Manifest **v2.1.0 / 10 tools** sha256 `698801c5…` byte-identical.
`hermes cron doctor` **no issues / 59 jobs**. Checkout `cs_live_` ×5; app-less 400; `quarterline` 400;
`/api/portal` 307. `events` 6363 → **6522** rows / sessions 3951 → **4031** (610 rows on 10-10 = the builds' and the
gate's own browser runs; 41 today = two long-lived browser sessions, `59a27597…` from 09-23 and `1886b14d…` from
10-03, browsing in step with the owner's own work, no user agent stored → **still no provable outside visitor, day
41**). Revenue **$0 real** (4 `cs_test_` purchases 2026-09-02; 1 sandbox subscription). `agent_query` still 8
(organic 0, day 41). Editorial: articles 70 → **72**; pressflow 72 files, image `db8c977` == editorial HEAD.
`vertical-sync --check` exit 0 (26); `recon:cadence` exit 0 (2 verticals 2026-10-05; **next recon tomorrow 10-12
14:30**). Item 11's crawler-map half now CLOSED, the dead-host descriptor half open. Item 7: gateway pid still
`1963330` (2026-09-12). **Open: 5, 6, 7 (P2), 11 (descriptor half, P2)** — plus the owner-held items he took
himself (provider low-balance alert, social/video, affiliate/ads).

_Last updated: 2026-10-11 (**customer service on the billing portal — recovered from a canceled Antigravity run and
re-scoped before it could ship**). The working tree held an unfinished feature from a session whose every step was
`canceled by manage_task`: `/api/support` (POST/GET/PATCH over `events`) plus a 545-line section component, wired into
`factory-billing-portal.tsx` **only as an unused import** — `<CustomerSupportSection />` was never mounted, so the
change did nothing. It also failed the gate (`next build` → TS2339 at `route.ts:225`; eslint
`react-hooks/set-state-in-effect`), and its GET listed **every** customer's name, email, subject and message body to
any anonymous caller on a public page (`/billing`), with PATCH letting anyone change any ticket's status. Owner
instruction: *"Fix it properly, then commit + push to main"*. Landed: the type/hook defects, the mount (+ a "Contact
Support" anchor), a single-ticket self-scoped lookup (**ticket_id + the filing email, both required**), and admin
listing/status-update behind an optional `SUPPORT_ADMIN_TOKEN` (unset ⇒ explicit 403, never an open fallback). Guard:
`src/app/api/support/route.test.ts` (10 assertions; proven to bite — disabling the anonymous guard and the email
filter turned 3 of them red). Gate green: tsc, eslint 0 errors, tokens, verticals, 233 vitest, build, 78 e2e
(the /billing axe WCAG run is what caught the section's hand-rolled tab switcher at 3.78:1 — now the shared
`AppleSegmentedTabs`). Revenue **$0 real**; no provable outside visitor.

_Last updated: 2026-10-11 (**canonical tags fixed on all 30 advertised pages**). Root cause: no `metadataBase`, so the
24 rule pages served a relative canonical (ignored by Google — it is why Search Console showed "User-declared
canonical: None") and the five product pages plus the directory declared none at all. `src/lib/seo/canonical.ts` now
emits the absolute URL and refuses any path that is not in the crawl map; an e2e loop over the crawl map asserts
every advertised page canonicalises to itself (proven to bite). The owner's submission is confirmed from Search
Console: `https://apps.giniloh.com/sitemap.xml` registered 2026-10-10T23:59:40Z, downloaded, 0 errors, 30 URLs.
Revenue **$0 real**; no provable outside visitor.

_Last updated: 2026-10-10 (**the three approved items are live**). ParcelProof's UPS AHS-Dimension trigger was
96 in where both carriers use **48 in** (96 is the Large Package/oversize figure) — a one-way money bug: any UPS
parcel with a longest side between 48 in and 96 in had a legitimate accessorial reported as recoverable. Fixed
(`38153e0`) with the tariff basis recorded in the file, the PRD line corrected, a boundary known-answer vector and a
paired-constant guard; proven live by reading the constant out of the deployed container's own server bundle
(`fedex:48` present, `ups:96` absent) and by the live rule page's published copy. The product host now serves
`/robots.txt` and `/sitemap.xml` (30 URLs, derived from the registry + preset modules, retired product absent), and
the reader site carries one contextual product CTA on the 52 of 86 articles that honestly have a matching tool.
Gate green end to end: 219 vitest / 77 e2e / visual-qa 24/24. Revenue **$0 real**; no provable outside visitor.
Details and evidence in `context/pending_approval.md`.

_Last updated: 2026-10-10 (**owner approved the ParcelProof threshold fix, the reader-page product wiring and the
product-host crawler map; all three are being landed**). The threshold defect was a genuine one-way money bug on a
live product: UPS's AHS-Dimension trigger was carried as a longest side > 96 in (the Large Package / oversize figure)
when both carriers assess it above **48 in**, so for any UPS parcel between 48 in and 96 in the audit reported a
legitimate accessorial as recoverable money. The PRD's tariff table carried the same error and is corrected in place.
The crawler map (`/robots.txt` + `/sitemap.xml`, both 404 until now) is derived from the registry and each product's
own pSEO preset modules so a retirement cannot leave a stale URL behind; the reader-site corpus gains a contextual
CTA to the matching tool on the 52 of 86 articles that honestly have one, and the reader sitemap's five capitalised
product URLs (all 404s — Next routes are case-sensitive) are corrected to the real routes. Revenue **$0 real**; no
provable outside visitor. Evidence and commit hashes in the code commit; the approval record is in
`context/pending_approval.md`.

_Last updated: 2026-10-10 (**SpendProof is LIVE and its extraction half WORKS — verified against the live
services**). Owner instruction *"env variables are now created in Coolify.. Please review and change status"*, then
*"full fix"*. Product `6f325f5`, gate repair `4dfe3c1`; app container `af8yqbwrrnyyfgs9wcg0intj-20261010T194129`
runs image `4dfe3c1…` == HEAD. Registry **5 live + 0 beta + 1 killed**; live `/showcase` **LIVE ×5 / BETA ×0 /
RETIRED ×1**; `/spendproof` 200. The three credentials are in the running container (read back:
`GEMINI_API_KEY`, `LLAMAPARSE_API_KEY`, `STRIPE_AGENT_METER_PRICE_ID`), both keys validated live, and
**`agent_metered` checkout is 500 → 200 `cs_live_…`** — that open item is CLOSED. The extraction half was dead in
three ways (a JSON parse POST where the service requires a multipart upload and an async
upload→poll→`/result/markdown` flow; a prompt asking for a per-line shape while the parser read a whole record; no
units stated while the record is integer micro-USD) — all fixed and **live-verified**: `POST
/api/spendproof/extract` **200** with 22/22 fields labelled `extracted` (text) and **200** for a real PDF
(document), rule-id **400**s for neither/both inputs. Gate green end to end (**213 vitest** / **75 e2e** /
**visual-qa 24/24**); the `/showcase` baseline re-derived after reading the diff (one 62×23 px region — the BETA→LIVE
badge). A **gate repair** landed separately (`4dfe3c1`): `visual-qa` failed `caseproof-qa-5` three times on a
false positive the deterministic text-geometry guard already decides (measured: 0 intersecting rects, 36 px of clear
space), so the reviewer no longer opines on that class. The 357 telemetry rows the gate's own e2e runs wrote were
deleted (verified back to row id 6723). **Still open for the owner:** no crawler map (`/robots.txt` + `/sitemap.xml`
404); the agent tool stays text-in (PDF is the HTTP route + page); **item 5**, **item 6**, **item 7** (P2), **item
11** (P2), the **ParcelProof AHS-Dimension one-liner** (23rd day); revenue **$0 real**, no provable outside visitor.

_Last updated: 2026-10-10 (**SpendProof is BUILT and LIVE in beta — the build line restarted overnight**).
Approval 2026-10-09 23:50 UTC (`c1470e2`), build fired 23:53 (`ed2ee8b`), shipped 2026-10-10 00:31
(`536de2a`, 28 files), landing record 00:36 (`04b699d`). `HEAD == origin/main == 04b699d`; app container
`af8yqbwrrnyyfgs9wcg0intj-20261010T003655` runs image `04b699dc…` == HEAD; `/showcase` 200; `/spendproof`
200 (live render `CLOSE WITHHELD`). Registry **4 live + 1 beta (spendproof) + 1 killed**; `verify-build.sh`
green in one pass (201 vitest / 75 Playwright / visual-qa 24/24). `/.well-known/mcp.json` **v2.1.0 / 10 tools**
sha256 `698801c5…` byte-identical (new `reconcile_ai_invoice` $1.50). **Two open items on the product, both the
owner's:** the deploy carries **no model key and no document-parse key**, so `POST /api/spendproof/extract`
answers **503** naming the missing variables (the loud door), and the `agent_metered` checkout is still **500**
(`STRIPE_AGENT_METER_PRICE_ID` unset). `hermes cron doctor` **1 issue / 59 jobs** — Editorial Verify Gate FAIL
10-10 14:01 (live site image `99933819` vs editorial HEAD `eaa303d`, deploy behind), **CLOSED** by 15:27
(pressflow container image `ab44d141` == editorial HEAD `ab44d14`). Revenue **$0 real**; **no provable outside
visitor (day 40)**; events 5789 → 6363 (+574, all our own test runs: 82 watchdog 10-09 16:31 + 492 SpendProof
e2e 10-10 00:05–00:26); articles 65 → 70. Still open for the founder: the **ParcelProof AHS-Dimension one-liner**
(22nd day), **item 5**, **item 6**, **item 7** (P2), **item 11** (P2), plus the two operator settings.

_Last updated: 2026-10-09 (**SpendProof APPROVED — the build line restarts**, owner instruction verbatim
*"approve spendproof and reactivate the build line"*). The build line was idle for four days with **nothing
approved**; the approval is the reactivation (no job was ever disabled — all 59 are `active`). SpendProof
(signal 79/100, PRD `context/recon_proposals/2026-10-05_spendproof.md`) is dispatched as a one-shot job against
its **v1 scope only** (§2 engine + extraction posture + §3 pricing; the record in `context/pending_approval.md`
carries the contract), registry status **`beta`** — the public launch call stays with the founder. At approval:
`HEAD == origin/main == 23ce146`, app image `23ce1466…` == HEAD, `/showcase` 200. **Two open items the approval
does not cover, both the founder's:** the deploy env has **no model or document-parse key** (SpendProof is the
first LLM/parse-backed product; the code must fail loudly without it), and the `agent_metered` checkout is still
**500** (`STRIPE_AGENT_METER_PRICE_ID` unset). Also unchanged: the product host has **no crawler map**
(`/robots.txt` and `/sitemap.xml` 404 on `apps.giniloh.com` — re-probed this turn), so nothing shipped becomes
discoverable; revenue **$0 real**; no provable outside visitor (day 39)._

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
  checkout_click, agent_query, reconcile_click). `scripts/growth-check.mjs` takes the product as an
  argument (`process.argv[2] || GROWTH_PRODUCT || "quarterline"`, `bc3d556`) and now splits every figure by
  traffic class. **The internal-traffic marker shipped 2026-10-19** (owner: *"@Simon approve traffic marker"*):
  one classifier (`src/lib/traffic-class.ts`) decides `internal` / `visitor` at the write boundary, carried by
  `/api/events`, the metered `/api/agent/calculate` route and the Playwright suite (`x-factory-internal: 1`),
  with a `?factory_internal=1` cookie for our own browsers. `growth-check.mjs` gates on
  `unique_sessions_visitor`; rows written before the marker stay NULL and are reported as `unclassified`,
  never backfilled.
- **Growth surfaces** — pSEO routes, embed widget, `.well-known` A2A manifests.
- **Config-as-data** — Gemini key/model/prompt live in Supabase `factory_config`
  (modifiable without redeploy).

## Database — Supabase (**one migration pending: 0004** — apply in the Supabase SQL editor)

| Table | Purpose | Status |
|---|---|---|
| `factory_config` | runtime secrets/config (Gemini key, QA model) | ✅ live |
| `events` | growth telemetry | ✅ live — **`traffic_class` column (migration `0004_events_traffic_class.sql`) authored 2026-10-19 and NOT yet applied**; until it is, the internal-traffic marker is carried in `payload.traffic_class` (the insert logs the pending migration loudly) and `growth-check.mjs` reads both. (read 2026-09-26, full paged read) — **1609 rows** (parcelproof 497 / facturgate 333 / factory 231 / quarterline 228 / caseproof 181 / ledgerlink 139), last write **2026-09-25T10:02:14Z** (≈22 h silent at the sweep); **981 session ids**, 198 null-session rows; every 09-24 and 09-25 row falls inside the 10:00–10:05 Build Watchdog Playwright window (62 rows on each day), and the session ids before it are the unattributable ones recorded in the 09-23/09-24 entries (returning browser `30eb9935` last seen 09-22T01:25:12Z; `59a27597` last seen 09-23T14:11:42Z, three factory-page `page_view`s, nothing since — **the last non-test event**) — **0 provably external in 26 days**. **4 `agent_query` rows, all factory ship probes** (facturgate ×3, 2026-09-17 03:50; parcelproof ×1, 2026-09-18 22:07) — organic agent queries 0; `product=caseproof` reads **181** rows, all factory verification runs |
| `subscriptions` | Stripe subscription records (webhook) | ✅ live |
| `purchases` | one-off PDF-export purchases (webhook) | ✅ live |

`supabase/schema.sql` is the complete, re-runnable source of truth for all four tables.

## Environment

Coolify env vars **added** (Supabase URL/service-role/anon, Stripe, Resend) plus, on 2026-10-10, the
two keys the first LLM/parse-backed product needs — `GEMINI_API_KEY` (the extraction model, default
`gemini-3.1-pro-preview`) and `LLAMAPARSE_API_KEY` (the document parse) — and
`STRIPE_AGENT_METER_PRICE_ID=price_1UMYy8JaTDc3aAp0mRZ6SFZ7`, which switched the `agent_metered`
checkout back on (it now returns a live session). The alternate names `SPENDPROOF_EXTRACTION_MODEL_KEY`
/ `SPENDPROOF_PARSE_KEY` are accepted in the same precedence, and `SPENDPROOF_EXTRACTION_MODEL`
overrides the model. A Coolify env change reaches the container only on a redeploy. Local `.env`
mirrors the rest.

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
