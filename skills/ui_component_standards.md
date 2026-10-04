---
name: ui-component-standards
description: "Use when building factory UI components."
version: 1.0.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: UI Component Standards

## 1. Objective
Standardize every UI surface so products ship accessible, responsive, and consistent out of the box.

## 2. Stack
- Next.js App Router + TypeScript
- Tailwind CSS (design tokens)
- Lucide Icons (never hand-drawn glyphs)
- React Flow for node-based visual charts

## 3. Editorial Signature & Aesthetic Excellence (Mandatory)
Every factory product must ship with an authentic, high-craft editorial engineering aesthetic. Plain, flat, or boxy MVPs fail inspection. Every product UI must incorporate the following signature elements (reference implementation: `/ledgerlink`):

1. **Architectural Horizon Stripe**:
   - A micro-height (`h-[3.5px] w-full`) geometric gradient runner along the top viewport edge directly above the navigation bar.
   - Tailored to the product's domain spectrum (e.g. electric financial: `#635BFF` via `#4338CA` to `#06B6D4`; logistics: `#EA580C` via `#D97706` to `#0284C7`; legal/compliance: `#4F46E5` via `#0284C7` to `#10B981`).

2. **Ambient Technical Grid Canvas**:
   - A faint, low-contrast mathematical dot-grid or ledger hairline grid across the top 240px–280px background behind the hero:
     `[background-image:radial-gradient(#CBD5E1_0.75px,transparent_0.75px)] [background-size:16px_16px] opacity-60`
   - Feathered downward into pure canvas background using a CSS mask gradient:
     `[mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]`

3. **Hero Visual Metaphor ("The Transformation Schematic")**:
   - Never leave the hero headline as bare text in a void. Beside or directly integrated with the headline, place a responsive vector schematic diagram (SVG) making the deterministic core tangible at a glance.
   - Show the incoming payload token (e.g. netted payout, raw EDI envelope, freight bill) passing through a glassmorphic prism, parser, or rule filter, fanning out into color-coded thread lines and categorized output nodes (Charges, Fees, Deductions, Balanced GL Net).
   - Ensure the arithmetic on the diagram nodes sums exactly (mathematical fidelity).

4. **Live Interactive Determinism Pill**:
   - The top hero badge must be an interactive status tag emphasizing browser-local execution:
     - Soft pulsing beacon dot (`#10B981` / emerald ping + static dot).
     - Monospaced font treatment (`font-mono text-xs`).
     - Explicit label: `BROWSER-LOCAL DETERMINISTIC` or `CLIENT-SIDE ENGINE`.
   - **Use the shared `<DeterminismPill>`** (`src/components/editorial/signature.tsx`), not a bespoke
     pill: the secondary half must use `EDITORIAL_MUTED_TEXT` (`#5B6B80`), never `#64748B` — see the
     2026-10-04 contrast entry in the resolved edge-cases below.

5. **Apple-Style Segmented Tab Switcher**:
   - Input mode switchers (e.g. JSON paste vs API key vs File upload) must use an Apple-style segmented control container (`bg-[#F1F5F9] p-1 rounded-xl shadow-inner border border-black/[0.04]`).
   - Active tabs use an elevated white surface (`bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold rounded-lg px-4 py-2`).
   - Never use standard flat underlined text links.
   - **Use the shared `<AppleSegmentedTabs>`** (`src/components/editorial/apple-segmented-tabs.tsx`).
     Inactive labels use `EDITORIAL_MUTED_TEXT` (`#5B6B80`) — slate-500 measures 4.34:1 on `#F1F5F9`
     and fails WCAG AA.

6. **IDE / Terminal Data Treatment**:
   - Raw code, JSON, XML, or structured text inputs must receive an authentic IDE/Terminal treatment:
     - Window chrome header bar with macOS control dots (`#EF4444`, `#F59E0B`, `#10B981`) and file title.
     - Top-right zero-egress badge: `CLIENT-SIDE ONLY • ZERO EGRESS` with `ShieldCheck` icon.
     - Left-hand line number gutter (`01`, `02`, `03`...) in `text-muted/40 font-mono select-none`.
     - Soft cool-tint background (`bg-[#F8FAFC]` or `bg-background/80`).
   - **Use the shared `<IdeInset>` (read-only code) / `<IdeTextarea>` (editable raw input)** —
     `src/components/editorial/`. For an *editable* field this is chrome around the existing
     `<textarea>` (keeping its label, placeholder and behaviour), not a replacement for it.
   - **The gutter is `#5B6B80`, not `text-muted/40`**: muted at 40% composites to ≈#B1B8C1, a 1.91:1
     ratio, and axe fails it (this rule shipped a failing value — see the 2026-10-04 entry below).
   - **A scrollable code region needs its own focus stop** (`tabIndex={0}` + `role="region"` +
     `aria-label`), or axe fails `scrollable-region-focusable`: the snippet scrolls independently of
     the page, so a keyboard user must be able to reach it.

7. **Tactile CTAs**:
   - Primary action buttons must provide tactile feedback:
     - Active hover transform: `hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150`.
     - Multi-layer shadow with top inner highlight: `shadow-[0_2px_8px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_12px_rgba(79,70,229,0.45),inset_0_1px_0_rgba(255,255,255,0.25)]`.

8. **Layered Ghost Border Elevation**:
   - Eliminate heavy, opaque 1px borders (`border-border`) around white cards.
   - Main surfaces and cards use pure white background (`bg-card`) with double hairline layered ghost shadows:
     `shadow-[0_0_0_1px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.04)] border-0 rounded-2xl`
   - Secondary summary metric cards use subtle backdrops (`bg-background/80 backdrop-blur-xs border border-border/80 shadow-2xs`).

9. **Design Token Discipline**:
   - Never use raw Tailwind color utilities in class names (e.g. `bg-slate-50`, `text-indigo-600`), which fail `scripts/check-design-tokens.mjs`.
   - Use semantic design tokens (`primary`, `accent`, `muted`, `subtle`, `border`, `card`, `background`, `foreground`, `success`, `destructive`, `warning`) or arbitrary hex brackets (`bg-[#F8FAFC]`, `text-[#047857]`).

## 4. Component rules
- Every reusable primitive lives in `src/components/ui/`.
- Use `clsx` + `tailwind-merge` via a `cn()` helper for conditional classes — never template-literal class soup.
- Buttons/inputs/cards/forms are variants of a single primitive, not ad-hoc divs.

## 5. Accessibility & contrast
- WCAG 2.1 AA contrast (≥4.5:1 body, ≥3:1 large text/UI).
- All interactive elements are keyboard-focusable with a visible focus ring.
- Labels are explicit; no placeholder-only inputs.
- `aria-*` on any icon-only control.

## 6. Responsive
- Mobile-first; use Tailwind `sm/md/lg` breakpoints.
- No fixed widths that break below a 360px viewport.

## 7. Dark mode
- Use CSS variables (`--foreground`, `--accent`, etc.) where possible; honor `prefers-color-scheme`.

## 8. Failure handling
- Toby flags contrast violations and non-reusable components in `self_improvement_eval.md`.

## 9. Automated enforcement (the quality gate)
Standards are enforced by `scripts/verify-build.sh`, which must pass before any push:
- `tsc --noEmit` — strict type checking.
- `eslint` — lint.
- `check:tokens` — design-token lint: raw Tailwind palette colors (e.g. `bg-blue-500`) are rejected; use tokens (`primary`, `accent`, `muted`, `border`, `card`, `destructive`, `success`, `warning`, `foreground`, `background`).
- `test` (vitest) — deterministic calc engines must ship known-answer test vectors in `src/lib/calc/*.test.ts`.
- `build` — production build.
- **`test:e2e` (Playwright)** — visual regression (`toHaveScreenshot`) + WCAG 2.1 AA accessibility (`@axe-core/playwright`).
- **`visual-qa` (Gemini vision)** — sends a rendered screenshot to Gemini for a style-guide review. The Gemini key/model/prompt live in Supabase `factory_config` (`supabase/schema.sql`), so they can be tuned without a redeploy. **Every product surface is reviewed, not just the flagship:** `scripts/visual-qa.mjs` holds a `SCREENSHOTS` list and `tests/e2e/qa-screenshot.spec.ts` captures each product in its richest state (assert-then-capture, so the capture itself fails loudly if the UI never reaches that state). When a product ships, add its capture *and* its path to that list in the same commit — a product with no screenshot is silently unaudited.

> **Route deletion leaves a stale route validator.** Deleting or renaming a route file (e.g. `src/app/api/*/route.ts`) does not regenerate the gitignored `.next/types/` files, so the next `tsc --noEmit` fails with `TS2307: Cannot find module '…/route.js'` from `.next/types/validator.ts`. This is a *stale build artifact*, not a code regression: `rm -rf .next/types` (or `.next`) and re-run — `next build` regenerates the validator from the live route tree. Rule: after deleting/renaming any route, clear `.next/types` before running `scripts/verify-build.sh`.

### Resolved edge-cases
- **2026-09-01 — `visual-qa` transient network timeout (endpoint).** The `visual-qa` gate makes a single `fetch` to `generativelanguage.googleapis.com` with a 10s timeout and no retry/backoff. A transient round-robin IP (`172.217.115.4:443`) was unreachable, surfacing `UND_ERR_CONNECT_TIMEOUT` and failing the entire gate even though every deterministic check (tsc / lint / tokens / test / build / e2e) had already passed. Re-run passed with model `gemini-3.1-pro-preview`. Lesson: distinguish a *network* failure (`fetch failed` / `UND_ERR_CONNECT_TIMEOUT`) from a *verdict* FAIL — retry with backoff before treating a timeout as a real style-guide failure.
- **2026-09-02 — `prefer-const` on mixed destructuring (build).** `eslint` fails the verify gate when a destructuring declares every binding with `let` while only some are reassigned. The new Stripe portal route (`src/app/api/portal/route.ts`) errored on `let { customerId, sessionId } = body` with `'sessionId' is never reassigned. Use 'const' instead` (line 72), because `customerId` is reassigned later but `sessionId` is only read. Fix: split the destructure so reassigned bindings use `let` and read-only bindings use `const` — `let { customerId } = body;` then `const { sessionId } = body;`. Applies to any destructured assignment (request bodies, props, config), not just this route.

- **2026-09-04 — `visual-qa` verdict FAIL: tab text cut off (layout).** The QuarterLine navigation tab bar used `overflow-x-auto` inside the 5-col results column; its four tabs (`Quarterly Estimates`, `SE & QBI Breakdown`, `23% Trap Checker`, `Scorecard (xx/100)`) exceed the column width at the desktop screenshot viewport, so the last tab clips at the right edge with no scroll affordance — Gemini flagged "tab text is cut off". Fix: replace `overflow-x-auto` with `flex-wrap` on the tab row (keep `whitespace-nowrap` on each button) so tabs wrap onto a second line instead of clipping. Lesson: for tab bars inside a fractional grid column, prefer wrapping over horizontal scroll — `overflow-x-auto` hides overflow with no visible affordance and reads as "cut off" to a vision reviewer.

- **2026-09-07 — E2E fails when an auth gate is added to a page (test).** Commit `a608eef` added a passcode gate to `/pressflow` (editorial factory) but did not update `tests/e2e/pressflow.spec.ts`, so the Playwright suite hit the locked "Editorial Factory" screen and failed on `heading "PressFlow"` / `button "Load Sample"`. Lesson: when any page adds an auth/SSO/passcode gate, update that page's E2E spec in the same commit to authenticate first — set the session cookie (`pressflow_auth` = `EDITORIAL_SECRET`) in `test.beforeEach` via `context.addCookies(...)` (or bypass the gate in the test env). Also keep assertions in sync with the rendered copy: commit `717eb78` had already relabeled the variant buttons ("⚡ Contrarian Hook", "📖 Story & Lessons") and replaced "Supabase + LinkedIn Engine", so the spec's stale strings also failed.

- **2026-09-07 — `visual-qa` false-positive FAIL: "zero padding" (endpoint).** Gemini (temperature 0) deterministically returned `FAIL: Urgent badge has zero horizontal padding` (then `wrapped tab rows have zero vertical gap`, then `installment amounts have zero right padding`) on an unchanged screenshot where the badge actually has ~6px of padding on each side and no content touches any border — confirmed by independent vision review. The `zero padding` sub-criterion in the GATE_PROMPT was the trigger; the vision model mis-judges fine padding on small pills at screenshot resolution. Fix: removed the padding sub-criterion from the gate (input/badge/card padding is already enforced by design tokens and asserted deterministically in `tests/e2e/qa-screenshot.spec.ts`) and kept overlap/collision as the spacing check. Also added retry-with-backoff (3 attempts) on a FAIL verdict in `scripts/visual-qa.mjs` — a genuine defect is re-flagged, a hallucinated one usually is not. Lesson: don't chase cosmetic CSS to appease a vision-model padding complaint; verify against the rendered screenshot first, and treat a single-shot vision FAIL as noisy.

- **2026-09-09 — E2E suite runs against a stale sibling-repo server on port 3000 (environment).** `scripts/verify-build.sh` failed 8/10 Playwright tests: `/` returned the title "PressFlow — Editorial Factory Studio & Verticals Engine" (not "Factory Showcase"), `/quarterline` returned an empty title, `/pressflow` returned `{"error":"Not found"}`, and the visual snapshot mismatched (1280×824 then 1280×4780 vs expected 1280×720). Root cause: `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, and a leftover `node site/server.mjs` from the sibling `/root/editorial-factory` project (started hours earlier in an IDE terminal) was squatting on port 3000 — Playwright silently reused *that* server instead of starting the freshly built `software-factory-core` app. Fix: before running verify-build, check `ss -tlnp | grep ':3000'`; if a process is listening, identify it with `ls -l /proc/<pid>/cwd` and kill any server that isn't this repo's own `next start` (especially `node site/server.mjs` from `/root/editorial-factory`). Re-run passed 10/10. Lesson: `reuseExistingServer` trusts *any* process bound to the baseURL port — never treat wrong-title / `{"error":"Not found"}` / snapshot-mismatch E2E failures as code regressions until you've ruled out a port squatter; confirm the listener's cwd belongs to this repo first. **Resolved (2026-09-09):** the e2e server was moved to a dedicated port so it no longer collides with the editorial-factory site — `playwright.config.ts` now uses `baseURL`/`url` = `http://127.0.0.1:3100` and `command` = `npm run start -- -p 3100`. The cross-factory collision is *prevented*, not just detected.

- **2026-09-12 — the gate ran against a workspace another session was still editing (environment).** The
  shared working tree of `software-factory-core` was left dirty (7 modified files, 2,267 insertions, plus
  an untracked `src/app/api/distribution/` route and `supabase/migrations/0003_distribution_tasks.sql`)
  by a concurrent Antigravity IDE session (`workspace_id file_root_software_factory_core`, server started
  02:11, file writes 02:20–02:23). `npm run lint` returned **exit 1** on that partial work
  (`react-hooks/set-state-in-effect`, `src/app/pressflow/page.tsx:316`), so `scripts/verify-build.sh`
  (`set -e`) aborts at step 2 and the Build Watchdog reports a red gate that has nothing to do with
  `main`. The same rewrite also removed copy that `tests/e2e/pressflow.spec.ts` asserts, and its data
  layer depends on a table (`public.distribution_tasks`) that does not exist in the deployed database.
  Rule: before running or interpreting `scripts/verify-build.sh`, **check `git status --short` first**.
  If the tree is dirty and the changes are not yours, a red gate is not a regression signal — record
  which paths are dirty and hand the decision back to the owner. Never `git stash`, revert, or
  `git add -A` another session's in-flight work, and never commit with a broad pathspec in a dirty tree
  (stage explicit paths only). Same discipline applies to concurrent `next dev`/`next build` runs in the
  shared directory: two writers on one node_modules/.next will produce flaky, unexplainable failures.
  **Follow-up (09-12 10:00 Build Watchdog run):** the same dirty tree was still failing `npm run lint`
  7.5 h later (IDE writes 02:20–02:23, server idle since) — "record and hand back" alone leaves the gate
  red indefinitely. Two additions to the rule. (1) To *conclusively* prove a dirty-tree failure is not a
  regression **without touching the live tree** (stashing is forbidden), verify `HEAD` in a detached
  worktree: `git worktree add --detach /tmp/sfc-head HEAD && ln -s "$PWD/node_modules" /tmp/sfc-head/node_modules`
  then `npm run lint` there (exit 0 ⇒ the commit is green and the failure is environment-only). Remove it
  with `git worktree remove --force`. (2) A dirty-tree blocker that *repeats across consecutive runs with
  the same paths* is an escalation to the owner (commit / revert / finish), not a fresh regression entry —
  do not re-log it as a new `build` error; flag it as a blocked `environment` state awaiting owner action.

- **2026-09-13 — `visual-qa` false-positive FAIL: "text overlapping in summary cards" (endpoint).** Gemini (`gemini-3.1-pro-preview`, temperature 0) returned `FAIL: text overlapping in summary cards (Gross/exp and Saves/taxes)` on all 3 retry attempts for an unchanged QuarterLine screenshot where every deterministic check (tsc / lint / tokens / 28 vitest / build / 9 e2e) had passed and the latest commit (`72f5951`) is docs-only. Playwright bounding-rect measurement of the rendered page shows **no** element overlaps or overflows its card: the two captions wrap cleanly to two lines inside the 152px-wide KPI cards (`xl:grid-cols-3` applied inside the `lg:col-span-5` summary column → 152px per card). `Gross $130,000 − $15,000 exp.` renders as line 1 `Gross $130,000` / line 2 `− $15,000 exp.` (right edge 873px vs card edge 912px); `Saves ~$3,994 in taxes` wraps the same way. Lesson: before chasing a "text overlapping / colliding" verdict, verify against the rendered DOM — measure `getBoundingClientRect()` of the flagged text runs and confirm no rect exceeds its card bounds and no two rects intersect. A vision model reads tight *wrapping* as *overlap*; the two are different, and only a true intersection/overflow warrants a CSS change. Secondary (genuine but non-blocking): the `xl:grid-cols-3` KPI layout is cramped — card-3's `$26,937` ends ~6px from its border, so longer formatted values (e.g. `$1,234,567`) *would* overflow the card. If a future flag names the large number rather than the caption, treat it as a real overflow (widen to `xl:grid-cols-1`, or clamp the title size) instead of re-running.

- **2026-09-18 — ParcelProof: `visual-qa` FAIL "a single sentence split across three columns", plus two tables that clipped their last column (build).** Three defects, three rules:
  1. **A flex container turns every inline child into its own column.** `<p className="flex …">` with an icon followed by *raw text + `<code>x</code>` + raw text* renders as three side-by-side flex items, so one sentence reads as three columns. Gemini flagged it and it was real. Rule: inside a `flex` row, wrap all running text in **one** child (`<span>…</span>`, inline `<code>`/`<strong>` stay inside it). An icon plus a bare text node is fine only because the text node is a single anonymous flex item — the moment you add an element mid-sentence, wrap.
  2. **A `w-full` table still overflows its card when its min-content width exceeds the container** — the browser then clips the last column instead of shrinking, and a clipped *number* in an audit reads as a hidden number. Measure it, don't eyeball it: `table.getBoundingClientRect().width` vs the wrapper's, and assert it (`tests/e2e/parcelproof-layout.spec.ts` is the standing guard). Fixes that actually work: `break-all` on long unbreakable tokens (tracking numbers, field paths), an explicit column width (`w-48`) on the mono column, and dropping a column that only repeats another.
  3. **For per-record detail (an audit ledger, a reconciliation list), prefer a labelled block per record over a wide table.** Nine columns cannot fit a 798px card; the same data as an 8-field `<dl>` grid per line wraps at any width, survives mobile, and can never hide a column. Reach for a table only when the column count is small and the values short.

- **2026-09-22 — CaseProof: adding a product fails the directory snapshot, and a repeated formatted
  number breaks a locator (test/build).** Three rules from one build:
  1. **Adding a product changes the directory page, so `landing.spec.ts`'s visual snapshot must be
     regenerated in the same commit** (`npx playwright test tests/e2e/landing.spec.ts
     --update-snapshots`) — and *reviewed*, not just accepted: open the new PNG and confirm the new
     card renders with its status badge and tool names. A snapshot updated without looking is a
     product nobody proof-read.
  2. **A formatted number that legitimately appears more than once breaks a strict-mode locator.** The
     audited payback ("41 months · 3.4 yr") renders in the verdict tile, in a driver row and in the
     comparison table, so `getByText(...)` throws a strict-mode violation. Scope the assertion
     (`.first()`, or a more specific role/region) instead of loosening the text.
  3. **Assert the string the report prints, not a rounded form of it.** `/peakFactor = 1\.4\b/` never
     matched because the engine publishes the solved crossing as `1.401`, and `\b` cannot match between
     two word characters.

- **2026-09-22 — CaseProof: no clock in the deterministic core (build).** The decision-pack CSV carried
  a `generated <ISO timestamp>` header, so two runs of the same case produced different bytes and the
  determinism test failed. An engine that must be reproducible *is* reproducible only if it reads no
  clock: the pack now carries the case's own provenance (label, tax year, cited rule source), and a
  date belongs in the filename or on the page, never inside the audited artifact.

- **2026-10-04 — `visual-qa` false-positive FAIL, 3rd occurrence of the wrap-as-overlap class, and the
  5-minute falsification recipe (endpoint).** `gemini-3.1-pro-preview` returned `FAIL: text overlapping
  in Pricing section description ("monthly" and "to" collide)` on ParcelProof — a surface the commit did
  not touch — on both attempts. Root cause of the class: the gate sends a FULL-PAGE screenshot, and the
  vision pipeline downscales it (1280×4732 → ~320 px wide), so the word spaces in 12 px type collapse and
  evenly spaced words read as colliding. **Falsify before touching CSS** — four checks, all cheap:
  (1) reproduce the captured state (the spec's own clicks), then walk
  `document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)` and compute each text node's
  `Range.getClientRects()`; report pairs intersecting by >2 px and elements with `scrollWidth >
  clientWidth`; a scrollable container (`max-h-96 overflow-y-auto`, `overflow-x-auto` table wrapper)
  reports *false* intersections because laid-out text extends past the clip — exclude it;
  (2) compare the flagged page's rendered visible text against the live (baseline) deploy — identical
  text means the flag cannot be this change's; (3) crop the flagged region of the saved PNG at native
  resolution and read it yourself; (4) compare against the pre-change tree if any doubt remains. All four
  said false positive here (0 collisions, 0 overflow, the paragraph is one 798×16 px line, visible text
  identical to the deployed `dd4b536`). Because the screenshot is byte-identical run to run, the
  3-attempt retry **cannot** clear a deterministic verdict — expect the gate to stay red on that image
  until the reviewer's input resolution changes. The structural fix (open, owner's call, since it changes
  a gate): review viewport-height tiles per screenshot instead of one downscaled full-page image. Never
  restyle a page to satisfy this verdict.

- **2026-10-04 — the Editorial Signature is now SHARED CODE, and three of its prescribed values were
  wrong (WCAG + layout).** `src/components/editorial/` holds the signature as primitives
  (`signature.tsx`: HorizonStripe / AmbientGrid / DeterminismPill / EditorialHero / GhostCard /
  TACTILE_CTA / ProductHeader; `apple-segmented-tabs.tsx`; `ide-inset.tsx` + `ide-textarea.tsx`;
  `prism-schematic.tsx`; `agent-surface-guide.tsx`), and ParcelProof, CaseProof and FacturGate now
  render from it. Measuring the three newer products against the archetype before the change showed
  0/9 of the signature markers on ParcelProof and CaseProof (and FacturGate on 3 of them via its own
  inline copies) — rule 9 was an instruction, not a fact about the tree. Three defects the axe/visual
  gates caught, all in markup copied verbatim from the archetype, which has **no axe test of its own**:
  1. **The prescribed secondary text failed WCAG AA on the surfaces it was prescribed for.** `#64748B`
     (slate-500) is 4.55:1 on the page (`#F8FAFC`) but **4.34:1 on `#F1F5F9`** (the segmented control)
     and 4.38:1 on the pill (`#F1F5F9/90`) — the ratio that matters, because that is where the pill and
     the tab labels sit. LedgerLink passes only because it is never axe-tested. One constant now:
     `EDITORIAL_MUTED_TEXT = "text-[#5B6B80]"` (≥5.0:1 on all three), used by the pill, the tabs and
     the gutter. The gutter rule above had the same class of bug: `text-muted/40` composites to ≈1.91:1.
     **Rule: pick a contrast target for the surface the text actually sits on, not for the page.**
  2. **`scrollable-region-focusable`**: a code snippet scrolls inside its own region, so the region
     needs `tabIndex={0}` + `role="region"` + `aria-label` or keyboard users cannot reach the content.
  3. **The parameter-card grid overflowed its own card** — a grid item's default `min-width` is
     min-content, so one long unbreakable monospace token (a CSV header list) pushed the grid wider
     than its container and spilled the description across the neighbouring column. Fix: `min-w-0` +
     `[overflow-wrap:anywhere]` on the item, `break-all` on the `<code>`. **This one was a TRUE
     positive reported by visual-qa** ("text overlapping in rate_card description") — falsified by
     measuring the DOM first (18 overflowing blocks; the guide Card 1014px inside an 896px box), which
     is the discipline the 09-04/09-13/09-14 entries above established for the opposite verdict.
  4. The hero schematic's node label and its right-aligned value collided on one baseline; they now
     stack in a single left-aligned column. Same "overlapping text" class, caught by reading the
     rendered capture rather than by the gate.
  Also: when a product's page copy changes, update its render spec in the same commit (the three
  products' specs asserted a name-as-heading that the Editorial hero replaces — the repo's own
  "keep assertions in sync with the rendered copy" rule, 2026-09-07).

### Design tokens
Single source of truth: `@theme` in `src/app/globals.css`. Agents use token classes (`bg-primary`, `text-muted`, `border-border`), never raw palette colors.

## 9. Executive PDF Document & Workpaper Standards (pdf-lib)
When generating paid audit workpapers, certificates, or executive exports:
- **Format**: Standard US Letter (612 × 792 pt).
- **Core Palette**:
  - Banner background: Dark navy (`#0f172a`, `rgb(0.06, 0.09, 0.16)`)
  - Accent color: Brand royal blue (`#2563eb`, `rgb(0.15, 0.39, 0.92)`)
  - Card background: Neutral light slate (`#f8fafc`, `rgb(0.96, 0.97, 0.98)`)
  - Borders: Clean subtle gray (`#e2e8f0`, `rgb(0.89, 0.91, 0.94)`)
  - Verified badges: Emerald green (`#059669`, `rgb(0.02, 0.59, 0.41)`)
- **Executive Header Visual Pattern**:
  1. **Top Accent Stripe**: 2.5–3pt brand accent line along the very top edge.
  2. **Brand Category Row**: Brand name (`QUARTERLINE`) in electric blue + `• OFFICIAL WORKPAPER` in muted slate.
  3. **Authoritative Title**: 18pt bold white with comfortable vertical breathing room (never horizontally squished with the brand name).
  4. **Statutory Subtitle**: 8.5pt regular font citing the exact governing legislation or regulatory authority.
  5. **Right-Side Certified Metadata Badge**: Boxed card on the top right displaying Period/Year, Issue Date, and a verified seal. *Important:* StandardFonts (Helvetica) in `pdf-lib` use WinAnsiEncoding and reject non-WinAnsi unicode symbols like `✓` (`0x2713`). Always draw icons via `page.drawLine()` vector strokes or use standard characters.
  6. **Bottom Separator Line**: 1.5pt dark stroke cleanly transitioning from the banner into the body.
- **Section Layout**:
  - Shaded section headers with dark navy title text.
  - Tabular key-value rows with subtle 0.5pt divider lines.
  - Prominent scorecard seal banner with penalty risk metrics.
- **Footer**:
  - Statutory disclaimer, generator attribution, and dynamic page numbering (`Page 1 of X`).
