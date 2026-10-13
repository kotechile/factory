// src/lib/launch-video/voice.test.ts
import { describe, expect, it } from "vitest";
import {
  assertKnownVoice,
  DEFAULT_KOKORO_VOICE,
  KOKORO_VOICES,
  voiceForSlug,
  voiceIndex,
} from "./voice";

describe("voiceIndex / voiceForSlug", () => {
  it("is deterministic for the same slug", () => {
    expect(voiceForSlug("spendproof").id).toBe(voiceForSlug("spendproof").id);
    expect(voiceIndex("spendproof")).toBe(voiceIndex("spendproof"));
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(voiceIndex("  SpendProof ")).toBe(voiceIndex("spendproof"));
  });

  it("refuses an empty slug instead of silently casting voice 0", () => {
    expect(() => voiceIndex("")).toThrowError(/needs a slug/);
    expect(() => voiceIndex("   ")).toThrowError(/needs a slug/);
  });

  it("pins the fleet's current casting, so a reorder fails loudly", () => {
    // Reordering KOKORO_VOICES re-casts every product. Measured from the derivation, not guessed —
    // if this breaks, that reorder was the cause.
    const casting = Object.fromEntries(
      ["quarterline", "ledgerlink", "facturgate", "parcelproof", "caseproof", "spendproof"]
        .map((slug) => [slug, voiceForSlug(slug).id]),
    );
    expect(casting).toEqual({
      quarterline: "bf_emma",
      ledgerlink: "am_michael",
      facturgate: "am_adam",
      parcelproof: "bf_isabella",
      caseproof: "bf_emma",
      spendproof: "am_adam",
    });
  });

  it("spreads a fleet across more than one voice", () => {
    const slugs = ["quarterline", "ledgerlink", "facturgate", "parcelproof", "caseproof", "spendproof"];
    const distinct = new Set(slugs.map((s) => voiceForSlug(s).id));
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe("assertKnownVoice", () => {
  it("accepts every voice in the roster", () => {
    for (const voice of KOKORO_VOICES) expect(() => assertKnownVoice(voice.id)).not.toThrow();
  });

  it("rejects an unknown id with the roster in the message", () => {
    expect(() => assertKnownVoice("af_nope")).toThrowError(/unknown Kokoro voice/);
    expect(() => assertKnownVoice("af_nope")).toThrowError(/af_heart/);
  });

  it("has the skill's documented default in the roster", () => {
    expect(KOKORO_VOICES.map((v) => v.id)).toContain(DEFAULT_KOKORO_VOICE);
    expect(KOKORO_VOICES).toHaveLength(8);
  });
});
