#!/usr/bin/env bash
set -e
echo "Running factory build verification..."
npx tsc --noEmit
npm run lint
npm run check:tokens
npm run test
npm run build
npm run test:e2e
echo "Verification passed."
