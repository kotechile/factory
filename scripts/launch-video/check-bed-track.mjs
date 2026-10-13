#!/usr/bin/env node
/**
 * check-bed-track.mjs — the gate behind "the bed is derived from the slug".
 *
 *   node scripts/launch-video/check-bed-track.mjs --slug spendproof
 *   node scripts/launch-video/check-bed-track.mjs --slug spendproof --dir <composition-dir>
 *
 * `pick-track.mjs` tells the author which bed to use; this proves they used it. Without a gate the
 * rule is only as reliable as the instruction being read, which is exactly how every launch ended up
 * on the same track before.
 *
 * Exit 0 pass · 1 fail · 2 usage error.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { bedTrackForSlug } from "../../src/lib/launch-video/music.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};
const slug = flag("--slug");
if (!slug) {
  console.error("usage: node scripts/launch-video/check-bed-track.mjs --slug <slug> [--dir <composition-dir>]");
  process.exit(2);
}

const slugDir = join(REPO, "content", "launch_videos", slug);
const compositionDir = flag("--dir") ?? join(slugDir, "composition");
if (!existsSync(compositionDir)) {
  console.error(`FAIL: no composition directory at ${compositionDir}`);
  process.exit(1);
}

const derived = bedTrackForSlug(slug);
const problems = [];

/** Every `assets/music/<file>.mp3` reference in the composition's HTML. */
function htmlFiles(dir, depth = 0) {
  if (depth > 4) return [];
  const found = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "snapshots" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...htmlFiles(path, depth + 1));
    else if (entry.endsWith(".html")) found.push(path);
  }
  return found;
}

const referenced = new Set();
for (const file of htmlFiles(compositionDir)) {
  for (const match of readFileSync(file, "utf8").matchAll(/assets\/music\/([A-Za-z0-9._-]+\.mp3)/g)) {
    referenced.add(match[1]);
  }
}

if (referenced.size === 0) {
  // A cues-only edit is legitimate, but it has to be a recorded decision, not an omission.
  const planPath = join(slugDir, "brag-plan.md");
  const plan = existsSync(planPath) ? readFileSync(planPath, "utf8") : "";
  if (/(cues[- ]only|no music bed|no bed)/i.test(plan)) {
    console.log(`OK  ${slug}: no bed referenced and brag-plan.md records the cues-only decision.`);
    process.exit(0);
  }
  console.error(
    `FAIL ${slug}: the composition references no bed track.\n` +
      `  Either mount the derived bed (${derived.file}) or record the cues-only decision in\n` +
      `  ${relative(REPO, planPath)} — silence is not an override.`,
  );
  process.exit(1);
}

if (referenced.size > 1) {
  problems.push(`references ${referenced.size} different beds: ${[...referenced].join(", ")}`);
}
for (const file of referenced) {
  if (file !== derived.file) {
    problems.push(
      `uses ${file}, but the bed derived from the slug is ${derived.file}\n` +
        `       run: node scripts/launch-video/pick-track.mjs --slug ${slug} --copy-to ${relative(REPO, compositionDir)}`,
    );
  }
  if (!existsSync(join(compositionDir, "assets", "music", file))) {
    problems.push(`references ${file}, which is not present in ${relative(REPO, compositionDir)}/assets/music/`);
  }
}

if (problems.length > 0) {
  console.error(`FAIL ${slug}: the composition's bed does not match the derived track.`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(`  derived for "${slug}": ${derived.file} (${derived.character})`);
  process.exit(1);
}

console.log(`OK  ${slug}: bed is the derived ${derived.file} (${derived.character}).`);
