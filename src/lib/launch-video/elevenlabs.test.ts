// src/lib/launch-video/elevenlabs.test.ts
import { describe, expect, it } from "vitest";
import { buildTtsRequest, ELEVENLABS_API, parseVoices } from "./elevenlabs";

describe("buildTtsRequest", () => {
  it("points at the voice endpoint, sends xi-api-key, and asks for a 128kbps mp3", () => {
    const { url, init } = buildTtsRequest({
      apiKey: "k_test",
      voiceId: "v1",
      text: "Hello.",
      modelId: "eleven_multilingual_v2",
    });
    expect(url).toBe(`${ELEVENLABS_API}/v1/text-to-speech/v1?output_format=mp3_44100_128`);
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("k_test");
    expect(JSON.parse(init.body as string)).toEqual({
      text: "Hello.",
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
    });
  });

  it("passes a speed override through voice_settings", () => {
    const { init } = buildTtsRequest({ apiKey: "k", voiceId: "v", text: "x", speed: 0.95 });
    expect(JSON.parse(init.body as string).voice_settings.speed).toBe(0.95);
  });
});

describe("parseVoices", () => {
  it("maps id/name plus the first descriptive label", () => {
    expect(
      parseVoices({ voices: [{ voice_id: "a", name: "Adam", labels: { accent: "american" } }] }),
    ).toEqual([{ id: "a", name: "Adam", label: "american" }]);
  });
});
