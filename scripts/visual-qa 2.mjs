#!/usr/bin/env node
// Visual QA — sends a rendered screenshot to Gemini (vision) for a UI review
// against ui_component_standards.md. Config (Gemini key, model, prompt) is read
// from Supabase factory_config at runtime, so it can be changed without a redeploy.

import { readFileSync, existsSync } from "node:fs";
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

// Load local env so the Supabase connection (URL + service-role key) is available.
loadEnvFile(".env.local");
loadEnvFile(".env");

const SCREENSHOT = "test-results/quarterline-qa.png";
const STYLEGUIDE = "skills/ui_component_standards.md";

const DEFAULT_PROMPT = `You are reviewing a screenshot of a tax-calculator web app UI.

Check for these issues (against the attached style guide):
1. Spacing: containers need >=24px padding; no text touching borders or overlapping.
2. Typography: sans-serif for UI text, monospace for numbers/currency; consistent weight and size hierarchy.
3. Color: neutral backgrounds, slate text + borders, one indigo accent; soft desaturated badges (no neon).
4. Layout: clean two-column grid, no merged or colliding text.

Reply with EXACTLY ONE of these two lines, nothing else:
PASS
FAIL: <brief comma-separated list of specific issues>`;

async function main() {
  // 1. Load config from Supabase factory_config (service role only — it holds secrets).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let geminiKey = process.env.GEMINI_API_KEY; // env fallback for local dev
  let model = "gemini-2.5-pro";
  let prompt = DEFAULT_PROMPT;

  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await sb.from("factory_config").select("key, value");
      if (!error && data) {
        const cfg = Object.fromEntries(data.map((r) => [r.key, r.value]));
        if (cfg.gemini_api_key) geminiKey = cfg.gemini_api_key;
        if (cfg.visual_qa_model) model = cfg.visual_qa_model;
        if (cfg.visual_qa_prompt) prompt = cfg.visual_qa_prompt;
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

  if (!existsSync(SCREENSHOT)) {
    console.error(`visual-qa: screenshot not found at ${SCREENSHOT}. Run the Playwright e2e step first.`);
    return 1;
  }

  // 2. Append the styleguide text (single source of truth for the review).
  if (existsSync(STYLEGUIDE)) {
    prompt += `\n\nStyle guide (${STYLEGUIDE}):\n${readFileSync(STYLEGUIDE, "utf8")}`;
  }

  // 3. Call Gemini vision.
  const image = readFileSync(SCREENSHOT);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/png", data: image.toString("base64") } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    console.error(`visual-qa: Gemini API error ${res.status}: ${await res.text()}`);
    return 1;
  }

  const data = await res.json();
  const review = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text).join("\n");

  console.log(`\n=== Visual QA (${model}) ===\n${review.trim()}\n`);

  // 4. Gate only on an explicit FAIL verdict (high-severity issues).
  if (/^FAIL/i.test(review.trim())) {
    console.error("visual-qa: FAIL — review found issues. See report above.");
    return 1;
  }
  if (/^PASS/i.test(review.trim())) {
    console.log("visual-qa: PASS");
    return 0;
  }
  console.error(
    "visual-qa: unrecognized verdict — treating as FAIL (model did not follow the PASS/FAIL format).",
  );
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("visual-qa: unexpected error:", e);
    process.exit(1);
  });
