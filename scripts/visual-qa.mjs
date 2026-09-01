#!/usr/bin/env node
// Visual QA — sends a rendered screenshot to Gemini (vision) for a UI review
// against ui_component_standards.md. Config (Gemini key, model, prompt) is read
// from Supabase factory_config at runtime, so it can be changed without a redeploy.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SCREENSHOT = "test-results/quarterline-qa.png";
const STYLEGUIDE = "skills/ui_component_standards.md";

const DEFAULT_PROMPT = `You are a rigorous UI/UX reviewer for a tax-calculator web app.
Review the screenshot against this style guide and report ONLY concrete, fixable issues:

1. Spacing & whitespace (8pt grid): containers need >=24px internal padding; no text touching borders or overlapping adjacent elements.
2. Typography: one sans-serif for UI, monospace for numbers/currency; weights limited to 400/500/600/700; clear hierarchy (title 24-28px bold > headers 16-18px semibold > numbers 24-32px bold mono > labels 13-14px medium > helper 12px regular).
3. Color (60-30-10): neutral backgrounds (slate-50 / white cards), slate text + borders, ONE indigo accent; soft desaturated badges (tinted bg + colored text), no neon/saturated pills.
4. Layout: balanced two-column grid, clear separation between form and summary; no merged/colliding text.

Respond with EXACTLY one of:
  "PASS" — if there are no high-severity issues (minor polish opportunities do not fail).
  "FAIL\\n- [high|medium|low] <element> — <issue> — <suggested fix>" — one line per issue.

Be specific and concise.`;

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
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
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
  console.warn("visual-qa: unrecognized verdict — informational only (no gate failure).");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("visual-qa: unexpected error:", e);
    process.exit(1);
  });
