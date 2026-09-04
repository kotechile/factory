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

### Resolved edge-cases
- **2026-09-01 — `visual-qa` transient network timeout (endpoint).** The `visual-qa` gate makes a single `fetch` to `generativelanguage.googleapis.com` with a 10s timeout and no retry/backoff. A transient round-robin IP (`172.217.115.4:443`) was unreachable, surfacing `UND_ERR_CONNECT_TIMEOUT` and failing the entire gate even though every deterministic check (tsc / lint / tokens / test / build / e2e) had already passed. Re-run passed with model `gemini-3.1-pro-preview`. Lesson: distinguish a *network* failure (`fetch failed` / `UND_ERR_CONNECT_TIMEOUT`) from a *verdict* FAIL — retry with backoff before treating a timeout as a real style-guide failure.
- **2026-09-02 — `prefer-const` on mixed destructuring (build).** `eslint` fails the verify gate when a destructuring declares every binding with `let` while only some are reassigned. The new Stripe portal route (`src/app/api/portal/route.ts`) errored on `let { customerId, sessionId } = body` with `'sessionId' is never reassigned. Use 'const' instead` (line 72), because `customerId` is reassigned later but `sessionId` is only read. Fix: split the destructure so reassigned bindings use `let` and read-only bindings use `const` — `let { customerId } = body;` then `const { sessionId } = body;`. Applies to any destructured assignment (request bodies, props, config), not just this route.

- **2026-09-04 — `visual-qa` verdict FAIL: tab text cut off (layout).** The QuarterLine navigation tab bar used `overflow-x-auto` inside the 5-col results column; its four tabs (`Quarterly Estimates`, `SE & QBI Breakdown`, `23% Trap Checker`, `Scorecard (xx/100)`) exceed the column width at the desktop screenshot viewport, so the last tab clips at the right edge with no scroll affordance — Gemini flagged "tab text is cut off". Fix: replace `overflow-x-auto` with `flex-wrap` on the tab row (keep `whitespace-nowrap` on each button) so tabs wrap onto a second line instead of clipping. Lesson: for tab bars inside a fractional grid column, prefer wrapping over horizontal scroll — `overflow-x-auto` hides overflow with no visible affordance and reads as "cut off" to a vision reviewer.

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
