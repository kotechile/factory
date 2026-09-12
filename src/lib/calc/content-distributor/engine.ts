/**
 * Deterministic Content Distribution & Multi-Platform Formatting Engine
 *
 * Transforms raw articles and software product blueprints into optimized,
 * multi-variant LinkedIn posts and Reddit submissions with 1-click Web Intent URLs,
 * character validation, and distribution task generators.
 */

import type { DistributionTask } from "@/lib/articles/types";

export type PostFormatVariant = "hook_and_punchline" | "bullet_takeaways" | "story_lesson";
export type RedditPostVariant = "math_breakdown" | "discussion_question" | "show_and_tell";

export interface FormatArticleInput {
  id?: string;
  title: string;
  content: string;
  sourceUrl?: string;
  tags?: string[];
  authorName?: string;
}

export interface FormattedPostOutput {
  variant: PostFormatVariant;
  title: string;
  postText: string;
  characterCount: number;
  wordCount: number;
  isWithinLimit: boolean; // LinkedIn max 3,000 characters
  previewHook: string; // First 140 chars before LinkedIn "see more" cutoff
  hashtags: string[];
}

export interface FormattedRedditPostOutput {
  variant: RedditPostVariant;
  title: string;
  postText: string;
  characterCount: number;
  wordCount: number;
  targetSubreddit: string;
  submitUrl: string;
}

export interface DistributionAnalysis {
  title: string;
  summary: string;
  keyPoints: string[];
  extractedHashtags: string[];
  recommendedSubreddits: string[];
  variants: Record<PostFormatVariant, FormattedPostOutput>;
  redditVariants: Record<RedditPostVariant, FormattedRedditPostOutput>;
}

export interface SoftwareDistributionBlueprint {
  slug: string;
  name: string;
  tagline: string;
  route: string;
  targetSubreddits: string[];
  redditPosts: Array<{
    variant: RedditPostVariant;
    subreddit: string;
    title: string;
    content: string;
    submitUrl: string;
  }>;
  linkedinPost: string;
}

const LINKEDIN_MAX_CHARS = 3000;
const SEE_MORE_CUTOFF = 140;

/**
 * Normalizes and cleans raw text from copy-pasting (strips markdown headers, cleans whitespace).
 */
export function cleanRawContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#+\s+/gm, "") // remove markdown headers #
    .replace(/[*_~`]/g, "") // remove basic markdown formatting
    .replace(/\n{3,}/g, "\n\n") // collapse multiple blank lines
    .trim();
}

/**
 * Extracts distinct key sentences/points deterministically from an article body.
 */
export function extractKeySentences(content: string, maxPoints = 3): string[] {
  const cleaned = cleanRawContent(content);
  if (!cleaned) return [];

  // Split into paragraphs or bullet lines
  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25);

  if (paragraphs.length === 0) {
    return [cleaned.slice(0, 150)];
  }

  // Take top sentences from distinct paragraphs
  const results: string[] = [];
  for (const para of paragraphs) {
    const sentences = para
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 20);

    for (const sentence of sentences) {
      if (!results.includes(sentence)) {
        results.push(sentence);
        break;
      }
    }
    if (results.length >= maxPoints) break;
  }

  // Fallback if not enough sentences found
  if (results.length === 0 && paragraphs[0]) {
    results.push(paragraphs[0]);
  }

  return results;
}

/**
 * Generates normalized LinkedIn hashtags from tags and content keywords.
 */
export function extractHashtags(tags?: string[], content?: string): string[] {
  const set = new Set<string>();

  // Process explicit tags
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      const clean = tag
        .replace(/[^a-zA-Z0-9]/g, "")
        .trim();
      if (clean) {
        set.add(`#${clean.charAt(0).toUpperCase() + clean.slice(1)}`);
      }
    }
  }

  // Common keywords scanner
  if (content && set.size < 4) {
    const lower = content.toLowerCase();
    const commonTopics: Record<string, string> = {
      tax: "#TaxStrategy",
      saas: "#SaaS",
      ai: "#ArtificialIntelligence",
      engineering: "#SoftwareEngineering",
      startup: "#Startups",
      finance: "#PersonalFinance",
      b2b: "#B2B",
      growth: "#GrowthStrategy",
      marketing: "#Marketing",
      product: "#ProductManagement",
      freelance: "#Freelancing",
      supabase: "#Supabase",
      nextjs: "#NextJS",
    };

    for (const [key, hashtag] of Object.entries(commonTopics)) {
      if (lower.includes(key) && !set.has(hashtag)) {
        set.add(hashtag);
        if (set.size >= 4) break;
      }
    }
  }

  if (set.size === 0) {
    set.add("#Business");
    set.add("#Productivity");
  }

  return Array.from(set).slice(0, 5);
}

/**
 * Deterministically recommends high-yield subreddits based on tags and content.
 */
export function getRecommendedSubreddits(tags?: string[], content?: string): string[] {
  const text = `${(tags || []).join(" ")} ${content || ""}`.toLowerCase();
  const subreddits = new Set<string>();

  if (text.includes("tax") || text.includes("qbi") || text.includes("irs") || text.includes("1099") || text.includes("schedule c")) {
    subreddits.add("tax");
    subreddits.add("freelance");
    subreddits.add("smallbusiness");
    subreddits.add("accounting");
  }

  if (text.includes("stripe") || text.includes("payout") || text.includes("reconciliation") || text.includes("general ledger") || text.includes("bookkeeping")) {
    subreddits.add("SaaS");
    subreddits.add("accounting");
    subreddits.add("smallbusiness");
    subreddits.add("SideProject");
  }

  if (text.includes("saas") || text.includes("mrr") || text.includes("b2b") || text.includes("software") || text.includes("startup")) {
    subreddits.add("SaaS");
    subreddits.add("SideProject");
    subreddits.add("startups");
    subreddits.add("Entrepreneur");
  }

  if (text.includes("nextjs") || text.includes("supabase") || text.includes("react") || text.includes("typescript") || text.includes("webdev")) {
    subreddits.add("webdev");
    subreddits.add("nextjs");
    subreddits.add("SideProject");
  }

  if (text.includes("freelance") || text.includes("solopreneur") || text.includes("consultant")) {
    subreddits.add("freelance");
    subreddits.add("solopreneur");
    subreddits.add("smallbusiness");
  }

  // Fallback defaults if no match
  if (subreddits.size === 0) {
    subreddits.add("SideProject");
    subreddits.add("SaaS");
    subreddits.add("smallbusiness");
  }

  return Array.from(subreddits).slice(0, 4);
}

/**
 * Constructs a zero-API Reddit Web Intent submission URL.
 */
export function buildRedditSubmitUrl(subreddit: string, title: string, text: string): string {
  const cleanSub = subreddit.replace(/^r\//i, "").trim() || "SideProject";
  const params = new URLSearchParams({
    title: title.trim(),
    text: text.trim(),
  });
  return `https://www.reddit.com/r/${cleanSub}/submit?${params.toString()}`;
}

/**
 * Generates Reddit Value-First Educational Breakdown (Markdown format).
 */
export function buildRedditBreakdownVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
): { title: string; body: string } {
  const postTitle = title.endsWith("?") ? title : `Breakdown: ${title}`;
  const p1 = keyPoints[0] || "Most assumptions rely on outdated rules of thumb.";
  const p2 = keyPoints[1] || "The actual statutory mechanics show a different outcome.";
  const p3 = keyPoints[2] || "Automating the verification eliminates recurring penalties.";

  const bodyLines = [
    `I've been analyzing the data and mechanics around this topic and wanted to share a concise breakdown for anyone dealing with this.`,
    "",
    `### Key Takeaways:`,
    `* **1. Root Problem:** ${p1}`,
    `* **2. The Reality / Data:** ${p2}`,
    `* **3. Actionable Rule:** ${p3}`,
    "",
    `### Why this matters:`,
    `When you rely on approximate benchmarks rather than deterministic calculations, small variances compound quickly.`,
    "",
    `Happy to answer questions or discuss the calculations in the comments.`,
  ];

  if (sourceUrl) {
    bodyLines.push("", `*(Reference & interactive calculation engine: [${sourceUrl}](${sourceUrl}))*`);
  }

  return {
    title: postTitle,
    body: bodyLines.join("\n"),
  };
}

/**
 * Generates Reddit Problem / Discussion Starter Variant.
 */
export function buildRedditDiscussionVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
): { title: string; body: string } {
  const postTitle = title.includes("?")
    ? title
    : `How are you currently handling ${title.toLowerCase()}?`;

  const p1 = keyPoints[0] || "We noticed significant discrepancies across standard guides.";
  const p2 = keyPoints[1] || "The math changes dramatically depending on statutory definitions.";

  const bodyLines = [
    `Curious how other operators / practitioners are handling this workflow right now:`,
    "",
    `> ${p1}`,
    "",
    `A few points we ran into during auditing:`,
    `- ${p2}`,
    `- What methods or spreadsheets are you using to verify these figures before filing/reporting?`,
    "",
    `Would love to hear how others approach this.`,
  ];

  if (sourceUrl) {
    bodyLines.push("", `*(For context, we broke down the formulas here: ${sourceUrl})*`);
  }

  return {
    title: postTitle,
    body: bodyLines.join("\n"),
  };
}

/**
 * Generates Reddit "Show & Tell / Built a Free Tool" Variant.
 */
export function buildRedditShowAndTellVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
): { title: string; body: string } {
  const postTitle = `I built a free deterministic tool for ${title}`;
  const p1 = keyPoints[0] || "Frustrated with manual guesswork and opaque spreadsheets.";
  const p2 = keyPoints[1] || "Built a 100% deterministic calculation model.";

  const bodyLines = [
    `Hey everyone,`,
    "",
    `Like many of you, I ran into friction with: **${title}**.`,
    "",
    `### What it does:`,
    `- **The Problem:** ${p1}`,
    `- **The Solution:** ${p2}`,
    `- **Privacy & Simplicity:** Zero signup required, zero ad tracking, instant calculations.`,
    "",
    `Built this to solve a real bottleneck in our workflow. Feedback and edge cases are very welcome!`,
  ];

  if (sourceUrl) {
    bodyLines.push("", `🔗 **Try it here:** [${sourceUrl}](${sourceUrl})`);
  }

  return {
    title: postTitle,
    body: bodyLines.join("\n"),
  };
}

/**
 * Generates the "Contrarian / Problem-Agitate" LinkedIn post variant.
 */
function buildHookAndPunchlineVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
  hashtags: string[] = [],
): string {
  const hook = title.endsWith("?") ? title : `${title}. Here's why most people get this wrong:`;
  const p1 = keyPoints[0] || "Most approaches tackle the symptom instead of the actual root cause.";
  const p2 = keyPoints[1] || "The math and data show a completely different reality when you break it down.";
  const p3 = keyPoints[2] || "Once you adjust the mechanics, the friction vanishes.";

  const lines = [
    hook,
    "",
    `⚠️ The common assumption vs. what actually happens:`,
    "",
    `1. ${p1}`,
    `2. ${p2}`,
    `3. ${p3}`,
    "",
    `💡 Key takeaway: Don't rely on rules of thumb when a deterministic model gives you the exact answer.`,
  ];

  if (sourceUrl) {
    lines.push("", `🔗 Read full details & run calculations: ${sourceUrl}`);
  }

  lines.push("", `What's your experience with this? Drop your thoughts below. 👇`);

  if (hashtags.length > 0) {
    lines.push("", hashtags.join(" "));
  }

  return lines.join("\n");
}

/**
 * Generates the "3-Bullet Actionable Framework" LinkedIn post variant.
 */
function buildBulletTakeawaysVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
  hashtags: string[] = [],
): string {
  const p1 = keyPoints[0] || "Audit your current baseline with hard numbers.";
  const p2 = keyPoints[1] || "Eliminate hidden assumptions and verify the statutory rules.";
  const p3 = keyPoints[2] || "Automate the calculation to prevent recurring errors.";

  const lines = [
    `📌 ${title}`,
    "",
    `3 actionable takeaways to apply right now:`,
    "",
    `🔹 Insight 1: ${p1}`,
    `🔹 Insight 2: ${p2}`,
    `🔹 Insight 3: ${p3}`,
    "",
    `🎯 Bottom line: Structure and clarity beat guesswork every time.`,
  ];

  if (sourceUrl) {
    lines.push("", `👉 Full breakdown: ${sourceUrl}`);
  }

  lines.push("", `♻️ Repost if you found this useful to your network.`);

  if (hashtags.length > 0) {
    lines.push("", hashtags.join(" "));
  }

  return lines.join("\n");
}

/**
 * Generates the "Story / Lesson Learned" LinkedIn post variant.
 */
function buildStoryLessonVariant(
  title: string,
  keyPoints: string[],
  sourceUrl?: string,
  hashtags: string[] = [],
): string {
  const p1 = keyPoints[0] || "We encountered a persistent bottleneck that took days to resolve.";
  const p2 = keyPoints[1] || "The breakthrough came from revisiting the original core specification.";
  const p3 = keyPoints[2] || "Shipping the solution changed how we approach our whole workflow.";

  const lines = [
    `A quick breakdown on: ${title}`,
    "",
    `Here is what happens behind the scenes:`,
    "",
    p1,
    "",
    p2,
    "",
    p3,
    "",
    `The big lesson? When in doubt, simplify to first principles and automate the verification.`,
  ];

  if (sourceUrl) {
    lines.push("", `Link to full article & tools: ${sourceUrl}`);
  }

  lines.push("", `Agree or disagree?`);

  if (hashtags.length > 0) {
    lines.push("", hashtags.join(" "));
  }

  return lines.join("\n");
}

/**
 * Main deterministic engine function.
 * Given an article input, generates comprehensive distribution analysis, LinkedIn variants, and Reddit variants.
 */
export function formatArticleForDistribution(input: FormatArticleInput): DistributionAnalysis {
  const cleanTitle = cleanRawContent(input.title) || "Key Insights & Analysis";
  const keyPoints = extractKeySentences(input.content, 3);
  const hashtags = extractHashtags(input.tags, `${input.title} ${input.content}`);
  const recommendedSubreddits = getRecommendedSubreddits(input.tags, `${input.title} ${input.content}`);
  const primarySub = recommendedSubreddits[0] || "SideProject";

  // LinkedIn Variants
  const postBuilders: Record<PostFormatVariant, { title: string; build: () => string }> = {
    hook_and_punchline: {
      title: "Contrarian Hook & Breakdown",
      build: () => buildHookAndPunchlineVariant(cleanTitle, keyPoints, input.sourceUrl, hashtags),
    },
    bullet_takeaways: {
      title: "3-Bullet Actionable Framework",
      build: () => buildBulletTakeawaysVariant(cleanTitle, keyPoints, input.sourceUrl, hashtags),
    },
    story_lesson: {
      title: "Executive Story & Lessons",
      build: () => buildStoryLessonVariant(cleanTitle, keyPoints, input.sourceUrl, hashtags),
    },
  };

  const variants = {} as Record<PostFormatVariant, FormattedPostOutput>;

  for (const [key, { title: variantTitle, build }] of Object.entries(postBuilders) as [
    PostFormatVariant,
    { title: string; build: () => string },
  ][]) {
    const text = build();
    const charCount = text.length;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const previewHook = text.slice(0, SEE_MORE_CUTOFF).trim();

    variants[key] = {
      variant: key,
      title: variantTitle,
      postText: text,
      characterCount: charCount,
      wordCount,
      isWithinLimit: charCount <= LINKEDIN_MAX_CHARS,
      previewHook,
      hashtags,
    };
  }

  // Reddit Variants
  const redditBreakdown = buildRedditBreakdownVariant(cleanTitle, keyPoints, input.sourceUrl);
  const redditDiscussion = buildRedditDiscussionVariant(cleanTitle, keyPoints, input.sourceUrl);
  const redditShowAndTell = buildRedditShowAndTellVariant(cleanTitle, keyPoints, input.sourceUrl);

  const redditVariants: Record<RedditPostVariant, FormattedRedditPostOutput> = {
    math_breakdown: {
      variant: "math_breakdown",
      title: redditBreakdown.title,
      postText: redditBreakdown.body,
      characterCount: redditBreakdown.body.length,
      wordCount: redditBreakdown.body.split(/\s+/).filter(Boolean).length,
      targetSubreddit: primarySub,
      submitUrl: buildRedditSubmitUrl(primarySub, redditBreakdown.title, redditBreakdown.body),
    },
    discussion_question: {
      variant: "discussion_question",
      title: redditDiscussion.title,
      postText: redditDiscussion.body,
      characterCount: redditDiscussion.body.length,
      wordCount: redditDiscussion.body.split(/\s+/).filter(Boolean).length,
      targetSubreddit: primarySub,
      submitUrl: buildRedditSubmitUrl(primarySub, redditDiscussion.title, redditDiscussion.body),
    },
    show_and_tell: {
      variant: "show_and_tell",
      title: redditShowAndTell.title,
      postText: redditShowAndTell.body,
      characterCount: redditShowAndTell.body.length,
      wordCount: redditShowAndTell.body.split(/\s+/).filter(Boolean).length,
      targetSubreddit: primarySub,
      submitUrl: buildRedditSubmitUrl(primarySub, redditShowAndTell.title, redditShowAndTell.body),
    },
  };

  const summary = keyPoints.join(" ");

  return {
    title: cleanTitle,
    summary,
    keyPoints,
    extractedHashtags: hashtags,
    recommendedSubreddits,
    variants,
    redditVariants,
  };
}

/**
 * Pre-defined Software Distribution Blueprints for factory tools.
 */
export const SOFTWARE_BLUEPRINTS: Record<string, SoftwareDistributionBlueprint> = {
  quarterline: {
    slug: "quarterline",
    name: "QuarterLine",
    tagline: "2026 Self-Employment & QBI Tax Calculator",
    route: "/quarterline",
    targetSubreddits: ["tax", "freelance", "smallbusiness", "accounting"],
    redditPosts: [
      {
        variant: "math_breakdown",
        subreddit: "tax",
        title: "2026 QBI Statutory Rate: Clarifying the 20% vs 23% Misconception for Schedule C Filers",
        content: `Several widely circulated guides for the 2026 tax year claim the Section 199A QBI deduction was increased to 23% under the One Big Beautiful Bill Act (Pub. L. 119-21).\n\n**Statutory Reality:** The enacted statute permanently locked the statutory rate at **20%**.\n\nCalculating estimated taxes on a 23% deduction underfunds federal withholding by thousands of dollars and triggers Section 6654 underpayment penalties.\n\n* Updated 2026 Thresholds (Rev. Proc. 2025-32): Single begins at $201,750 (phase-out $75,000); Married Joint begins at $403,500 (phase-out $150,000).\n* Safe Harbor: 100% of 2025 liability (or 110% if prior AGI > $150k).\n\nReference & open calculation engine: https://factory.aichieve.net/quarterline`,
        submitUrl: buildRedditSubmitUrl(
          "tax",
          "2026 QBI Statutory Rate: Clarifying the 20% vs 23% Misconception for Schedule C Filers",
          `Several widely circulated guides for the 2026 tax year claim the Section 199A QBI deduction was increased to 23% under the One Big Beautiful Bill Act (Pub. L. 119-21).\n\n**Statutory Reality:** The enacted statute permanently locked the statutory rate at **20%**.\n\nCalculating estimated taxes on a 23% deduction underfunds federal withholding by thousands of dollars and triggers Section 6654 underpayment penalties.\n\n* Updated 2026 Thresholds (Rev. Proc. 2025-32): Single begins at $201,750 (phase-out $75,000); Married Joint begins at $403,500 (phase-out $150,000).\n* Safe Harbor: 100% of 2025 liability (or 110% if prior AGI > $150k).\n\nReference & open calculation engine: https://factory.aichieve.net/quarterline`,
        ),
      },
      {
        variant: "show_and_tell",
        subreddit: "freelance",
        title: "I built a free 2026 quarterly estimated tax & QBI calculator for freelancers (no signup)",
        content: `Tired of guessing 1099 quarterly estimates or dealing with clunky spreadsheets that haven't updated for the 2026 inflation brackets?\n\nI built **QuarterLine** — an instant, deterministic calculator that figures out:\n1. Exact 2026 Self-Employment Tax (Social Security 12.4% up to $181,800 + Medicare 2.9% + 0.9% Additional Medicare surtax).\n2. Section 199A QBI statutory 20% deduction with SSTB phase-in curves.\n3. Safe Harbor quarterly installment schedule.\n\nZero signup, zero ads, runs locally in the browser.\n\n🔗 Free tool: https://factory.aichieve.net/quarterline\n\nFeedback and edge cases welcome!`,
        submitUrl: buildRedditSubmitUrl(
          "freelance",
          "I built a free 2026 quarterly estimated tax & QBI calculator for freelancers (no signup)",
          `Tired of guessing 1099 quarterly estimates or dealing with clunky spreadsheets that haven't updated for the 2026 inflation brackets?\n\nI built **QuarterLine** — an instant, deterministic calculator that figures out:\n1. Exact 2026 Self-Employment Tax (Social Security 12.4% up to $181,800 + Medicare 2.9% + 0.9% Additional Medicare surtax).\n2. Section 199A QBI statutory 20% deduction with SSTB phase-in curves.\n3. Safe Harbor quarterly installment schedule.\n\nZero signup, zero ads, runs locally in the browser.\n\n🔗 Free tool: https://factory.aichieve.net/quarterline\n\nFeedback and edge cases welcome!`,
        ),
      },
    ],
    linkedinPost: `If you are self-employed or run a single-member LLC, watch out for the 2026 QBI tax trap:\n\nSeveral published guides suggest the Section 199A deduction was raised to 23%. In reality, Pub. L. 119-21 locked it strictly at 20%.\n\nUsing 23% underfunds your estimated tax liability and triggers IRS Section 6654 penalties.\n\n📌 3 things to verify right now:\n1. 2026 single threshold begins at $201,750 (phase-out $75,000).\n2. Married threshold begins at $403,500 (phase-out $150,000).\n3. Safe Harbor requires 100% (or 110% if prior AGI > $150k) of prior year tax.\n\nWe built QuarterLine to automate these calculations deterministically:\n👉 https://factory.aichieve.net/quarterline\n\n#TaxStrategy #Freelancing #SmallBusiness #Accounting`,
  },
  ledgerlink: {
    slug: "ledgerlink",
    name: "LedgerLink",
    tagline: "Stripe Payout → GL Reconciliation Engine",
    route: "/ledgerlink",
    targetSubreddits: ["SaaS", "accounting", "smallbusiness", "stripe", "SideProject"],
    redditPosts: [
      {
        variant: "math_breakdown",
        subreddit: "SaaS",
        title: "How we automated Stripe Payout → General Ledger reconciliation to 0 cent variance",
        content: `Reconciling netted Stripe payouts in Xero or QuickBooks is one of the most frustrating recurring tasks in SaaS accounting.\n\nA single bank deposit lumps together gross charges, refunds, dispute holdbacks, processing fees, Connect platform fees, and rolling reserve adjustments.\n\nWe built a deterministic reconciliation engine that decomposes any Stripe payout into exact double-entry GL journal lines:\n- Credits: Gross revenue categories\n- Debits: Refunds, processing fees, dispute reserves\n- Net matches bank deposit down to $0.00.\n\nAccepts restricted read-only Stripe keys or pasted JSON exports.\n\nLive tool: https://factory.aichieve.net/ledgerlink`,
        submitUrl: buildRedditSubmitUrl(
          "SaaS",
          "How we automated Stripe Payout → General Ledger reconciliation to 0 cent variance",
          `Reconciling netted Stripe payouts in Xero or QuickBooks is one of the most frustrating recurring tasks in SaaS accounting.\n\nA single bank deposit lumps together gross charges, refunds, dispute holdbacks, processing fees, Connect platform fees, and rolling reserve adjustments.\n\nWe built a deterministic reconciliation engine that decomposes any Stripe payout into exact double-entry GL journal lines:\n- Credits: Gross revenue categories\n- Debits: Refunds, processing fees, dispute reserves\n- Net matches bank deposit down to $0.00.\n\nAccepts restricted read-only Stripe keys or pasted JSON exports.\n\nLive tool: https://factory.aichieve.net/ledgerlink`,
        ),
      },
      {
        variant: "show_and_tell",
        subreddit: "SideProject",
        title: "Show SideProject: LedgerLink — Instant Stripe Payout to QuickBooks/Xero CSV exporter",
        content: `I built **LedgerLink** to eliminate the manual spreadsheet gymnastics of reconciling Stripe payouts into accounting software.\n\nIt takes any Stripe payout ID and breaks it down into balanced GL journal lines with zero penny drift. Exports clean CSVs ready for Xero and QuickBooks.\n\n🔗 Try it: https://factory.aichieve.net/ledgerlink`,
        submitUrl: buildRedditSubmitUrl(
          "SideProject",
          "Show SideProject: LedgerLink — Instant Stripe Payout to QuickBooks/Xero CSV exporter",
          `I built **LedgerLink** to eliminate the manual spreadsheet gymnastics of reconciling Stripe payouts into accounting software.\n\nIt takes any Stripe payout ID and breaks it down into balanced GL journal lines with zero penny drift. Exports clean CSVs ready for Xero and QuickBooks.\n\n🔗 Try it: https://factory.aichieve.net/ledgerlink`,
        ),
      },
    ],
    linkedinPost: `Reconciling Stripe payouts in accounting software shouldn't require manual spreadsheet gymnastics.\n\nA single Stripe deposit contains dozens of bundled transactions: processing fees, refunds, disputes, and cross-border currency conversions.\n\nWe shipped LedgerLink to decompose netted payouts into balanced, audit-proof GL journal lines that match bank deposits down to the cent.\n\n👉 Try it here: https://factory.aichieve.net/ledgerlink\n\n#SaaS #Accounting #FinTech #Stripe #Bookkeeping`,
  },
  pressflow: {
    slug: "pressflow",
    name: "PressFlow",
    tagline: "Supabase-Powered Article & Multi-Platform Distribution Engine",
    route: "/pressflow",
    targetSubreddits: ["SideProject", "SaaS", "nextjs", "webdev"],
    redditPosts: [
      {
        variant: "show_and_tell",
        subreddit: "SideProject",
        title: "Show SideProject: PressFlow — 1-Click Reddit & LinkedIn distribution workflow for developers",
        content: `I built **PressFlow** to solve the weekly distribution chore for micro-SaaS and developer tools.\n\nInstead of dealing with rejected Reddit API keys or manual copy-pasting, PressFlow:\n1. Generates value-first Reddit markdown posts tailored per subreddit.\n2. Provides 1-click native Reddit submit URLs with title & text prefilled.\n3. Maintains a clean weekly To-Do board (Ready to Publish, Done, Deleted).\n\nCheck it out: https://factory.aichieve.net/pressflow`,
        submitUrl: buildRedditSubmitUrl(
          "SideProject",
          "Show SideProject: PressFlow — 1-Click Reddit & LinkedIn distribution workflow for developers",
          `I built **PressFlow** to solve the weekly distribution chore for micro-SaaS and developer tools.\n\nInstead of dealing with rejected Reddit API keys or manual copy-pasting, PressFlow:\n1. Generates value-first Reddit markdown posts tailored per subreddit.\n2. Provides 1-click native Reddit submit URLs with title & text prefilled.\n3. Maintains a clean weekly To-Do board (Ready to Publish, Done, Deleted).\n\nCheck it out: https://factory.aichieve.net/pressflow`,
        ),
      },
    ],
    linkedinPost: `Distribution is 80% of software growth, but manual posting across platforms is tedious.\n\nWe built PressFlow to turn engineering release notes and articles into multi-variant LinkedIn posts and zero-API Reddit submission intents with a weekly To-Do queue.\n\n👉 https://factory.aichieve.net/pressflow\n\n#SaaS #ContentStrategy #GrowthEngineering #NextJS`,
  },
};

/**
 * Generates structured Distribution Tasks for a Software Product.
 */
export function generateDistributionTasksForSoftware(blueprint: SoftwareDistributionBlueprint): DistributionTask[] {
  const now = new Date().toISOString();
  const tasks: DistributionTask[] = [];

  // Generate Reddit tasks
  blueprint.redditPosts.forEach((post, idx) => {
    tasks.push({
      id: `task-software-${blueprint.slug}-reddit-${post.subreddit}-${idx}`,
      source_type: "software",
      source_id: blueprint.slug,
      source_title: `${blueprint.name} (${blueprint.tagline})`,
      platform: "reddit",
      channel: `r/${post.subreddit}`,
      post_title: post.title,
      post_content: post.content,
      submit_url: post.submitUrl,
      status: "ready_to_publish",
      metadata: { variant: post.variant, route: blueprint.route },
      created_at: now,
      updated_at: now,
    });
  });

  // Generate LinkedIn task
  tasks.push({
    id: `task-software-${blueprint.slug}-linkedin`,
    source_type: "software",
    source_id: blueprint.slug,
    source_title: `${blueprint.name} (${blueprint.tagline})`,
    platform: "linkedin",
    channel: "Feed",
    post_title: `LinkedIn Breakdown: ${blueprint.name}`,
    post_content: blueprint.linkedinPost,
    submit_url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://factory.aichieve.net${blueprint.route}`)}`,
    status: "ready_to_publish",
    metadata: { route: blueprint.route },
    created_at: now,
    updated_at: now,
  });

  return tasks;
}

/**
 * Generates structured Distribution Tasks for a Marketing Article.
 */
export function generateDistributionTasksForArticle(article: {
  id?: string;
  title: string;
  content: string;
  sourceUrl?: string;
  tags?: string[];
}): DistributionTask[] {
  const now = new Date().toISOString();
  const analysis = formatArticleForDistribution({
    id: article.id,
    title: article.title,
    content: article.content,
    sourceUrl: article.sourceUrl,
    tags: article.tags,
  });

  const articleId = article.id || `art-${Date.now()}`;
  const tasks: DistributionTask[] = [];

  // Top subreddits (up to 2 for targeted distribution)
  const targetSubs = analysis.recommendedSubreddits.slice(0, 2);

  targetSubs.forEach((sub, idx) => {
    const variantKey = idx === 0 ? "math_breakdown" : "discussion_question";
    const variant = analysis.redditVariants[variantKey];
    const submitUrl = buildRedditSubmitUrl(sub, variant.title, variant.postText);

    tasks.push({
      id: `task-art-${articleId}-reddit-${sub}`,
      source_type: "article",
      source_id: articleId,
      source_title: analysis.title,
      platform: "reddit",
      channel: `r/${sub}`,
      post_title: variant.title,
      post_content: variant.postText,
      submit_url: submitUrl,
      status: "ready_to_publish",
      metadata: { variant: variantKey, subreddit: sub },
      created_at: now,
      updated_at: now,
    });
  });

  // LinkedIn Task
  const linkedinVariant = analysis.variants.bullet_takeaways;
  tasks.push({
    id: `task-art-${articleId}-linkedin`,
    source_type: "article",
    source_id: articleId,
    source_title: analysis.title,
    platform: "linkedin",
    channel: "Feed",
    post_title: `LinkedIn Post: ${analysis.title}`,
    post_content: linkedinVariant.postText,
    submit_url: article.sourceUrl
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(article.sourceUrl)}`
      : undefined,
    status: "ready_to_publish",
    metadata: { variant: "bullet_takeaways" },
    created_at: now,
    updated_at: now,
  });

  return tasks;
}

/**
 * Generates the complete Weekly Distribution Batch combining all active software products and recent articles.
 */
export function generateWeeklyBatch(articles: Array<{ id?: string; title: string; content: string; sourceUrl?: string; tags?: string[] }> = []): DistributionTask[] {
  const allTasks: DistributionTask[] = [];

  // 1. Add all Software Product blueprints
  for (const blueprint of Object.values(SOFTWARE_BLUEPRINTS)) {
    allTasks.push(...generateDistributionTasksForSoftware(blueprint));
  }

  // 2. Add recent marketing articles (up to 3 most recent)
  const recentArticles = articles.slice(0, 3);
  for (const article of recentArticles) {
    allTasks.push(...generateDistributionTasksForArticle(article));
  }

  return allTasks;
}
