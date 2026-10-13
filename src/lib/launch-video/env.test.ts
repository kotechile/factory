// src/lib/launch-video/env.test.ts
import { describe, expect, it } from "vitest";
import { parseEnvFile, requireEnv } from "./env";

describe("parseEnvFile", () => {
  it("parses KEY=value, ignores comments and blanks, strips quotes", () => {
    const out = parseEnvFile([
      "# a comment",
      "",
      "ELEVENLABS_API_KEY=sk_abc123",
      'YOUTUBE_PRIVACY_STATUS="private"',
      "SPACED = value with spaces ",
    ].join("\n"));
    expect(out).toEqual({
      ELEVENLABS_API_KEY: "sk_abc123",
      YOUTUBE_PRIVACY_STATUS: "private",
      SPACED: "value with spaces",
    });
  });

  it("keeps the first '=' in the value", () => {
    expect(parseEnvFile("A=b=c").A).toBe("b=c");
  });

  it("strips an inline comment from an unquoted value", () => {
    // shape taken from the deployed .env, where all three of these were parsing with the comment
    // glued onto the value
    const out = parseEnvFile([
      "MUSIC_TRACK=                  # blank = auto-pick a bundled brag track by tone",
      "PUBLISH=0                     # 1 = auto-publish after a successful render",
      "YOUTUBE_CATEGORY_ID=28                 # Science & Technology",
    ].join("\n"));
    expect(out).toEqual({ MUSIC_TRACK: "", PUBLISH: "0", YOUTUBE_CATEGORY_ID: "28" });
  });

  it("keeps a '#' that is not preceded by whitespace", () => {
    expect(parseEnvFile("URL=https://example.com/page#section").URL).toBe("https://example.com/page#section");
    expect(parseEnvFile("HASH=#notacomment").HASH).toBe("#notacomment");
  });

  it("leaves a quoted value alone, so a secret containing '#' survives", () => {
    expect(parseEnvFile('SECRET="pa#ss word # not a comment"').SECRET).toBe("pa#ss word # not a comment");
  });
});

describe("requireEnv", () => {
  it("returns the named keys when all are present", () => {
    expect(requireEnv({ A: "1", B: "2" }, ["A", "B"], ".env")).toEqual({ A: "1", B: "2" });
  });

  it("names every missing key and the source file", () => {
    expect(() => requireEnv({ A: "1" }, ["A", "B", "C"], ".env")).toThrowError(
      /missing required env vars \(B, C\) in \.env/,
    );
  });

  it("treats an empty string as missing", () => {
    expect(() => requireEnv({ A: "" }, ["A"], ".env")).toThrowError(/A/);
  });
});
