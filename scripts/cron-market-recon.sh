#!/usr/bin/env bash
# Manual trigger for Simon's Weekly Autonomous Market Recon Sweep.
# The scheduled run itself is a Hermes cron job: "[bot:simon] Weekly Market Recon"
# (Monday 06:00 EST). This script exists for manual invocation and CI/Coolify hooks.
set -euo pipefail

# Trigger the Hermes cron job to run on the next scheduler tick.
hermes cron run "Weekly Market Recon"

# Alternatively, run Simon directly in one-shot mode:
# hermes -p simon chat -q "Run the weekly market recon per skills/market_recon_last30days.md"
