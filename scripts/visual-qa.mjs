#!/usr/bin/env node
// Visual QA — two modes (config read from Supabase factory_config at runtime):
//   gate (default)      — PASS/FAIL review of a rendered screenshot against the
//                         style guide. Fails the build on FAIL.
//   suggest (--suggest) — asks Gemini for structured UI/UX improvement suggestions
//                         (JSON), appends them to context/design_backlog.md.

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

const SCREENSHOT = "test-results/quarterline-qa.png";
const STYLEGUIDE = "skills/ui_component_standards.md";
const BACKLOG = "context/design_backlog.md";

// Note: font-family is intentionally NOT in the gate checklist — vision models
// cannot reliably tell monospace from sans at small sizes; that is asserted
// deterministically in tests/e2e/qa-screenshot.spec.ts.
const GATE_PROMPT = `You are reviewing a screenshot of a tax-calculator web app UI.

Check for SIGNIFICANT issues only (minor polish does NOT fail):
1. Spacing: content flush against container borders; text overlapping or colliding.
2. Layout: broken or misaligned grid; elements overlapping.
3. Color: unreadable text (poor contrast); clashing/neon colors.
4. Typography: broken hierarchy (everything the same size; no visual distinction between title/header/body).

Reply with EXACTLY ONE of these two lines, nothing else:
PASS
FAIL: <brief comma-separated list of significant issues>`;

const SUGGEST_PROMPT = `You are a senior product/UI designer reviewing a screenshot of a tax-calculator web app.
Suggest concrete, high-value UI/UX improvements. Consider conversion, clarity, information hierarchy, visual polish, and usability. Be specific and realistic (this is a calculator SaaS).

Return a JSON object in this exact shape:
{"suggestions":[{"title":"...","category":"spacing|typography|color|layout|conversion|a11y|copy","impact":"high|medium|low","effort":"high|medium|low","rationale":"why this helps","suggested_change":"specific actionable change"}]}

Suggest 3-5 improvements. Return ONLY the JSON object.`;

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

  if (!existsSync(SCREENSHOT)) {
    console.error(`visual-qa: screenshot not found at ${SCREENSHOT}. Run the Playwright e2e step first.`);
    return 1;
  }

  if (existsSync(STYLEGUIDE)) {
    prompt += `\n\nStyle guide (${STYLEGUIDE}):\n${readFileSync(STYLEGUIDE, "utf8")}`;
  }

  const image = readFileSync(SCREENSHOT);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const generationConfig = { temperature: 0, maxOutputTokens: suggestMode ? 4096 : 2048 };
  if (suggestMode) generationConfig.responseMimeType = "application/json";

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
      generationConfig,
    }),
  });

  if (!res.ok) {
    console.error(`visual-qa: Gemini API error ${res.status}: ${await res.text()}`);
    return 1;
  }

  const data = await res.json();
  const review = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text).join("\n");

  // --- Suggest mode: parse JSON, append to backlog ---
  if (suggestMode) {
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

  // --- Gate mode: PASS/FAIL ---
  console.log(`\n=== Visual QA (${model}) ===\n${review.trim()}\n`);
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
