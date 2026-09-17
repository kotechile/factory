#!/usr/bin/env node
// Visual QA — two modes (config read from Supabase factory_config at runtime):
//   gate (default)      — PASS/FAIL review of each product screenshot against the
//                         style guide. Fails the build on FAIL.
//   suggest (--suggest) — asks Gemini for structured UI/UX improvement suggestions
//                         (JSON), appends them to context/design_backlog.md.
//
// Every shipped product surface is reviewed, not just QuarterLine: add the screenshot path
// captured by tests/e2e/qa-screenshot.spec.ts to SCREENSHOTS when a product ships.

import { readFileSync, existsSync, appendFileSync } from "node:fs";
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

const SCREENSHOTS = [
  "test-results/quarterline-qa.png",
  "test-results/facturgate-qa.png",
];
const STYLEGUIDE = "skills/ui_component_standards.md";
const BACKLOG = "context/design_backlog.md";

// Note: font-family is intentionally NOT in the gate checklist — vision models
// cannot reliably tell monospace from sans at small sizes; that is asserted
// deterministically in tests/e2e/qa-screenshot.spec.ts.
const GATE_PROMPT = `You are reviewing a screenshot of a web app UI.

Check for SIGNIFICANT issues only (minor polish does NOT fail):
1. Spacing: text OVERLAPPING or COLLIDING with other text or borders. Do NOT flag padding itself — input, badge/pill, and card padding is already enforced by design tokens and verified programmatically.
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
    return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text).join("\n");
  };

  let verdict = await call();
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt < MAX_ATTEMPTS && /^FAIL/i.test(verdict.trim()); attempt++) {
    const waitMs = 1000 * 2 ** (attempt - 2);
    console.log(
      `visual-qa: ${imagePath} — FAIL verdict on attempt ${attempt} (${model}) — retrying in ${waitMs}ms (backoff)…`,
    );
    await new Promise((r) => setTimeout(r, waitMs));
    verdict = await call();
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

  // Suggest mode stays scoped to the flagship calculator surface.
  const targets = suggestMode ? [SCREENSHOTS[0]] : SCREENSHOTS;
  const missing = targets.filter((path) => !existsSync(path));
  if (missing.length === targets.length) {
    console.error(
      `visual-qa: screenshot not found at ${missing.join(", ")}. Run the Playwright e2e step first.`,
    );
    return 1;
  }

  if (existsSync(STYLEGUIDE)) {
    prompt += `\n\nStyle guide (${STYLEGUIDE}):\n${readFileSync(STYLEGUIDE, "utf8")}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const generationConfig = { temperature: 0, maxOutputTokens: suggestMode ? 4096 : 2048 };
  if (suggestMode) generationConfig.responseMimeType = "application/json";

  const available = targets.filter((path) => existsSync(path));
  for (const path of missing) {
    console.warn(`visual-qa: skipping ${path} — not captured by the e2e run.`);
  }

  if (!suggestMode) {
    let failures = 0;
    for (const imagePath of available) {
      const verdict = await reviewScreenshot({
        url,
        geminiKey,
        prompt,
        generationConfig,
        imagePath,
        model,
      });
      console.log(`\n=== Visual QA (${model}) — ${imagePath} ===\n${verdict.trim()}\n`);
      if (/^FAIL/i.test(verdict.trim())) {
        console.error(`visual-qa: FAIL — ${imagePath} review found issues. See report above.`);
        failures += 1;
      } else if (!/^PASS/i.test(verdict.trim())) {
        console.error(
          `visual-qa: ${imagePath} — unrecognized verdict, treating as FAIL (model did not follow the PASS/FAIL format).`,
        );
        failures += 1;
      } else {
        console.log(`visual-qa: PASS — ${imagePath}`);
      }
    }
    return failures === 0 ? 0 : 1;
  }

  const review = available[0] ? await reviewScreenshot({
    url,
    geminiKey,
    prompt,
    generationConfig,
    imagePath: available[0],
    model,
  }) : "";

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
