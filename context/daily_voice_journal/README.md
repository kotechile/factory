# Daily Voice Journal

Daily operational context reviewed by the `[bot:simon] Daily Proactive Sweep` cron (daily 08:00).

## Purpose
Short, dated entries capturing the fleet's day-over-day signal: what shipped, what broke,
what a human/agent said that should persist, and any blocker the sweep should surface.

## Status
- Created 2026-09-03 — this directory was referenced in GUIDE.md / README.md / AGENTS.md but
  never existed. No automated producer currently writes here.
- `skills/voice_content_engine.md` generates launch copy + social assets, NOT daily journal
  entries. Until a producer is wired, entries are added manually by Simon or the founder.
- **2026-09-16:** the gap this predicted materialised — the 09-14 and 09-15 sweeps both ran
  `completed` and delivered full reports to Slack while writing **nothing** here. Both entries were
  reconstructed from their cron output files (`~/.hermes/cron/output/7804a08125ce/*.md`) and are
  marked as reconstructions at the top. **Rule:** a sweep that runs must leave a durable record
  (journal entry + growth-gate row + commit); a delivered report that leaves no artifact is an audit
  gap, not a success. Until a producer exists, that step is on the sweep.
- **2026-09-17:** the rule held for a second day (`2026-09-17.md` + its growth-gate row were written by
  the 08:00 sweep). There is still **no producer** — the entry exists because the sweep writes it, so any
  run that skips that step silently restarts the gap. The structural fix stays open in
  `context/pending_approval.md` item 6.

## Format
One file per day: `YYYY-MM-DD.md` (see `_template.md`).
