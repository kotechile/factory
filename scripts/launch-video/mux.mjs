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
  planTail,
  SILENCE_MIN_DURATION,
  SILENCE_NOISE_DB,
} from "../../src/lib/launch-video/ffmpeg.ts";
import { bedTrackForSlug } from "../../src/lib/launch-video/music.ts";

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

const voiceoverSeconds = parseFfprobeDuration(
  JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "json", voiceover],
      { encoding: "utf8" },
    ),
  ),
);

// The tail: the bed keeps playing after the narration's last word and fades out, instead of the
// video cutting on the final syllable. `planTail` owns both numbers (how much to add, where to fade).
const tail = hasMusic ? planTail({ videoSeconds, voiceSeconds: voiceoverSeconds }) : null;
let bedFile;
if (tail && tail.padSeconds > 0 && hasBed) {
  const track = bedTrackForSlug(slug);
  bedFile = join(dir, "composition", "assets", "music", track.file);
  if (!existsSync(bedFile)) {
    throw new Error(
      `this mix needs ${tail.padSeconds.toFixed(2)}s of music past the render, but the derived bed is ` +
        `not on disk: ${bedFile}\n  run: node scripts/launch-video/pick-track.mjs --slug ${slug} ` +
        `--copy-to ${join(dir, "composition")}\n  the tail cannot be invented from a stream that ends with the video`,
    );
  }
}
if (!hasMusic) {
  console.log("tail: skipped — brag.mp4 carries no audio, so there is no music to continue");
} else {
  const musicAfterVoice = tail.totalSeconds - voiceoverSeconds;
  console.log(
    `tail: voice ends ${voiceoverSeconds.toFixed(2)}s of ${tail.totalSeconds.toFixed(2)}s → ` +
      `${musicAfterVoice.toFixed(2)}s of music ` +
      `(pad ${tail.padSeconds.toFixed(2)}s${tail.padSeconds > 0 ? ", last frame held" : ""}, ` +
      `fade ${tail.fadeStartSeconds === null ? "none — no room past the voice" : `from ${tail.fadeStartSeconds.toFixed(2)}s`})`,
  );
}

execFileSync(
  "ffmpeg",
  buildMuxArgs({ video, voiceover, output, hasMusic, hasBed, tail: tail ?? undefined, bedFile, videoSeconds }),
  { stdio: "inherit" },
);
if (!existsSync(output)) throw new Error("ffmpeg exited 0 but launch.mp4 does not exist");

// The pad is the whole point of this step, so measure it rather than trusting the filter string.
const written = parseFfprobeDuration(
  JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "json", output],
      { encoding: "utf8" },
    ),
  ),
);
const expected = tail ? tail.totalSeconds : videoSeconds;
if (Math.abs(written - expected) > 0.12) {
  throw new Error(
    `launch.mp4 is ${written.toFixed(2)}s but the tail plan said ${expected.toFixed(2)}s — ` +
      `the pad did not land; refusing to ship a video whose ending does not match what was measured`,
  );
}
console.log(
  `wrote ${output} — ${written.toFixed(2)}s ` +
    `(render ${videoSeconds.toFixed(2)}s + ${(written - videoSeconds).toFixed(2)}s tail, ` +
    `${(written - voiceoverSeconds).toFixed(2)}s of music after the voice)`,
);

