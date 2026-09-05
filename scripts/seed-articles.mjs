#!/usr/bin/env node
/**
 * Seeder script: Ingests full long-form pillar articles and generates companion LinkedIn posts into Supabase.
 * Run with: `node scripts/seed-articles.mjs`
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

const PILLAR_ARTICLES = [
  {
    title: "The 2026 Freelancer & 1099 Tax Guide: OBBBA, Section 199A QBI, and the 20% vs 23% Statutory Rate",
    source_url: "https://factory.aichieve.net/quarterline",
    tags: ["Tax", "SmallBusiness", "Freelance", "Accounting", "OBBBA", "QBI"],
    content: `# The 2026 Freelancer & 1099 Tax Guide: OBBBA, Section 199A QBI, and the 20% vs 23% Statutory Rate

For U.S. freelancers, independent contractors, single-member LLC owners, and Schedule C filers, the 2026 tax year marks a historic shift in federal tax accounting. The enactment of the One Big Beautiful Bill Act (OBBBA, Pub. L. 119-21) permanently reshapes the calculations governing self-employment tax, Section 199A deductions, and quarterly estimated payments.

However, widespread misinformation across published guides has introduced an acute financial trap ahead of quarterly estimated tax deadlines: the misconception that the Section 199A Qualified Business Income (QBI) deduction rate was increased to 23%.

In this comprehensive guide, we dissect the verified statutory mechanics of the 2026 tax code, citation vectors from Rev. Proc. 2025-32, and how to avoid costly underpayment penalties.

---

## 1. The Statutory 20% QBI Deduction (Debunking the 23% House Draft Myth)

During the legislative drafting of OBBBA, an initial House proposal floated an increase of the Section 199A QBI deduction from 20% to 23%. Several early tax commentary outlets rushed to publish guidance advising filers to adopt the 23% calculation.

**The Reality:** The final enacted statute signed into law (Pub. L. 119-21) permanently locked Section 199A at the statutory **20% rate**.

### The Underpayment Trap:
If a sole proprietor netting $150,000 calculates their estimated payment assuming a 23% deduction ($34,500) rather than the enacted 20% deduction ($30,000), their estimated tax liability is underfunded by thousands of dollars. With the IRS Section 6654 interest penalty applying to underpayments, relying on unverified internet guides poses an immediate audit and cash-flow risk.

---

## 2. 2026 Thresholds and the Widened Phase-In Band (Rev. Proc. 2025-32)

Under 2026 statutory inflation adjustments, the taxable income thresholds for QBI limitations have expanded significantly:

* **Single Filers:** Threshold begins at **$201,750**, with a phase-in band widened to **$75,000** (fully phased out at $276,750 for Specified Service Trades or Businesses).
* **Married Filing Jointly:** Threshold begins at **$403,500**, with a phase-in band widened to **$150,000** (fully phased out at $553,500 for SSTBs).

For businesses classified as Specified Service Trades or Businesses (consulting, healthcare, law, financial services, performing arts), the phase-out reduces the allowable QBI deduction linearly across the expanded $75K / $150K corridor.

For non-SSTB businesses above the threshold, the deduction is capped by the greater of:
1. **50% of W-2 wages** paid by the business, or
2. **25% of W-2 wages** + **2.5% of Unadjusted Basis Immediately after Acquisition (UBIA)** of qualified property.

---

## 3. Self-Employment Tax Base & Above-the-Line Adjustments

Self-employment tax remains at **15.3%** on net Schedule C earnings up to the updated Social Security wage base:

* **Social Security Cap:** Rose to **$184,500** for 2026 (12.4% rate).
* **Medicare Tax:** **2.9%** on all net earnings with no ceiling.
* **Additional Medicare Tax:** **0.9%** surtax on self-employment earnings exceeding **$200,000** (single) or **$250,000** (married filing jointly).
* **Net Earnings Factor:** Schedule C profit is multiplied by statutory **92.35%** (0.9235) before applying SE tax rates.

### Deductible Half-SE Adjustment:
Filers continue to receive an above-the-line deduction for 50% of the calculated self-employment tax. This deduction reduces Adjusted Gross Income (AGI) and feeds directly into the QBI net income calculation.

---

## 4. Key 2026 OBBBA Freelancer Provisions

1. **"No Tax on Tips" Deduction:** Eligible workers in qualified service occupations can deduct up to **$25,000** of qualified tip income from federal income tax (SE tax still applies).
2. **Senior Deduction:** Taxpayers age 65 and older receive an above-the-line **$6,000** deduction, subject to a phase-out of $0.06 per dollar over $75,000 (single) or $150,000 (joint).
3. **1099-MISC/NEC Reporting Floor:** The statutory threshold for Form 1099 issuance was adjusted to **$2,000**, reducing administrative burdens on micro-transactions.
4. **State and Local Tax (SALT) Cap:** The statutory deduction cap adjusted to **$40,400**.

---

## 5. Safe Harbor Rules for Estimated Tax Payments

To avoid Section 6654 penalties on quarterly estimated tax installments (due April 15, June 15, September 15, and January 15), filers must satisfy one of the two statutory Safe Harbor benchmarks:

* **100% Rule:** Pay 100% of the prior year's (2025) total tax liability in 4 equal quarterly installments.
* **110% High-Income Rule:** If prior-year AGI exceeded $150,000 ($75,000 if married filing separately), the safe-harbor requirement increases to **110%** of the 2025 total tax liability.
* **90% Current-Year Rule:** Pay at least 90% of the actual 2026 total tax liability.

---

## Summary & Verification

When preparing quarterly estimates or Schedule C filings, deterministic statutory verification beats guesswork. Never rely on rules of thumb or outdated house-draft figures.

You can verify your exact 2026 self-employment tax, Section 199A QBI deduction, and safe-harbor payment installments using the open deterministic calculation engine at [factory.aichieve.net/quarterline](https://factory.aichieve.net/quarterline).`,
  },
];

async function seed() {
  console.log("Seeding long-form pillar articles into Supabase...");

  for (const item of PILLAR_ARTICLES) {
    // Insert or update article
    const { data: article, error: artError } = await supabase
      .from("articles")
      .upsert(
        {
          title: item.title,
          content: item.content,
          source_url: item.source_url,
          tags: item.tags,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "title" },
      )
      .select()
      .single();

    if (artError) {
      // If no unique constraint on title, just insert
      const { data: inserted, error: insertErr } = await supabase
        .from("articles")
        .insert([
          {
            title: item.title,
            content: item.content,
            source_url: item.source_url,
            tags: item.tags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (insertErr) {
        console.error("Failed to seed article:", insertErr.message);
        continue;
      }
      console.log(`✓ Seeded article: "${inserted.title}" (ID: ${inserted.id})`);
      await seedCompanionPosts(inserted.id, inserted.title, inserted.source_url);
    } else {
      console.log(`✓ Seeded/Updated article: "${article.title}" (ID: ${article.id})`);
      await seedCompanionPosts(article.id, article.title, article.source_url);
    }
  }

  console.log("✓ Seeding complete.");
}

async function seedCompanionPosts(articleId, title, sourceUrl) {
  const posts = [
    {
      article_id: articleId,
      platform: "linkedin",
      format_variant: "bullet_takeaways",
      status: "draft",
      content: `📌 2026 Freelancer Tax Strategy: Navigating OBBBA & Section 199A

3 critical takeaways for Schedule C filers and single-member LLCs doing Q3 estimates:

🔹 Insight 1: The Section 199A QBI deduction remained at 20% in enacted law (Pub. L. 119-21) — guides citing 23% are referencing an unpassed House draft.
🔹 Insight 2: The phase-in corridor widened to $75K single / $150K MFJ with updated Rev. Proc. 2025-32 thresholds ($201,750 / $403,500).
🔹 Insight 3: Safe Harbor rules require 110% of prior-year tax if 2025 AGI exceeded $150K to avoid Section 6654 penalties.

🎯 Bottom line: Relying on rules of thumb over deterministic statutory calculations underfunds your quarterly estimate.

👉 Full guide & verified calculation engine: ${sourceUrl}

#TaxStrategy #Freelancing #Accounting #SmallBusiness #OBBBA`,
    },
    {
      article_id: articleId,
      platform: "linkedin",
      format_variant: "hook_and_punchline",
      status: "draft",
      content: `The 2026 QBI Tax Misconception: Why 23% Underfunds Your Estimated Tax. Here's why most people get this wrong:

⚠️ The common assumption vs. what actually happens:

1. Several top guides are telling filers to calculate Section 199A at 23% under OBBBA.
2. In reality, Pub. L. 119-21 strictly enacted the 20% statutory rate.
3. Calculating at 23% overstates your deduction by 15% and triggers IRS underpayment penalties on Sept 15.

💡 Key takeaway: Don't rely on rules of thumb when a deterministic model gives you the exact answer.

🔗 Full breakdown & calculator: ${sourceUrl}

What's your experience with this? Drop your thoughts below. 👇

#TaxStrategy #Freelancing #SaaS #Accounting`,
    },
  ];

  for (const p of posts) {
    const { error } = await supabase.from("linkedin_posts").insert([
      {
        ...p,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    if (error) {
      console.warn("Notice inserting companion post:", error.message);
    } else {
      console.log(`  ✓ Seeded companion LinkedIn post (${p.format_variant})`);
    }
  }
}

seed().catch(console.error);
