// src/lib/launch-video/voice.ts
/**
 * Which Kokoro narration voice a launch video gets.
 *
 * Derived from the product slug, exactly like the bed track in `music.ts`, so the choice is
 * mechanical, reproducible and spread across the roster: the same product always gets the same
 * voice, and neighbouring products are unlikely to share one. Every launch in the same voice reads
 * as a template; one voice per product reads as a channel.
 *
 * Only the English voices rotate. Kokoro also ships Spanish, French, Japanese and Chinese voices,
 * but a launch video's narration is English, so casting one of those would mispronounce the script.
 * Add them here only when the narration itself is not English.
 *
 * The order of `KOKORO_VOICES` is load-bearing — it IS the modulo space. APPEND new voices at the
 * end. Reordering or removing an entry re-casts every product in the fleet, so `voice.test.ts` pins
 * the current assignments and a reorder fails loudly instead of silently re-casting everything.
 *
 * The derived voice is the DEFAULT, not a cage: an author may override it when the derived voice
 * genuinely fights the product's tone (a funeral-director product does not want the brightest
 * voice), but the override has to be stated in `brag-plan.md` with the reason. Silence is never an
 * override.
 */

export interface NarrationVoice {
  /** The Kokoro voice id handed to `npx hyperframes tts --voice`. */
  readonly id: string;
  readonly name: string;
  readonly accent: string;
  readonly gender: "female" | "male";
}

export const KOKORO_VOICES: readonly NarrationVoice[] = [
  { id: "af_heart", name: "Heart", accent: "American English", gender: "female" },
  { id: "af_nova", name: "Nova", accent: "American English", gender: "female" },
  { id: "af_sky", name: "Sky", accent: "American English", gender: "female" },
  { id: "am_adam", name: "Adam", accent: "American English", gender: "male" },
  { id: "am_michael", name: "Michael", accent: "American English", gender: "male" },
  { id: "bf_emma", name: "Emma", accent: "British English", gender: "female" },
  { id: "bf_isabella", name: "Isabella", accent: "British English", gender: "female" },
  { id: "bm_george", name: "George", accent: "British English", gender: "male" },
];

/** The voice the `brag` skill itself documents as its default, and the fallback for a fresh checkout. */
export const DEFAULT_KOKORO_VOICE = "af_heart";

/**
 * FNV-1a (32-bit) over the normalized slug — the same hash `bedTrackIndex` uses. Small,
 * dependency-free and stable across runs, Node versions and machines; a `Math.random` or a
 * time-based pick would re-cast the fleet on every render, which is the thing this exists to stop.
 */
export function voiceIndex(slug: string): number {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) throw new Error("voiceIndex needs a slug; received an empty string");
  let hash = 0x811c9dc5;
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % KOKORO_VOICES.length;
}

/** The narration voice for a product. Deterministic: same slug, same voice, forever. */
export function voiceForSlug(slug: string): NarrationVoice {
  return KOKORO_VOICES[voiceIndex(slug)];
}

/** Throw on a voice id Kokoro does not have, instead of letting the TTS CLI fail mid-run. */
export function assertKnownVoice(id: string): void {
  const known = KOKORO_VOICES.some((voice) => voice.id === id);
  if (!known) {
    throw new Error(
      `unknown Kokoro voice "${id}" — known: ${KOKORO_VOICES.map((v) => v.id).join(", ")}`,
    );
  }
}
