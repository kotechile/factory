// src/lib/launch-video/env.ts
import { existsSync, readFileSync } from "node:fs";

/** Parse the subset of dotenv syntax this repo actually uses. Pure — no I/O. */
export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/** Load a .env file into process.env without clobbering already-set variables. */
export function loadEnvFile(path: string, target: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(path)) return;
  for (const [key, value] of Object.entries(parseEnvFile(readFileSync(path, "utf8")))) {
    if (target[key] === undefined) target[key] = value;
  }
}

/** Throw one explicit error listing every missing key. Never degrade to a default. */
export function requireEnv(
  env: Record<string, string | undefined>,
  keys: string[],
  source: string,
): Record<string, string> {
  const missing = keys.filter((k) => !env[k] || env[k] === "");
  if (missing.length) {
    throw new Error(
      `missing required env vars (${missing.join(", ")}) in ${source} — add them and re-run; ` +
        `see .env.example for the documented shape`,
    );
  }
  return Object.fromEntries(keys.map((k) => [k, env[k] as string]));
}
