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

## 3. Component rules
- Every reusable primitive lives in `src/components/ui/`.
- Use `clsx` + `tailwind-merge` via a `cn()` helper for conditional classes — never template-literal class soup.
- Buttons/inputs/cards/forms are variants of a single primitive, not ad-hoc divs.

## 4. Accessibility & contrast
- WCAG 2.1 AA contrast (≥4.5:1 body, ≥3:1 large text/UI).
- All interactive elements are keyboard-focusable with a visible focus ring.
- Labels are explicit; no placeholder-only inputs.
- `aria-*` on any icon-only control.

## 5. Responsive
- Mobile-first; use Tailwind `sm/md/lg` breakpoints.
- No fixed widths that break below a 360px viewport.

## 6. Dark mode
- Use CSS variables (`--foreground`, `--accent`, etc.) where possible; honor `prefers-color-scheme`.

## 7. Failure handling
- Toby flags contrast violations and non-reusable components in `self_improvement_eval.md`.

## 8. Automated enforcement (the quality gate)
Standards are enforced by `scripts/verify-build.sh`, which must pass before any push:
- `tsc --noEmit` — strict type checking.
- `eslint` — lint.
- `check:tokens` — design-token lint: raw Tailwind palette colors (e.g. `bg-blue-500`) are rejected; use tokens (`primary`, `accent`, `muted`, `border`, `card`, `destructive`, `success`, `warning`, `foreground`, `background`).
- `test` (vitest) — deterministic calc engines must ship known-answer test vectors in `src/lib/calc/*.test.ts`.
- `build` — production build.
- **`test:e2e` (Playwright)** — visual regression (`toHaveScreenshot`) + WCAG 2.1 AA accessibility (`@axe-core/playwright`).
- **`visual-qa` (Gemini vision)** — sends a rendered screenshot to Gemini for a style-guide review. The Gemini key/model/prompt live in Supabase `factory_config` (`supabase/schema.sql`), so they can be tuned without a redeploy.

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
