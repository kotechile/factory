#!/usr/bin/env node
/**
 * check-craft.mjs — the gate that asks whether the video actually MOVES.
 *
 *   node scripts/launch-video/check-craft.mjs --slug spendproof
 *   node scripts/launch-video/check-craft.mjs --file path/to/launch.mp4 --montage /tmp/m.jpg
 *   node scripts/launch-video/check-craft.mjs --slug spendproof --json
 *
 * Sample the picture twice a second at 320x180 grayscale and measure how much it changes between
 * samples. A held beat is craft; a scene that sits frozen for three seconds is a slide, and the audit
 * that ships these films (`hyperframes check`) does not look at motion at all. Exit 0 = the film
 * moves, 1 = it does not, 2 = usage or media error.
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyseMotion, craftProblems, sampleMotion, SAMPLE_FPS } from "../../src/lib/launch-video/craft.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};
const slug = flag("--slug");
const file = flag("--file") ?? (slug ? join(REPO, "content", "launch_videos", slug, "launch.mp4") : undefined);
if (!file) {
  console.error("usage: node scripts/launch-video/check-craft.mjs (--slug <slug> | --file <mp4>) [--json] [--montage <jpg>]");
  process.exit(2);
}

const seconds = Number(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], {
    encoding: "utf8",
  }).trim(),
);

const { deltas, samples: frames } = sampleMotion(file);
const report = analyseMotion(deltas);
const problems = craftProblems(report);

if (flag("--montage")) {
  const target = flag("--montage");
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", file,
    "-vf", `fps=1/${Math.max(1, seconds / 6).toFixed(2)},scale=640:-1,tile=3x2`,
    "-frames:v", "1", target,
  ]);
  console.log(`montage: ${target} — look at it before you ship`);
}

if (argv.includes("--json")) {
  console.log(JSON.stringify({ file, seconds, frames, ...report, problems }, null, 2));
} else {
  console.log(`craft: ${file}`);
  console.log(
    `  ${report.seconds.toFixed(1)}s at ${SAMPLE_FPS} samples/s · median change ${report.medianDelta.toFixed(2)}/255` +
      ` · max ${report.maxDelta.toFixed(1)} · ${report.beats} beats`,
  );
  console.log(
    `  frozen ${Math.round(report.staticFraction * 100)}% of the runtime · longest frozen stretch ` +
      `${report.longestStaticRunSeconds.toFixed(1)}s`,
  );
  const worst = [...report.trace].sort((a, b) => a.delta - b.delta).slice(0, 3);
  console.log(`  stillest samples: ${worst.map((s) => `t=${s.t.toFixed(1)}s d=${s.delta.toFixed(2)}`).join(" · ")}`);
  if (problems.length === 0) {
    console.log("  PASS — the picture keeps moving");
  } else {
    for (const problem of problems) console.error(`  FAIL — ${problem}`);
  }
}

process.exit(problems.length === 0 ? 0 : 1);
