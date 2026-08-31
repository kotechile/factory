#!/usr/bin/env bash
# Manual trigger for the daily "Do Smart Things" proactive sweep.
# Scheduled Hermes cron job: "[bot:simon] Daily Proactive Sweep" (08:00 EST daily).
set -euo pipefail
hermes cron run "Daily Proactive Sweep"
