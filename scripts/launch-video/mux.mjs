#!/usr/bin/env node
/**
 * mux.mjs — brag.mp4 + voiceover.mp3 → launch.mp4 (the file that goes to YouTube).
 *   node scripts/launch-video/mux.mjs --slug spendproof
 * Music is ducked under the voice when the brag has an audio stream; if it does not, the voice
 * is laid over silently (a legitimate shape, not a fallback — logged explicitly).
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMuxArgs } from "../../src/lib/launch-video/ffmpeg.ts";

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

const streams = JSON.parse(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "stream=codec_type", "-of", "json", video,
], { encoding: "utf8" }));
const hasMusic = (streams.streams ?? []).some((s) => s.codec_type === "audio");
console.log(`brag.mp4 audio stream: ${hasMusic ? "present — music will be ducked under the voice" : "absent — voice-only mix"}`);

execFileSync("ffmpeg", buildMuxArgs({ video, voiceover, output, hasMusic }), { stdio: "inherit" });
if (!existsSync(output)) throw new Error("ffmpeg exited 0 but launch.mp4 does not exist");
console.log(`wrote ${output}`);
