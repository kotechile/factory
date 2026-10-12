#!/usr/bin/env node
/**
 * youtube-auth.mjs — ONE-TIME OAuth consent for the owner's own YouTube channel.
 *
 *   node scripts/youtube-auth.mjs --url              # prints the consent URL (open it in YOUR browser)
 *   node scripts/youtube-auth.mjs --code <code>      # exchanges the code, prints the .env lines
 *
 * Requires YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET in .env (Google Cloud → Credentials →
 * OAuth client ID → type "Desktop app"). The redirect is Google's loopback: after approving, your
 * browser lands on http://localhost/?code=... which FAILS TO LOAD — that is expected; copy the
 * `code=` value out of the address bar.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnvFile, requireEnv } from "../src/lib/launch-video/env.ts";
import { GOOGLE_TOKEN_URL } from "../src/lib/launch-video/youtube.ts";

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnvFile(join(REPO, ".env"));
const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET } = requireEnv(
  process.env, ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"], join(REPO, ".env"),
);

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");
const REDIRECT = "http://localhost";
const argv = process.argv.slice(2);
const codeIndex = argv.indexOf("--code");
const code = codeIndex === -1 ? undefined : argv[codeIndex + 1];

if (!code) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", YOUTUBE_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // force a refresh_token even on re-consent
  console.log("1) Open this URL in YOUR browser and approve:\n");
  console.log(url.toString());
  console.log("\n2) Your browser will fail to load http://localhost/?code=…  — copy the code value and run:");
  console.log("   node scripts/youtube-auth.mjs --code <code>");
  process.exit(0);
}

const res = await fetch(GOOGLE_TOKEN_URL, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code, client_id: YOUTUBE_CLIENT_ID, client_secret: YOUTUBE_CLIENT_SECRET,
    redirect_uri: REDIRECT, grant_type: "authorization_code",
  }),
});
const json = await res.json();
if (!json.refresh_token) {
  console.error(`Google returned no refresh_token: ${JSON.stringify(json).slice(0, 400)}`);
  console.error("Re-run with --url (a repeat consent must send prompt=consent, which this script does).");
  process.exit(1);
}

const accessToken = json.access_token;
const channel = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
  headers: { authorization: `Bearer ${accessToken}` },
}).then((r) => r.json());
const title = channel.items?.[0]?.snippet?.title;
console.log(`Consent OK. Channel: ${title ?? "(unknown — check the scope)"}\n`);
console.log("Add these to /root/software-factory-core/.env (and NEVER commit them):");
console.log(`YOUTUBE_REFRESH_TOKEN=${json.refresh_token}`);

// Best-effort clipboard convenience on macOS/Windows hosts; ignored elsewhere.
try { execFileSync("pbcopy", { input: json.refresh_token }); console.log("(copied to clipboard)"); } catch {}
