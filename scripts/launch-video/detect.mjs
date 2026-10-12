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
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import { selectPendingProducts } from "../../src/lib/launch-video/plan.ts";
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
const { data: rows, error } = await supabase.from("launch_videos").select("slug,status,attempts");
if (error) {
  console.error(`launch_videos read failed: ${error.message}`);
  console.error("If the table does not exist, apply supabase/migrations/0003_launch_videos.sql in the Supabase SQL editor.");
  process.exit(2);
}

if (mode === "probe") {
  console.log(`launch_videos table OK (${rows.length} row(s))`);
  process.exit(0);
}

const pending = selectPendingProducts(
  products.map((p) => ({
    slug: p.slug, name: p.name, status: p.status, launchedAt: p.launchedAt, visibility: p.visibility,
  })),
  rows,
);

if (mode === "monitor") {
  for (const p of pending) console.log(`PENDING ${p.slug} ${p.launchedAt}`);
  process.exit(0);
}

console.log(JSON.stringify({ pending, ledgerRows: rows.length }, null, 2));
