#!/usr/bin/env node
/**
 * detect.mjs — which products still need a launch video?
 *
 *   node scripts/launch-video/detect.mjs            # monitor mode: one stable line per pending slug
 *   node scripts/launch-video/detect.mjs --json     # full payload for the agent
 *   node scripts/launch-video/detect.mjs --probe    # is the ledger table reachable? (used after the migration)
 *
 * Monitor mode output MUST be byte-stable across ticks (no timestamps, no counts of the whole
 * registry) — the Hermes cron monitor hashes it and suppresses the agent run when it is unchanged.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import { selectEmbedPending, selectPendingProducts } from "../../src/lib/launch-video/plan.ts";
import { embeddedSlugs } from "../../src/lib/launch-video/embed.ts";
import { createClient } from "@supabase/supabase-js";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));

const mode = process.argv.includes("--probe") ? "probe"
  : process.argv.includes("--json") ? "json" : "monitor";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv(
  process.env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], join(REPO, ".env"),
);
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { products } = await import(join(REPO, "src/products/registry.ts"));
const { data: rows, error } = await supabase
  .from("launch_videos")
  .select("slug,status,attempts,youtube_video_id");
if (error) {
  console.error(`launch_videos read failed: ${error.message}`);
  console.error("If the table does not exist, apply supabase/migrations/0003_launch_videos.sql in the Supabase SQL editor.");
  process.exit(2);
}

if (mode === "probe") {
  console.log(`launch_videos table OK (${rows.length} row(s))`);
  process.exit(0);
}

/**
 * The slugs the DEPLOYED site carries, not the working tree.
 *
 * An entry committed but not pushed is not live, so counting it as embedded would stop the retry
 * while the product page still shows no video. `origin/main` is what Coolify serves; the working
 * tree is only the fallback for a checkout with no remote ref.
 */
function deployedEmbeddedSlugs() {
  try {
    const source = execFileSync("git", ["show", "origin/main:src/products/launch-videos.ts"], {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { slugs: embeddedSlugs(source), from: "origin/main" };
  } catch {
    const source = readFileSync(join(REPO, "src/products/launch-videos.ts"), "utf8");
    return { slugs: embeddedSlugs(source), from: "working tree" };
  }
}

const deployed = deployedEmbeddedSlugs();
const pending = selectPendingProducts(
  products.map((p) => ({
    slug: p.slug, name: p.name, status: p.status, launchedAt: p.launchedAt, visibility: p.visibility,
  })),
  rows,
);
const embedPending = selectEmbedPending(
  products.map((p) => ({
    slug: p.slug, name: p.name, status: p.status, launchedAt: p.launchedAt, visibility: p.visibility,
  })),
  rows.map((row) => ({
    slug: row.slug,
    status: row.status,
    attempts: row.attempts,
    youtubeVideoId: row.youtube_video_id ?? null,
  })),
  deployed.slugs,
);

if (mode === "monitor") {
  for (const p of pending) console.log(`PENDING ${p.slug} ${p.launchedAt}`);
  for (const e of embedPending) console.log(`EMBED_PENDING ${e.slug} ${e.youtubeVideoId}`);
  process.exit(0);
}

console.log(JSON.stringify({ pending, embedPending, ledgerRows: rows.length, embeddedFrom: deployed.from }, null, 2));
