// src/lib/launch-video/youtube.ts
export const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
export const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const TECH_CATEGORY_ID = "28"; // Science & Technology
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 5000;
export const TAGS_TOTAL_MAX = 500;

export interface VideoResourceInput {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
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
      title: input.title.slice(0, TITLE_MAX),
      description: input.description.slice(0, DESCRIPTION_MAX),
      tags,
      categoryId: TECH_CATEGORY_ID,
    },
    status: { privacyStatus: input.privacyStatus, selfDeclaredMadeForKids: false },
  };
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
