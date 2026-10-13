// src/lib/launch-video/music.ts
/**
 * Which bundled bed track a launch video gets.
 *
 * Derived from the product slug, so the choice is mechanical, reproducible and spread across the
 * catalog: the same product always gets the same bed, and neighbouring products are unlikely to
 * share one. Before this the bed was chosen per run by hand, and every launch landed on vol-12.
 *
 * The order of `BED_TRACKS` is load-bearing — it IS the modulo space. APPEND new tracks at the end.
 * Reordering or removing an entry re-assigns every product in the fleet, so `music.test.ts` pins the
 * current assignments and a reorder fails loudly instead of silently re-scoring the catalog.
 *
 * The derived track is the DEFAULT, not a cage: an author may override it when the derived track
 * genuinely fights the product's tone, but the override has to be stated in `brag-plan.md` with the
 * reason. Silence is never an override.
 */

export interface BedTrack {
  readonly file: string;
  /** Measured with ffprobe, not read off a label. */
  readonly seconds: number;
  readonly character: string;
}

export const BED_TRACKS: readonly BedTrack[] = [
  {
    file: "happy-beats-business-moves-vol-1-by-ende-dot-app.mp3",
    seconds: 163.992,
    character: "full upbeat, most energetic",
  },
  {
    file: "happy-beats-business-moves-vol-9-by-ende-dot-app.mp3",
    seconds: 113.664,
    character: "mid-energy, slightly more laid-back",
  },
  {
    file: "happy-beats-business-moves-vol-10-by-ende-dot-app.mp3",
    seconds: 60.024,
    character: "compact loop, punchy",
  },
  {
    file: "happy-beats-business-moves-vol-11-by-ende-dot-app.mp3",
    seconds: 87.624,
    character: "warm and business-y",
  },
  {
    file: "happy-beats-business-moves-vol-12-by-ende-dot-app.mp3",
    seconds: 117.384,
    character: "steady and clean",
  },
];

/** The shortest bed that can carry a 25s launch video. */
export const MIN_BED_SECONDS = 25;

/**
 * FNV-1a (32-bit) over the normalized slug. Small, dependency-free and stable across runs, Node
 * versions and machines — a `Math.random` or a time-based pick would re-score the catalog on every
 * render, which is the thing this exists to prevent.
 */
export function bedTrackIndex(slug: string): number {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) throw new Error("bedTrackIndex needs a slug; received an empty string");
  let hash = 0x811c9dc5;
  for (const character of normalized) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % BED_TRACKS.length;
}

/** The bed track for a product. Deterministic: same slug, same track, forever. */
export function bedTrackForSlug(slug: string): BedTrack {
  return BED_TRACKS[bedTrackIndex(slug)];
}
