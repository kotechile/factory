#!/usr/bin/env node
/**
 * voices.mjs — list the ElevenLabs voices available to this account.
 *   node scripts/launch-video/voices.mjs --list
 * Prints: id  name  label. Copy the id into ELEVENLABS_VOICE_ID in .env.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import { ELEVENLABS_API, parseVoices } from "../../src/lib/launch-video/elevenlabs.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));
const { ELEVENLABS_API_KEY } = requireEnv(process.env, ["ELEVENLABS_API_KEY"], join(REPO, ".env"));

const res = await fetch(`${ELEVENLABS_API}/v1/voices`, { headers: { "xi-api-key": ELEVENLABS_API_KEY } });
if (!res.ok) {
  console.error(`ElevenLabs /v1/voices failed: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
for (const v of parseVoices(await res.json())) {
  console.log(`${v.id}\t${v.name}\t${v.label ?? ""}`);
}
