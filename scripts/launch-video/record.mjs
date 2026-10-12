#!/usr/bin/env node
/**
 * record.mjs — upsert a launch_videos row.
 *
 *   node scripts/launch-video/record.mjs --slug spendproof --status rendering --bump-attempts
 *   node scripts/launch-video/record.mjs --slug spendproof --status uploaded --video-id ABC123 --url https://youtu.be/ABC123
 *   node scripts/launch-video/record.mjs --slug spendproof --status failed --error "ElevenLabs HTTP 401"
 *   node scripts/launch-video/record.mjs --status --           (invalid; --status is required)
 *
 * --status uploaded|grandfathered make the detector stop selecting this slug. --bump-attempts is
 * the ONLY thing that increments attempts (so a crash mid-run still counts as an attempt).
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnvFile, requireEnv } from "../../src/lib/launch-video/env.ts";
import { createClient } from "@supabase/supabase-js";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
loadEnvFile(join(REPO, ".env"));

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? undefined : argv[i + 1]; };
const has = (name) => argv.includes(name);

const slug = flag("--slug");
const status = flag("--status");
if (!slug || !status) {
  console.error("usage: node scripts/launch-video/record.mjs --slug <slug> --status <status> [--bump-attempts] [--error <msg>] [--video-id <id>] [--url <url>] [--words N] [--vo-seconds N] [--video-seconds N]");
  process.exit(2);
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv(
  process.env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], join(REPO, ".env"),
);
const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing, error: readError } = await supabase
  .from("launch_videos").select("slug,attempts").eq("slug", slug).maybeSingle();
if (readError) throw new Error(`ledger read failed: ${readError.message}`);

const row = {
  slug,
  status,
  attempts: (existing?.attempts ?? 0) + (has("--bump-attempts") ? 1 : 0),
  updated_at: new Date().toISOString(),
};
for (const [name, column] of [
  ["--video-id", "youtube_video_id"], ["--url", "youtube_url"], ["--error", "last_error"],
  ["--words", "narration_words"], ["--vo-seconds", "voiceover_seconds"], ["--video-seconds", "video_seconds"],
]) {
  const value = flag(name);
  if (value !== undefined) row[column] = name.includes("seconds") || name === "--words" ? Number(value) : value;
}

const { error } = await supabase.from("launch_videos").upsert(row, { onConflict: "slug" });
if (error) throw new Error(`ledger write failed: ${error.message}`);
console.log(`launch_videos: ${slug} → ${status} (attempts=${row.attempts})${row.last_error ? ` error="${row.last_error}"` : ""}`);
