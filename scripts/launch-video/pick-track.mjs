#!/usr/bin/env node
/**
 * pick-track.mjs — print the bed track a product's launch video must use.
 *
 *   node scripts/launch-video/pick-track.mjs --slug spendproof
 *   node scripts/launch-video/pick-track.mjs --slug spendproof --json
 *   node scripts/launch-video/pick-track.mjs --slug spendproof --copy-to <composition-dir>
 *
 * The choice is derived from the slug (src/lib/launch-video/music.ts), so it is the same on every
 * run and different across the catalog. Do not hand-pick the bed: run this, then point the
 * composition's music element at the file it names. If a derived track genuinely fights the
 * product's tone, override it and record the reason in brag-plan.md — silence is not an override.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BED_TRACKS, bedTrackForSlug, bedTrackIndex } from "../../src/lib/launch-video/music.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** The bundled music lives with the brag skill, which is installed outside this repo. */
const BED_SOURCE_DIRS = [
  join(REPO, "content", "launch_videos", "_beds"),
  "/root/.hermes/skills/creative/brag/assets/music",
];

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};
const slug = flag("--slug");
if (!slug) {
  console.error("usage: node scripts/launch-video/pick-track.mjs --slug <slug> [--json] [--copy-to <composition-dir>]");
  process.exit(2);
}

const asJson = argv.includes("--json");
const copyTo = flag("--copy-to");
const track = bedTrackForSlug(slug);
const index = bedTrackIndex(slug);

if (copyTo) {
  const source = BED_SOURCE_DIRS.map((dir) => join(dir, track.file)).find((path) => existsSync(path));
  if (!source) {
    console.error(
      `the bed catalog is not on this machine — looked in:\n  ${BED_SOURCE_DIRS.join("\n  ")}\n` +
        `install it (npx hyperframes skills) or copy ${track.file} into content/launch_videos/_beds/`,
    );
    process.exit(1);
  }
  const destination = join(copyTo, "assets", "music");
  mkdirSync(destination, { recursive: true });
  copyFileSync(source, join(destination, track.file));
  console.error(`copied ${track.file} → ${join(destination, track.file)}`);
}

if (asJson) {
  console.log(JSON.stringify({ slug, index, catalogSize: BED_TRACKS.length, ...track }, null, 2));
} else {
  console.log(track.file);
}
