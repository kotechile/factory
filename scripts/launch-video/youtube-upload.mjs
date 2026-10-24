#!/usr/bin/env node
/**
 * youtube-upload.mjs — upload launch.mp4 to the owner's channel via the YouTube Data API v3.
 *
 *   node scripts/launch-video/youtube-upload.mjs --slug spendproof
 *   node scripts/launch-video/youtube-upload.mjs --slug spendproof --dry-run
 *   node scripts/launch-video/youtube-upload.mjs --check-auth          # verifies the refresh token
 *
 * Default privacy comes from YOUTUBE_PRIVACY_STATUS (shipped default: private).
 * Thumbnail failure is the ONLY warning-only case (custom thumbnails require a verified channel);
 * it is logged, written into youtube.json and must be reported in the Slack post. Everything else
 * is fatal with the provider's own error text.
 */
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import {
  buildResumableInit, buildVideoResource, parseRefreshTokenResponse, parseShareCopy, readYoutubeConfig,
  YOUTUBE_API, YOUTUBE_THUMBNAIL_URL, GOOGLE_TOKEN_URL,
} from "../../src/lib/launch-video/youtube.ts";
import { analyseMotion, craftProblems, sampleMotion } from "../../src/lib/launch-video/craft.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));
const argv = process.argv.slice(2);
const flag = (n, fallback) => { const i = argv.indexOf(n); return i === -1 ? fallback : argv[i + 1]; };
const dryRun = argv.includes("--dry-run");

const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = requireEnv(
  process.env, ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"], join(REPO, ".env"),
);

async function accessToken() {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  return parseRefreshTokenResponse(await res.json()).accessToken;
}

if (argv.includes("--check-auth")) {
  const token = await accessToken();
  const res = await fetch(`${YOUTUBE_API}/channels?part=snippet&mine=true`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) { console.error(`YouTube API rejected the token: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  const json = await res.json();
  console.log(`auth OK — channel: ${json.items?.[0]?.snippet?.title ?? "(none returned)"}`);
  process.exit(0);
}

const slug = flag("--slug");
if (!slug) { console.error("usage: node scripts/launch-video/youtube-upload.mjs --slug <slug> [--dry-run|--check-auth]"); process.exit(2); }

const dir = join(REPO, "content", "launch_videos", slug);
const videoPath = flag("--video", join(dir, "launch.mp4"));
const shareCopyPath = flag("--share-copy", join(dir, "share-copy.txt"));
const thumbnailPath = flag("--thumbnail", join(dir, "brag.jpg"));
if (!existsSync(videoPath)) throw new Error(`missing ${videoPath} — the mux step must run first`);
if (!existsSync(shareCopyPath)) throw new Error(`missing ${shareCopyPath} — the brag step must produce share copy`);

// CRAFT GATE — the upload is the last place this can be stopped. Five films shipped 56-66% frozen
// because the only audit looked at structure and contrast; a film that does not move is not
// uploaded, whatever the report would have said about it.
const craft = analyseMotion(sampleMotion(videoPath).deltas);
const craftFailures = craftProblems(craft);
if (craftFailures.length > 0) {
  console.error(
    `craft gate failed for ${slug}: ${craft.seconds.toFixed(1)}s, ` +
      `${Math.round(craft.staticFraction * 100)}% frozen, longest frozen stretch ` +
      `${craft.longestStaticRunSeconds.toFixed(1)}s, ${craft.beats} beats`,
  );
  for (const failure of craftFailures) console.error(`  - ${failure}`);
  console.error(
    `  revise the composition and re-render, or run ` +
      `\`node scripts/launch-video/check-craft.mjs --slug ${slug} --montage /tmp/${slug}.jpg\` to look at it`,
  );
  process.exit(1);
}
console.log(
  `craft OK: ${craft.beats} beats, ${Math.round(craft.staticFraction * 100)}% frozen, ` +
    `longest hold ${craft.longestStaticRunSeconds.toFixed(1)}s`,
);

const { title, description } = parseShareCopy(readFileSync(shareCopyPath, "utf8"));
const productUrl = `${(process.env.NEXT_PUBLIC_APP_URL || "https://apps.giniloh.com").replace(/\/$/, "")}/${slug}/`;
// accepts both the documented names and the ones the deployed .env uses; refuses an unknown value
const { privacyStatus, tags, categoryId, madeForKids } = readYoutubeConfig(process.env);
const size = statSync(videoPath).size;
const body = buildVideoResource({
  title, tags, privacyStatus, categoryId, madeForKids,
  description: `${description}\n\nTry it: ${productUrl}\nDeterministic, no signup needed.`,
});

if (dryRun) {
  console.log(`DRY RUN → ${buildResumableInit({ size, mimeType: "video/mp4" }).url}`);
  console.log(`  file: ${videoPath} (${size} bytes)`);
  console.log(`  title: ${body.snippet.title}`);
  console.log(`  privacy: ${body.status.privacyStatus}  category: ${body.snippet.categoryId}  madeForKids: ${body.status.selfDeclaredMadeForKids}`);
  console.log(`  tags (${body.snippet.tags.length}): ${body.snippet.tags.join(", ") || "(none)"}`);
  console.log(`  description:\n${body.snippet.description}`);
  process.exit(0);
}

const token = await accessToken();
const init = buildResumableInit({ size, mimeType: "video/mp4" });
const session = await fetch(init.url, {
  method: "POST",
  headers: { ...init.headers, authorization: `Bearer ${token}` },
  body: JSON.stringify(body),
});
if (!session.ok) {
  console.error(`YouTube upload session failed: HTTP ${session.status} — ${(await session.text()).slice(0, 400)}`);
  process.exit(1);
}
const uploadUrl = session.headers.get("location");
if (!uploadUrl) { console.error("YouTube returned no Location header for the resumable session"); process.exit(1); }

const put = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "content-type": "video/mp4", "content-length": String(size) },
  body: readFileSync(videoPath),
});
const json = await put.json().catch(() => ({}));
// A completed resumable upload answers 200 or 201 depending on the backend. Requiring exactly 201
// reported a live, public video as a failure — and skipped the thumbnail and the result file.
if ((put.status !== 201 && put.status !== 200) || !json.id) {
  console.error(`YouTube upload failed: HTTP ${put.status} — ${JSON.stringify(json).slice(0, 400)}`);
  process.exit(1);
}

const result = {
  slug, videoId: json.id, url: `https://youtu.be/${json.id}`,
  privacyStatus, title: body.snippet.title, uploadedAt: new Date().toISOString(), thumbnail: "skipped",
};

if (existsSync(thumbnailPath)) {
  const thumb = await fetch(`${YOUTUBE_THUMBNAIL_URL}?videoId=${json.id}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" },
    body: readFileSync(thumbnailPath),
  });
  if (thumb.ok) result.thumbnail = "set";
  else {
    result.thumbnail = `WARNING: HTTP ${thumb.status} — ${(await thumb.text()).slice(0, 200)}`;
    console.error(`[warn] thumbnail not set (${result.thumbnail}). Custom thumbnails need a verified channel + the youtube scope.`);
  }
}

writeFileSync(join(dir, "youtube.json"), JSON.stringify(result, null, 2));
console.log(`uploaded ${result.url} (privacy: ${privacyStatus}, thumbnail: ${result.thumbnail})`);
if (result.thumbnail.startsWith("WARNING")) process.exitCode = 0; // warn-only, reported by the SOP
