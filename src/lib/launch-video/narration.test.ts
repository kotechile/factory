// src/lib/launch-video/narration.test.ts
import { describe, expect, it } from "vitest";
import { assertNarrationFits, countWords, maxWordsFor, narrationSeconds } from "./narration";

describe("countWords", () => {
  it("counts whitespace-separated words and ignores em-dashes as separators", () => {
    expect(countWords("Audit any carrier invoice — in seconds.")).toBe(6);
  });
  it("returns 0 for empty input", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("narrationSeconds", () => {
  it("uses 2.4 words per second", () => {
    expect(narrationSeconds(60)).toBeCloseTo(25.0, 5);
    expect(narrationSeconds(24)).toBeCloseTo(10.0, 5);
  });
});

describe("maxWordsFor", () => {
  it("leaves the 0.5s safety margin before the video's last frame", () => {
    expect(maxWordsFor(24)).toBe(56); // floor((24-0.5)*2.4)
  });
});

describe("assertNarrationFits", () => {
  it("passes when the narration ends before the video does", () => {
    expect(() => assertNarrationFits({ words: 50, videoSeconds: 24 })).not.toThrow();
  });
  it("throws an actionable error naming the maximum word count", () => {
    expect(() => assertNarrationFits({ words: 80, videoSeconds: 24 })).toThrowError(
      /narration is 33.3s but the video is 24.0s: cut it to <=56 words \(80 words now\)/,
    );
  });
});
