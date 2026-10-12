// src/lib/launch-video/elevenlabs.ts
export const ELEVENLABS_API = "https://api.elevenlabs.io";
export const DEFAULT_TTS_MODEL = "eleven_multilingual_v2";
export const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";

export interface TtsRequestInput {
  apiKey: string;
  voiceId: string;
  text: string;
  modelId?: string;
  outputFormat?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export function buildTtsRequest(input: TtsRequestInput): { url: string; init: RequestInit } {
  const {
    apiKey,
    voiceId,
    text,
    modelId = DEFAULT_TTS_MODEL,
    outputFormat = DEFAULT_OUTPUT_FORMAT,
    speed,
    stability = 0.4,
    similarityBoost = 0.75,
    style = 0.15,
  } = input;
  const voice_settings: Record<string, unknown> = {
    stability,
    similarity_boost: similarityBoost,
    style,
    use_speaker_boost: true,
  };
  if (speed !== undefined) voice_settings.speed = speed;
  return {
    url: `${ELEVENLABS_API}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`,
    init: {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: modelId, voice_settings }),
    },
  };
}

export interface VoiceOption {
  id: string;
  name: string;
  label?: string;
}

export function parseVoices(json: { voices?: Array<Record<string, unknown>> }): VoiceOption[] {
  return (json.voices ?? []).map((v) => {
    const labels = (v.labels ?? {}) as Record<string, string>;
    const label = labels.accent ?? labels.description ?? labels.gender ?? Object.values(labels)[0];
    return {
      id: String(v.voice_id),
      name: String(v.name ?? ""),
      ...(label ? { label: String(label) } : {}),
    };
  });
}
