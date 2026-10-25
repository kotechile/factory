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

/**
 * The duck graph.
 *
 * `sidechaincompress` ends when its SIDECHAIN ends, so keying it with the raw narration clipped the
 * whole mix to the narration's length: the shipped CaseProof mix was 18.8 s of audio in a 21.0 s
 * video, i.e. the bed stopped dead on the last word and the remaining seconds played silent. That is
 * the "voice ends abruptly" the owner reported — not a missing tail, a truncated one. The key is
 * therefore padded to the video's own length, where it is silent and compresses nothing.
 */
export function duckMix(videoSeconds?: number): string {
  const key =
    videoSeconds === undefined
      ? "[vokey]volume=1.0,apad[vaside]"
      : `[vokey]volume=1.0,apad=whole_dur=${secs(videoSeconds)}[vaside]`;
  return (
    "[0:a]volume=1.0[music];[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.9,asplit=2[vo][vokey];" +
    `${key};` +
    "[music][vaside]sidechaincompress=threshold=0.05:ratio=3:attack=5:release=350[ducked];" +
    "[ducked][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mixed]"
  );
}

export const DUCK_FILTER = `${duckMix()};[mixed]${LOUDNESS_FILTER}[aout]`;

/**
 * The same voice gain and mix weights as `DUCK_FILTER`, with the sidechain removed. Cues-only
 * videos take this path: there is no bed to sit under, so nothing has a reason to be compressed.
 */
export const NO_DUCK_MIX =
  "[0:a]volume=1.0[cues];[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.9[vo];" +
  "[cues][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mixed]";

export const NO_DUCK_FILTER = `${NO_DUCK_MIX};[mixed]${LOUDNESS_FILTER}[aout]`;

/**
 * How much music-only tail a launch video ends on, after the narration's last word.
 *
 * Shipped videos ended the instant the voice stopped — at best 1.5 s, and always on a hard cut with
 * the bed still at full level, which reads as the audio being chopped off. The owner's note was
 * "the voice ends abruptly, a couple of seconds of music would help" (2026-10-24). Three and a half
 * seconds is a full musical phrase at these tempos and survives the platform's own end-card UI.
 */
export const TAIL_SECONDS = 3.5;

/** The bed fades over this long, ending exactly on the final frame. */
export const TAIL_FADE_SECONDS = 1.2;

/** The render's frame rate; pads are snapped to it so the tail is a whole number of frames. */
export const TAIL_FPS = 30;

/** Never start a fade this close to the voice: a fade must not touch the narration. */
export const TAIL_MIN_AFTER_VOICE = 0.15;

/** What a 0.2 s sliver of fade looks like: not a fade. Below this, no fade is applied at all. */
export const TAIL_MIN_FADE = 0.2;

export interface TailPlan {
  /** Extra seconds appended after the video's last frame; 0 when the render already has the tail. */
  readonly padSeconds: number;
  /** Final runtime in seconds. */
  readonly totalSeconds: number;
  /** When the fade-out starts, or null when there is no room to fade without touching the voice. */
  readonly fadeStartSeconds: number | null;
}

/**
 * Decide how much tail a video needs and when its music should fade.
 *
 * The narration is written after the render, so the render's own outro may be shorter than the tail
 * this rule wants; the mux holds the last frame for the difference rather than the author guessing.
 * A plan that needs no pad is still useful: it is what tells the mux where to fade.
 */
export function planTail(args: {
  videoSeconds: number;
  voiceSeconds: number;
  tail?: number;
  fade?: number;
  fps?: number;
}): TailPlan {
  const { videoSeconds, voiceSeconds } = args;
  const tail = args.tail ?? TAIL_SECONDS;
  const fade = args.fade ?? TAIL_FADE_SECONDS;
  const fps = args.fps ?? TAIL_FPS;
  if (!Number.isFinite(videoSeconds) || videoSeconds <= 0) {
    throw new Error(`planTail needs a positive videoSeconds; received ${videoSeconds}`);
  }
  if (!Number.isFinite(voiceSeconds) || voiceSeconds < 0) {
    throw new Error(`planTail needs a non-negative voiceSeconds; received ${voiceSeconds}`);
  }
  if (!Number.isFinite(tail) || tail < 0) {
    throw new Error(`planTail needs a non-negative tail; received ${tail}`);
  }

  const needed = voiceSeconds + tail - videoSeconds;
  // ceil to a whole frame: the render is 30 fps and a half-frame pad lands as an odd frame count
  const padSeconds = needed <= 0 ? 0 : Math.ceil(needed * fps) / fps;
  const totalSeconds = videoSeconds + padSeconds;
  const candidate = Math.max(voiceSeconds + TAIL_MIN_AFTER_VOICE, totalSeconds - fade);
  const fadeStartSeconds = candidate + TAIL_MIN_FADE <= totalSeconds ? candidate : null;

  return { padSeconds, totalSeconds, fadeStartSeconds };
}

/** ffmpeg wants fixed point, not 17.333333333333336. */
function secs(value: number): string {
  return value.toFixed(3);
}

/**
 * The audio half of the tail: continue the bed for `padSeconds`, then fade out over the last second
 * or so, then normalise — in that order, so loudnorm measures the fade and does not undo it.
 *
 * With no bed the video is cues-only; padding with silence is the honest choice there (there is no
 * music to continue) and the fade is then applied to whatever the final seconds carry.
 */
function tailAudioGraph(plan: TailPlan, hasBed: boolean): string[] {
  const parts: string[] = [];
  let out = "mixed";

  if (plan.padSeconds > 0) {
    if (hasBed) {
      // The tail is DELAYED onto the timeline rather than concatenated. `concat` on a segment
      // demuxed with -ss carries that segment's own timestamps, and the join produced a mix whose
      // opening seconds played at the wrong rate on the uploaded copy. adelay puts the segment at
      // an absolute offset on the same clock, so there is no join to get wrong.
      const delayMs = Math.round((plan.totalSeconds - plan.padSeconds) * 1000);
      parts.push(
        "[2:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS," +
          `afade=t=in:st=0:d=0.08,adelay=${delayMs}:all=1[tailseg]`,
      );
      parts.push(`[mixed][tailseg]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0[joined]`);
    } else {
      parts.push(`[mixed]apad=pad_dur=${secs(plan.padSeconds)}[joined]`);
    }
    out = "joined";
  }

  if (plan.fadeStartSeconds !== null) {
    parts.push(`[${out}]afade=t=out:st=${secs(plan.fadeStartSeconds)}:d=${secs(TAIL_FADE_SECONDS)}[faded]`);
    out = "faded";
  }

  parts.push(`[${out}]${LOUDNESS_FILTER}[aout]`);
  return parts;
}


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
  /**
   * Music-only tail after the narration, from `planTail`. Omitted → no tail handling at all, which
   * is the pre-2026-10-24 behaviour and what the older tests pin.
   */
  tail?: TailPlan;
  /**
   * The bed's source file (the same track the composition mounted). When the video needs padding,
   * the mux continues this file from the render's end so the tail carries music instead of silence.
   */
  bedFile?: string;
  /** The render's own duration, used to pad the duck key. Omitted → `apad` unbounded. */
  videoSeconds?: number;
}): string[] {
  const { video, voiceover, output, hasMusic } = args;
  const hasBed = args.hasBed ?? hasMusic;
  const tail = args.tail;
  // The tail exists to carry MUSIC past the voice. A brag rendered without audio has nothing to
  // continue, and holding the last frame over silence is not the note this was built for.
  const padSeconds = tail && hasMusic ? tail.padSeconds : 0;
  const padVideo = padSeconds > 0;
  const videoSeconds = args.videoSeconds ?? (tail ? tail.totalSeconds - tail.padSeconds : undefined);
  // Deliberately NO -shortest. It clips the output to the shortest INPUT STREAM, and the narration is
  // always shorter than the video by design (assertNarrationFits reserves 0.5s), so -shortest
  // truncated the outro hold on every single mix — 22.00s in, 21.41s out. The video is stream-copied
  // and the mixed audio is bounded by its first input (`amix=duration=first`), so the output already
  // ends exactly with the video without it.
  // `-ar 48000` is pinned because LOUDNESS_FILTER resamples internally to 192 kHz; without it the AAC
  // encoder quietly emitted a 96 kHz track instead of the 48 kHz the platforms expect.
  const tailArgs = ["-ar", "48000", "-movflags", "+faststart", output];
  const inputs = ["-y", "-i", video, "-i", voiceover];

  if (padVideo) {
    if (hasBed) {
      if (!args.bedFile) {
        throw new Error(
          "the video needs a music tail but no bedFile was given — the bed cannot be recovered from " +
            "a stream that ends with the render; pass the derived track from pick-track.mjs",
        );
      }
      const videoSecondsForSeek = tail!.totalSeconds - tail!.padSeconds;
      inputs.push(
        "-ss", secs(videoSecondsForSeek),
        "-t", secs(tail!.padSeconds + 0.05),
        "-i", args.bedFile,
      );
    }
  }

  if (!hasMusic) {
    return [
      ...inputs,
      "-map", "0:v:0", "-map", "1:a:0",
      "-af", LOUDNESS_FILTER,
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      ...tailArgs,
    ];
  }

  const mix = hasBed ? duckMix(videoSeconds) : NO_DUCK_MIX;
  const parts: string[] = padVideo
    ? [`[0:v]tpad=stop_mode=clone:stop_duration=${secs(padSeconds)},format=yuv420p[vout]`]
    : [];
  parts.push(mix);
  // With no tail plan this is the legacy graph, byte-identical to DUCK_FILTER/NO_DUCK_FILTER.
  if (tail) parts.push(...tailAudioGraph({ ...tail, padSeconds }, hasBed));
  else parts.push(`[mixed]${LOUDNESS_FILTER}[aout]`);

  return [
    ...inputs,
    "-filter_complex", parts.join(";"),
    "-map", padVideo ? "[vout]" : "0:v:0", "-map", "[aout]",
    // Holding the last frame is the only way to lengthen a finished render, and that frame must be
    // re-encoded; CRF 16 keeps it visually identical to the stream-copied master.
    ...(padVideo
      ? ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p"]
      : ["-c:v", "copy"]),
    "-c:a", "aac", "-b:a", "192k",
    ...tailArgs,
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
