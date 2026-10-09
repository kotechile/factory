#!/usr/bin/env node
/**
 * check-slack-posts.mjs — re-gate the Slack message each factory job ACTUALLY delivered.
 *
 * Why this exists: scripts/check-slack-report.mjs is run by the agent against a scratch *draft*, but
 * the founder reads the agent's *final response*. Observed live (2026-10-08): the Daily Proactive
 * Sweep reported "the report passed check-slack-report.mjs (exit 0, 250 body words)" and then
 * delivered a 261-character preamble carrying a commit id and a script name — the gate passed on a
 * file the founder never saw. A gate the model runs on its own draft is documentation, in the same
 * class as an unscheduled verify.sh. This script closes the loop by gating the delivered text.
 *
 * Watchdog contract (same as the Editorial Verify Gate): print NOTHING when every recent factory
 * post passes (empty stdout = silent delivery), print a short plain-English report and exit
 * non-zero otherwise. Wired to the `Slack Report Gate` cron job via
 * ~/.hermes/scripts/slack_report_gate.sh (--no-agent, no model call).
 *
 * Env overrides (for testing both paths by hand):
 *   SLACK_GATE_WINDOW_HOURS=0    -> nothing is in window, so the green/silent path
 *   SLACK_GATE_STATE=<path>      -> use a scratch state file
 */

import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const GATE = join(REPO, "scripts", "check-slack-report.mjs");
const HERMES = process.env.HERMES_HOME || join(homedir(), ".hermes");
const JOBS_FILE = join(HERMES, "cron", "jobs.json");
const STATE_DB = join(HERMES, "state.db");
const STATE_FILE = process.env.SLACK_GATE_STATE || join(HERMES, "state", "slack_report_gate.json");
const WINDOW_HOURS = Number(process.env.SLACK_GATE_WINDOW_HOURS || 36);

// Every job whose final response is delivered to the founder as a factory report.
const JOB_NAMES = ["Daily Proactive Sweep", "Weekly Market Recon", "Build Watchdog", "Growth Watchdog"];

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
};

let jobs;
try {
  const raw = readJson(JOBS_FILE, null);
  jobs = Array.isArray(raw) ? raw : raw?.jobs;
} catch {
  jobs = null;
}
if (!Array.isArray(jobs)) {
  console.log(`Slack Report Gate: cannot read the job store at ${JOBS_FILE}`);
  process.exit(1);
}

const state = readJson(STATE_FILE, { checked: [] });
const checked = new Set(state.checked || []);
const problems = [];
const seen = [];
let gateable = 0;

let db;
try {
  db = new DatabaseSync(STATE_DB, { readOnly: true });
} catch (e) {
  console.log(`Slack Report Gate: cannot open the session store at ${STATE_DB} — ${e.message}`);
  process.exit(1);
}

const cutoff = Date.now() / 1000 - WINDOW_HOURS * 3600;

for (const name of JOB_NAMES) {
  if (!jobs.some((j) => (j.name || "") === name)) continue; // job retired -> nothing to check

  const rows = db
    .prepare("select id, title, started_at, end_reason from sessions where title like ? order by started_at desc limit 5")
    .all(`${name}%`);

  for (const row of rows) {
    const started = Number(row.started_at);
    if (!(started >= cutoff)) break; // ordered newest-first: every remaining run is older
    if (checked.has(row.id)) continue;
    const er = row.end_reason ?? "";
    if (er && !["cron_complete", "ok"].includes(er)) continue; // died mid-flight: no report was delivered

    const msgs = db
      .prepare("select content from messages where session_id = ? and role = 'assistant' and content is not null order by rowid desc limit 6")
      .all(row.id);
    const text = msgs.map((m) => m.content || "").find((c) => c.trim().length > 150);
    if (!text) continue; // silent run ([SILENT]) or nothing delivered

    gateable += 1;
    const tmp = join(tmpdir(), `slack-post-${row.id}.md`);
    writeFileSync(tmp, text);
    let out = "";
    let ok = true;
    try {
      out = execFileSync("node", [GATE, tmp], { encoding: "utf8", cwd: REPO });
    } catch (e) {
      ok = false;
      out = `${e.stdout || ""}${e.stderr || ""}`;
    } finally {
      rmSync(tmp, { force: true });
    }
    seen.push(row.id);

    if (!ok) {
      const clean = (s) => {
        let t = s.replace(/^FAIL\s+line\s+[\d-]+:\s*/, "");
        t = t.replace(/^missing required section (".+?").*$/, "the $1 section is missing or out of order");
        t = t.replace(/\s*—\s*say what it means.*$/, "");
        t = t.replace(/\s*—\s*raw machine detail belongs.*$/, "");
        t = t.replace(/\s*—\s*tables break on mobile.*$/, "");
        return t.trim();
      };
      const reasons = out.split("\n").filter((l) => l.startsWith("FAIL")).map(clean);
      problems.push({
        job: name,
        when: new Date(started * 1000).toISOString().slice(0, 16).replace("T", " "),
        reasons: reasons.slice(0, 3),
        count: Math.max(reasons.length, 1),
      });
    }
  }
}

db.close();

// remember what we looked at so a bad post is reported once, not every night
if (seen.length) {
  const next = [...checked, ...seen].slice(-200);
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ checked: next, updated_at: new Date().toISOString() }, null, 1));
}

if (!gateable || !problems.length) process.exit(0); // silent = every delivered report was postable

const total = problems.reduce((n, p) => n + p.count, 0);
console.log(
  `Slack Report Gate: ${problems.length} of the last ${gateable} delivered report(s) break our own writing standard (${total} fault(s)).`,
);
console.log("");
for (const p of problems) {
  console.log(`- ${p.job} (${p.when} UTC) sent a message the gate rejects:`);
  for (const r of p.reasons) console.log(`    · ${r}`);
}
console.log("");
console.log("What this means: the founder read a report the factory's own gate would have blocked. What the");
console.log("agent checked was a draft file, not the text it actually sent.");
console.log("Re-check any message by hand: node scripts/check-slack-report.mjs <file>");
process.exit(1);
