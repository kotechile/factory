# Vendored copy gate

Source: kotechile vibe-marketing.
lexicon 7ef5ec85b710df46
linter d324f2a3ae0154a1

Re-vendor after any lexicon or linter change: node vendor.mjs --to <repo> --name factory-apps --write --hook

Run: npm run copy:check
Build hook: prebuild (VIBE gate runs before every build/deploy).
Extra roots scanned: content/launch_videos (only share-copy.txt, narration.txt)

These files are copies, not forks. Edit the spec in /root/vibe-marketing and re-vendor;
`npm run copy:check` starts with verify-vendor.mjs, which fails on an in-place edit here.
