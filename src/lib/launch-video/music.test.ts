// src/lib/launch-video/music.test.ts
import { describe, expect, it } from "vitest";
import { BED_TRACKS, bedTrackForSlug, bedTrackIndex, MIN_BED_SECONDS } from "./music";

describe("BED_TRACKS", () => {
  it("every bed is long enough to carry a launch video", () => {
    for (const track of BED_TRACKS) {
      expect(track.seconds).toBeGreaterThanOrEqual(MIN_BED_SECONDS);
      expect(track.file).toMatch(/\.mp3$/);
    }
  });

  it("has no duplicate entries, and the order is append-only", () => {
    // This exact order IS the modulo space. If this assertion fails because someone reordered or
    // inserted a track, every product's bed changes at once — re-pin the fleet below deliberately.
    expect(BED_TRACKS.map((t) => t.file)).toEqual([
      "happy-beats-business-moves-vol-1-by-ende-dot-app.mp3",
      "happy-beats-business-moves-vol-9-by-ende-dot-app.mp3",
      "happy-beats-business-moves-vol-10-by-ende-dot-app.mp3",
      "happy-beats-business-moves-vol-11-by-ende-dot-app.mp3",
      "happy-beats-business-moves-vol-12-by-ende-dot-app.mp3",
    ]);
  });
});

describe("bedTrackForSlug", () => {
  it("is deterministic — the same slug always resolves to the same track", () => {
    for (const slug of ["spendproof", "quarterline", "parcelproof"]) {
      const first = bedTrackForSlug(slug);
      for (let i = 0; i < 25; i += 1) expect(bedTrackForSlug(slug)).toBe(first);
    }
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(bedTrackForSlug("  SpendProof ")).toBe(bedTrackForSlug("spendproof"));
  });

  it("refuses an empty slug rather than silently landing on one track", () => {
    expect(() => bedTrackIndex("")).toThrowError(/needs a slug/);
    expect(() => bedTrackIndex("   ")).toThrowError(/needs a slug/);
  });

  it("spreads the fleet instead of putting everyone on one track", () => {
    // Regression guard: the bug this replaced handed every launch vol-12.
    const fleet = ["quarterline", "ledgerlink", "facturgate", "parcelproof", "caseproof", "spendproof"];
    const used = new Set(fleet.map((s) => bedTrackForSlug(s).file));
    expect(used.size).toBeGreaterThanOrEqual(4);
  });

  it("pins the current fleet assignment, so a reorder cannot silently re-score it", () => {
    expect(bedTrackForSlug("quarterline").file).toBe("happy-beats-business-moves-vol-1-by-ende-dot-app.mp3");
    expect(bedTrackForSlug("ledgerlink").file).toBe("happy-beats-business-moves-vol-11-by-ende-dot-app.mp3");
    expect(bedTrackForSlug("facturgate").file).toBe("happy-beats-business-moves-vol-12-by-ende-dot-app.mp3");
    expect(bedTrackForSlug("parcelproof").file).toBe("happy-beats-business-moves-vol-9-by-ende-dot-app.mp3");
    expect(bedTrackForSlug("caseproof").file).toBe("happy-beats-business-moves-vol-12-by-ende-dot-app.mp3");
    expect(bedTrackForSlug("spendproof").file).toBe("happy-beats-business-moves-vol-11-by-ende-dot-app.mp3");
  });

  it("keeps the index inside the catalog for any slug shape", () => {
    for (const slug of ["a", "spendproof", "a-very-long-product-slug-name", "x1", "0000"]) {
      const index = bedTrackIndex(slug);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(BED_TRACKS.length);
    }
  });
});
