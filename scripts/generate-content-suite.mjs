#!/usr/bin/env node
/**
 * Hermes Content Suite Generator
 *
 * Generates both a comprehensive long-form pillar article AND its companion
 * LinkedIn post variations from product PRD metadata or custom topics, and
 * saves them directly into Supabase.
 *
 * Usage:
 *   node scripts/generate-content-suite.mjs --product quarterline
 *   node scripts/generate-content-suite.mjs --title "Title" --topic "Topic" --url "https://..."
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// Parse command-line args
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const productSlug = getArg("product") || "quarterline";
const customTitle = getArg("title");
const customTopic = getArg("topic");
const customUrl = getArg("url");

async function generateContentSuite() {
  console.log(`[Hermes Content Engine] Generating content suite for product: "${productSlug}"...`);

  let title = customTitle || "2026 Self-Employment Tax & QBI Strategy Guide";
  let sourceUrl = customUrl || "https://factory.aichieve.net/quarterline";
  let tags = ["Tax", "Freelance", "Accounting", "OBBBA", "SaaS"];
  let content = "";

  if (productSlug === "quarterline" && !customTitle) {
    title = "The 2026 Freelancer Tax Strategy & Section 199A QBI Blueprint";
    sourceUrl = "https://factory.aichieve.net/quarterline";
    tags = ["Tax", "Freelance", "OBBBA", "QBI", "Accounting", "SmallBusiness"];
    content = `# The 2026 Freelancer Tax Strategy & Section 199A QBI Blueprint

## Overview & Statutory Changes
The 2026 tax year represents the full enactment of the One Big Beautiful Bill Act (OBBBA, Pub. L. 119-21), introducing major structural changes for Schedule C filers, independent contractors, single-member LLCs, and freelance professionals.

Understanding these statutory formulas is critical to preventing penalties and ensuring quarterly estimated tax payments are accurately funded.

---

## 1. The Section 199A QBI Statutory Rate (20% vs 23%)
A major source of confusion in 2026 tax planning stems from earlier legislative drafts proposing a 23% rate. The final enacted statute locked the Qualified Business Income (QBI) deduction strictly at **20%**.

* **Statutory Reference:** 26 U.S. Code § 199A / Pub. L. 119-21.
* **Impact:** Applying 23% instead of 20% overstates deductions and triggers IRS Section 6654 interest penalties on underfunded estimated installments.

---

## 2. Updated Thresholds & The Expanded Phase-In Corridor
Under Rev. Proc. 2025-32 inflation adjustments:
* **Single Filers:** Phase-in threshold is **$201,750**, with an expanded **$75,000** phase-in band (full phaseout at $276,750 for SSTBs).
* **Married Filing Jointly:** Phase-in threshold is **$403,500**, with an expanded **$150,000** phase-in band (full phaseout at $553,500 for SSTBs).

---

## 3. Self-Employment Tax & Safe Harbor Compliance
* **Social Security Ceiling:** Updated to **$184,500** at 12.4%.
* **Medicare:** 2.9% base + 0.9% additional Medicare over $200k single / $250k MFJ.
* **Safe Harbor Benchmark:** Satisfy 100% of 2025 tax liability (or 110% if 2025 AGI exceeded $150k) across equal quarterly installments.

---

## Conclusion & Verified Calculation
Deterministic calculations eliminate assumptions. Access the verified calculation model and audit tools directly at [factory.aichieve.net/quarterline](https://factory.aichieve.net/quarterline).`;
  } else {
    content = `# ${title}

## Executive Summary
${customTopic || "Comprehensive deterministic analysis covering architecture, operational workflows, and verified benchmark performance."}

## Core Problem & Analysis
In complex domain calculations, rules of thumb and high-level summaries frequently omit critical statutory edge cases and boundary rules.

## Key Insights
1. **Accurate Baseline:** Always establish calculations using verified source statutes and primary documentation.
2. **Automate Boundary Checks:** Eliminate manual spreadsheet errors with deterministic calculation engines.
3. **Continuous Verification:** Integrate automated test vectors against known-answer scenarios.

## Tools & Resources
Explore the interactive calculation tools and agent endpoints at [${sourceUrl}](${sourceUrl}).`;
  }

  // 1. Insert Article into Supabase
  const { data: article, error: artError } = await supabase
    .from("articles")
    .insert([
      {
        title,
        content,
        source_url: sourceUrl,
        tags,
        metadata: { generated_by: "hermes_echo", product_slug: productSlug },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (artError) {
    console.error("Failed to save article to Supabase:", artError.message);
    process.exit(1);
  }

  console.log(`✓ Long-form pillar article created in Supabase (ID: ${article.id})`);

  // 2. Generate and Insert Companion LinkedIn Posts
  const companionPosts = [
    {
      format_variant: "bullet_takeaways",
      content: `📌 ${title}

3 actionable takeaways to apply right now:

🔹 Insight 1: Verify the statutory rate (OBBBA Pub. L. 119-21 kept QBI at 20%, not 23%).
🔹 Insight 2: Account for updated 2026 thresholds ($201,750 single / $403,500 MFJ under Rev. Proc. 2025-32).
🔹 Insight 3: Safe Harbor rules require 110% of prior-year tax for AGI > $150K.

🎯 Bottom line: Structure and clarity beat guesswork every time.

👉 Read full pillar guide: ${sourceUrl}

${tags.map((t) => `#${t}`).join(" ")}`,
    },
    {
      format_variant: "hook_and_punchline",
      content: `${title}. Here's why most people get this wrong:

⚠️ The common assumption vs. what actually happens:

1. Several guides instruct filers to use 23% for QBI.
2. The enacted statute strictly maintained the 20% deduction.
3. Overstating deductions risks Section 6654 underpayment penalties on upcoming quarterly installments.

💡 Key takeaway: Don't rely on rules of thumb when a deterministic model gives you the exact answer.

🔗 Full analysis & verified calculator: ${sourceUrl}

What's your experience with this? Drop your thoughts below. 👇

${tags.map((t) => `#${t}`).join(" ")}`,
    },
  ];

  for (const p of companionPosts) {
    const { error: postErr } = await supabase.from("linkedin_posts").insert([
      {
        article_id: article.id,
        platform: "linkedin",
        content: p.content,
        format_variant: p.format_variant,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    if (!postErr) {
      console.log(`  ✓ Generated companion LinkedIn post (${p.format_variant})`);
    }
  }

  console.log("\n[Hermes Content Engine] Content suite generated & synchronized successfully.");
  console.log(`Article Title: "${title}"`);
  console.log(`Article ID: ${article.id}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
}

generateContentSuite().catch(console.error);
