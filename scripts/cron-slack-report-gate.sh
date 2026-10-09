#!/usr/bin/env bash
# Slack Report Gate — re-gate the Slack message each factory cron job actually delivered.
#
# Watchdog contract (same as the Editorial Verify Gate): print nothing when every recent factory
# report passes the writing standard (empty stdout = silent delivery), print a short plain-English
# report and exit non-zero otherwise. Wired to the `Slack Report Gate` cron job via
# ~/.hermes/scripts/slack_report_gate.sh (--no-agent --script: no model call).
#
# Why this exists: the factory's #loop-ai reports are gated against skills/slack_reporting.md by
# scripts/check-slack-report.mjs, but the agent runs that gate on its own scratch draft while the
# founder reads the agent's final response. On 2026-10-08 the Daily Proactive Sweep reported a clean
# gate and still shipped a preamble carrying a commit id and a script name. The logic lives in
# scripts/check-slack-posts.mjs, which re-gates the text that was actually sent.
set -uo pipefail

REPO="${FACTORY_REPO:-/root/software-factory-core}"
cd "$REPO" 2>/dev/null || {
  echo "Slack Report Gate: repo not found at $REPO"
  exit 1
}

exec node scripts/check-slack-posts.mjs
