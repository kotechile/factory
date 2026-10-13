// src/lib/launch-video/youtube.test.ts
import { describe, expect, it } from "vitest";
import {
  buildResumableInit,
  buildVideoResource,
  parseRefreshTokenResponse,
  parseShareCopy,
  readYoutubeConfig,
  truncateTitle,
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

describe("truncateTitle", () => {
  it("leaves a title that already fits alone", () => {
    const short = "Introducing SpendProof: a short one.";
    expect(truncateTitle(short)).toBe(short);
  });

  it("never cuts mid-word, and keeps a prefix of the source", () => {
    // The first live LedgerLink upload ended on "…£4,378.21 decomposes".
    const title =
      "Introducing LedgerLink: Stripe payout → GL reconciliation. One netted payout of £4,378.21 decomposes into five GL accounts.";
    const cut = truncateTitle(title);
    expect(title.startsWith(cut)).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(100);
    expect(cut.endsWith("decomposes")).toBe(false);
    expect(cut.endsWith("£4,378.21")).toBe(true);
  });

  it("strips punctuation the cut leaves dangling", () => {
    // FacturGate came out as "…pre-send gate for EU e-invoices — the e".
    const cut = truncateTitle(
      "Introducing FacturGate: the deterministic EN 16931 + CIUS-FR pre-send gate for EU e-invoices — the exact blocking rule list.",
    );
    expect(cut.length).toBeLessThanOrEqual(100);
    expect(cut.endsWith("—")).toBe(false);
    expect(cut.endsWith("e")).toBe(false);
    expect(cut.trim()).toBe(cut);
  });

  it("drops a stranded trailing word instead of ending on it", () => {
    // CaseProof came out as "…before you sign: labour at the fully l".
    const cut = truncateTitle(
      "CaseProof re-runs a warehouse-automation vendor's own numbers before you sign: labour at the fully loaded rate.",
    );
    expect(cut.length).toBeLessThanOrEqual(100);
    expect(cut.endsWith(" the")).toBe(false);
    expect(cut.endsWith(" at")).toBe(false);
    expect(cut.endsWith(" l")).toBe(false);
  });

  it("still returns something usable when there is no space to break on", () => {
    const cut = truncateTitle("x".repeat(240));
    expect(cut.length).toBeLessThanOrEqual(100);
    expect(cut.length).toBeGreaterThan(0);
  });

  it("respects an explicit cap", () => {
    expect(truncateTitle("alpha beta gamma delta", 12)).toBe("alpha beta");
  });
});

describe("readYoutubeConfig", () => {
  it("reads the documented names", () => {
    const config = readYoutubeConfig({ YOUTUBE_PRIVACY_STATUS: "unlisted", YOUTUBE_TAGS: "a, b ,,c" });
    expect(config.privacyStatus).toBe("unlisted");
    expect(config.tags).toEqual(["a", "b", "c"]);
  });

  it("reads the aliases the deployed .env actually sets", () => {
    // these are the names in .env; nothing read them before, so a public setting became private
    const config = readYoutubeConfig({ YOUTUBE_PRIVACY: "public", YOUTUBE_DEFAULT_TAGS: "ai,automation,tutorial" });
    expect(config.privacyStatus).toBe("public");
    expect(config.tags).toEqual(["ai", "automation", "tutorial"]);
  });

  it("prefers the documented name when both spellings are present", () => {
    const config = readYoutubeConfig({
      YOUTUBE_PRIVACY_STATUS: "private",
      YOUTUBE_PRIVACY: "public",
      YOUTUBE_TAGS: "documented",
      YOUTUBE_DEFAULT_TAGS: "alias",
    });
    expect(config.privacyStatus).toBe("private");
    expect(config.tags).toEqual(["documented"]);
  });

  it("refuses to guess a privacy it does not recognise", () => {
    expect(() => readYoutubeConfig({ YOUTUBE_PRIVACY: "publik" })).toThrowError(/must be one of private, unlisted, public/);
  });

  it("refuses a non-numeric category id", () => {
    expect(() => readYoutubeConfig({ YOUTUBE_CATEGORY_ID: "Science" })).toThrowError(/numeric YouTube category id/);
  });

  it("parses the made-for-kids flag and refuses junk", () => {
    expect(readYoutubeConfig({ YOUTUBE_MADE_FOR_KIDS: "0" }).madeForKids).toBe(false);
    expect(readYoutubeConfig({ YOUTUBE_MADE_FOR_KIDS: "true" }).madeForKids).toBe(true);
    expect(() => readYoutubeConfig({ YOUTUBE_MADE_FOR_KIDS: "maybe" })).toThrowError(/boolean-ish/);
  });

  it("falls back to the shipped defaults when nothing is set", () => {
    const config = readYoutubeConfig({});
    expect(config).toEqual({ privacyStatus: "private", tags: [], categoryId: "28", madeForKids: false });
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
