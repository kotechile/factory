// src/lib/launch-video/youtube.ts
export const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
export const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
/**
 * Media lives on the /upload/ host, not the metadata host. Posting thumbnail bytes to
 * `${YOUTUBE_API}/thumbnails/set` returns HTTP 400 "The request does not include the image content",
 * because that endpoint expects JSON metadata rather than the image itself.
 */
export const YOUTUBE_THUMBNAIL_URL = "https://www.googleapis.com/upload/youtube/v3/thumbnails/set";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const TECH_CATEGORY_ID = "28"; // Science & Technology
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 5000;
export const TAGS_TOTAL_MAX = 500;

/**
 * A word the cut can strand at the end ("…labour at the"). Dropped after trimming so a shortened title
 * reads as a title rather than a sentence that stopped mid-thought.
 */
const DANGLING_TAIL =
  /\s+(?:a|an|the|and|or|of|to|in|on|at|for|with|by|from|into|as|is|are|was|were|be|that|this|its|your|our|their)$/i;

const TRAILING_PUNCTUATION = /[\s,;:.·—–-]+$/;

/**
 * YouTube caps a title at 100 characters, and a hard slice cuts mid-word: the first live uploads came
 * out as "…£4,378.21 decomposes", "…EU e-invoices — the e" and "…before you sign: labour at the fully
 * l". Cut on the last word boundary instead, drop a stranded trailing word, and strip the punctuation
 * the cut leaves behind. The share copy's first sentence is still the title, so a first sentence
 * longer than the cap now yields a shorter title rather than a broken one.
 */
export function truncateTitle(title: string, max: number = TITLE_MAX): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) return trimmed;

  let cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0) cut = cut.slice(0, lastSpace);

  let previous: string;
  do {
    previous = cut;
    cut = cut.replace(TRAILING_PUNCTUATION, "").replace(DANGLING_TAIL, "");
  } while (cut !== previous);

  return cut;
}

export interface VideoResourceInput {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
  categoryId?: string;
  madeForKids?: boolean;
}

export function buildVideoResource(input: VideoResourceInput) {
  const tags: string[] = [];
  let len = 0;
  for (const tag of input.tags) {
    const t = tag.trim();
    if (!t) continue;
    if (len + t.length + 1 > TAGS_TOTAL_MAX) break;
    tags.push(t);
    len += t.length + 1;
  }
  return {
    snippet: {
      title: truncateTitle(input.title),
      description: input.description.slice(0, DESCRIPTION_MAX),
      tags,
      categoryId: input.categoryId ?? TECH_CATEGORY_ID,
    },
    status: {
      privacyStatus: input.privacyStatus,
      selfDeclaredMadeForKids: input.madeForKids ?? DEFAULT_MADE_FOR_KIDS,
    },
  };
}

export const DEFAULT_PRIVACY_STATUS = "private";
export const DEFAULT_MADE_FOR_KIDS = false;
const PRIVACY_VALUES = ["private", "unlisted", "public"] as const;

export interface YoutubeConfig {
  privacyStatus: (typeof PRIVACY_VALUES)[number];
  tags: string[];
  categoryId: string;
  madeForKids: boolean;
}

/**
 * Read the upload settings, accepting both the documented names and the ones `.env` actually
 * shipped with.
 *
 * `.env.example`, the README and the SOP all document `YOUTUBE_PRIVACY_STATUS` / `YOUTUBE_TAGS`,
 * while the deployed `.env` sets `YOUTUBE_PRIVACY` / `YOUTUBE_DEFAULT_TAGS`. Nothing read the
 * latter, so a `public` setting silently became `private` and the configured tags were dropped —
 * an unread setting is the same class of bug as a silent fallback, just quieter. Both spellings are
 * accepted here, in one place, so the aliasing is visible instead of scattered.
 *
 * An unrecognised value is refused rather than coerced: a typo in `YOUTUBE_PRIVACY` must not decide
 * whether a video is published.
 */
export function readYoutubeConfig(env: Record<string, string | undefined>): YoutubeConfig {
  const privacy = (env.YOUTUBE_PRIVACY_STATUS ?? env.YOUTUBE_PRIVACY ?? DEFAULT_PRIVACY_STATUS).trim();
  if (!PRIVACY_VALUES.includes(privacy as (typeof PRIVACY_VALUES)[number])) {
    throw new Error(
      `YOUTUBE_PRIVACY_STATUS/YOUTUBE_PRIVACY must be one of ${PRIVACY_VALUES.join(", ")}; ` +
        `received ${JSON.stringify(privacy)}. Refusing to guess a privacy for a published video.`,
    );
  }

  const tags = (env.YOUTUBE_TAGS ?? env.YOUTUBE_DEFAULT_TAGS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const categoryId = (env.YOUTUBE_CATEGORY_ID ?? TECH_CATEGORY_ID).trim();
  if (!/^\d+$/.test(categoryId)) {
    throw new Error(`YOUTUBE_CATEGORY_ID must be a numeric YouTube category id; received ${JSON.stringify(categoryId)}`);
  }

  const rawKids = env.YOUTUBE_MADE_FOR_KIDS;
  let madeForKids = DEFAULT_MADE_FOR_KIDS;
  if (rawKids !== undefined && rawKids.trim() !== "") {
    const value = rawKids.trim().toLowerCase();
    if (["1", "true", "yes"].includes(value)) madeForKids = true;
    else if (["0", "false", "no"].includes(value)) madeForKids = false;
    else {
      throw new Error(`YOUTUBE_MADE_FOR_KIDS must be a boolean-ish value; received ${JSON.stringify(rawKids)}`);
    }
  }

  return { privacyStatus: privacy as (typeof PRIVACY_VALUES)[number], tags, categoryId, madeForKids };
}

export function parseShareCopy(text: string): { title: string; description: string } {
  const lines = text.split("\n").map((l) => l.trim());
  const firstIndex = lines.findIndex((l) => l.length > 0);
  if (firstIndex === -1) throw new Error("share-copy.txt is empty — the brag step did not produce share copy");
  const title = lines[firstIndex].replace(/^#+\s*/, "").replace(/^["']|["']$/g, "").trim();
  const description = lines.slice(firstIndex + 1).join("\n").trim();
  return { title, description };
}

export function buildResumableInit(args: { size: number; mimeType: string }): {
  url: string;
  headers: Record<string, string>;
} {
  return {
    url: `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(args.size),
      "X-Upload-Content-Type": args.mimeType,
    },
  };
}

export function parseRefreshTokenResponse(json: {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}): { accessToken: string; expiresIn: number } {
  if (!json.access_token) {
    throw new Error(
      `Google token refresh failed: ${json.error ?? "no access_token"}${json.error_description ? `: ${json.error_description}` : ""}`,
    );
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 0 };
}
