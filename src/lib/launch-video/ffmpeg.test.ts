// src/lib/launch-video/ffmpeg.test.ts
import { describe, expect, it } from "vitest";
import { buildMuxArgs, parseFfprobeDuration } from "./ffmpeg";

const DUCK =
  "[0:a]volume=1.0[music];[1:a]volume=1.9,asplit=2[vo][vokey];[vokey]volume=1.0[voside];" +
  "[music][voside]sidechaincompress=threshold=0.05:ratio=8:attack=5:release=350[ducked];" +
  "[ducked][vo]amix=inputs=2:duration=first:dropout_transition=0:weights=1 1[aout]";

describe("buildMuxArgs", () => {
  it("ducks the music under the voice when the brag has a music track", () => {
    const args = buildMuxArgs({ video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4", hasMusic: true });
    expect(args).toContain("-filter_complex");
    expect(args[args.indexOf("-filter_complex") + 1]).toBe(DUCK);
    expect(args).toEqual([
      "-y", "-i", "brag.mp4", "-i", "vo.mp3",
      "-filter_complex", DUCK,
      "-map", "0:v:0", "-map", "[aout]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart", "-shortest", "launch.mp4",
    ]);
  });

  it("just lays the voice over the video when the brag was rendered without music", () => {
    const args = buildMuxArgs({ video: "brag.mp4", voiceover: "vo.mp3", output: "launch.mp4", hasMusic: false });
    expect(args).toEqual([
      "-y", "-i", "brag.mp4", "-i", "vo.mp3",
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart", "-shortest", "launch.mp4",
    ]);
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
