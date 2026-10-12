#!/usr/bin/env node
/**
 * voiceover.mjs — ElevenLabs narration for one product.
 *
 *   node scripts/launch-video/voiceover.mjs --slug spendproof
 *   node scripts/launch-video/voiceover.mjs --slug spendproof --dry-run   # print the request, call nothing
 *
 * Reads  content/launch_videos/<slug>/narration.txt  (+ brag.mp4 for the duration check)
 * Writes content/launch_videos/<slug>/voiceover.mp3 and voiceover.json
 * Exits non-zero on: missing key/voice, narration outside the video's budget, HTTP error, empty audio.
 * There is NO fallback voice and NO silent truncation.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import { buildTtsRequest, DEFAULT_OUTPUT_FORMAT, DEFAULT_TTS_MODEL } from "../../src/lib/launch-video/elevenlabs.ts";
import { assertNarrationFits, countWords } from "../../src/lib/launch-video/narration.ts";
import { parseFfprobeDuration } from "../../src/lib/launch-video/ffmpeg.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));

const argv = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};
const dryRun = argv.includes("--dry-run");
const slug = flag("--slug");
if (!slug) {
  console.error("usage: node scripts/launch-video/voiceover.mjs --slug <slug> [--dry-run]");
  process.exit(2);
}

const outDir = join(REPO, "content", "launch_videos", slug);
const narrationPath = flag("--narration", join(outDir, "narration.txt"));
const videoPath = flag("--video", join(outDir, "brag.mp4"));
const outPath = flag("--out", join(outDir, "voiceover.mp3"));
const { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL, ELEVENLABS_OUTPUT_FORMAT } = requireEnv(
  process.env, ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"], join(REPO, ".env"),
);

const narration = readFileSync(narrationPath, "utf8").trim();
if (!narration) throw new Error(`${narrationPath} is empty — the agent must write the narration first`);

const videoJson = JSON.parse(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "json", videoPath,
], { encoding: "utf8" }));
const videoSeconds = parseFfprobeDuration(videoJson);

const words = countWords(narration);
assertNarrationFits({ words, videoSeconds });

const { url, init } = buildTtsRequest({
  apiKey: ELEVENLABS_API_KEY,
  voiceId: ELEVENLABS_VOICE_ID,
  text: narration,
  modelId: ELEVENLABS_MODEL || DEFAULT_TTS_MODEL,
  outputFormat: ELEVENLABS_OUTPUT_FORMAT || DEFAULT_OUTPUT_FORMAT,
});

if (dryRun) {
  console.log(`DRY RUN → POST ${url}`);
  console.log(`  xi-api-key: ***${ELEVENLABS_API_KEY.slice(-4)}`);
  console.log(`  words=${words} videoSeconds=${videoSeconds.toFixed(2)} budget=${(videoSeconds - 0.5).toFixed(2)}s`);
  console.log(`  body.model_id=${JSON.parse(init.body).model_id}`);
  process.exit(0);
}

const res = await fetch(url, init);
if (!res.ok) {
  console.error(`ElevenLabs TTS failed: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
const audio = Buffer.from(await res.arrayBuffer());
if (audio.length < 1000) {
  console.error(`ElevenLabs returned ${audio.length} bytes — refusing to write an empty voiceover`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, audio);

const voJson = JSON.parse(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "json", outPath,
], { encoding: "utf8" }));
const voiceoverSeconds = parseFfprobeDuration(voJson);
assertNarrationFits({ words, videoSeconds: videoSeconds, margin: 0.5 });

writeFileSync(join(outDir, "voiceover.json"), JSON.stringify({
  slug, words, voiceId: ELEVENLABS_VOICE_ID,
  modelId: ELEVENLABS_MODEL || DEFAULT_TTS_MODEL,
  outputFormat: ELEVENLABS_OUTPUT_FORMAT || DEFAULT_OUTPUT_FORMAT,
  bytes: statSync(outPath).size, videoSeconds, voiceoverSeconds,
}, null, 2));

console.log(`voiceover.mp3 ${voiceoverSeconds.toFixed(2)}s (${words} words) over a ${videoSeconds.toFixed(2)}s video — OK`);
