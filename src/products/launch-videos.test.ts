// src/products/launch-videos.test.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { jpegSize } from "@/lib/launch-video/embed";
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

  it("ships the facade poster in public/, so a page view reaches no third party", () => {
    // The embed is click-to-load: the poster is the only image the section shows before play, so it
    // must be ours — a YouTube thumbnail URL here and back come the third-party requests the facade
    // exists to remove. The FILE is checked, not just the path: a missing poster renders a broken
    // tile while every other gate stays green.
    for (const video of LAUNCH_VIDEOS) {
      expect(video.posterPath).toMatch(/^\/launch-videos\/[a-z0-9-]+\.jpg$/);
      const file = join(process.cwd(), "public", video.posterPath.replace(/^\//, ""));
      expect(existsSync(file), `${video.slug}: missing poster ${video.posterPath}`).toBe(true);
      // Dimensions, not bytes: a designed frame that is mostly one flat colour compresses to ~8 KB,
      // which overlaps YouTube's ~2 KB 120×90 "no thumbnail" placeholder. The page renders 1280×720.
      const poster = jpegSize(new Uint8Array(readFileSync(file)));
      expect(poster, `${video.slug}: poster is not a readable JPEG`).not.toBeNull();
      expect(poster, `${video.slug}: poster is ${poster?.width}×${poster?.height}`).toEqual({ width: 1280, height: 720 });
    }
  });
});

describe("launchVideoFor", () => {
  it("finds a published product", () => {
    expect(launchVideoFor("spendproof")?.youtubeId).toBe("fYCWUMVtb_M");
  });

  it("returns undefined for a product with no video, and for a slug that is not a product", () => {
    // The page must render nothing rather than an empty player.
    expect(launchVideoFor("quarterline")).toBeUndefined();
    expect(launchVideoFor("not-a-product")).toBeUndefined();
    expect(launchVideoFor("")).toBeUndefined();
  });
});

describe("embed URLs", () => {
  // Pin the shaped URL to a known slug rather than to LAUNCH_VIDEOS[0]: every launch inserts its
  // entry at the top, so an index-based assertion fails on the next product, not on a real defect.
  it("uses the privacy-enhanced host, so no cookie is set before play", () => {
    const video = launchVideoFor("spendproof");
    expect(video).toBeDefined();
    expect(launchVideoEmbedUrl(video!)).toBe("https://www.youtube-nocookie.com/embed/fYCWUMVtb_M");
    expect(launchVideoEmbedUrl(video!)).not.toContain("youtube.com/embed");
  });

  it("builds a short watch URL", () => {
    const video = launchVideoFor("spendproof");
    expect(video).toBeDefined();
    expect(launchVideoWatchUrl(video!)).toBe("https://youtu.be/fYCWUMVtb_M");
  });
});
