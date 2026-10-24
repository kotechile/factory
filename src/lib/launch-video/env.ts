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
    const raw = t.slice(eq + 1);
    let value = raw.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      // `KEY=value   # note` — dotenv-style inline comments. Applied to the UNTRIMMED remainder,
      // because `KEY=   # note` trims down to `# note` and would otherwise keep the comment as the
      // value. Only unquoted values are trimmed, so a secret containing '#' survives when quoted.
      value = raw.replace(/\s+#.*$/, "").trim();
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

/**
 * Set one key in a dotenv file's text, for a value that must never be printed.
 *
 * A credential refresh is a write, not a display: printing the new token into a terminal or a chat
 * log is how a secret leaks, so the exchange writes it here instead. Duplicate keys collapse to the
 * first position — `parseEnvFile` lets the last one win, so two copies of `YOUTUBE_REFRESH_TOKEN`
 * silently behave like the second, which is exactly the kind of stale-value bug this avoids.
 */
export function setEnvValue(text: string, key: string, value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`invalid env key ${JSON.stringify(key)}`);
  if (value.includes("\n")) throw new Error(`refusing to write a newline into ${key}`);

  const lines = text.split("\n");
  const line = `${key}=${value}`;
  let replaced = false;
  const out: string[] = [];
  for (const current of lines) {
    const eq = current.indexOf("=");
    const name = eq === -1 ? "" : current.slice(0, eq).trim();
    if (name === key) {
      if (!replaced) {
        out.push(line);
        replaced = true;
      }
      continue; // drop duplicates
    }
    out.push(current);
  }
  if (!replaced) {
    if (out.length > 0 && out[out.length - 1] === "") out.splice(out.length - 1, 0, line);
    else out.push(line);
  }
  return out.join("\n");
}
