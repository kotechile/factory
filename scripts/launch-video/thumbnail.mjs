#!/usr/bin/env node
/**
 * thumbnail.mjs — choose the poster/thumbnail frame, set it on YouTube, and prove what is live.
 *
 *   node scripts/launch-video/thumbnail.mjs --slug spendproof --check
 *   node scripts/launch-video/thumbnail.mjs --slug spendproof --at 2.6
 *   node scripts/launch-video/thumbnail.mjs --slug spendproof --from /path/to/frame.jpg
 *   node scripts/launch-video/thumbnail.mjs --slug caseproof --title "Introducing CaseProof: ..."
 *   node scripts/launch-video/thumbnail.mjs --slug caseproof --description-from content/.../share-copy.txt
 *
 * Why not frame 0: frame 0 of a HyperFrames render is the first frame of an entrance — often before
 * the headline has landed — so it makes a blank or half-built thumbnail. A thumbnail has to be a
 * SETTLED beat (text fully in, before it exits), which is why the frame is chosen, not defaulted.
 *
 * Writes public/launch-videos/<slug>.jpg at 1280×720 (the size the page renders) and posts the same
 * bytes as the video's custom thumbnail. `--check` changes nothing: it prints the title, description
 * and runtime YouTube actually holds, so "is the description there?" is answered by the API, not by
 * the local file that was meant to be sent.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import { GOOGLE_TOKEN_URL, YOUTUBE_API, YOUTUBE_THUMBNAIL_URL } from "../../src/lib/launch-video/youtube.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};
const slug = flag("--slug");
if (!slug) {
  console.error("usage: node scripts/launch-video/thumbnail.mjs --slug <slug> [--check] [--at <seconds>] [--from <jpg>]");
  process.exit(2);
}

const dir = join(REPO, "content", "launch_videos", slug);
const record = join(dir, "youtube.json");
if (!existsSync(record)) throw new Error(`missing ${record} — upload first`);
const videoId = JSON.parse(readFileSync(record, "utf8")).videoId;
if (!videoId) throw new Error(`${record} has no videoId`);

async function accessToken() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = requireEnv(
    process.env, ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"], join(REPO, ".env"),
  );
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`token refresh failed: ${json.error ?? "no access_token"}`);
  return json.access_token;
}

const token = await accessToken();

/** What YouTube actually holds for this video — the only answer to "is the description there?". */
async function readBack() {
  const res = await fetch(
    `${YOUTUBE_API}/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`videos.list failed: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  const item = (await res.json()).items?.[0];
  if (!item) throw new Error(`YouTube returns no video for ${videoId}`);
  return {
    title: item.snippet?.title ?? "",
    description: item.snippet?.description ?? "",
    tags: item.snippet?.tags ?? [],
    duration: item.contentDetails?.duration,
    privacy: item.status?.privacyStatus,
    uploadStatus: item.status?.uploadStatus,
    thumbnails: Object.keys(item.snippet?.thumbnails ?? {}),
  };
}

// A title that a 100-char word-boundary cut left mid-sentence needs fixing on the video itself; the
// snippet is re-sent whole (description, tags and category included) so a title edit cannot blank them.
async function updateSnippet(nextTitle, nextDescription) {
  const res = await fetch(`${YOUTUBE_API}/videos?part=snippet&id=${encodeURIComponent(videoId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const item = (await res.json()).items?.[0];
  if (!item) throw new Error(`cannot read ${videoId} to retitle it`);
  const snippet = {
    title: (nextTitle ?? item.snippet?.title ?? "").slice(0, 100),
    description: nextDescription ?? item.snippet?.description ?? "",
    tags: item.snippet?.tags ?? [],
    categoryId: item.snippet?.categoryId ?? "28",
  };
  const put = await fetch(`${YOUTUBE_API}/videos?part=snippet`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ id: videoId, snippet }),
  });
  if (!put.ok) throw new Error(`snippet update failed: HTTP ${put.status} — ${(await put.text()).slice(0, 300)}`);
  console.log(`title set on ${videoId}: ${JSON.stringify(snippet.title)}`);
  console.log(`description set: ${snippet.description.length} chars`);
}

/** The description the upload step builds: the share copy's body plus the product link. */
function descriptionFromShareCopy(path) {
  const lines = readFileSync(path, "utf8").split("\n").map((line) => line.trim());
  const first = lines.findIndex((line) => line.length > 0);
  if (first === -1) throw new Error(`${path} is empty`);
  const body = lines.slice(first + 1).filter(Boolean).join("\n\n");
  if (!body) {
    throw new Error(
      `${path} has a title line and no description body — a one-line share copy uploads a 78-char ` +
        `description. Split it: line 1 is the title, the rest is the description`,
    );
  }
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://apps.aichieve.net").replace(/\/$/, "");
  return `${body}\n\nTry it: ${base}/${slug}/\nDeterministic, no signup needed.`;
}

const wantTitle = flag("--title");
const descriptionFile = flag("--description-from");
const nextDescription = descriptionFile
  ? descriptionFromShareCopy(descriptionFile)
  : flag("--description");
if (wantTitle || nextDescription) await updateSnippet(wantTitle, nextDescription);

if (argv.includes("--check")) {
  const live = await readBack();
  console.log(`${slug} · ${videoId}`);
  console.log(`  title      ${JSON.stringify(live.title)} (${live.title.length} chars)`);
  console.log(`  description ${live.description.length} chars · ${live.description.split("\n").length} line(s)`);
  console.log(`  tags       ${live.tags.length}`);
  console.log(`  runtime    ${live.duration} · privacy ${live.privacy} · ${live.uploadStatus}`);
  console.log(`  thumbnails ${live.thumbnails.join(", ") || "(none)"}`);
  const expected = readFileSync(join(dir, "share-copy.txt"), "utf8").split("\n")[0].trim();
  if (live.title !== expected.slice(0, 100)) {
    console.log(`  NOTE       share-copy's first line differs from the live title (YouTube truncates at 100)`);
  }
  if (live.description.length < 80) console.log("  FAIL       description is missing or too short");
  process.exit(0);
}

/**
 * A metadata-only run must not touch the image: re-cutting at a default timestamp would silently
 * replace a chosen thumbnail with whatever happens to be on screen at 2.6s.
 */
const setThumbnail = argv.includes("--set-thumbnail") || !!flag("--from") || !!flag("--at");
if (!setThumbnail) {
  const live = await readBack();
  console.log(`${videoId}: title "${live.title}" · description ${live.description.length} chars · thumbnail left as it is`);
  process.exit(0);
}

/** Cut one frame at `at`, or take a supplied image, and normalise it to 1280×720. */
const tmp = mkdtempSync(join(tmpdir(), "thumb-"));
try {
  const source = join(tmp, "source.jpg");
  const at = flag("--at") ?? "2.6";
  const from = flag("--from");
  const video = existsSync(join(dir, "launch.mp4")) ? join(dir, "launch.mp4") : join(dir, "brag.mp4");
  if (!existsSync(video) && !from) throw new Error(`no launch.mp4/brag.mp4 in ${dir} to cut a frame from`);

  if (from) {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", from, "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", source]);
  } else {
    execFileSync("ffmpeg", [
      "-y", "-v", "error", "-ss", String(at), "-i", video, "-frames:v", "1",
      "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "2", source,
    ]);
  }

  const target = join(REPO, "public", "launch-videos", `${slug}.jpg`);
  writeFileSync(`${target}.tmp`, readFileSync(source));
  renameSync(`${target}.tmp`, target);
  console.log(`poster: ${target} (from ${from ? "a supplied image" : `${video.split("/").pop()} at ${at}s`})`);

  const bytes = readFileSync(target);
  const thumb = await fetch(`${YOUTUBE_THUMBNAIL_URL}?videoId=${encodeURIComponent(videoId)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" },
    body: bytes,
  });
  if (!thumb.ok) {
    throw new Error(
      `thumbnail upload failed: HTTP ${thumb.status} — ${(await thumb.text()).slice(0, 300)}\n` +
        `  the local poster is written; YouTube refuses custom thumbnails unless the channel is verified`,
    );
  }
  console.log(`thumbnail set on ${videoId} (${bytes.length} bytes, 1280×720)`);

  const live = await readBack();
  console.log(`live title: "${live.title}" · description ${live.description.length} chars · privacy ${live.privacy}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
