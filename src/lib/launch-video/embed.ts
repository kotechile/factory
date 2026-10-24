// src/lib/launch-video/embed.ts
/**
 * Wiring a published launch video into the site — the half the pipeline used to leave to a human.
 *
 * After `youtube-upload.mjs` returns an id, the product page still shows nothing until someone adds
 * an entry to `src/products/launch-videos.ts` and drops a poster into `public/launch-videos/`. That
 * is the manual link in an otherwise unattended pipeline, and it is why a launch could sit with a
 * video on YouTube and no video on its page. These helpers are the pure half of closing it: they
 * read the YouTube resource, decide the embed's accessible name, and insert a correctly formatted
 * registry entry without rewriting the file around it.
 *
 * The registry is the runtime source of truth (the pages read it), so this module only ever APPENDS
 * a missing slug. An id that is already published is never rewritten by automation: the owner owns
 * the ids, and a re-run of the pipeline must not silently repoint a live page at a different video.
 */

/** Metadata host for `videos.list`. Uploads go to the /upload/ host; reads do not. */
export const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/** The poster size the page declares (1280×720) and the facade renders into a 16:9 box. */
export const POSTER_WIDTH = 1280;
export const POSTER_HEIGHT = 720;

/**
 * Below this a "poster" is YouTube's 120×90 placeholder for a thumbnail it does not have. The
 * products test also refuses anything under 10 KB (a 120×90 JPEG is ~2 KB), so an upscale of a
 * placeholder would fail the build later rather than at the point of the mistake.
 */
export const POSTER_MIN_BYTES = 10_000;

/** The array declaration this module inserts into. Missing it means the file moved; fail loudly. */
export const REGISTRY_ARRAY_MARKER = "export const LAUNCH_VIDEOS: readonly LaunchVideo[] = [";

export interface LaunchVideoEntry {
  readonly slug: string;
  readonly youtubeId: string;
  readonly title: string;
  readonly durationSeconds: number;
  /** ISO date (YYYY-MM-DD) the upload was verified against the YouTube API. */
  readonly publishedAt: string;
}

/**
 * ISO-8601 duration (`PT23S`, `PT1M23S`, `PT1H2M3S`) → whole seconds.
 *
 * YouTube reports runtime as `contentDetails.duration`, not as a number, and rounding it wrong puts
 * a wrong "23s" on the page. Fractions are rounded up: a 22.4 s video is not a 22 s video.
 */
export function parseIsoDuration(iso: string): number {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso.trim());
  if (!match) throw new Error(`cannot read a duration from ${JSON.stringify(iso)} — expected ISO-8601 like PT23S`);
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 86_400 +
    Number(hours ?? 0) * 3_600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0);
  if (!Number.isFinite(total)) throw new Error(`duration ${JSON.stringify(iso)} is not a finite number of seconds`);
  if (total <= 0) throw new Error(`duration ${JSON.stringify(iso)} is not positive — the video has no runtime`);
  return Math.ceil(total);
}

export interface VideoResourceItem {
  id?: string;
  snippet?: { title?: string };
  contentDetails?: { duration?: string };
  status?: { uploadStatus?: string; privacyStatus?: string };
}

export interface VerifiedVideo {
  readonly youtubeId: string;
  readonly title: string;
  readonly durationSeconds: number;
  readonly privacyStatus: string;
}

/**
 * What the API must say before an id may go on a live page.
 *
 * `private` is refused rather than embedded: a private video renders "Video unavailable" to every
 * visitor, which is worse than no embed at all. An upload that has not finished processing is
 * retried by the caller, so it throws with the status the API actually reported.
 */
export function verifyVideoResource(json: { items?: VideoResourceItem[] }, expectedId: string): VerifiedVideo {
  const items = json.items ?? [];
  if (items.length === 0) {
    throw new Error(
      `YouTube returned no video for ${expectedId} — the upload is not readable yet (processing, wrong ` +
        `channel, or a wrong id); retry, do not guess metadata`,
    );
  }
  const item = items.find((candidate) => candidate.id === expectedId) ?? items[0];
  const uploadStatus = item.status?.uploadStatus;
  if (uploadStatus !== "processed") {
    throw new Error(
      `video ${expectedId} has uploadStatus=${JSON.stringify(uploadStatus)} — YouTube has not finished ` +
        `processing it; retry rather than embedding a video that cannot play`,
    );
  }
  const privacyStatus = item.status?.privacyStatus;
  if (privacyStatus === "private") {
    throw new Error(
      `video ${expectedId} is private — a public page cannot play it. Flip the privacy (the upload ` +
        `defaults to private on purpose) or leave it unembedded`,
    );
  }
  const rawTitle = item.snippet?.title?.trim();
  if (!rawTitle) throw new Error(`video ${expectedId} has no snippet.title — nothing to label the embed with`);
  const rawDuration = item.contentDetails?.duration;
  if (!rawDuration) {
    throw new Error(`video ${expectedId} has no contentDetails.duration — refusing to invent a runtime`);
  }
  return {
    youtubeId: item.id ?? expectedId,
    title: rawTitle,
    durationSeconds: parseIsoDuration(rawDuration),
    privacyStatus: privacyStatus ?? "unknown",
  };
}

/**
 * The embed's accessible name.
 *
 * Hand-published uploads are titled with the product name alone ("SpendProof"), which is not a
 * usable name for an iframe, so those fall back to the product's own tagline. The rule is length
 * based on purpose: a title that merely repeats the name carries no information.
 */
export function accessibleName(args: {
  youtubeTitle: string;
  productName: string;
  tagline: string;
}): string {
  const title = args.youtubeTitle.trim();
  const name = args.productName.trim();
  const tagline = args.tagline.trim().replace(/[.\s]+$/, "");
  if (title.length >= name.length + 8 && title.toLowerCase() !== name.toLowerCase()) return title;
  if (!tagline) return `Introducing ${name}`;
  return `Introducing ${name}: ${tagline}`;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate before writing: a malformed entry would fail the products test after the file changed. */
export function assertEmbeddable(entry: LaunchVideoEntry): void {
  if (!SLUG.test(entry.slug)) throw new Error(`slug ${JSON.stringify(entry.slug)} is not a product slug`);
  if (!YOUTUBE_ID.test(entry.youtubeId)) {
    throw new Error(`youtubeId ${JSON.stringify(entry.youtubeId)} is not an 11-character YouTube id`);
  }
  if (!entry.title.trim()) throw new Error(`entry for ${entry.slug} has no title`);
  if (!Number.isInteger(entry.durationSeconds) || entry.durationSeconds <= 0) {
    throw new Error(`entry for ${entry.slug} has a runtime of ${entry.durationSeconds}s`);
  }
  if (!ISO_DATE.test(entry.publishedAt)) {
    throw new Error(`entry for ${entry.slug} has publishedAt ${JSON.stringify(entry.publishedAt)} (want YYYY-MM-DD)`);
  }
}

/** One registry entry, formatted exactly like the hand-written ones it sits beside. */
export function renderEntry(entry: LaunchVideoEntry, indent = "  "): string {
  assertEmbeddable(entry);
  const quote = (value: string) => JSON.stringify(value);
  return [
    `${indent}{`,
    `${indent}  slug: ${quote(entry.slug)},`,
    `${indent}  youtubeId: ${quote(entry.youtubeId)},`,
    `${indent}  posterPath: ${quote(`/launch-videos/${entry.slug}.jpg`)},`,
    `${indent}  title: ${quote(entry.title)},`,
    `${indent}  durationSeconds: ${entry.durationSeconds},`,
    `${indent}  publishedAt: ${quote(entry.publishedAt)},`,
    `${indent}},`,
  ].join("\n");
}

/** The slugs the registry already carries — read from source so a mid-edit checkout still parses. */
export function embeddedSlugs(source: string): string[] {
  const slugs: string[] = [];
  for (const match of source.matchAll(/slug:\s*"([a-z0-9-]+)"/g)) slugs.push(match[1]);
  return slugs;
}

/**
 * Insert a new entry at the top of the array (newest first, matching the file's convention).
 *
 * Deliberately an insertion and not a rewrite: the file carries hand-written comments explaining
 * each id, and regenerating it would throw those away. Re-adding an existing slug throws instead of
 * silently repointing a published page.
 */
export function insertEntry(source: string, entry: LaunchVideoEntry): string {
  const marker = REGISTRY_ARRAY_MARKER;
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`the launch-video registry no longer declares ${JSON.stringify(marker)} — update embed.ts before running it`);
  }
  if (embeddedSlugs(source).includes(entry.slug)) {
    throw new Error(`${entry.slug} is already embedded — a published id is owned by hand, not repointed by automation`);
  }
  const insertAt = markerIndex + marker.length;
  return `${source.slice(0, insertAt)}\n${renderEntry(entry)}${source.slice(insertAt)}`;
}

/** True when the fetched thumbnail is big enough to serve as a 1280×720 poster. */
export function isUsablePoster(width: number, height: number): boolean {
  return width >= POSTER_WIDTH && height >= POSTER_HEIGHT;
}

/** Today, in the form `publishedAt` takes. */
export function isoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** The published id the registry carries for a slug, if any — for recording what a replace superseded. */
export function embeddedIdFor(source: string, slug: string): string | undefined {
  const block = new RegExp(`\\{\\s*\\n\\s*slug: "${slug}",[\\s\\S]*?\\n\\s*\\},`).exec(source);
  if (!block) return undefined;
  return /youtubeId: "([^"]+)"/.exec(block[0])?.[1];
}

/**
 * Point an already-published slug at a different video.
 *
 * This is the one legitimate rewrite of an existing entry: the film was re-cut and re-uploaded, and the
 * page must show the new one. It is deliberately opt-in (`--replace`) because the default must stay
 * "never repoint a published page", and because a silent repoint would strand whatever the old id was
 * with no record of the swap. Only the four fields that describe the upload change; the slug, poster
 * path and any hand-written comment around the block are left exactly as they are.
 */
export function replaceEntry(source: string, entry: LaunchVideoEntry): string {
  assertEmbeddable(entry);
  if (!source.includes(REGISTRY_ARRAY_MARKER)) {
    throw new Error(`the launch-video registry no longer declares ${JSON.stringify(REGISTRY_ARRAY_MARKER)}`);
  }
  if (!embeddedSlugs(source).includes(entry.slug)) {
    throw new Error(`${entry.slug} is not embedded yet — use insertEntry, not replaceEntry`);
  }
  const quote = (value: string) => JSON.stringify(value);
  const match = new RegExp(`\\{\\s*\\n(\\s*)slug: "${entry.slug}",[\\s\\S]*?\\n\\s*\\},`).exec(source);
  if (!match) throw new Error(`could not find the ${entry.slug} entry to replace`);

  const block = match[0]
    .replace(/youtubeId: "[^"]*",/, `youtubeId: ${quote(entry.youtubeId)},`)
    .replace(/title: "(?:[^"\\]|\\.)*",/, `title: ${quote(entry.title)},`)
    .replace(/durationSeconds: \d+,/, `durationSeconds: ${entry.durationSeconds},`)
    .replace(/publishedAt: "[^"]*",/, `publishedAt: ${quote(entry.publishedAt)},`);

  return source.slice(0, match.index) + block + source.slice(match.index + match[0].length);
}
