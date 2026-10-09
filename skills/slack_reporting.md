---
name: slack-reporting
description: "Use when posting any factory report to Slack — write it for the human, not the machine."
version: 1.1.0
license: MIT
platforms: [linux, macos, windows]
---

# SKILL: Slack Reporting — the Human-Readable Format

## 1. Objective
Every factory message that lands in `#loop-ai` is read by one human founder, usually on a phone, usually
in under 30 seconds. This SOP fixes the shape and the language of those messages so a reader who knows
nothing about the repo can answer three questions without opening a file: **What happened?**,
**What can I use?** and **What do you need from me?**

House style is **Smart Brevity** — the same at-a-glance discipline the editorial fleet applies to
published articles (`editorial-factory/.agents/claude_stylist.md`): the shortest true statement first,
plain words, no unexplained internal codes. A report the founder has to decode is a report that was not
delivered.

## 2. Mandatory message anatomy
Six labelled sections, always in this order, always with these literal labels (the gate in §6 checks
for them by name). The appendix is exempt from the language rules — it is the only place raw machine
output belongs.

```
**<headline: what happened, in plain words> — <Fri 2026-09-18>**

<one status emoji> **Bottom line:** <1-3 sentences: the single most important fact, and whether the founder must act>

**What changed since last <run>**
- <change in plain words, with the number and its comparison>

**What's live for you**
- <what the founder can use today — each product, tool or page by its plain name — and anything NEW since the last report>

**What I did on my own**
- <autonomous action actually taken, or: "Nothing — no safe autonomous action was available.">

**What I need from you**
1. <one decision per line: what to decide, why now, the exact reply to send, the cost of doing nothing>

**Next check:** <when this is looked at again, and any due date before then>

**Numbers, for the record:** <raw metrics, event names, ids, commits, paths — freely>
```

**The headline is the first line of the message.** No preamble, no "here's the report", no restatement of
what you just did, and nothing between the headline and the Bottom line. A reader who opens the message on
a lock screen must see the situation in the first line.

## 3. Language rules
1. **Lead with meaning, not metric names.** The first five lines carry the most important fact, and the
   ask if there is one. Never open with a metric dump.
2. **Explain or drop.** Any term that needs the repo to understand either gets a plain gloss of eight
   words or fewer ("an internal-traffic marker — a tag that separates our own test visits from real
   people") or moves to the record section. No undefined acronyms in the body: expand at first use
   ("programmatic SEO (pSEO)", "our own automated test runs (CI)").
3. **No unexplained internal codes.** Commit ids, session ids, table and column names, script names,
   file paths and repository file names are appendix-only. Refer to queued work by what it does plus when
   it was queued — never as "approval item 5". The one exception is the exact reply text the founder must
   send (`@Simon approve 5`).
4. **Translate the factory's inner verbs into outcomes** (see §5 glossary). "Gate MISS — held" means
   "we missed the target and changed nothing". "TEST MODE" means "the money is fake: $161 shown, $0
   collected".
5. **One ask per line.** Each ask states what to decide, why now, the exact reply, and what happens if
   nothing is done. No ask at all is a valid answer — write "Nothing — you can ignore this report."
6. **No spin in either direction.** Plain English must not soften a failure: write "we missed it", never
   "held". State costs in dollars and days, not in severity adjectives.
7. **Budget: 250 words in the body**, excluding the record section. Bullets, never paragraphs. Short
   lines. No tables (they break on mobile). Bold only section labels and the one number that matters.
   The "What's live for you" section is at most 4 short bullets.
8. **Emoji discipline:** one status marker at the start of a line, at most three such lines in a whole
   message — ✅ on track · ⚠️ needs you · ❌ blocked or failed. A wall of warnings stops meaning anything.
9. **End with what happens next**, so silence never reads as absence of news.
10. **Never paste machine output.** If a log line matters, quote only the part that carries the meaning.
11. **Drafting tip (measured, not theoretical):** the 250-word ceiling is the binding constraint on a
    report with three asks. Write the shortest true version first, then move everything that is not a
    change, an action or an ask into the record section — and write the record section last, dumping
    every id there. Two independent drafts of the §4 example both landed inside the budget; runs that
    treat the record section as a place to put the leftover numbers need three passes.
12. **The text you send IS the file you gated — byte for byte.** On a cron run the delivered message is
    your final response, so a preamble, a "Done." line, a closing "let me know", or a re-worded section
    means the founder received an ungated message even though the gate printed PASS. Draft to the scratch
    file, gate the file, then emit exactly that text and nothing else (see §6).
13. **Say what the founder can use.** Every report — including a quiet one — names what is live today and
    flags the new. "No build today" is a change; "what you have" is a standing fact the founder is
    otherwise left to reconstruct from memory.

## 4. Worked example
Real run, 2026-09-18. The founder's reply to the posted version was "I do not understand" — it opened with
`page_view 161 · checkout_click 4` and referenced "approval item 5".

- As posted: `tests/fixtures/slack-reporting/bad-2026-09-18.md` (359 body words, fires the gate).
- Rewritten: `tests/fixtures/slack-reporting/good-2026-09-18.md` (247 words, gate clean).
- Diff of the rewrite: the headline states the situation ("no real users, no real revenue"); the numbers
  are translated ("all 58 visits were created by our own automated tests"); one bullet names what is live
  today; the three asks name the decision, the reply and the cost of inaction; every id and event name
  moved into the record line.

Second worked example — the tight case, 2026-10-08: the daily sweep is the densest report the fleet
writes (four asks, a live-product inventory, a change list and a full live probe), and it still fits:
`tests/fixtures/slack-reporting/good-2026-10-08-daily-sweep.md`, gate clean at exactly 250 body words.
When a draft does not fit, cut the explanation, never the ask.

## 5. Glossary — say this, not that
| Internal wording | Write instead |
|---|---|
| gate MISS / "held" | we missed the <Day-14> target and changed nothing |
| TEST MODE / `sk_test` | payments are still in sandbox; $161 shown, $0 actually collected |
| 0 provably-external sessions | no real outside visitor has ever used it |
| non-CI session / deploy smoke / Playwright run | our own test run (which one, and when) |
| internal-traffic marker | a tag that separates our own test visits from real people |
| pSEO expansion, `/calc/*` presets | extra landing pages for long-tail searches |
| `agent_query` | a call made to the product by an AI agent |
| live image behind HEAD | the deploy has not picked up the latest change yet |
| blocked-on-traffic | it cannot be tested until real visitors exist |
| Day 7 / 14 / 30 gate | the 7-, 14- and 30-day checkpoints after launch |
| frontier / pro tier / Flash tier | (drop it — the founder is not choosing models) |
| cron job / pipeline / the fleet | the scheduled jobs / the automated desk |
| commit, repo, deploy, merge | say what changed for the user, and when it went live |
| tokens, per-million rates | the cost of a run, in dollars |

## 6. The gate
Draft the message to a scratch file and run:

```bash
node scripts/check-slack-report.mjs <file>
```

Exit 0 = postable. Exit 1 = the listed errors must be fixed first (missing section, over budget, internal
jargon or raw ids in the body, a table, emoji overload, an ask with no action, a preamble before the
headline). This is a hard gate, same class as `scripts/verify-build.sh`: never post a report the gate
rejects, and never weaken the gate to make a report pass. If a rule is genuinely wrong, patch this file
(factory rule 6) and say so in the record section.

**Gate the message, not the draft.** The gate only sees a file; the founder sees your final response. Emit
the gated file's text verbatim as that response — no greeting, no summary line, no sign-off. Post-hoc
compliance is checked by `scripts/check-slack-posts.mjs` (the `Slack Report Gate` job), which re-gates the
message that was actually delivered; a preamble that slipped through shows up there as a failure against
your job.

## 7. Where this binds
Every factory message to Slack `#loop-ai`, including: Growth Watchdog and Build Watchdog runs, the Daily
Proactive Sweep, the Weekly Market Recon, Seeder payloads, Simon's PRD review payloads, and any escalation
posted by hand. Simon's PRD payload keeps its decision fields (verdict, candidates, asks) but uses this
anatomy and these language rules.
