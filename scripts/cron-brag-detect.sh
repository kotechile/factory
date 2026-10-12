#!/usr/bin/env bash
# Detector for the Post-Ship Brag cron job. Monitor mode: byte-stable output, one line per pending
# slug ("PENDING <slug> <launchedAt>"). The Hermes cron monitor hashes this; unchanged output
# suppresses the agent run, so this costs no model tokens when nothing shipped.
set -uo pipefail
cd /root/software-factory-core
exec node scripts/launch-video/detect.mjs
