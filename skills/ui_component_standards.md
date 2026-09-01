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

### Design tokens
Single source of truth: `@theme` in `src/app/globals.css`. Agents use token classes (`bg-primary`, `text-muted`, `border-border`), never raw palette colors.
