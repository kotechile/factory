// src/lib/launch-video/env.test.ts
import { describe, expect, it } from "vitest";
import { parseEnvFile, requireEnv, setEnvValue } from "./env";

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

describe("setEnvValue", () => {
  const base = "A=1\n# comment\nYOUTUBE_REFRESH_TOKEN=old-token\nB=2\n";

  it("replaces an existing value and leaves everything else alone", () => {
    const next = setEnvValue(base, "YOUTUBE_REFRESH_TOKEN", "new-token");
    expect(next).toBe("A=1\n# comment\nYOUTUBE_REFRESH_TOKEN=new-token\nB=2\n");
  });

  it("appends a key that is not there yet, keeping one trailing newline", () => {
    expect(setEnvValue("A=1", "NEW_KEY", "v")).toBe("A=1\nNEW_KEY=v");
    expect(setEnvValue("A=1\n", "NEW_KEY", "v")).toBe("A=1\nNEW_KEY=v\n");
  });

  it("collapses duplicate keys to the first position — the parser keeps the LAST, so two copies lie", () => {
    const next = setEnvValue("A=1\nK=first\nB=2\nK=second\n", "K", "only");
    expect(next).toBe("A=1\nK=only\nB=2\n");
    expect(parseEnvFile(next).K).toBe("only");
  });

  it("does not treat a prefix as the same key", () => {
    expect(setEnvValue("K_EXTRA=1\n", "K", "v")).toBe("K_EXTRA=1\nK=v\n");
  });

  it("refuses a value or key that would corrupt the file", () => {
    expect(() => setEnvValue(base, "K", "a\nb")).toThrowError(/newline/);
    expect(() => setEnvValue(base, "K-2", "v")).toThrowError(/invalid env key/);
  });
});
