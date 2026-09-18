#!/usr/bin/env node
/**
 * check-slack-report.mjs — gate a factory Slack report against skills/slack_reporting.md.
 *
 * Usage:
 *   node scripts/check-slack-report.mjs <file>     # lint a draft
 *   node scripts/check-slack-report.mjs -          # lint stdin
 *
 * Exit 0 = the draft follows the human-readable contract. Exit 1 = fix the errors listed.
 * The "Numbers, for the record" section is exempt from the language/word rules: that is the
 * one place raw machine output is allowed to live.
 */

import { readFileSync } from "node:fs";

const BODY_WORD_BUDGET = 250;
const MAX_EMOJI_LINES = 3;

const REQUIRED = [
  ["bottom line", /^bottom line\b/],
  ["what changed", /^what changed\b/],
  ["what i did", /^what i did\b/],
  ["what i need from you", /^what i need from you\b/],
  ["numbers, for the record", /^(numbers|the numbers)\b[\s\S]{0,40}\b(record|audit)\b/],
];

const JARGON = [
  "approval item",
  "provably-external",
  "provably external",
  "on both legs",
  "gate verdict",
  "held",
  "scoped script",
  "test mode",
  "sk_test",
  "sk_live",
  "instrumented_rows",
  "session_id_column",
  "non-ci session",
  "ci session",
  "deploy smoke",
  "quarterline-scoped",
  "blocked-on-traffic",
  "fail-closed",
  "hs/day",
  "ticket",
  "quarterline-scoped script",
];

const TECHNICAL = [
  ["a snake_case database field or event name", /\b[a-z][a-z0-9]*_[a-z0-9_]+\b/],
  ["a commit or session id", /\b(?:[0-9a-f]{7,40})\b/],
  ["a file path or script name", /\b[\w.-]+\.(?:mjs|ts|tsx|md|json|sql|sh|py)\b|\b(?:scripts|src|context|skills|\.agents)\/[\w./-]+/],
  ["a JSON-ish key", /\b[a-z]+[A-Z][a-zA-Z]*\b\s*[:=]/],
];

const ACRONYMS = ["ci", "qa", "pseo", "seo", "mcp", "api", "sql", "csv", "pdf", "webmcp", "gtm", "prd", "sop", "ab"];

const STATUS_EMOJI = ["✅", "⚠️", "⚠", "❌", "🔴", "🟡", "🟢", "🚨", "☠️"];

// ---------------------------------------------------------------- helpers

const strip = (s) =>
  s
    .replace(/\*\*/g, "")
    .replace(/[`_*]/g, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")   // drop bullets, numbering, status emoji
    .trim();

const labelOf = (line) => strip(line).toLowerCase().replace(/[—–-]+$/, "").trim();

const words = (s) => (s.match(/[A-Za-z0-9$%][A-Za-z0-9$%'’,.\/-]*/g) || []).length;

function main() {
  const arg = process.argv[2] || "-";
  const raw = arg === "-" ? readFileSync(0, "utf8") : readFileSync(arg, "utf8");
  const text = raw.replace(/[\u200b\u200c\u200d\ufeff\u2060]/g, "");
  const lines = text.split("\n");

  const errors = [];
  const warnings = [];
  const add = (list, msg, line) => list.push({ msg, line });

  // --- locate the "numbers, for the record" divider: everything after it is the raw appendix.
  let recordIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lab = labelOf(lines[i]);
    if (REQUIRED[4][1].test(lab)) {
      recordIdx = i;
      break;
    }
  }
  const bodyText = recordIdx === -1 ? text : lines.slice(0, recordIdx).join("\n");
  const bodyLines = recordIdx === -1 ? lines : lines.slice(0, recordIdx);

  // --- E1/E9: required sections, in order, non-empty
  let cursor = 0;
  for (const [name, re] of REQUIRED) {
    let found = -1;
    for (let i = cursor; i < lines.length; i++) {
      if (re.test(labelOf(lines[i]))) {
        found = i;
        break;
      }
    }
    if (found === -1) {
      add(errors, `missing required section "${name}" (or it is out of order / not its own bold line)`, 0);
      continue;
    }
    cursor = found + 1;
    const nextStop = lines.slice(cursor).findIndex((l) => REQUIRED.some(([, r]) => r.test(labelOf(l))));
    const afterLabel = (() => {
      const i = lines[found].indexOf(":");
      return i === -1 ? "" : lines[found].slice(i + 1);
    })();
    const chunk = [afterLabel, ...lines.slice(cursor, nextStop === -1 ? lines.length : cursor + nextStop)]
      .map(strip)
      .filter(Boolean);
    if (chunk.length === 0) add(errors, `section "${name}" is empty`, found + 1);
  }

  // --- E2/E3: headline
  const first = bodyLines.findIndex((l) => l.trim().length > 0);
  if (first === -1) {
    add(errors, "empty message", 1);
  } else {
    const head = strip(bodyLines[first]);
    if (REQUIRED.some(([, re]) => re.test(labelOf(bodyLines[first])))) {
      add(errors, "no headline before the first section — open with one plain-English sentence", first + 1);
    }
    if (head.length > 120) add(errors, `headline is ${head.length} chars — keep it under 120`, first + 1);
    if (!/\d{4}-\d{2}-\d{2}|\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i.test(head))
      add(warnings, "headline has no date — a reader cannot tell when this is from", first + 1);
  }

  // --- E4: body word budget (appendix exempt)
  const bw = words(bodyText);
  if (bw > BODY_WORD_BUDGET)
    add(errors, `body is ${bw} words — the budget is ${BODY_WORD_BUDGET} (move detail into the record section)`, 0);

  // --- E5/E6/E7: language rules on the body only
  let inFence = false;
  bodyLines.forEach((raw2, i) => {
    const line = raw2.replace(/[\u200b\u200c\u200d\ufeff\u2060]/g, "");
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const low = strip(line).toLowerCase();
    if (!low) return;
    for (const j of JARGON) {
      const re = new RegExp(`\\b${j.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s|es)?\\b`, "i");
      if (re.test(low)) add(errors, `internal jargon "${j}" in the body — say what it means (appendix-only term)`, i + 1);
    }
    for (const [what, re] of TECHNICAL) {
      const m = strip(line).match(re);
      if (m) add(errors, `body contains ${what} ("${m[0]}") — raw machine detail belongs in the record section`, i + 1);
    }
    if (/^\s*\|.*\|/.test(line)) add(errors, "markdown table in the body — tables break on mobile; use bullets", i + 1);
  });

  // --- E10: the ask section must answer "what do you need from me" explicitly
  const askIdx = lines.findIndex((l) => /^what i need from you\b/.test(labelOf(l)));
  if (askIdx !== -1) {
    const end = lines.findIndex((l, i) => i > askIdx && REQUIRED.some(([, r]) => r.test(labelOf(l))));
    const ask = lines
      .slice(askIdx + 1, end === -1 ? lines.length : end)
      .join(" ")
      .toLowerCase();
    const nothingNeeded = /nothing|no action|you can ignore|none\b/.test(ask);
    const hasAsk = /\b(reply|approve|decide|send|confirm|choose|stop|fund|turn on|set)\b/.test(ask);
    if (!nothingNeeded && !hasAsk)
      add(errors, 'the ask section names no action — either list the action + the exact reply, or write "Nothing — you can ignore this report."', askIdx + 1);
    if (!nothingNeeded && !/if (you|nothing|it|this|neither|no)/.test(ask))
      add(warnings, "the ask section does not say what happens if the founder does nothing", askIdx + 1);
  }

  // --- E8: status emoji discipline, and acronym discipline
  const emojiLines = bodyLines.filter((l) => STATUS_EMOJI.some((e) => l.includes(e))).length;
  if (emojiLines > MAX_EMOJI_LINES)
    add(errors, `${emojiLines} status-emoji lines — at most ${MAX_EMOJI_LINES}; a wall of warnings stops meaning anything`, 0);
  for (const acr of ACRONYMS) {
    const re = new RegExp(`\\b${acr}\\b`, "i");
    const inBody = bodyLines.filter((l) => re.test(strip(l)));
    if (!inBody.length) continue;
    const beforeAcr = strip(inBody[0]).split(new RegExp(`\\b${acr}\\b`, "i"))[0];
    const expanded = /\(\s*$|[A-Za-z]{3,}\s*\($/.test(beforeAcr) || new RegExp(`[A-Za-z]{3,}\\s*\\(\\s*${acr}\\s*\\)`, "i").test(strip(inBody[0]));
    if (!expanded)
      add(warnings, `"${acr.toUpperCase()}" is not spelled out at first use in the body`, 0);
  }

  // --- report
  const name = arg === "-" ? "<stdin>" : arg;
  if (!errors.length && !warnings.length) {
    console.log(`PASS  ${name} — ${bw} body words, sections complete, no unexplained internals.`);
    return 0;
  }
  for (const w of warnings) console.log(`WARN  line ${w.line || "-"}: ${w.msg}`);
  for (const e of errors) console.log(`FAIL  line ${e.line || "-"}: ${e.msg}`);
  if (errors.length) {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s) in ${name}. Fix the errors and re-run before posting.`);
    return 1;
  }
  console.log(`\n0 errors, ${warnings.length} warning(s) in ${name}. Postable — ${bw} body words.`);
  return 0;
}

process.exit(main());
