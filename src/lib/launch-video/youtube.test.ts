// src/lib/launch-video/youtube.test.ts
import { describe, expect, it } from "vitest";
import {
  buildResumableInit,
  buildVideoResource,
  parseRefreshTokenResponse,
  parseShareCopy,
  YOUTUBE_UPLOAD_URL,
} from "./youtube";

describe("buildVideoResource", () => {
  it("bills the snippet/status parts with a 100-char title ceiling", () => {
    const body = buildVideoResource({
      title: "T".repeat(140),
      description: "Desc",
      tags: ["factory", "deterministic"],
      privacyStatus: "private",
    });
    expect(body.snippet.title).toHaveLength(100);
    expect(body.snippet.categoryId).toBe("28");
    expect(body.status).toEqual({ privacyStatus: "private", selfDeclaredMadeForKids: false });
  });

  it("caps the total tag string at 500 chars", () => {
    const body = buildVideoResource({
      title: "x", description: "d",
      tags: Array.from({ length: 60 }, (_, i) => `tag-${i}-padding`),
      privacyStatus: "private",
    });
    expect(body.snippet.tags.join(",").length).toBeLessThanOrEqual(500);
  });
});

describe("parseShareCopy", () => {
  it("takes the first non-empty line as the title and the rest as the description", () => {
    const { title, description } = parseShareCopy("# SpendProof\n\nFind every overbilled line.\n\nTry it: https://x\n");
    expect(title).toBe("SpendProof");
    expect(description).toContain("Find every overbilled line.");
  });
});

describe("buildResumableInit", () => {
  it("targets the resumable upload endpoint with the byte length headers", () => {
    const { url, headers } = buildResumableInit({ size: 20480, mimeType: "video/mp4" });
    expect(url).toBe(`${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`);
    expect(headers["X-Upload-Content-Length"]).toBe("20480");
    expect(headers["X-Upload-Content-Type"]).toBe("video/mp4");
  });
});

describe("parseRefreshTokenResponse", () => {
  it("returns the access token", () => {
    expect(parseRefreshTokenResponse({ access_token: "ya29.x", expires_in: 3599 }).accessToken).toBe("ya29.x");
  });
  it("surfaces Google's error verbatim", () => {
    expect(() => parseRefreshTokenResponse({ error: "invalid_grant", error_description: "Token expired" }))
      .toThrowError(/invalid_grant: Token expired/);
  });
});
