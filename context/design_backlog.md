# Design Backlog

UI/UX improvement suggestions from `visual-qa --suggest` (Gemini vision).
Triaged by Toby — see `skills/design_review.md`.

## Triage legend
- ✅ accepted — implemented
- 📐 codified — folded into `ui_component_standards.md`
- ⏸ deferred — awaiting capacity

---

(New suggestions are appended below as dated sections by `scripts/visual-qa.mjs --suggest`.)

## 2026-09-01 (visual-qa:suggest)
- [high impact / medium effort / typography] **Format currency inputs for readability** — Large numbers like '130000' are difficult to parse at a glance, increasing the risk of user error. Formatting with commas and adding a persistent currency symbol reduces cognitive load. — _suggested change_: Implement an input mask to automatically format numbers with commas (e.g., '130,000') and add a persistent '$' prefix adornment inside the left edge of the input fields.
- [high impact / low effort / conversion] **Unify CTA copy to prevent price shock** — The top header CTA says 'Export Report' while the bottom CTA says 'Export Report ($9)'. Hiding the price in the top CTA can cause friction, distrust, and drop-offs when the user is unexpectedly hit with a paywall. — _suggested change_: Update the top-right header button to include the price, matching the bottom CTA exactly: 'Export Report ($9)', setting clear expectations before the user clicks.
- [medium impact / low effort / color] **Emphasize the Total Tax Liability card** — The 'Total 2026 Tax Liability' is the ultimate bottom-line number for the user, but it currently has less visual weight than the colorful QBI Deduction card next to it. — _suggested change_: Apply a subtle background fill (e.g., `bg-primary/5` or `bg-muted`) or a heavier border to the 'Total 2026 Tax Liability' card to establish it as the primary focal point of the results.
- [medium impact / low effort / a11y] **Improve contrast on the Alert banner button** — The white 'Check Trap Impact' button on the light orange warning banner has a very faint border, lacking sufficient contrast against its background. This likely fails WCAG 2.1 AA 3:1 contrast requirements for UI components. — _suggested change_: Update the button to use a standard outline variant with a darker, accessible border (e.g., `border-warning/50` or `border-foreground/20`) or use a solid background that contrasts adequately against the banner.
