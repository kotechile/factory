// src/lib/launch-video/ffmpeg.ts
/**
 * Music is ducked under the voice, cues are not.
 *
 * A launch video's audio stream is `bed + motion-matched cues`, mixed by HyperFrames into one
 * track — the mux cannot see them separately. So the question the mux has to answer is not
 * "is there a music bed?" but "does this video actually have a bed to duck?" — which it answers
 * by measuring: a bed runs under most of the video, sparse cues leave most of it silent.
 *
 * Ducking a cues-only video compresses the thing it is meant to protect: the whole `[0:a]` stream
 * is the cues, so the two audible stamps land quieter than everything around them.
 */

/**
 * Music is ducked under the voice. The setting is measured, not assumed.
 *
 * The compressor applies the SAME gain reduction to the whole `[0:a]` stream — bed and cues alike.
 * It does not single out transients, so ducking cannot "squash the stamps" while sparing the bed:
 * what it costs is absolute level on the brag side against the voice.
 *
 * Measured on a real brag, with a correctly-scaled stand-in narration driving the key:
 *
 *   voice at the key   ratio 8    ratio 3
 *   -20.4 dBFS           -7.3 dB   -5.6 dB
 *   -16.4 dBFS          -10.8 dB   -8.2 dB
 *   -12.4 dBFS          -14.3 dB   -10.9 dB
 *
 * A plausible narration lands around -16 dBFS at the key, where 8:1 was removing ~11 dB from a bed
 * that is already ~10 dB under speech — the bed nearly vanished, which is what the mix sounded like.
 * 3:1 keeps the bed present for ~2.6 dB less protection, and the threshold stays at 0.05 so the duck
 * still engages for a quiet narration. Raising the threshold to 0.10 recovers a further ~4 dB but
 * lets a quiet narration through unducked, so it is left alone deliberately.
 */
/**
 * Where a finished launch mix should land. The raw inputs are quiet — an ElevenLabs narration measures
 * about -26.5 LUFS, and `amix` then halves the sum — so the mix shipped at -26.9 LUFS with 10 dB of
 * unused headroom, roughly 13 dB under the -14 LUFS that streaming platforms normalise towards.
 */
export const LOUDNESS_TARGET = { I: -14, TP: -1.5, LRA: 11 } as const;

/**
 * Finishes every mix at platform-normal loudness. This is level only: the voice-to-bed balance the duck
 * produces is carried through untouched. loudnorm resamples internally, so the mux pins the output rate
 * (`-ar 48000`) or the AAC encoder emits 96 kHz instead of the 48 kHz the platforms expect.
 */
export const LOUDNESS_FILTER =
  `loudnorm=I=${LOUDNESS_TARGET.I}:TP=${LOUDNESS_TARGET.TP}:LRA=${LOUDNESS_TARGET.LRA}`;

export const DUCK_FILTER =
  "[0:a]volume=1.0[music];[1:a]volume=1.9,asplit=2[vo][vokey];[vokey]volume=1.0[voside];" +
  "[music][voside]sidechaincompress=threshold=0.05:ratio=3:attack=5:release=350[ducked];" +
  `[ducked][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mixed];[mixed]${LOUDNESS_FILTER}[aout]`;

/**
 * The same voice gain and mix weights as `DUCK_FILTER`, with the sidechain removed. Cues-only
 * videos take this path: there is no bed to sit under, so nothing has a reason to be compressed.
 */
export const NO_DUCK_FILTER =
  "[0:a]volume=1.0[cues];[1:a]volume=1.9[vo];" +
  `[cues][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mixed];[mixed]${LOUDNESS_FILTER}[aout]`;

/**
 * How much of a video must carry audio before it is treated as having a continuous bed. A bed with
 * music under it sits near 1.0; a cues-only edit measured on the shipped SpendProof brag is 0.11.
 */
export const BED_MIN_AUDIBLE_FRACTION = 0.5;

/** The `silencedetect` noise floor, in dB, the mux measures with. */
export const SILENCE_NOISE_DB = -50;
/** The shortest gap `silencedetect` counts as silence, in seconds. */
export const SILENCE_MIN_DURATION = 0.5;

const SILENCE_START = /silence_start:\s*(-?[\d.]+)/;
const SILENCE_END = /silence_end:\s*(-?[\d.]+)/;

/**
 * The silence spans `ffmpeg -af silencedetect` reported, as `[start, end]` seconds.
 *
 * `silencedetect` prints a `silence_start` and, when the audio resumes, a `silence_end`. Trailing
 * silence has no end line, so a span still open at the end of the log is closed at `duration`. A
 * span that is malformed or inverted is dropped rather than silently widening the silence.
 */
export function parseSilenceSpans(output: string, duration: number): Array<[number, number]> {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`parseSilenceSpans needs a positive duration; received ${duration}`);
  }
  const spans: Array<[number, number]> = [];
  let open: number | null = null;

  for (const line of output.split("\n")) {
    const start = SILENCE_START.exec(line);
    if (start) {
      const value = Number(start[1]);
      // silencedetect emits -0 at a boundary; clamp into the media instead of trusting the sign.
      open = Number.isFinite(value) ? Math.min(Math.max(value, 0), duration) : 0;
      continue;
    }
    const end = SILENCE_END.exec(line);
    if (end && open !== null) {
      const value = Number(end[1]);
      const close = Number.isFinite(value) ? Math.min(Math.max(value, 0), duration) : duration;
      if (close > open) spans.push([open, close]);
      open = null;
    }
  }
  if (open !== null && duration > open) spans.push([open, duration]);

  return spans;
}

/** The fraction of `duration` that carries audio above the measured silence floor, 0..1. */
export function audibleFraction(spans: Array<[number, number]>, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`audibleFraction needs a positive duration; received ${duration}`);
  }
  const silent = spans.reduce((total, [start, end]) => total + Math.max(0, end - start), 0);
  return Math.min(1, Math.max(0, 1 - silent / duration));
}

/**
 * True when the video's audio runs under enough of its length to be a bed that must be ducked.
 * False means the audio is cues only, and the mux leaves it at full level.
 */
export function detectsContinuousBed(spans: Array<[number, number]>, duration: number): boolean {
  return audibleFraction(spans, duration) >= BED_MIN_AUDIBLE_FRACTION;
}

export function buildMuxArgs(args: {
  video: string;
  voiceover: string;
  output: string;
  /** The brag has an audio stream at all. False renders a voice-only mix. */
  hasMusic: boolean;
  /**
   * That audio contains a continuous bed to duck. Defaults to `hasMusic`, so a caller that has not
   * measured keeps today's ducking behaviour rather than silently dropping the duck.
   */
  hasBed?: boolean;
}): string[] {
  const { video, voiceover, output, hasMusic } = args;
  const hasBed = args.hasBed ?? hasMusic;
  // Deliberately NO -shortest. It clips the output to the shortest INPUT STREAM, and the narration is
  // always shorter than the video by design (assertNarrationFits reserves 0.5s), so -shortest
  // truncated the outro hold on every single mix — 22.00s in, 21.41s out. The video is stream-copied
  // and the mixed audio is bounded by its first input (`amix=duration=first`), so the output already
  // ends exactly with the video without it.
  // `-ar 48000` is pinned because LOUDNESS_FILTER resamples internally to 192 kHz; without it the AAC
  // encoder quietly emitted a 96 kHz track instead of the 48 kHz the platforms expect.
  const tail = ["-ar", "48000", "-movflags", "+faststart", output];
  if (!hasMusic) {
    return [
      "-y", "-i", video, "-i", voiceover,
      "-map", "0:v:0", "-map", "1:a:0",
      "-af", LOUDNESS_FILTER,
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      ...tail,
    ];
  }
  return [
    "-y", "-i", video, "-i", voiceover,
    "-filter_complex", hasBed ? DUCK_FILTER : NO_DUCK_FILTER,
    "-map", "0:v:0", "-map", "[aout]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
    ...tail,
  ];
}

export function parseFfprobeDuration(json: { format?: { duration?: string } }): number {
  const raw = json?.format?.duration;
  if (raw === undefined || raw === null || raw === "") {
    throw new Error("ffprobe returned no format.duration — refusing to guess a media length");
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`ffprobe duration is not a number: ${raw}`);
  return value;
}
