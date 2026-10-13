// src/products/launch-videos.test.ts
import { describe, expect, it } from "vitest";
import { products } from "./registry";
import {
  LAUNCH_VIDEOS,
  launchVideoEmbedUrl,
  launchVideoFor,
  launchVideoWatchUrl,
} from "./launch-videos";

describe("LAUNCH_VIDEOS", () => {
  it("names only products that exist in the registry", () => {
    // A launch video for a slug no product answers at is a dead embed on a 404.
    const known = new Set(products.map((product) => product.slug));
    for (const video of LAUNCH_VIDEOS) expect(known.has(video.slug)).toBe(true);
  });

  it("never lists the same product twice", () => {
    const slugs = LAUNCH_VIDEOS.map((video) => video.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("carries a well-formed YouTube id for every entry", () => {
    // Ids are exactly 11 URL-safe characters; a truncated paste is the realistic failure.
    for (const video of LAUNCH_VIDEOS) {
      expect(video.youtubeId).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
  });

  it("carries a real title, runtime and verification date", () => {
    for (const video of LAUNCH_VIDEOS) {
      expect(video.title.trim().length).toBeGreaterThan(10);
      expect(video.durationSeconds).toBeGreaterThan(0);
      expect(video.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("launchVideoFor", () => {
  it("finds a published product", () => {
    expect(launchVideoFor("spendproof")?.youtubeId).toBe("LdSoKLTfYjs");
  });

  it("returns undefined for a product with no video, and for a slug that is not a product", () => {
    // The page must render nothing rather than an empty player.
    expect(launchVideoFor("quarterline")).toBeUndefined();
    expect(launchVideoFor("not-a-product")).toBeUndefined();
    expect(launchVideoFor("")).toBeUndefined();
  });
});

describe("embed URLs", () => {
  it("uses the privacy-enhanced host, so no cookie is set before play", () => {
    const video = LAUNCH_VIDEOS[0];
    expect(launchVideoEmbedUrl(video)).toBe("https://www.youtube-nocookie.com/embed/LdSoKLTfYjs");
    expect(launchVideoEmbedUrl(video)).not.toContain("youtube.com/embed");
  });

  it("builds a short watch URL", () => {
    expect(launchVideoWatchUrl(LAUNCH_VIDEOS[0])).toBe("https://youtu.be/LdSoKLTfYjs");
  });
});
