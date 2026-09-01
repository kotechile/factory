---
description: Use when triaging UI/UX improvement suggestions from `visual-qa --suggest`.
---

# Design Review (Toby)

## Purpose
Evaluate the structured suggestions produced by `scripts/visual-qa.mjs --suggest`
(Gemini vision) and route each to one of three outcomes. This is the "suggest → evaluate"
half of the design flywheel (the gate catches violations; this turns ideas into standards).

## Scoring
For each suggestion, score:
- **Impact**: high (3) / medium (2) / low (1) — does it materially improve conversion, clarity, or usability?
- **Effort**: low (3) / medium (2) / high (1) — how much work to implement?
- **Fit**: does it align with `skills/ui_component_standards.md` and the 60/30/10 + 8pt grid system?

Priority = impact × effort (higher = do it sooner).

## Triage
1. **Accept → implement** — high impact + low effort. Dispatch to the build engine (`agy`).
2. **Codify → styleguide** — if a suggestion reveals a recurring pattern, fold it into
   `skills/ui_component_standards.md` so every future build follows it automatically.
   This is how the styleguide evolves.
3. **Defer → backlog** — everything else stays in `context/design_backlog.md`.

## Rules
- Never implement without running `scripts/verify-build.sh` afterward.
- Record the decision (accept / codify / defer) in `skills/self_improvement_eval.md` so the triage is auditable.
- If a suggestion contradicts the constitution (`AGENTS.md`), reject it.
- If a suggestion recurs across ≥2 reviews, treat it as a codify (styleguide) candidate.
