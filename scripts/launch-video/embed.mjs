#!/usr/bin/env node
/**
 * embed.mjs — put a published launch video on the site, without a human editing a registry.
 *
 *   node scripts/launch-video/embed.mjs --slug spendproof
 *   node scripts/launch-video/embed.mjs --slug spendproof --dry-run
 *   node scripts/launch-video/embed.mjs --slug spendproof --push          # verify-build, then push
 *   node scripts/launch-video/embed.mjs --slug spendproof --poster-only   # re-cut the poster
 *   node scripts/launch-video/embed.mjs --slug spendproof --replace --push # re-cut film, new upload
 *
 * This is the step that used to be manual: after `youtube-upload.mjs` returned an id, the product
 * page still rendered nothing until someone added an entry to `src/products/launch-videos.ts` and a
 * 1280×720 poster to `public/launch-videos/`. It reads the id back from the YouTube API (never from
 * youtube.json alone — that file records what was attempted), cuts the poster from the video's own
 * opening frame when YouTube has no 1280×720 thumbnail, and inserts the entry.
 *
 * Idempotent: an id that is already on the page is left exactly as it is. A published id is the
 * owner's, and re-running the pipeline must never repoint a live page at a different video.
 *
 * `--push` runs `scripts/verify-build.sh` first (factory rule 7) and only pushes when it passes. A
 * failed verification leaves the commit local on purpose: `detect.mjs` reads `origin/main`, so the
 * slug stays EMBED_PENDING and the next tick retries instead of the site silently missing a video.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import {
  accessibleName,
  embeddedSlugs,
  insertEntry,
  isoDate,
  embeddedIdFor,
  isUsablePoster,
  POSTER_MIN_BYTES,
  REGISTRY_ARRAY_MARKER,
  renderEntry,
  replaceEntry,
  verifyVideoResource,
  YOUTUBE_VIDEOS_URL,
} from "../../src/lib/launch-video/embed.ts";
import { GOOGLE_TOKEN_URL } from "../../src/lib/launch-video/youtube.ts";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));

const argv = process.argv.slice(2);
const flag = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};
const has = (name) => argv.includes(name);

const slug = flag("--slug");
if (!slug) {
  console.error("usage: node scripts/launch-video/embed.mjs --slug <slug> [--dry-run] [--push] [--no-verify] [--poster-only] [--replace]");
  process.exit(2);
}
const dryRun = has("--dry-run");
const push = has("--push");
const verify = !has("--no-verify");
const posterOnly = has("--poster-only");
const replace = has("--replace");

const slugDir = join(REPO, "content", "launch_videos", slug);
const youtubeJsonPath = join(slugDir, "youtube.json");
const launchPath = join(slugDir, "launch.mp4");
const posterRel = `public/launch-videos/${slug}.jpg`;
const posterPath = join(REPO, posterRel);
const registryPath = join(REPO, "src", "products", "launch-videos.ts");
// The registry spec pins one published id (and its embed/watch URLs) literally, which is the point:
// a re-published film must move the pin rather than pass against whatever the file happens to say.
const registryTestPath = join(REPO, "src", "products", "launch-videos.test.ts");

if (!existsSync(youtubeJsonPath)) {
  throw new Error(`missing ${youtubeJsonPath} — the upload step must run first (there is no id to embed)`);
}
const upload = JSON.parse(readFileSync(youtubeJsonPath, "utf8"));
const videoId = upload.videoId;
if (!videoId) throw new Error(`${youtubeJsonPath} has no videoId`);

const { products } = await import(join(REPO, "src/products/registry.ts"));
const product = products.find((candidate) => candidate.slug === slug);
if (!product) throw new Error(`${slug} is not a product in src/products/registry.ts — refusing to embed a dead route`);

/** Run a command and return stdout, throwing with its own stderr when it fails. */
function run(command, args, opts = {}) {
  const result = spawnSync(command, args, { cwd: REPO, encoding: "utf8", ...opts });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}): ${(result.stderr || result.stdout || "").trim().slice(0, 600)}`);
  }
  return result.stdout ?? "";
}

function imageSize(path) {
  const out = run("ffprobe", [
    "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path,
  ]).trim();
  const [width, height] = out.split(",").map(Number);
  return { width, height };
}

async function accessToken() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = requireEnv(
    process.env, ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"], join(REPO, ".env"),
  );
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      refresh_token: YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Google token refresh failed: ${json.error ?? "no access_token"}${json.error_description ? `: ${json.error_description}` : ""}`);
  }
  return json.access_token;
}

// 1. Read the upload back from YouTube. youtube.json is what we sent; this is what exists.
const token = await accessToken();

async function readVideo() {
  const res = await fetch(
    `${YOUTUBE_VIDEOS_URL}?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`YouTube read-back failed: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  }
  return verifyVideoResource(await res.json(), videoId);
}

/**
 * A freshly uploaded video is not `processed` for the first minute or two, and the embed must not be
 * retried by a human for that. Poll instead of failing: the monitor's hash gate means a slug that
 * drops out of the pending set is never revisited on its own.
 */
async function waitForProcessed() {
  const deadline = Date.now() + 4 * 60_000;
  for (;;) {
    try {
      return await readVideo();
    } catch (error) {
      const transient = /not finished processing|no video for/.test(error.message);
      if (!transient || Date.now() >= deadline) throw error;
      console.log(`waiting for YouTube to finish processing ${videoId}… (${error.message.slice(0, 90)})`);
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
}

const video = await waitForProcessed();
console.log(
  `verified ${video.youtubeId}: "${video.title}" — ${video.durationSeconds}s, privacy ${video.privacyStatus}`,
);

// 2. The registry is authoritative; only a MISSING slug is added.
const source = readFileSync(registryPath, "utf8");
if (!source.includes(REGISTRY_ARRAY_MARKER)) {
  throw new Error(`${registryPath} no longer contains ${JSON.stringify(REGISTRY_ARRAY_MARKER)} — update embed.ts`);
}
const alreadyEmbedded = embeddedSlugs(source).includes(slug);
if (alreadyEmbedded) {
  console.log(`${slug} is already embedded in ${registryPath} — leaving the published id alone`);
}

// 3. Poster: our own origin, 1280×720, the video's own opening frame.
mkdirSync(join(REPO, "public", "launch-videos"), { recursive: true });
let posterFrom = null;
const posterIsGood = existsSync(posterPath) && statSync(posterPath).size > POSTER_MIN_BYTES;
if (!posterIsGood || posterOnly || replace) {
  const tmpThumb = join(slugDir, "poster-source.jpg");
  let usable = false;
  const thumbRes = await fetch(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`);
  if (thumbRes.ok) {
    writeFileSync(tmpThumb, Buffer.from(await thumbRes.arrayBuffer()));
    const { width, height } = imageSize(tmpThumb);
    usable = isUsablePoster(width, height);
    if (!usable) console.log(`YouTube's maxresdefault is ${width}×${height} (a placeholder) — cutting from the master instead`);
  } else {
    console.log(`YouTube has no maxresdefault for ${videoId} (HTTP ${thumbRes.status}) — cutting from the master instead`);
  }

  if (usable) {
    run("ffmpeg", ["-y", "-v", "error", "-i", tmpThumb, "-vf", "scale=1280:720", "-q:v", "3", posterPath]);
    posterFrom = "youtube maxresdefault";
    if (existsSync(tmpThumb)) unlinkSync(tmpThumb);
  } else {
    // The master is the honest source: the site's poster must be the opening frame of the video
    // people are about to play, not an upscale of a 120×90 placeholder.
    if (!existsSync(launchPath)) throw new Error(`missing ${launchPath} and YouTube has no usable thumbnail — nothing to cut a poster from`);
    run("ffmpeg", [
      "-y", "-v", "error", "-i", launchPath, "-frames:v", "1",
      "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720",
      "-q:v", "3", posterPath,
    ]);
    posterFrom = "launch.mp4 opening frame";
    if (existsSync(tmpThumb)) unlinkSync(tmpThumb);
  }

  const bytes = statSync(posterPath).size;
  const size = imageSize(posterPath);
  if (bytes <= POSTER_MIN_BYTES) throw new Error(`poster came out ${bytes} bytes — a placeholder, not a poster`);
  if (size.width !== 1280 || size.height !== 720) {
    throw new Error(`poster is ${size.width}×${size.height}; the page renders 1280×720`);
  }
  console.log(`poster: ${posterRel} (${bytes} bytes, 1280×720, from ${posterFrom})`);
} else {
  console.log(`poster: ${posterRel} already present and usable`);
}

/**
 * The registry origin/main actually serves.
 *
 * Compare the deployed ID, not the slug: after a replace the slug is present on both sides while the
 * video behind it differs, so a slug check reports "already deployed" for a page still showing the old
 * film. That bug shipped one commit; the check is by id now.
 */
function deployedSource() {
  try {
    return run("git", ["show", "origin/main:src/products/launch-videos.ts"]);
  } catch {
    return readFileSync(registryPath, "utf8");
  }
}

/** Commit our two files and, when asked, verify + push. Only our files: the tree may carry other work. */
async function publish() {
  run("git", ["add", posterRel, "src/products/launch-videos.ts", "src/products/launch-videos.test.ts"]);
  const staged = spawnSync("git", ["diff", "--cached", "--name-only"], { cwd: REPO, encoding: "utf8" }).stdout.trim();
  if (!staged) {
    console.log("nothing staged — already committed");
  } else {
    run("git", [
      "commit", "-m", `launch video: embed ${slug} (${video.youtubeId})`,
      "-m",
      `Uploaded ${video.youtubeId} (${video.durationSeconds}s, ${video.privacyStatus}) and embedded it: ` +
        `poster ${posterFrom ?? "already present"}, registry entry via scripts/launch-video/embed.mjs.`,
    ]);
    console.log(`committed: launch video: embed ${slug} (${video.youtubeId})`);
  }

  if (!push) return;
  if (verify) {
    console.log("running scripts/verify-build.sh before pushing (factory rule 7)…");
    try {
      run("bash", ["scripts/verify-build.sh"], { stdio: "inherit" });
    } catch (error) {
      throw new Error(
        `the commit is local: verify-build failed, so nothing was pushed. ${error.message}\n` +
          `  ${slug} therefore stays EMBED_PENDING (detect reads origin/main). Fix the build, then: git push`,
      );
    }
  }
  run("git", ["push", "origin", "HEAD:main"]);
  const pushed = embeddedIdFor(deployedSource(), slug);
  if (pushed !== video.youtubeId) {
    throw new Error(
      `pushed, but origin/main carries ${pushed ?? "no id"} for ${slug} instead of ${video.youtubeId} — check the push output`,
    );
  }
  console.log(`pushed: origin/main now serves ${video.youtubeId} for ${slug}`);
}

if (alreadyEmbedded && !replace) {
  // A previous run may have written and committed without pushing. Finish that instead of
  // reporting success while the live site still shows no video.
  if (embeddedIdFor(deployedSource(), slug) === video.youtubeId) {
    console.log("nothing to write — the page already serves this exact video");
    process.exit(0);
  }
  console.log(`${slug} is embedded locally but origin/main does not carry it — finishing the commit and push`);
  await publish();
  process.exit(0);
}

// 4. Build the entry.
const entry = {
  slug,
  youtubeId: video.youtubeId,
  title: accessibleName({
    youtubeTitle: video.title,
    productName: product.name,
    tagline: product.tagline ?? "",
  }),
  durationSeconds: video.durationSeconds,
  publishedAt: isoDate(),
};
const previousId = embeddedIdFor(source, slug);
if (replace && previousId && previousId === entry.youtubeId) {
  throw new Error(`${slug} already points at ${entry.youtubeId} — nothing to replace`);
}
const nextSource = replace ? replaceEntry(source, entry) : insertEntry(source, entry);

if (dryRun) {
  console.log("DRY RUN — would add to src/products/launch-videos.ts:");
  console.log(renderEntry(entry));
  console.log(`accessible name: ${entry.title}`);
  process.exit(0);
}

// 5. Write, prove, and roll back on a failed gate.
const sourceBackup = `${registryPath}.bak-embed`;
const posterExisted = existsSync(posterPath);
const posterBackup = `${posterPath}.bak-embed`;
const testBackup = `${registryTestPath}.bak-embed`;
copyFileSync(registryPath, sourceBackup);
copyFileSync(registryTestPath, testBackup);
if (posterExisted) copyFileSync(posterPath, posterBackup);

let testChanged = false;
try {
  writeFileSync(`${registryPath}.tmp`, nextSource);
  renameSync(`${registryPath}.tmp`, registryPath);
  if (replace && previousId) {
    const pinned = readFileSync(registryTestPath, "utf8");
    if (!pinned.includes(previousId)) {
      throw new Error(
        `--replace expects ${registryTestPath} to pin ${previousId}; it does not, so the id it pins ` +
          `would no longer be the published one — fix the spec by hand before replacing`,
      );
    }
    const moved = pinned.split(previousId).join(entry.youtubeId);
    if (moved !== pinned) {
      writeFileSync(registryTestPath, moved);
      testChanged = true;
    }
  }
  run("npx", ["vitest", "run", "src/products/launch-videos.test.ts"]);
} catch (error) {
  copyFileSync(sourceBackup, registryPath);
  copyFileSync(testBackup, registryTestPath);
  if (posterExisted) copyFileSync(posterBackup, posterPath);
  unlinkSync(sourceBackup);
  unlinkSync(testBackup);
  if (posterExisted) unlinkSync(posterBackup);
  throw new Error(`the launch-videos gate rejected the new entry, so nothing was changed: ${error.message}`);
}
unlinkSync(sourceBackup);
unlinkSync(testBackup);
if (posterExisted) unlinkSync(posterBackup);
if (testChanged) console.log(`moved the published-id pin in ${relative(REPO, registryTestPath)} to ${entry.youtubeId}`);
console.log(`embedded ${slug} — the products test passes with the new entry`);

// Keep an audit trail of the swap: the registry only ever shows the current id, and the superseded
// upload is what someone will ask about later.
if (replace && previousId) {
  writeFileSync(
    join(slugDir, "superseded.json"),
    JSON.stringify({ slug, replaced: previousId, with: entry.youtubeId, at: new Date().toISOString() }, null, 2),
  );
  console.log(`replaced ${previousId} with ${entry.youtubeId} (recorded in content/launch_videos/${slug}/superseded.json)`);
}

// 6. Commit, and push when asked.
await publish();
