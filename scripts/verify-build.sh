#!/usr/bin/env bash
set -e
echo "Running factory build verification..."
npx tsc --noEmit
npm run lint
npm run build
echo "Verification passed."
