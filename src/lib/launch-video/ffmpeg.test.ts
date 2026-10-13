// src/lib/launch-video/ffmpeg.test.ts
import { describe, expect, it } from "vitest";
import {
  audibleFraction,
  buildMuxArgs,
  detectsContinuousBed,
  LOUDNESS_FILTER,
  LOUDNESS_TARGET,
  NO_DUCK_FILTER,
  parseFfprobeDuration,
  parseSilenceSpans,
} from "./ffmpeg";

const DUCK_FILTER_EXPECTED =
  "[0:a]volume=1.0[music];[1:a]volume=1.9,asplit=2[vo][vokey];[vokey]volume=1.0[voside];" +
  "[music][voside]sidechaincompress=threshold=0.05:ratio=3:attack=5:release=350[ducked];" +
  `[ducked][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[mixed];[mixed]${LOUDNESS_FILTER}[aout]`;

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
    expect(graph).toContain("[1:a]volume=1.9[vo]");
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
