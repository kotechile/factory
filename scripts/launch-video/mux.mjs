#!/usr/bin/env node
/**
 * mux.mjs — brag.mp4 + voiceover.mp3 → launch.mp4 (the file that goes to YouTube).
 *
 * The brag's audio is bed + motion-matched cues in ONE stream, so the mux cannot split them. What it
 * can do is ask whether there is a bed to duck at all: it measures how much of the video carries
 * audio, and a cues-only edit — where nearly all of the 22s is silent — keeps its cues at full level
 * instead of being compressed by the same sidechain that exists to make room for a music bed.
 *
 * If that measurement cannot be taken the run SAYS SO and falls back to ducking, which is the
 * behaviour this script shipped with. It is never a silent downgrade (AGENTS.md rule 5).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  audibleFraction,
  buildMuxArgs,
  detectsContinuousBed,
  parseFfprobeDuration,
  parseSilenceSpans,
  SILENCE_MIN_DURATION,
  SILENCE_NOISE_DB,
} from "../../src/lib/launch-video/ffmpeg.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const argv = process.argv.slice(2);
const slug = argv[argv.indexOf("--slug") + 1];
if (!slug || argv.indexOf("--slug") === -1) {
  console.error("usage: node scripts/launch-video/mux.mjs --slug <slug>");
  process.exit(2);
}

const dir = join(REPO, "content", "launch_videos", slug);
const video = join(dir, "brag.mp4");
const voiceover = join(dir, "voiceover.mp3");
const output = join(dir, "launch.mp4");
for (const f of [video, voiceover]) {
  if (!existsSync(f)) throw new Error(`missing ${f} — run the earlier pipeline steps first`);
}

const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type:format=duration", "-of", "json", video],
    { encoding: "utf8" },
  ),
);
const videoSeconds = parseFfprobeDuration(probe);
const hasMusic = (probe.streams ?? []).some((s) => s.codec_type === "audio");

let hasBed = hasMusic;
if (!hasMusic) {
  console.log("brag.mp4 audio: absent — voice-only mix");
} else {
  const measured = spawnSync(
    "ffmpeg",
    [
      "-v", "info",
      "-i", video,
      "-af", `silencedetect=noise=${SILENCE_NOISE_DB}dB:d=${SILENCE_MIN_DURATION}`,
      "-f", "null", "-",
    ],
    { encoding: "utf8" },
  );
  if (measured.status !== 0) {
    const last = (measured.stderr ?? "").trim().split("\n").filter(Boolean).slice(-1)[0] ?? "";
    console.warn(
      `WARNING: could not measure the brag's audio (silencedetect exited ${measured.status}) — ` +
        `falling back to ducking the brag audio under the voice. ${last}`,
    );
  } else {
    const spans = parseSilenceSpans(measured.stderr ?? "", videoSeconds);
    const fraction = audibleFraction(spans, videoSeconds);
    hasBed = detectsContinuousBed(spans, videoSeconds);
    console.log(
      `brag.mp4 audio: audible ${(fraction * 100).toFixed(1)}% of ${videoSeconds.toFixed(2)}s → ` +
        (hasBed
          ? "continuous bed found — music ducked under the voice"
          : "cues only — nothing is ducked, the effects stay at full level"),
    );
  }
}

execFileSync("ffmpeg", buildMuxArgs({ video, voiceover, output, hasMusic, hasBed }), {
  stdio: "inherit",
});
if (!existsSync(output)) throw new Error("ffmpeg exited 0 but launch.mp4 does not exist");
console.log(`wrote ${output}`);
