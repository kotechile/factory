// src/lib/launch-video/ffmpeg.test.ts
import { describe, expect, it } from "vitest";
import {
  audibleFraction,
  buildMuxArgs,
  detectsContinuousBed,
  duckMix,
  LOUDNESS_FILTER,
  LOUDNESS_TARGET,
  NO_DUCK_FILTER,
  parseFfprobeDuration,
  parseSilenceSpans,
  planTail,
  TAIL_SECONDS,
} from "./ffmpeg";

const DUCK_FILTER_EXPECTED = `${duckMix()};[mixed]${LOUDNESS_FILTER}[aout]`;

describe("DUCK_FILTER", () => {
  it("ducks at 3:1 — a deliberate setting, not the 8:1 that made the bed vanish", () => {
    expect(DUCK_FILTER_EXPECTED).toContain("ratio=3");
    expect(DUCK_FILTER_EXPECTED).not.toContain("ratio=8");
  });
  it("keeps the sidechain threshold low enough to engage on a quiet narration", () => {
    expect(DUCK_FILTER_EXPECTED).toContain("threshold=0.05");
  });
});

describe("buildMuxArgs", () => {
  it("ducks the music under the voice when the brag has a continuous bed", () => {
    const args = buildMuxArgs({
      video: "brag.mp4",
      voiceover: "vo.mp3",
      output: "launch.mp4",
      hasMusic: true,
      hasBed: true,
    });
    expect(args).toEqual([
      "-y", "-i", "brag.mp4", "-i", "vo.mp3",
      "-filter_complex", DUCK_FILTER_EXPECTED,
      "-map", "0:v:0", "-map", "[aout]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-ar", "48000", "-movflags", "+faststart", "launch.mp4",
    ]);
  });

  it("leaves a cues-only brag at full level instead of ducking the effects", () => {
    const args = buildMuxArgs({
      video: "brag.mp4",
      voiceover: "vo.mp3",
      output: "launch.mp4",
      hasMusic: true,
      hasBed: false,
    });
    const graph = args[args.indexOf("-filter_complex") + 1];
    expect(graph).toBe(NO_DUCK_FILTER);
    expect(graph).not.toContain("sidechaincompress");
    expect(graph).toContain("[0:a]volume=1.0[cues]");
    // the narration arrives 24 kHz mono; it is resampled explicitly rather than left to negotiation
    expect(graph).toContain("[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.9[vo]");
    expect(graph).toContain("[cues][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mixed]");
    expect(graph).toContain(LOUDNESS_FILTER);
    expect(args[args.indexOf("-map") + 1]).toBe("0:v:0");
  });

  it("ducks when a caller has not measured whether there is a bed", () => {
    // fail-closed to the shipped behaviour rather than silently dropping the duck
    const args = buildMuxArgs({ video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4", hasMusic: true });
    expect(args[args.indexOf("-filter_complex") + 1]).toBe(DUCK_FILTER_EXPECTED);
  });

  it("just lays the voice over the video when the brag was rendered without audio", () => {
    const args = buildMuxArgs({
      video: "brag.mp4",
      voiceover: "vo.mp3",
      output: "launch.mp4",
      hasMusic: false,
      hasBed: false,
    });
    expect(args).toEqual([
      "-y", "-i", "brag.mp4", "-i", "vo.mp3",
      "-map", "0:v:0", "-map", "1:a:0",
      "-af", LOUDNESS_FILTER,
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-ar", "48000", "-movflags", "+faststart", "launch.mp4",
    ]);
  });

  it("never passes -shortest, which would truncate the outro to the narration length", () => {
    // The narration is always shorter than the video, so -shortest silently clipped the ending.
    for (const hasBed of [true, false]) {
      const args = buildMuxArgs({
        video: "brag.mp4",
        voiceover: "vo.mp3",
        output: "launch.mp4",
        hasMusic: true,
        hasBed,
      });
      expect(args).not.toContain("-shortest");
    }
  });

  it("finishes the mix at platform loudness instead of shipping it ~13 dB quiet", () => {
    // The narration arrives near -26.5 LUFS and amix then halves the sum, so this is not optional.
    expect(LOUDNESS_TARGET.I).toBe(-14);
    expect(LOUDNESS_TARGET.TP).toBeLessThan(0);
    for (const hasBed of [true, false]) {
      const args = buildMuxArgs({
        video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4", hasMusic: true, hasBed,
      });
      const graph = args[args.indexOf("-filter_complex") + 1];
      expect(graph).toContain(LOUDNESS_FILTER);
      expect(graph.endsWith("[aout]")).toBe(true);
    }
    const noMusic = buildMuxArgs({
      video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4", hasMusic: false,
    });
    expect(noMusic[noMusic.indexOf("-af") + 1]).toBe(LOUDNESS_FILTER);
  });

  it("pins 48 kHz, because loudnorm resamples internally to 192 kHz", () => {
    for (const hasMusic of [true, false]) {
      const args = buildMuxArgs({
        video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4", hasMusic, hasBed: true,
      });
      expect(args[args.indexOf("-ar") + 1]).toBe("48000");
    }
  });
});

describe("duckMix — the sidechain must not end the bed (regression)", () => {
  it("keys on a padded voice so the duck lives as long as the video, not the narration", () => {
    // Shipped CaseProof: 21.00s video, 18.82s narration. sidechaincompress stopped with the key, so
    // the mix came out 18.8s and the last seconds of picture played silent — the owner's "the voice
    // ends abruptly". The key is padded (silently) to the video's length so the bed survives it.
    const graph = duckMix(21);
    expect(graph).toContain("[vokey]volume=1.0,apad=whole_dur=21.000[vaside]");
    expect(graph).toContain("[music][vaside]sidechaincompress");
    expect(graph).not.toContain("[voside]");
  });

  it("still pads the key when the video's length is unknown", () => {
    expect(duckMix()).toContain("[vokey]volume=1.0,apad[vaside]");
  });

  it("carries the video length through buildMuxArgs", () => {
    const plan = planTail({ videoSeconds: 21, voiceSeconds: 19 });
    const args = buildMuxArgs({
      video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4",
      hasMusic: true, hasBed: true, tail: plan, bedFile: "bed.mp3",
    });
    expect(args[args.indexOf("-filter_complex") + 1]).toContain("apad=whole_dur=21.000");
  });
});

describe("planTail", () => {
  it("adds nothing when the render already ends more than the tail after the voice", () => {
    const plan = planTail({ videoSeconds: 22, voiceSeconds: 18 });
    expect(plan.padSeconds).toBe(0);
    expect(plan.totalSeconds).toBe(22);
    // fade sits in the last 1.2s, well clear of a voice that stops at 18s
    expect(plan.fadeStartSeconds).toBeCloseTo(20.8, 3);
  });

  it("pads a render that ends too soon after the voice, snapped up to a whole frame", () => {
    // the shipped LedgerLink run: 20.04s of voice in a 21.60s render
    const plan = planTail({ videoSeconds: 21.6, voiceSeconds: 20.04 });
    expect(plan.padSeconds).toBeCloseTo(1.9667, 3);
    expect(plan.totalSeconds).toBeCloseTo(23.5667, 3);
    expect(plan.totalSeconds - 21.6).toBeCloseTo(plan.padSeconds, 6);
  });

  it("leaves the full tail even when the voice runs to the last half second", () => {
    const plan = planTail({ videoSeconds: 22, voiceSeconds: 21.5 });
    expect(plan.totalSeconds - 21.5).toBeCloseTo(TAIL_SECONDS, 3);
  });

  it("never starts the fade before the voice has finished", () => {
    const plan = planTail({ videoSeconds: 22, voiceSeconds: 21.4, tail: 0.6 });
    expect(plan.fadeStartSeconds).toBeGreaterThan(21.4);
  });

  it("skips the fade when there is no room for one after the voice", () => {
    const plan = planTail({ videoSeconds: 22, voiceSeconds: 21.95, tail: 0.1 });
    expect(plan.fadeStartSeconds).toBeNull();
  });

  it("refuses inputs it cannot measure", () => {
    expect(() => planTail({ videoSeconds: 0, voiceSeconds: 1 })).toThrowError(/positive videoSeconds/);
    expect(() => planTail({ videoSeconds: 22, voiceSeconds: -1 })).toThrowError(/non-negative voiceSeconds/);
    expect(() => planTail({ videoSeconds: 22, voiceSeconds: 1, tail: -1 })).toThrowError(/non-negative tail/);
  });
});

describe("buildMuxArgs with a tail", () => {
  const bench = {
    video: "brag.mp4",
    voiceover: "vo.mp3",
    output: "launch.mp4",
    hasMusic: true,
    hasBed: true,
  };

  it("holds the last frame, continues the bed and fades — in one pass", () => {
    const plan = planTail({ videoSeconds: 21, voiceSeconds: 19 });
    const args = buildMuxArgs({ ...bench, tail: plan, bedFile: "assets/music/bed.mp3" });
    const graph = args[args.indexOf("-filter_complex") + 1];

    expect(graph).toContain(`[0:v]tpad=stop_mode=clone:stop_duration=${plan.padSeconds.toFixed(3)}`);
    // delayed onto the same clock, never concatenated: a -ss demuxed segment carries its own PTS
    expect(graph).toContain("adelay=21000:all=1[tailseg]");
    expect(graph).toContain("[mixed][tailseg]amix=inputs=2:duration=longest");
    expect(graph).not.toContain("concat");
    expect(graph).toContain(`afade=t=out:st=${plan.fadeStartSeconds!.toFixed(3)}:d=1.200`);
    expect(graph.endsWith("[aout]")).toBe(true);
    // the bed keeps playing, so its source is a third input seeked to the render's end
    expect(args.slice(0, 11)).toEqual([
      "-y", "-i", "brag.mp4", "-i", "vo.mp3", "-ss", "21.000", "-t", "1.550",
      "-i", "assets/music/bed.mp3",
    ]);
    // a held frame cannot be stream-copied
    expect(args[args.indexOf("-map") + 1]).toBe("[vout]");
    expect(args).toContain("libx264");
    expect(args).toContain("16");
    expect(args).not.toContain("copy");
    expect(args[args.indexOf("-ar") + 1]).toBe("48000");
  });

  it("keeps the stream copy when the render already has the tail, but still fades", () => {
    const plan = planTail({ videoSeconds: 22, voiceSeconds: 18 });
    const args = buildMuxArgs({ ...bench, tail: plan, bedFile: "assets/music/bed.mp3" });
    const graph = args[args.indexOf("-filter_complex") + 1];
    expect(graph).not.toContain("tpad");
    expect(graph).not.toContain("concat");
    expect(graph).toContain("afade=t=out");
    expect(args[args.indexOf("-c:v") + 1]).toBe("copy");
    expect(args[args.indexOf("-map") + 1]).toBe("0:v:0");
  });

  it("pads with silence for a cues-only brag instead of inventing music", () => {
    const plan = planTail({ videoSeconds: 21, voiceSeconds: 19 });
    const args = buildMuxArgs({ ...bench, hasBed: false, tail: plan });
    const graph = args[args.indexOf("-filter_complex") + 1];
    expect(graph).toContain(`[mixed]apad=pad_dur=${plan.padSeconds.toFixed(3)}[joined]`);
    expect(graph).not.toContain("concat");
    expect(graph).not.toContain("sidechaincompress");
  });

  it("refuses to pad a bed without the bed's source, rather than silently going silent", () => {
    const plan = planTail({ videoSeconds: 21, voiceSeconds: 19 });
    expect(() => buildMuxArgs({ ...bench, tail: plan })).toThrowError(/no bedFile/);
  });

  it("skips the tail on a brag rendered without audio", () => {
    const plan = planTail({ videoSeconds: 21, voiceSeconds: 19 });
    const args = buildMuxArgs({ ...bench, hasMusic: false, hasBed: false, tail: plan });
    expect(args).not.toContain("tpad");
    expect(args[args.indexOf("-c:v") + 1]).toBe("copy");
    expect(args[args.indexOf("-af") + 1]).toBe(LOUDNESS_FILTER);
  });
});

describe("parseSilenceSpans", () => {
  it("reads the span pairs silencedetect prints", () => {
    const out = [
      "[silencedetect @ 0x1] silence_start: 0.196979",
      "[silencedetect @ 0x1] silence_end: 2.000431 | silence_duration: 1.803452",
      "[silencedetect @ 0x1] silence_start: 4.5",
      "[silencedetect @ 0x1] silence_end: 9.0 | silence_duration: 4.5",
    ].join("\n");
    expect(parseSilenceSpans(out, 22)).toEqual([
      [0.196979, 2.000431],
      [4.5, 9.0],
    ]);
  });

  it("closes a trailing silence at the media duration", () => {
    const out = "[silencedetect @ 0x1] silence_start: 19.5";
    expect(parseSilenceSpans(out, 22)).toEqual([[19.5, 22]]);
  });

  it("clamps a negative-zero boundary into the media", () => {
    const out = [
      "[silencedetect @ 0x1] silence_start: -0",
      "[silencedetect @ 0x1] silence_end: 1.5 | silence_duration: 1.5",
    ].join("\n");
    expect(parseSilenceSpans(out, 22)).toEqual([[0, 1.5]]);
  });

  it("returns nothing when the video is continuously audible", () => {
    expect(parseSilenceSpans("[ffmpeg] nothing here", 22)).toEqual([]);
  });

  it("drops an inverted span instead of widening the silence", () => {
    const out = [
      "[silencedetect @ 0x1] silence_start: 8",
      "[silencedetect @ 0x1] silence_end: 3 | silence_duration: 0",
    ].join("\n");
    expect(parseSilenceSpans(out, 22)).toEqual([]);
  });

  it("refuses a duration it cannot measure against", () => {
    expect(() => parseSilenceSpans("", 0)).toThrowError(/positive duration/);
  });
});

describe("audibleFraction / detectsContinuousBed", () => {
  it("scores a music bed at ~1 and never calls it cues-only", () => {
    const fraction = audibleFraction([], 22);
    expect(fraction).toBe(1);
    expect(detectsContinuousBed([], 22)).toBe(true);
  });

  it("scores the shipped SpendProof brag (cues only) far below the bed threshold", () => {
    // measured: 7 cues, 2.46s audible in 22.00s, digital silence between them
    const spans = parseSilenceSpans(
      [
        "[silencedetect @ 0x1] silence_start: 0.19",
        "[silencedetect @ 0x1] silence_end: 0.55 | silence_duration: 0.36",
        "[silencedetect @ 0x1] silence_start: 0.66",
        "[silencedetect @ 0x1] silence_end: 8.74 | silence_duration: 8.08",
        "[silencedetect @ 0x1] silence_start: 8.92",
        "[silencedetect @ 0x1] silence_end: 13.10 | silence_duration: 4.18",
        "[silencedetect @ 0x1] silence_start: 13.60",
        "[silencedetect @ 0x1] silence_end: 15.00 | silence_duration: 1.40",
        "[silencedetect @ 0x1] silence_start: 15.15",
        "[silencedetect @ 0x1] silence_end: 15.84 | silence_duration: 0.69",
        "[silencedetect @ 0x1] silence_start: 15.95",
        "[silencedetect @ 0x1] silence_end: 19.66 | silence_duration: 3.71",
        "[silencedetect @ 0x1] silence_start: 20.80",
      ].join("\n"),
      22,
    );
    const fraction = audibleFraction(spans, 22);
    expect(fraction).toBeGreaterThan(0.05);
    expect(fraction).toBeLessThan(0.2);
    expect(detectsContinuousBed(spans, 22)).toBe(false);
  });

  it("refuses a duration it cannot measure against", () => {
    expect(() => audibleFraction([], 0)).toThrowError(/positive duration/);
  });
});

describe("parseFfprobeDuration", () => {
  it("reads format.duration as a number", () => {
    expect(parseFfprobeDuration({ format: { duration: "10.000000" } })).toBe(10);
  });
  it("throws when ffprobe returned no duration", () => {
    expect(() => parseFfprobeDuration({ format: {} })).toThrowError(/no format\.duration/);
  });
});
