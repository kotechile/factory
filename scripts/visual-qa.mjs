#!/usr/bin/env node
// Visual QA — two modes (config read from Supabase factory_config at runtime):
//   gate (default)      — PASS/FAIL review of each product screenshot against the
//                         style guide. Fails the build on FAIL.
//   suggest (--suggest) — asks Gemini for structured UI/UX improvement suggestions
//                         (JSON), appends them to context/design_backlog.md.
//
// Every shipped product surface is reviewed, one tile at a time: add the product to REVIEWED_PRODUCTS
// below and its capture to tests/e2e/qa-screenshot.spec.ts when a product ships.

import { readFileSync, existsSync, appendFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env loader (no dependency): loads KEY=VALUE lines for local gate runs.
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

// Every shipped product surface is reviewed — as FULL-RESOLUTION TILES, not one ~4x downscaled full-page
// image (owner call, 2026-10-05: "approve tiles"; the shrunken page was the input the reviewer could not
// read, and hallucinated "text overlapping" verdicts came from it). The tiles are written by
// tests/e2e/qa-screenshot.spec.ts as test-results/<product>-qa-<n>.png; add a product here and a capture
// there when it ships.
const REVIEWED_PRODUCTS = ["facturgate", "parcelproof", "caseproof", "spendproof"];
// `--suggest` reviews ONE surface; named explicitly (a tile of the flagship page) rather than indexed, so
// removing a product can never silently retarget the suggestion pass at a different page.
const SUGGEST_TARGET = "test-results/facturgate-qa-1.png";
// Tiles are independent API calls; a handful in flight keeps the step to a couple of minutes.
const TILE_CONCURRENCY = 4;
const STYLEGUIDE = "skills/ui_component_standards.md";
const BACKLOG = "context/design_backlog.md";

/** The captured tiles for a product, in page order. */
function tilesFor(product) {
  if (!existsSync("test-results")) return [];
  return readdirSync("test-results")
    .filter((file) => new RegExp(`^${product}-qa-\\d+\\.png$`).test(file))
    .sort(
      (a, b) => Number(a.match(/(\d+)\.png$/)[1]) - Number(b.match(/(\d+)\.png$/)[1]),
    )
    .map((file) => `test-results/${file}`);
}

/** Promise pool: run `worker` over `items` with at most `limit` in flight, preserving order. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// Note: font-family is intentionally NOT in the gate checklist — vision models
// cannot reliably tell monospace from sans at small sizes; that is asserted
// deterministically in tests/e2e/qa-screenshot.spec.ts.
const GATE_PROMPT = `You are reviewing a screenshot of a web app UI.

Check for SIGNIFICANT issues only (minor polish does NOT fail):
1. Spacing: text OVERLAPPING or COLLIDING with other text or borders. Do NOT flag padding itself — input, badge/pill, and card padding is already enforced by design tokens and verified programmatically. Do NOT flag a connector/leader line that merely ENDS NEAR a label, or a label whose text wraps onto a second line: only a line that visibly crosses over characters counts, and that geometry is asserted programmatically (tests/e2e/schematic-collision.spec.ts samples every connector against every label box), so a line-and-label spacing opinion here is noise.
2. Layout: broken or misaligned grid; elements overlapping.
3. Color: unreadable text (poor contrast); clashing/neon colors.
4. Typography: broken hierarchy (everything the same size; no visual distinction between title/header/body).

Reply with EXACTLY ONE of these two lines, nothing else:
PASS
FAIL: <brief comma-separated list of significant issues>`;

const SUGGEST_PROMPT = `You are a senior product/UI designer reviewing a screenshot of a web app.
Suggest concrete, high-value UI/UX improvements. Consider conversion, clarity, information hierarchy, visual polish, and usability. Be specific and realistic (this is a calculator SaaS).

Return a JSON object in this exact shape:
{"suggestions":[{"title":"...","category":"spacing|typography|color|layout|conversion|a11y|copy","impact":"high|medium|low","effort":"high|medium|low","rationale":"why this helps","suggested_change":"specific actionable change"}]}

Suggest 3-5 improvements. Return ONLY the JSON object.`;

/**
 * Sends one screenshot to Gemini and returns the raw verdict text.
 *
 * A single vision-model verdict is noisy: Gemini at temperature 0 has deterministically
 * false-flagged properly-padded badges ("zero horizontal padding") on an unchanged screenshot, and
 * read tight *wrapping* as *overlap*. A one-shot verdict must not hard-fail the build when every
 * deterministic check (tsc/lint/tokens/vitest/build/e2e) already passed, so a FAIL verdict is
 * retried with backoff — a genuine layout/contrast defect will be flagged again, a hallucinated one
 * usually will not. API/network errors still fail immediately.
 */
async function reviewScreenshot({ url, geminiKey, prompt, generationConfig, imagePath, model }) {
  const image = readFileSync(imagePath);
  const body = (text) =>
    JSON.stringify({
      contents: [
        {
          parts: [
            { text },
            { inline_data: { mime_type: "image/png", data: image.toString("base64") } },
          ],
        },
      ],
      generationConfig,
    });

  // The last raw response's shape, kept for the diagnostic below: an unrecognized verdict used to be
  // undebuggable from the log (the text alone cannot tell a hallucination from a truncated response).
  let lastMeta = null;

  const call = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: body(prompt),
    });
    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const candidate = data.candidates?.[0];
    lastMeta = { finishReason: candidate?.finishReason, usage: data.usageMetadata };
    return (candidate?.content?.parts ?? []).map((p) => p.text).join("\n");
  };

  let verdict = await call();
  const MAX_ATTEMPTS = 3;
  // Retry on a FAIL **and** on an unrecognized verdict. A malformed answer (prose, a truncated
  // response, a stray preamble) is model noise, exactly like a hallucinated FAIL — it is not a finding,
  // and treating it as terminal makes the gate's result depend on which shape the model happened to
  // emit. Fail-closed is unchanged: three consecutive non-PASS verdicts still fail the step.
  const needsRetry = (v) => /^FAIL/i.test(v.trim()) || !/^PASS/i.test(v.trim());
  for (let attempt = 1; attempt < MAX_ATTEMPTS && needsRetry(verdict); attempt++) {
    const waitMs = 1000 * 2 ** (attempt - 2);
    console.log(
      `visual-qa: ${imagePath} — ${/^FAIL/i.test(verdict.trim()) ? "FAIL" : "unrecognized"} verdict on attempt ${attempt} (${model}) — retrying in ${waitMs}ms (backoff)…`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
    verdict = await call();
  }
  if (!/^PASS/i.test(verdict.trim()) && !/^FAIL/i.test(verdict.trim())) {
    console.log(
      `visual-qa: ${imagePath} — unrecognized verdict after ${MAX_ATTEMPTS} attempts; last response finishReason=${lastMeta?.finishReason} usage=${JSON.stringify(lastMeta?.usage ?? {})}`,
    );
  }
  return verdict;
}

async function main() {
  const suggestMode = process.argv.includes("--suggest");

  // Load config from Supabase factory_config (service role only — it holds secrets).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let geminiKey = process.env.GEMINI_API_KEY; // env fallback for local dev
  let model = process.env.VISUAL_QA_MODEL || "gemini-2.5-pro";
  let prompt = suggestMode ? SUGGEST_PROMPT : GATE_PROMPT;

  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await sb.from("factory_config").select("key, value");
      if (!error && data) {
        const cfg = Object.fromEntries(data.map((r) => [r.key, r.value]));
        if (cfg.gemini_api_key) geminiKey = cfg.gemini_api_key;
        if (cfg.visual_qa_model) model = cfg.visual_qa_model;
        if (!suggestMode && cfg.visual_qa_prompt) prompt = cfg.visual_qa_prompt;
      } else if (error) {
        console.warn(`visual-qa: could not read factory_config (${error.message}); using env fallback.`);
      }
    } catch (e) {
      console.warn(`visual-qa: Supabase read failed (${e.message}); using env fallback.`);
    }
  }

  if (!geminiKey) {
    console.warn(
      "visual-qa: SKIPPED — no Gemini key configured. Add `gemini_api_key` to Supabase factory_config (or set GEMINI_API_KEY).",
    );
    return 0;
  }

  // Suggest mode stays scoped to one surface; the gate reviews every tile of every reviewed product.
  const perProduct = suggestMode
    ? []
    : REVIEWED_PRODUCTS.map((product) => ({ product, tiles: tilesFor(product) }));

  if (suggestMode) {
    if (!existsSync(SUGGEST_TARGET)) {
      console.error(
        `visual-qa: screenshot not found at ${SUGGEST_TARGET}. Run the Playwright e2e step first.`,
      );
      return 1;
    }
  } else {
    const missing = perProduct.filter((entry) => entry.tiles.length === 0).map((e) => e.product);
    if (missing.length > 0) {
      console.error(
        `visual-qa: no captured tiles for ${missing.join(", ")} — run the Playwright e2e step first ` +
          `(tests/e2e/qa-screenshot.spec.ts writes test-results/<product>-qa-<n>.png).`,
      );
      return 1;
    }
  }

  if (existsSync(STYLEGUIDE)) {
    prompt += `\n\nStyle guide (${STYLEGUIDE}):\n${readFileSync(STYLEGUIDE, "utf8")}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  // Output budget for the gate call. Thinking tokens count against it, and this model's review of a dense
  // full-page screenshot spent 1965 thinking tokens on its own — i.e. the old 2048 budget left the verdict
  // one token from truncation, which is how a truncated, verdict-less response got read as a FAIL. 4096 is
  // ~2x the measured peak: enough headroom for the whole answer, still bounded (a larger budget only makes
  // the gate slower).
  const generationConfig = { temperature: 0, maxOutputTokens: suggestMode ? 4096 : 4096 };
  if (suggestMode) generationConfig.responseMimeType = "application/json";

  if (!suggestMode) {
    const jobs = perProduct.flatMap((entry) =>
      entry.tiles.map((tile) => ({ product: entry.product, tile })),
    );
    console.log(
      `visual-qa: reviewing ${jobs.length} tile(s) across ${perProduct.length} product(s), ${TILE_CONCURRENCY} at a time`,
    );

    const reviews = await mapLimit(jobs, TILE_CONCURRENCY, async ({ product, tile }) => {
      const verdict = await reviewScreenshot({
        url,
        geminiKey,
        prompt,
        generationConfig,
        imagePath: tile,
        model,
      });
      return { product, tile, verdict: verdict.trim() };
    });

    let failures = 0;
    for (const { product, tile, verdict } of reviews) {
      console.log(`\n=== Visual QA (${model}) — ${tile} (${product}) ===\n${verdict}\n`);
      if (/^PASS/i.test(verdict)) {
        continue;
      }
      if (/^FAIL/i.test(verdict)) {
        console.error(`visual-qa: FAIL — ${tile} review found issues. See report above.`);
      } else {
        console.error(
          `visual-qa: ${tile} — unrecognized verdict, treating as FAIL (model did not follow the PASS/FAIL format).`,
        );
      }
      failures += 1;
    }

    // Per-product summary: a product passes only if EVERY one of its tiles passed, so a defect on any
    // screenful fails the step and the failing tile is named in the log.
    for (const { product, tiles } of perProduct) {
      const failed = reviews.filter((r) => r.product === product && !/^PASS/i.test(r.verdict));
      console.log(
        `visual-qa: ${product} — ${tiles.length - failed.length}/${tiles.length} tile(s) PASS` +
          (failed.length ? ` — FAIL on ${failed.map((f) => f.tile).join(", ")}` : ""),
      );
    }

    return failures === 0 ? 0 : 1;
  }

  const review = await reviewScreenshot({
    url,
    geminiKey,
    prompt,
    generationConfig,
    imagePath: SUGGEST_TARGET,
    model,
  });

  // --- Suggest mode: parse JSON, append to backlog ---
  let suggestions = [];
  try {
    suggestions = JSON.parse(review.trim()).suggestions || [];
  } catch {
    const stripped = review.replace(/```(?:json)?/g, "").trim();
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        suggestions = JSON.parse(stripped.slice(start, end + 1)).suggestions || [];
      } catch {}
    }
  }
  if (!suggestions.length) {
    console.error("visual-qa:suggest — no suggestions parsed. Raw:", review);
    return 1;
  }
  const date = new Date().toISOString().slice(0, 10);
  const lines = suggestions.map(
    (s) =>
      `- [${s.impact} impact / ${s.effort} effort / ${s.category}] **${s.title}** — ${s.rationale} — _suggested change_: ${s.suggested_change}`,
  );
  appendFileSync(BACKLOG, `\n## ${date} (visual-qa:suggest)\n${lines.join("\n")}\n`, "utf8");
  console.log(`\n=== Design suggestions (${model}) — appended to ${BACKLOG} ===`);
  for (const s of suggestions) {
    console.log(`  • [${s.impact}/${s.effort}/${s.category}] ${s.title}`);
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("visual-qa: unexpected error:", e);
    process.exit(1);
  });
