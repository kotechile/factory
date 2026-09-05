import { NextResponse } from "next/server";
import { saveArticle, saveLinkedInPost } from "@/lib/articles/db";
import { formatArticleForDistribution } from "@/lib/calc/content-distributor/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productSlug = "quarterline", title: rawTitle, topic, sourceUrl } = body;

    let title = rawTitle;
    let content = "";
    let url = sourceUrl || "https://factory.aichieve.net/quarterline";
    let tags = ["Tax", "Freelance", "Accounting", "OBBBA", "QBI"];

    if (productSlug === "quarterline" && !rawTitle) {
      title = "The 2026 Freelancer & 1099 Tax Guide: OBBBA, Section 199A QBI, and the 20% vs 23% Statutory Rate";
      url = "https://factory.aichieve.net/quarterline";
      tags = ["Tax", "SmallBusiness", "Freelance", "Accounting", "OBBBA", "QBI"];
      content = `# The 2026 Freelancer & 1099 Tax Guide: OBBBA, Section 199A QBI, and the 20% vs 23% Statutory Rate

## Overview
The 2026 tax year marks the full application of the One Big Beautiful Bill Act (OBBBA, Pub. L. 119-21), updating calculations for self-employment tax, Section 199A QBI deductions, and quarterly estimated tax payments.

---

## 1. Statutory 20% Section 199A Deduction
While early House drafts considered a 23% rate, Pub. L. 119-21 locked the statutory QBI deduction rate at **20%**. Overestimating the deduction leads to underfunded quarterly estimated payments and Section 6654 penalties.

---

## 2. Updated 2026 Thresholds (Rev. Proc. 2025-32)
* **Single Filers:** Phase-in begins at **$201,750** with an expanded **$75,000** band.
* **Married Filing Jointly:** Phase-in begins at **$403,500** with an expanded **$150,000** band.

---

## 3. Safe Harbor Compliance
Pay 100% of 2025 tax liability (or 110% if 2025 AGI was over $150k) across 4 installments to ensure full penalty protection.

---

## Interactive Verification
Verify your 2026 tax numbers and safe harbor schedules with the open calculation engine at [${url}](${url}).`;
    } else {
      title = rawTitle || "Deterministic Product Breakdown & Strategic Guide";
      content = `# ${title}

## Executive Summary
${topic || "Comprehensive deterministic analysis covering architecture, statutory edge cases, and actionable best practices."}

## Core Problem & Analysis
In complex business domains, rules of thumb frequently cause critical calculation and compliance errors.

## Key Insights
1. **Statutory Accuracy:** Always build calculations from primary sources and enacted statutes.
2. **Automate Boundary Checks:** Eliminate manual spreadsheet errors with deterministic engines.
3. **Continuous Verification:** Integrate automated test vectors against known-answer scenarios.

## Tools & Resources
Explore the interactive calculation tools and agent endpoints at [${url}](${url}).`;
    }

    // Save Long-Form Article to Supabase
    const savedArticle = await saveArticle({
      title,
      content,
      source_url: url,
      tags,
      metadata: { generated_by: "pressflow_engine", productSlug },
    });

    // Generate Formatted LinkedIn Posts
    const analysis = formatArticleForDistribution({
      title,
      content,
      sourceUrl: url,
      tags,
    });

    const savedPosts = [];
    for (const [variantKey, postData] of Object.entries(analysis.variants)) {
      const p = await saveLinkedInPost({
        article_id: savedArticle.id,
        content: postData.postText,
        format_variant: variantKey,
        status: "draft",
      });
      savedPosts.push(p);
    }

    return NextResponse.json({
      success: true,
      article: savedArticle,
      posts: savedPosts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate content suite";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
