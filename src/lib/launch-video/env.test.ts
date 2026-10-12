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
