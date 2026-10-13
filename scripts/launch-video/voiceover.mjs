#!/usr/bin/env node
/**
 * voiceover.mjs — narration for one product.
 *
 *   node scripts/launch-video/voiceover.mjs --slug spendproof
 *   node scripts/launch-video/voiceover.mjs --slug spendproof --voice af_heart
 *   node scripts/launch-video/voiceover.mjs --slug spendproof --tts elevenlabs
 *   node scripts/launch-video/voiceover.mjs --slug spendproof --speed 0.9
 *   node scripts/launch-video/voiceover.mjs --slug spendproof --dry-run   # plan only, calls nothing
 *
 * Default TTS is Kokoro (local, via `npx hyperframes tts`) — the voice the `brag` skill itself
 * documents — and the voice is DERIVED FROM THE SLUG unless `--voice` overrides it. ElevenLabs is
 * still available behind `--tts elevenlabs` for A/B comparison; it is no longer the default.
 *
 * Kokoro needs `kokoro-onnx` + `soundfile` in a python the TTS CLI can see; point
 * HYPERFRAMES_PYTHON at such a venv (set in .env for this repo).
 *
 * Reads  content/launch_videos/<slug>/narration.txt (+ brag.mp4 for the duration checks)
 * Writes content/launch_videos/<slug>/voiceover.wav (lossless), voiceover.mp3 (what the mux reads)
 *        and voiceover.json
 * Exits non-zero on: unknown voice, empty narration, narration outside the word budget, a
 * synthesized take that would overrun the video, TTS failure, empty audio.
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
import { assertKnownVoice, voiceForSlug } from "../../src/lib/launch-video/voice.ts";

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
  console.error("usage: node scripts/launch-video/voiceover.mjs --slug <slug> [--tts kokoro|elevenlabs] [--voice <id>] [--speed 1.0] [--dry-run]");
  process.exit(2);
}

const outDir = join(REPO, "content", "launch_videos", slug);
const narrationPath = flag("--narration", join(outDir, "narration.txt"));
const videoPath = flag("--video", join(outDir, "brag.mp4"));
const outPath = flag("--out", join(outDir, "voiceover.mp3"));
const wavPath = join(outDir, "voiceover.wav");
const compositionDir = join(outDir, "composition");
const provider = flag("--tts", "kokoro");
const speed = flag("--speed", "0.95");

const narration = readFileSync(narrationPath, "utf8").trim();
if (!narration) throw new Error(`${narrationPath} is empty — the agent must write the narration first`);

const videoSeconds = parseFfprobeDuration(JSON.parse(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "json", videoPath,
], { encoding: "utf8" })));

const words = countWords(narration);
assertNarrationFits({ words, videoSeconds });

/**
 * The word budget above is an estimate. This is the measured check: the mux bounds the mix to the
 * video (`amix=duration=first`), so a take that runs long is cut mid-sentence with nothing failing.
 */
function assertTakeFits(seconds) {
  if (seconds > videoSeconds - 0.5) {
    console.error(
      `the narrated take is ${seconds.toFixed(2)}s but only ${(videoSeconds - 0.5).toFixed(2)}s of a ` +
      `${videoSeconds.toFixed(2)}s video is usable — the mux would cut it off mid-sentence. ` +
      `Shorten the script or raise --speed.`,
    );
    process.exit(1);
  }
}

function probeSeconds(path) {
  return parseFfprobeDuration(JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "json", path,
  ], { encoding: "utf8" })));
}

mkdirSync(outDir, { recursive: true });

let voiceId;
let modelId = null;
let outputFormat = null;

if (provider === "kokoro") {
  voiceId = flag("--voice", voiceForSlug(slug).id);
  assertKnownVoice(voiceId);
  if (dryRun) {
    console.log(`DRY RUN → npx hyperframes tts (Kokoro, local)`);
    console.log(`  voice: ${voiceId}${flag("--voice") ? " (explicit --voice)" : ` (derived from "${slug}")`}`);
    console.log(`  speed: ${speed}`);
    console.log(`  out:   ${wavPath} → ${outPath}`);
    console.log(`  words=${words} videoSeconds=${videoSeconds.toFixed(2)} budget=${(videoSeconds - 0.5).toFixed(2)}s`);
    process.exit(0);
  }
  console.log(`Kokoro ${voiceId} · speed ${speed} · ${words} words`);
  execFileSync("npx", [
    "hyperframes", "tts",
    "--text-file", narrationPath,
    "--voice", voiceId,
    "--speed", speed,
    "-o", wavPath,
  ], { cwd: compositionDir, stdio: "inherit" });
  if (!statSync(wavPath).size) throw new Error(`Kokoro wrote an empty ${wavPath}`);
  // -q:a 2 ≈ 190 kbps VBR: transparent for speech, and keeps the rest of the pipeline on .mp3
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", wavPath, "-c:a", "libmp3lame", "-q:a", "2", outPath]);
  modelId = "kokoro-82m";
  outputFormat = "wav→mp3(libmp3lame -q:a 2)";
} else if (provider === "elevenlabs") {
  const { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL, ELEVENLABS_OUTPUT_FORMAT } = requireEnv(
    process.env, ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"], join(REPO, ".env"),
  );
  voiceId = flag("--voice", ELEVENLABS_VOICE_ID);
  modelId = ELEVENLABS_MODEL || DEFAULT_TTS_MODEL;
  outputFormat = ELEVENLABS_OUTPUT_FORMAT || DEFAULT_OUTPUT_FORMAT;
  const { url, init } = buildTtsRequest({
    apiKey: ELEVENLABS_API_KEY, voiceId, text: narration, modelId, outputFormat,
  });
  if (dryRun) {
    console.log(`DRY RUN → POST ${url}`);
    console.log(`  voiceId: ${voiceId}  model: ${modelId}`);
    console.log(`  words=${words} videoSeconds=${videoSeconds.toFixed(2)}`);
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
  writeFileSync(outPath, audio);
} else {
  console.error(`unknown --tts provider "${provider}" — expected kokoro or elevenlabs`);
  process.exit(2);
}

const voiceoverSeconds = probeSeconds(outPath);
assertTakeFits(voiceoverSeconds);

writeFileSync(join(outDir, "voiceover.json"), JSON.stringify({
  slug, words, provider, voiceId, modelId, outputFormat, speed,
  bytes: statSync(outPath).size, videoSeconds, voiceoverSeconds,
}, null, 2));

console.log(`voiceover.mp3 ${voiceoverSeconds.toFixed(2)}s (${words} words, ${provider}/${voiceId}) over a ${videoSeconds.toFixed(2)}s video — OK`);
